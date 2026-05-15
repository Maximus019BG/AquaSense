import base64
import json
import time
from nacl.signing import SigningKey
from hardware.gateway.src.auth import verify_message


def build_canonical(data):
    idv = data.get("id", "")
    metricv = data.get("metric", "")
    valuev = int(data.get("value", 0))
    seqv = int(data.get("seq", 0))
    hopsv = int(data.get("hops", 0))
    tsv = int(data.get("ts", int(time.time())))
    return ('{"id":"%s","metric":"%s","value":%d,"seq":%d,"hops":%d,"ts":%d}' % (idv, metricv, valuev, seqv, hopsv, tsv)).encode('utf-8')


def test_verify_valid_signature():
    sk = SigningKey.generate()
    pk = sk.verify_key
    data = {"id": "sensor-01", "metric": "turb_raw", "value": 1234, "seq": 1, "hops": 0, "ts": 1650000000}
    canonical = build_canonical(data)
    sig = sk.sign(canonical).signature
    sig_b64 = base64.b64encode(sig).decode('ascii')
    pubkeys = {"sensor-01": base64.b64encode(bytes(pk)).decode('ascii')}
    assert verify_message("sensor-01", canonical, sig_b64, pubkeys=pubkeys)


def test_verify_invalid_signature():
    sk = SigningKey.generate()
    pk = sk.verify_key
    data = {"id": "sensor-01", "metric": "turb_raw", "value": 1234, "seq": 1, "hops": 0, "ts": 1650000000}
    canonical = build_canonical(data)
    sig = sk.sign(canonical).signature
    # tamper with signature
    bad = bytearray(sig)
    bad[0] ^= 0xFF
    sig_b64 = base64.b64encode(bytes(bad)).decode('ascii')
    pubkeys = {"sensor-01": base64.b64encode(bytes(pk)).decode('ascii')}
    assert not verify_message("sensor-01", canonical, sig_b64, pubkeys=pubkeys)
