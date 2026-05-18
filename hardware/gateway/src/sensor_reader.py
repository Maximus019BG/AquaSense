import time
import random
import json
import re
import requests
from typing import Dict, Any, Optional

class SensorDataReader:
    """Abstract base class for reading sensor data."""
    def read_data(self) -> Optional[Dict[str, Any]]:
        raise NotImplementedError("Subclasses must implement read_data")

class DummySensorReader(SensorDataReader):
    """Generates dummy water sensor data if hardware is not available."""
    
    def read_data(self) -> Optional[Dict[str, Any]]:
        # Center temperature around 15.7°C with small Gaussian noise for realism
        temp = round(random.gauss(15.7, 0.5), 2)
        # Clamp to reasonable sensor bounds
        if temp < -10.0:
            temp = -10.0
        if temp > 50.0:
            temp = 50.0
        return {
            "temperature": temp,
            "ph": round(random.uniform(6.7, 7.8), 2),
            "light_intensity": round(random.uniform(0.0, 10.0), 2),
            "turbidity": round(random.uniform(0.0, 89.0), 2),
            "gyro_level": {
                "x": round(random.uniform(-90.0, 90.0), 2),
                "y": round(random.uniform(-90.0, 90.0), 2),
                "z": round(random.uniform(-90.0, 90.0), 2)
            },
            "gyro_accelerometer": {
                "x": round(random.uniform(-2.0, 2.0), 2),
                "y": round(random.uniform(-2.0, 2.0), 2),
                "z": round(random.uniform(-2.0, 2.0), 2)
            },
            "timestamp": time.time()
        }


class LoraSensorReader(SensorDataReader):
    """Reads sensor data via LoRa module.

    This implementation reads framed packets from a serial-connected LoRa receiver.
    It does not require newline-terminated messages, because LoRa payloads are packet-
    framed rather than line-framed. If `pyserial` is not installed or the serial port
    cannot be opened, an informative exception is raised.
    """
    def __init__(self, port: str, baudrate: int = 115200, timeout: float = 1.0):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        try:
            import serial
        except Exception as e:
            raise RuntimeError("pyserial is required for LoraSensorReader: install with 'pip install pyserial'") from e

        try:
            # Use a finite timeout so we can return control if no packet is available.
            self.serial = serial.Serial(self.port, self.baudrate, timeout=timeout)
        except Exception as e:
            raise RuntimeError(f"Failed to open serial port {self.port}: {e}") from e

    def read_data(self) -> Optional[Dict[str, Any]]:
        # Read whatever bytes are currently available and attempt to parse them as JSON.
        try:
            raw = self.serial.read_all()
            if not raw:
                return None

            try:
                text = raw.decode('utf-8', errors='replace').strip()
            except Exception:
                text = str(raw)

            # Try to parse JSON first
            try:
                payload = json.loads(text)
            except Exception:
                # Return raw text under a key if JSON parsing fails
                payload = {"raw": text, "raw_bytes": list(raw)}

            payload.setdefault("timestamp", time.time())
            return payload
        except Exception as e:
            print(f"Error while reading from LoRa serial: {e}")
            return None


