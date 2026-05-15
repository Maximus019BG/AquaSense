import json
import os
import base64
import time
from typing import Optional

from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

KEYS_PATH = os.path.join(os.path.dirname(__file__), '..', 'keys', 'pubkeys.json')


def load_pubkeys(path: Optional[str] = None):
    p = path or KEYS_PATH
    try:
        with open(p, 'r') as f:
            data = json.load(f)
            # Expect mapping device_id -> base64 public key
            return data
    except FileNotFoundError:
        return {}


def verify_message(device_id: str, message_bytes: bytes, signature_b64: str, pubkeys=None) -> bool:
    """Verify Ed25519 signature for given device_id.

    - device_id: identifier to look up public key
    - message_bytes: canonical message bytes that were signed
    - signature_b64: base64-encoded signature (64 bytes)
    """
    if pubkeys is None:
        pubkeys = load_pubkeys()
    pub_b64 = pubkeys.get(device_id)
    if not pub_b64:
        return False
    try:
        pub = base64.b64decode(pub_b64)
    except Exception:
        return False
    try:
        vk = VerifyKey(pub)
        sig = base64.b64decode(signature_b64)
        # Verify will raise on failure
        vk.verify(message_bytes, sig)
        return True
    except (BadSignatureError, Exception):
        return False