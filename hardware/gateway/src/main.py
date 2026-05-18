import time
import os
import logging
import glob
from dotenv import load_dotenv
from sensor_reader import LoraSensorReader, DummySensorReader, VtmisSensorReader, CombinedSensorReader
from http_transmitter import HttpTransmitter
from auth import verify_message, load_pubkeys
import base64


def setup_logger(log_path: str) -> logging.Logger:
    logger = logging.getLogger("gateway")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        file_handler = logging.FileHandler(log_path)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    return logger


def find_serial_ports() -> list[str]:
    try:
        import serial.tools.list_ports
        return [port.device for port in serial.tools.list_ports.comports()]
    except Exception:
        return sorted(glob.glob("/dev/ttyUSB*") + glob.glob("/dev/ttyACM*"))


def main():
    # Load environment variables from .env file if it exists
    load_dotenv()
    
    # Configuration
    SERVER_URL = os.environ.get("SERVER_URL", "http://localhost:3000/api/readings")
    LORA_PORT = os.environ.get("LORA_PORT", "/dev/ttyUSB0")
    # If USE_DUMMY_DATA is set to "true", force dummy polling mode;
    # otherwise attempt to use the LoRa reader and fall back to dummy polling.
    USE_DUMMY_DATA = os.environ.get("USE_DUMMY_DATA", "false").lower() == "true"
    USE_VTMIS = os.environ.get("USE_VTMIS", "false").lower() == "true"
    VTMIS_STATION = os.environ.get("VTMIS_STATION", "23")
    INTERVAL_SECONDS = int(os.environ.get("INTERVAL_SECONDS", "1"))
    DEVICE_KEY = os.environ.get("DEVICE_KEY", "default-device-key")
    # If true, accept LoRa messages without Ed25519 signatures (raw LoRa)
    ALLOW_RAW_LORA = os.environ.get("ALLOW_RAW_LORA", "false").lower() == "true"
    HOPS_WINDOW_SECONDS = float(os.environ.get("HOPS_WINDOW_SECONDS", "2.0"))
    LOG_FILE = os.environ.get("GATEWAY_LOG_FILE", "gateway.log")
    MAX_RECENT_MESSAGES = int(os.environ.get("MAX_RECENT_MESSAGES", "50"))

    logger = setup_logger(LOG_FILE)
    logger.info(f"Gateway log initialized at {LOG_FILE}")

    transmitter = HttpTransmitter(SERVER_URL)

    # Initialize reader(s). Support combining VTMIS + Dummy if both enabled
    readers_to_combine = []
    mode = "lora"  # default
    
    if USE_VTMIS:
        logger.info(f"Initializing VTMIS Sensor Reader (station {VTMIS_STATION})...")
        readers_to_combine.append(VtmisSensorReader(station_id=VTMIS_STATION))
        mode = "combined" if USE_DUMMY_DATA else "vtmis"
    
    if USE_DUMMY_DATA:
        logger.info("Initializing Dummy Sensor Reader...")
        readers_to_combine.append(DummySensorReader())
        mode = "combined" if USE_VTMIS else "dummy"
    
    # If multiple readers were requested, keep them as a list so we can
    # poll and transmit each reader's data separately (avoids mixing VTMIS
    # and local/dummy payloads in a single request which can cause server
    # errors). If a single reader is present, keep the legacy `reader` API.
    multiple_readers = False
    if readers_to_combine:
        if len(readers_to_combine) > 1:
            logger.info(f"Will poll and transmit {len(readers_to_combine)} sensor readers separately")
            multiple_readers = True
            reader = None
        else:
            reader = readers_to_combine[0]
    else:
        # Fall back to LoRa
        user_set_port = "LORA_PORT" in os.environ
        selected_port = LORA_PORT

        if not user_set_port:
            available_ports = find_serial_ports()
            if available_ports:
                if LORA_PORT not in available_ports:
                    selected_port = available_ports[0]
                    logger.info(
                        "Default LoRa port %s not found. Auto-detected serial ports: %s. Trying %s.",
                        LORA_PORT,
                        available_ports,
                        selected_port,
                    )

        try:
            logger.info(f"Initializing with LoRa Sensor Reader on port {selected_port}...")
            reader = LoraSensorReader(selected_port)
            mode = "lora"
        except Exception as e:
            available_ports = find_serial_ports()
            if available_ports:
                logger.warning("Available serial ports: %s", available_ports)
            else:
                logger.warning("No serial ports were detected on the host.")

            logger.warning(
                "LoRa initialization failed: %s\nFalling back to Dummy Sensor Reader (polling mode).",
                e,
            )
            reader = DummySensorReader()
            mode = "dummy"

    logger.info("Gateway started. Press Ctrl+C to exit.")
    
    try:
        last_seen = {}
        recent_messages = []

        if mode in ["dummy", "vtmis", "combined"]:
            # Polling mode for dummy data, VTMIS, and combined sources with a fixed interval
            while True:
                if multiple_readers:
                    # Poll each configured reader and send its own HTTP request.
                    for r in readers_to_combine:
                        try:
                            data = r.read_data()
                        except Exception as e:
                            logger.warning(f"Error reading from {r.__class__.__name__}: {e}")
                            data = None

                        if not data:
                            continue

                        # Annotate source to help server-side routing/processing
                        src = getattr(r, "__class__", type(r)).__name__.lower()
                        if "vtmis" in src:
                            data["source"] = "vtmis"
                        elif "dummy" in src:
                            data["source"] = "dummy"
                        else:
                            data["source"] = "sensor"

                        data["device_key"] = DEVICE_KEY
                        transmitter.transmit(data)

                    time.sleep(INTERVAL_SECONDS)
                    continue

                # Single reader path (legacy behavior)
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

                # Track all received LoRa payloads and keep a recent list for logging
                received_time = time.time()
                recent_messages.append({"received_at": received_time, "payload": data})
                if len(recent_messages) > MAX_RECENT_MESSAGES:
                    recent_messages.pop(0)

                logger.info("LoRa received message (%s): %s", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(received_time)), data)
                logger.info("Recent LoRa messages stored: %d", len(recent_messages))

                # Determine timestamp for dedup checks
                ts = float(data.get("timestamp", time.time()))

                # Optionally verify incoming Ed25519 signature if present.
                # Expect clients to include a base64 signature field in the payload named "sig".
                pubkeys = load_pubkeys()
                sig_b64 = None
                if "sig" in data:
                    sig_b64 = data.pop("sig")
                device_id = data.get("id") or data.get("device_id") or data.get("deviceId")

                if sig_b64 and device_id:
                    # Recreate canonical message bytes: stable JSON with keys sorted
                    try:
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
                            if not ALLOW_RAW_LORA:
                                logger.warning(f"Signature verification failed for device_id={device_id}; dropping message")
                                continue
                            else:
                                logger.warning(f"Signature verification failed for device_id={device_id}, but ALLOW_RAW_LORA enabled — accepting raw message")
                        else:
                            logger.info(f"Signature verified for device_id={device_id}")
                    except Exception as e:
                        if not ALLOW_RAW_LORA:
                            logger.error(f"Error verifying signature: {e}")
                            continue
                        else:
                            logger.warning(f"Error verifying signature ({e}), but ALLOW_RAW_LORA enabled — accepting raw message")
                else:
                    # If no signature present, optionally accept raw LoRa messages if configured
                    if not ALLOW_RAW_LORA:
                        logger.warning("No signature present or missing device id; dropping message")
                        continue
                    else:
                        logger.info("No signature present; ALLOW_RAW_LORA enabled — accepting raw LoRa message")

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
                        logger.info(f"Duplicate hop detected for buoy_id={buoy_id}; ignoring (last seen {ts-last:.2f}s ago)")
                        continue

                    # Record this sighting
                    last_seen[buoy_id] = ts

                data["device_key"] = DEVICE_KEY
                transmitter.transmit(data)

    except KeyboardInterrupt:
        logger.info("Shutting down gateway...")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")

if __name__ == "__main__":
    main()
