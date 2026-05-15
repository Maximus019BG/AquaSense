import time
import os
from dotenv import load_dotenv
from sensor_reader import LoraSensorReader, DummySensorReader
from http_transmitter import HttpTransmitter

def main():
    # Load environment variables from .env file if it exists
    load_dotenv()
    
    # Configuration
    SERVER_URL = os.environ.get("SERVER_URL", "http://localhost:3000/api/readings")
    LORA_PORT = os.environ.get("LORA_PORT", "/dev/ttyUSB0")
    USE_DUMMY_DATA = os.environ.get("USE_DUMMY_DATA", "true").lower() == "true"
    INTERVAL_SECONDS = int(os.environ.get("INTERVAL_SECONDS", "60"))
    DEVICE_KEY = os.environ.get("DEVICE_KEY", "default-device-key")

    transmitter = HttpTransmitter(SERVER_URL)
    
    # Initialize appropriate reader
    if USE_DUMMY_DATA:
        print("Initializing with Dummy Sensor Reader...")
        reader = DummySensorReader()
    else:
        print(f"Initializing with LoRa Sensor Reader on port {LORA_PORT}...")
        reader = LoraSensorReader(LORA_PORT)
        
    print("Gateway started. Press Ctrl+C to exit.")
    
    try:
        while True:
            data = reader.read_data()
            
            if data:
                data["device_key"] = DEVICE_KEY
                transmitter.transmit(data)
                
            time.sleep(INTERVAL_SECONDS)
            
    except KeyboardInterrupt:
        print("Shutting down gateway...")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    main()
