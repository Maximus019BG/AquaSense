import requests
import json
from typing import Dict, Any

class DataTransmitter:
    """Base class for transmitting data."""
    def transmit(self, data: Dict[str, Any]) -> bool:
        raise NotImplementedError("Subclasses must implement transmit")

class HttpTransmitter(DataTransmitter):
    """Transmits data to a remote server via HTTP POST."""
    
    def __init__(self, server_url: str):
        self.server_url = server_url
        self.headers = {"Content-Type": "application/json"}
        
    def transmit(self, data: Dict[str, Any]) -> bool:
        try:
            response = requests.post(
                self.server_url, 
                headers=self.headers, 
                data=json.dumps(data),
                timeout=10
            )
            response.raise_for_status()
            print(f"Data transmitted successfully to {self.server_url}")
            return True
        except requests.exceptions.RequestException as e:
            print(f"Failed to transmit data: {e}")
            return False