class VtmisSensorReader(SensorDataReader):
    """Reads sensor data from VTMIS (https://www.vtmis.bg/) Highcharts graphs.
    
    Fetches the graph data for a specified station and extracts the latest
    readings for air temperature, wind speed, air pressure, and visibility.
    Maps them to water readings schema for compatibility with the web server.
    """
    
    def __init__(self, station_id: str = "23", timeout: float = 10.0):
        """
        Args:
            station_id: VTMIS station ID (default: "23" for Burgas)
            timeout: HTTP request timeout in seconds
        """
        self.station_id = station_id
        self.timeout = timeout
        self.url = "https://www.vtmis.bg/graph/nimh_with_direction.php"
    
    def read_data(self) -> Optional[Dict[str, Any]]:
        """Fetch and parse VTMIS graph data, returning latest sensor readings."""
        try:
            response = requests.post(
                self.url,
                data={"station": self.station_id},
                timeout=self.timeout,
                headers={"User-Agent": "AquaSense-Gateway/1.0"}
            )
            response.raise_for_status()
            html = response.text
            
            # Extract all Highcharts data from script tags
            chart_data = self._parse_highcharts_data(html)
            if not chart_data:
                print("No chart data found in VTMIS response")
                return None
            
            # Map sensor data to water readings schema
            readings = self._map_to_water_schema(chart_data)
            readings["timestamp"] = time.time()
            return readings
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching VTMIS data: {e}")
            return None
        except Exception as e:
            print(f"Error parsing VTMIS data: {e}")
            return None
    
    def _parse_highcharts_data(self, html: str) -> Dict[str, Any]:
        """Extract Highcharts series data from HTML script tags.
        
        Returns a dict mapping sensor names to their latest values:
        {
            "Air Temperature": 15.4,
            "Wind Speed": 3.2,
            "Air Pressure": 1013.5,
            "Visibility": 9999,
            ...
        }
        """
        data = {}
        
        # Split by "new Highcharts.Chart(" to isolate each chart block
        blocks = re.split(r"new\s+Highcharts\.Chart\s*\(\s*\{", html)
        
        for block in blocks[1:]:  # Skip the first split (before first chart)
            try:
                # Extract title: look for text: 'Title' or text: "Title"
                title_match = re.search(r"title:\s*\{[^}]*?text:\s*['\"]([^'\"]+)['\"]", block)
                if not title_match:
                    continue
                    
                title = title_match.group(1).strip()
                
                # Extract the data array: data: [[timestamp, value], ...]
                # Look for the series array and then the data field
                data_match = re.search(r"data:\s*\[\s*(\[[^\]]*\](?:\s*,\s*\[[^\]]*\])*)\s*,?\s*\]", block)
                if not data_match:
                    continue
                
                # Get the matched data string
                data_str = data_match.group(1)
                
                # Remove trailing comma if present and wrap in outer brackets
                data_str = data_str.rstrip(',')
                data_array_str = f"[{data_str}]"
                
                # Parse as JSON
                try:
                    data_points = json.loads(data_array_str)
                except json.JSONDecodeError:
                    # Try to clean up the string if JSON parsing fails
                    # Remove any trailing commas inside arrays
                    data_str = re.sub(r',(\s*\])', r'\1', data_str)
                    data_array_str = f"[{data_str}]"
                    data_points = json.loads(data_array_str)
                
                if data_points:
                    # Get the last data point [timestamp, value]
                    latest = data_points[-1]
                    if isinstance(latest, (list, tuple)) and len(latest) >= 2:
                        data[title] = float(latest[1])
                        
            except Exception as e:
                print(f"Error parsing chart block: {e}")
        
        return data
    
    def _map_to_water_schema(self, vtmis_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map VTMIS atmospheric sensor data to water readings schema.
        
        VTMIS provides:
        - Air Temperature (°C) -> temperature
        - Air Pressure (mbar) -> ph (scaled)
        - Visibility (m) -> turbidity (inverse, 0-100 scale)
        - Wind Speed (m/s) -> light_intensity (scaled)
        
        Returns a dict with fields: temperature, ph, turbidity, dissolved_oxygen, water_level
        """
        result = {
            "temperature": 0.0,
            "ph": 7.0,
            "turbidity": 50.0,
            "dissolved_oxygen": 8.0,
            "water_level": 0.0,
        }
        
        # Map Air Temperature directly
        if "Air Temperature" in vtmis_data:
            result["temperature"] = float(vtmis_data["Air Temperature"])
        
        # Map Air Pressure to pH (scale pressure ~1000-1025 mbar to pH ~6-8)
        if "Air Pressure" in vtmis_data:
            pressure = float(vtmis_data["Air Pressure"])
            # Linear mapping: 1000 mbar -> pH 6.5, 1025 mbar -> pH 7.5
            result["ph"] = 6.5 + ((pressure - 1000) / 25) * 1.0
            result["ph"] = round(max(6.0, min(8.5, result["ph"])), 2)  # Clamp to realistic range
        
        # Map Visibility to Turbidity (inverse scale: 10000m -> 0 turbidity, 0m -> 100 turbidity)
        if "Visibility" in vtmis_data:
            visibility = float(vtmis_data["Visibility"])
            # Visibility in meters to turbidity percentage
            # Higher visibility = lower turbidity
            turbidity = 100.0 * (1.0 - min(visibility / 10000.0, 1.0))
            result["turbidity"] = round(max(0.0, min(100.0, turbidity)), 2)
        
        # Map Wind Speed to Light Intensity (scale m/s to 0-10)
        if "Wind Speed" in vtmis_data:
            wind_speed = float(vtmis_data["Wind Speed"])
            # 0-20 m/s -> 0-10 light intensity
            result["light_intensity"] = round(min(10.0, wind_speed / 2.0), 2)
        
        # Convert to string for database compatibility
        return {
            "temperature": str(result["temperature"]),
            "ph": str(result["ph"]),
            "turbidity": str(result["turbidity"]),
            "dissolved_oxygen": str(result["dissolved_oxygen"]),
            "water_level": str(result["water_level"]),
        }


class CombinedSensorReader(SensorDataReader):
    """Combines readings from multiple sources (e.g., VTMIS + Dummy).
    
    Reads from both sensors and merges their data, preferring VTMIS data
    when available and falling back to dummy data for missing fields.
    """
    
    def __init__(self, readers: list[SensorDataReader]):
        """
        Args:
            readers: List of SensorDataReader instances to combine
        """
        self.readers = readers
    
    def read_data(self) -> Optional[Dict[str, Any]]:
        """Read from all sources and merge results."""
        result = {}
        
        for reader in self.readers:
            try:
                data = reader.read_data()
                if data:
                    # Merge data, with first reader taking precedence
                    for key, value in data.items():
                        if key not in result or result[key] is None:
                            result[key] = value
            except Exception as e:
                print(f"Error reading from {reader.__class__.__name__}: {e}")
                continue
        
        if result:
            result.setdefault("timestamp", time.time())
            return result
        
        return None
