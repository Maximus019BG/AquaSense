from hardware.gateway.src.main import normalize_lora_payload, sort_serial_ports
from hardware.gateway.src.sensor_reader import extract_first_json_object


def test_extract_json_from_esp32_tx_log():
    text = '[  1234 ms] INFO  LORA     tx ok: {"id":"client-01","metric":"turb_raw","value":903,"seq":1,"hops":0,"ts":12}\r\n'

    payload, remaining = extract_first_json_object(text)

    assert payload == {
        "id": "client-01",
        "metric": "turb_raw",
        "value": 903,
        "seq": 1,
        "hops": 0,
        "ts": 12,
    }
    assert remaining == ""


def test_extract_json_waits_for_incomplete_payload():
    payload, remaining = extract_first_json_object('tx ok: {"id":"client-01"')

    assert payload is None
    assert remaining == '{"id":"client-01"'


def test_sort_serial_ports_prefers_usb_over_bluetooth():
    class FakePort:
        def __init__(self, device, description, hwid):
            self.device = device
            self.description = description
            self.hwid = hwid

    ports = [
        FakePort("COM4", "Standard Serial over Bluetooth link", "BTHENUM\\ABC"),
        FakePort("COM6", "USB-SERIAL CH340", "USB VID:PID=1A86:7523"),
    ]

    assert sort_serial_ports(ports)[0] == "COM6"


def test_normalize_snapshot_payload():
    payload = {
        "id": "client-01",
        "type": "snapshot",
        "seq": 10,
        "hops": 0,
        "ts": 16,
        "turb_raw": 1011,
        "turbidity": 56,
        "ph_raw": 0,
        "temp_raw": 321,
        "temp_c_x10": 234,
        "lux": 78,
        "accel_x": 1,
        "accel_y": -2,
        "accel_z": 3,
    }

    normalized = normalize_lora_payload(payload)

    assert normalized["buoy_id"] == "client-01"
    assert normalized["device_id"] == "client-01"
    assert normalized["temperature"] == 23.4
    assert normalized["ph"] == 0
    assert normalized["turbidity"] == 56
    assert normalized["light_intensity"] == 78
    assert normalized["gyro_accelerometer"] == {"x": 1, "y": -2, "z": 3}


def test_normalize_legacy_metric_payload():
    normalized = normalize_lora_payload(
        {"id": "client-01", "metric": "temp_c_x10", "value": 185, "seq": 2, "hops": 0, "ts": 4}
    )

    assert normalized["buoy_id"] == "client-01"
    assert normalized["temperature"] == 18.5
