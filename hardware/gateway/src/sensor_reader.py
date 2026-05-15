import time
import random
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
    """Reads sensor data via LoRa module."""
    def __init__(self, port: str, baudrate: int = 115200):
        self.port = port
        self.baudrate = baudrate
        # Initialize serial connection here if hardware is present
        # self.serial = serial.Serial(port, baudrate, timeout=1)
        
    def read_data(self) -> Optional[Dict[str, Any]]:
        # In a real scenario, this would read from serial and parse the LoRa message
        # For now, it will return dummy data to prevent failing if lora is missing
        print(f"Reading from LoRa on {self.port}...")
        # Simulating a failure or real read...
        return None
