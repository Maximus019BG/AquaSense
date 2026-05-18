import time
import os
import logging
import glob
from dotenv import load_dotenv
try:
    from .sensor_reader import LoraSensorReader, DummySensorReader
    from .http_transmitter import HttpTransmitter
    from .auth import verify_message, load_pubkeys
except ImportError:
    from sensor_reader import LoraSensorReader, DummySensorReader
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


def serial_port_score(port) -> tuple[int, str]:
    text = f"{port.description} {port.hwid}".lower()
    score = 50
    if any(token in text for token in ("usb", "ch340", "cp210", "silicon labs", "ftdi")):
        score -= 40
    if any(token in text for token in ("bluetooth", "bthenum")):
        score += 40
    return score, port.device


def sort_serial_ports(ports) -> list[str]:
    return [port.device for port in sorted(ports, key=serial_port_score)]


def find_serial_ports() -> list[str]:
    try:
        import serial.tools.list_ports
        ports = list(serial.tools.list_ports.comports())
        return sort_serial_ports(ports)
    except Exception:
        return sorted(glob.glob("/dev/ttyUSB*") + glob.glob("/dev/ttyACM*"))


def first_present(data: dict, *keys: str):
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return None


def normalize_lora_payload(data: dict) -> dict:
    """Normalize compact LoRa payloads into the gateway/web reading shape."""
    normalized = dict(data)
    device_id = first_present(data, "id", "device_id", "deviceId", "device", "dev_id")
    if device_id:
        normalized["buoy_id"] = device_id
        normalized.setdefault("device_id", device_id)

    if "metric" in data and "value" in data:
        metric = data.get("metric")
        value = data.get("value")
        if metric == "turb_pct":
            normalized["turbidity"] = value
        elif metric == "ph_raw":
            normalized["ph_raw"] = value
            normalized.setdefault("ph", value)
        elif metric == "temp_c_x10":
            normalized["temp_c_x10"] = value
            normalized["temperature"] = float(value) / 10.0
        elif metric == "lux":
            normalized["lux"] = value
            normalized["light_intensity"] = value
        elif metric in ("accel_x", "accel_y", "accel_z"):
            axis = metric.rsplit("_", 1)[1]
            normalized.setdefault("gyro_accelerometer", {})[axis] = value
        return normalized

    if "turbidity" not in normalized and "turb_pct" in data:
        normalized["turbidity"] = data["turb_pct"]

    if "temperature" not in normalized and "temp_c_x10" in data:
        normalized["temperature"] = float(data["temp_c_x10"]) / 10.0

    if "ph" not in normalized and "ph_raw" in data:
        normalized["ph"] = data["ph_raw"]

    if "light_intensity" not in normalized and "lux" in data:
        normalized["light_intensity"] = data["lux"]

    accel_x = first_present(data, "accel_x")
    accel_y = first_present(data, "accel_y")
    accel_z = first_present(data, "accel_z")
    if accel_x is not None or accel_y is not None or accel_z is not None:
        normalized["gyro_accelerometer"] = {
            "x": accel_x,
            "y": accel_y,
            "z": accel_z,
        }

    return normalized


def main():
    # Load environment variables from .env file if it exists
    load_dotenv()
    
    # Configuration
    SERVER_URL = os.environ.get("SERVER_URL", "http://localhost:3000/api/readings")
    LORA_PORT = os.environ.get("LORA_PORT", "/dev/ttyUSB0")
    # If USE_DUMMY_DATA is set to "true", force dummy polling mode;
    # otherwise attempt to use the LoRa reader and fall back to dummy polling.
    USE_DUMMY_DATA = os.environ.get("USE_DUMMY_DATA", "false").lower() == "true"
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

    # Initialize appropriate reader. Prefer LoRa if available unless overridden.
    if USE_DUMMY_DATA:
        logger.info("Initializing with Dummy Sensor Reader (polling mode)...")
        reader = DummySensorReader()
        mode = "dummy"
    else:
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

                data = normalize_lora_payload(data)

                # Extract buoy_id from expected device identifier fields in LoRa payload
                buoy_id = data.get("buoy_id") or data.get("id") or data.get("device_id") or data.get("deviceId") or data.get("device") or data.get("dev_id")
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
