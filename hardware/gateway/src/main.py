import time
import os
from dotenv import load_dotenv
from sensor_reader import LoraSensorReader, DummySensorReader
from http_transmitter import HttpTransmitter
from auth import verify_message, load_pubkeys
import base64

def main():
    # Load environment variables from .env file if it exists
    load_dotenv()
    
    # Configuration
    SERVER_URL = os.environ.get("SERVER_URL", "http://localhost:3000/api/readings")
    LORA_PORT = os.environ.get("LORA_PORT", "/dev/ttyUSB0")
    # If USE_DUMMY_DATA is set to "true", force dummy polling mode;
    # otherwise attempt to use the LoRa reader and fall back to dummy polling.
    USE_DUMMY_DATA = os.environ.get("USE_DUMMY_DATA", "false").lower() == "true"
    INTERVAL_SECONDS = int(os.environ.get("INTERVAL_SECONDS", "60"))
    DEVICE_KEY = os.environ.get("DEVICE_KEY", "default-device-key")
    HOPS_WINDOW_SECONDS = float(os.environ.get("HOPS_WINDOW_SECONDS", "2.0"))

    transmitter = HttpTransmitter(SERVER_URL)

    # Initialize appropriate reader. Prefer LoRa if available unless overridden.
    if USE_DUMMY_DATA:
        print("Initializing with Dummy Sensor Reader (polling mode)...")
        reader = DummySensorReader()
        mode = "dummy"
    else:
        try:
            print(f"Initializing with LoRa Sensor Reader on port {LORA_PORT}...")
            reader = LoraSensorReader(LORA_PORT)
            mode = "lora"
        except Exception as e:
            print(f"LoRa initialization failed: {e}\nFalling back to Dummy Sensor Reader (polling mode).")
            reader = DummySensorReader()
            mode = "dummy"
        
    print("Gateway started. Press Ctrl+C to exit.")
    
    try:
        last_seen = {}

        if mode == "dummy":
            # Polling mode for dummy data with a fixed interval
            while True:
                data = reader.read_data()
                if data:
                    data["device_key"] = DEVICE_KEY
                    transmitter.transmit(data)
                time.sleep(INTERVAL_SECONDS)
        else:
            # For real LoRa hardware, block and transmit immediately when a message arrives
            while True:
                data = reader.read_data()  # blocking read
                if not data:
                    continue

                # Determine timestamp for dedup checks
                ts = float(data.get("timestamp", time.time()))

                # Verify incoming Ed25519 signature if present
                # Expect clients to include a base64 signature field in the payload named "sig"
                pubkeys = load_pubkeys()
                sig_b64 = None
                if "sig" in data:
                    sig_b64 = data.pop("sig")
                device_id = data.get("id") or data.get("device_id") or data.get("deviceId")
                if sig_b64 and device_id:
                    # Recreate canonical message bytes: stable JSON with keys sorted
                    try:
                        # Build canonical message bytes using the shared protocol ordering
                        # same as Shared::serializePayload: id, metric, value, seq, hops, ts
                        idv = data.get("id", "")
                        metricv = data.get("metric", "")
                        valuev = int(data.get("value", 0))
                        seqv = int(data.get("seq", 0))
                        hopsv = int(data.get("hops", 0))
                        tsv = int(data.get("ts", int(time.time())))
                        canonical_str = '{{"id":"%s","metric":"%s","value":%d,"seq":%d,"hops":%d,"ts":%d}}' % (idv, metricv, valuev, seqv, hopsv, tsv)
                        canonical = canonical_str.encode('utf-8')
                        ok = verify_message(device_id, canonical, sig_b64, pubkeys=pubkeys)
                        if not ok:
                            print(f"Signature verification failed for device_id={device_id}; dropping message")
                            continue
                        else:
                            print(f"Signature verified for device_id={device_id}")
                    except Exception as e:
                        print(f"Error verifying signature: {e}")
                        continue
                else:
                    # If no signature present, reject by default (only accept signed messages)
                    print("No signature present or missing device id; dropping message")
                    continue

                # Extract buoy_id from expected device identifier fields in LoRa payload
                buoy_id = data.get("device_id") or data.get("deviceId") or data.get("device") or data.get("dev_id")
                if buoy_id:
                    data["buoy_id"] = buoy_id

                    # Prune old entries
                    now = time.time()
                    for k, v in list(last_seen.items()):
                        if now - v > HOPS_WINDOW_SECONDS * 5:
                            del last_seen[k]

                    # If this buoy_id was seen recently, consider it a duplicate hop and ignore
                    last = last_seen.get(buoy_id)
                    if last is not None and ts - last <= HOPS_WINDOW_SECONDS:
                        print(f"Duplicate hop detected for buoy_id={buoy_id}; ignoring (last seen {ts-last:.2f}s ago)")
                        continue

                    # Record this sighting
                    last_seen[buoy_id] = ts

                data["device_key"] = DEVICE_KEY
                transmitter.transmit(data)

    except KeyboardInterrupt:
        print("Shutting down gateway...")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    main()
