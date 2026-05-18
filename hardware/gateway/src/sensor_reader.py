import time
import random
import json
from typing import Dict, Any, Optional


def extract_first_json_object(buffer: str) -> tuple[Optional[Dict[str, Any]], str]:
    """Extract the first JSON object from a mixed serial text buffer."""
    decoder = json.JSONDecoder()

    while buffer:
        start = buffer.find("{")
        if start == -1:
            return None, ""

        buffer = buffer[start:]
        try:
            payload, end = decoder.raw_decode(buffer)
        except json.JSONDecodeError:
            newline = buffer.find("\n")
            if newline != -1:
                candidate = buffer[:newline]
                if "}" in candidate:
                    buffer = buffer[newline + 1 :]
                    continue

            if len(buffer) > 4096:
                return None, buffer[-4096:]
            return None, buffer

        remaining = buffer[end:].lstrip()
        if isinstance(payload, dict):
            return payload, remaining

        buffer = remaining

    return None, buffer


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
        self._text_buffer = ""

    def read_data(self) -> Optional[Dict[str, Any]]:
        # Read one serial chunk and extract JSON from mixed debug/log output.
        try:
            raw = self.serial.read_until(b"\n", size=512)
            if not raw:
                return None

            try:
                text = raw.decode('utf-8', errors='replace').strip()
            except Exception:
                text = str(raw)

            self._text_buffer += text
            payload, self._text_buffer = extract_first_json_object(self._text_buffer)
            if payload is None:
                return None

            payload.setdefault("timestamp", time.time())
            return payload
        except Exception as e:
            print(f"Error while reading from LoRa serial: {e}")
            return None
