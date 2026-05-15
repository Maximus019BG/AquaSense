#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C"
{
#endif

    // Sign `msg` of length `msglen` using base64-encoded Ed25519 private key `privkey_b64`.
    // On success writes a base64-encoded signature into `out_b64` (null-terminated) and returns true.
    // `out_b64_len` is the capacity of out_b64.
    // If libsodium is not available at compile time, this function returns false.
    int ed25519_sign_base64(const char *privkey_b64, const uint8_t *msg, size_t msglen, char *out_b64, size_t out_b64_len);

#ifdef __cplusplus
}
#endif
