import time
import random
import json
from typing import Dict, Any, Optional

class SensorDataReader:
    """Abstract base class for reading sensor data."""
    def read_data(self) -> Optional[Dict[str, Any]]:
        raise NotImplementedError("Subclasses must implement read_data")

class DummySensorReader(SensorDataReader):
    """Generates dummy water sensor data if hardware is not available."""
    
    def read_data(self) -> Optional[Dict[str, Any]]:
        return {
            "temperature": round(random.uniform(5.0, 35.0), 2),
            "ph": round(random.uniform(6.5, 8.5), 2),
            "light_intensity": round(random.uniform(0.0, 1000.0), 2),
            "turbidity": round(random.uniform(0.0, 100.0), 2),
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
