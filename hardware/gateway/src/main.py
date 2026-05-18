import time
import os
import logging
import glob
from dotenv import load_dotenv
try:
    from .sensor_reader import LoraSensorReader, DummySensorReader, VtmisSensorReader, CombinedSensorReader
    from .http_transmitter import HttpTransmitter
    from .auth import verify_message, load_pubkeys
except ImportError:
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


def is_lora_reader(reader) -> bool:
    return "lora" in reader.__class__.__name__.lower()


def handle_lora_reading(
    data: dict,
    *,
    logger: logging.Logger,
    transmitter: HttpTransmitter,
    device_key: str,
    allow_raw_lora: bool,
    last_seen: dict,
    recent_messages: list,
    max_recent_messages: int,
    hops_window_seconds: float,
) -> None:
    if not data:
        return

    received_time = time.time()
    recent_messages.append({"received_at": received_time, "payload": data})
    if len(recent_messages) > max_recent_messages:
        recent_messages.pop(0)

    logger.info("LoRa received message (%s): %s", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(received_time)), data)
    logger.info("Recent LoRa messages stored: %d", len(recent_messages))

    ts = float(data.get("timestamp", time.time()))

    pubkeys = load_pubkeys()
    sig_b64 = None
    if "sig" in data:
        sig_b64 = data.pop("sig")
    device_id = data.get("id") or data.get("device_id") or data.get("deviceId")

    if sig_b64 and device_id:
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
                if not allow_raw_lora:
                    logger.warning(f"Signature verification failed for device_id={device_id}; dropping message")
                    return
                logger.warning(f"Signature verification failed for device_id={device_id}, but ALLOW_RAW_LORA enabled — accepting raw message")
            else:
                logger.info(f"Signature verified for device_id={device_id}")
        except Exception as e:
            if not allow_raw_lora:
                logger.error(f"Error verifying signature: {e}")
                return
            logger.warning(f"Error verifying signature ({e}), but ALLOW_RAW_LORA enabled — accepting raw message")
    else:
        if not allow_raw_lora:
            logger.warning("No signature present or missing device id; dropping message")
            return
        logger.info("No signature present; ALLOW_RAW_LORA enabled — accepting raw LoRa message")

    data = normalize_lora_payload(data)
    data["source"] = "lora"

    buoy_id = data.get("buoy_id") or data.get("id") or data.get("device_id") or data.get("deviceId") or data.get("device") or data.get("dev_id")
    if buoy_id:
        data["buoy_id"] = buoy_id

        now = time.time()
        for k, v in list(last_seen.items()):
            if now - v > hops_window_seconds * 5:
                del last_seen[k]

        last = last_seen.get(buoy_id)
        if last is not None and ts - last <= hops_window_seconds:
            logger.info(f"Duplicate hop detected for buoy_id={buoy_id}; ignoring (last seen {ts-last:.2f}s ago)")
            return

        last_seen[buoy_id] = ts

    data["device_key"] = device_key
    transmitter.transmit(data)


def main():
    # Load environment variables from .env file if it exists
    load_dotenv()
    
    # Configuration
    SERVER_URL = os.environ.get("SERVER_URL", "http://localhost:3000/api/readings")
    LORA_PORT = os.environ.get("LORA_PORT", "/dev/ttyUSB0")
    LORA_SERIAL_BAUD = int(os.environ.get("LORA_SERIAL_BAUD", "9600"))
    USE_LORA = os.environ.get("USE_LORA", "true").lower() == "true"
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

    # Initialize reader(s). LoRa can run alongside VTMIS and/or Dummy.
    readers_to_poll = []
    lora_reader = None

    if USE_VTMIS:
        logger.info(f"Initializing VTMIS Sensor Reader (station {VTMIS_STATION})...")
        readers_to_poll.append(VtmisSensorReader(station_id=VTMIS_STATION))
    
    if USE_DUMMY_DATA:
        logger.info("Initializing Dummy Sensor Reader...")
        readers_to_poll.append(DummySensorReader())

    if USE_LORA:
        user_set_port = "LORA_PORT" in os.environ
        selected_port = LORA_PORT

        if not user_set_port:
            available_ports = find_serial_ports()
            if available_ports and LORA_PORT not in available_ports:
                selected_port = available_ports[0]
                logger.info(
                    "Default LoRa port %s not found. Auto-detected serial ports: %s. Trying %s.",
                    LORA_PORT,
                    available_ports,
                    selected_port,
                )

        try:
            logger.info(
                "Initializing LoRa Sensor Reader on port %s (baud=%d)...",
                selected_port,
                LORA_SERIAL_BAUD,
            )
            lora_reader = LoraSensorReader(selected_port, baudrate=LORA_SERIAL_BAUD)
        except Exception as e:
            available_ports = find_serial_ports()
            if available_ports:
                logger.warning("Available serial ports: %s", available_ports)
            else:
                logger.warning("No serial ports were detected on the host.")

            logger.warning("LoRa initialization failed: %s", e)

    if lora_reader is not None:
        readers_to_poll.append(lora_reader)
    
    multiple_readers = len(readers_to_poll) > 1
    if multiple_readers:
        logger.info("Will poll and transmit %d sensor readers separately", len(readers_to_poll))
    elif readers_to_poll:
        logger.info("Will poll and transmit a single non-LoRa reader; LoRa handler remains active if available")

    logger.info("Gateway started. Press Ctrl+C to exit.")
    
    try:
        last_seen = {}
        recent_messages = []

        if readers_to_poll:
            # Polling mode for VTMIS/Dummy and LoRa when present with a fixed interval.
            while True:
                for r in readers_to_poll:
                    try:
                        data = r.read_data()
                    except Exception as e:
                        logger.warning(f"Error reading from {r.__class__.__name__}: {e}")
                        continue

                    if not data:
                        continue

                    if is_lora_reader(r):
                        handle_lora_reading(
                            data,
                            logger=logger,
                            transmitter=transmitter,
                            device_key=DEVICE_KEY,
                            allow_raw_lora=ALLOW_RAW_LORA,
                            last_seen=last_seen,
                            recent_messages=recent_messages,
                            max_recent_messages=MAX_RECENT_MESSAGES,
                            hops_window_seconds=HOPS_WINDOW_SECONDS,
                        )
                    else:
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

    except KeyboardInterrupt:
        logger.info("Shutting down gateway...")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")

if __name__ == "__main__":
    main()
