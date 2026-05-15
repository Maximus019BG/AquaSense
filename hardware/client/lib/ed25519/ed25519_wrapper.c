#include "ed25519_wrapper.h"
#include <string.h>

#ifdef USE_SODIUM
#include <sodium.h>
#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>

int ed25519_sign_base64(const char *privkey_b64, const uint8_t *msg, size_t msglen, char *out_b64, size_t out_b64_len)
{
    if (!privkey_b64 || !msg || !out_b64)
        return 0;
    if (sodium_init() < 0)
        return 0;

    // decode private key from base64
    size_t privbin_len = crypto_sign_SECRETKEYBYTES;
    unsigned char *privbin = malloc(privbin_len);
    if (!privbin)
        return 0;
    if (sodium_base642bin(privbin, privbin_len, privkey_b64, strlen(privkey_b64), NULL, &privbin_len, NULL, sodium_base64_VARIANT_ORIGINAL) != 0)
    {
        free(privbin);
        return 0;
    }

    unsigned char sig[crypto_sign_BYTES];
    unsigned long long siglen = 0;
    if (crypto_sign_detached(sig, &siglen, msg, msglen, privbin) != 0)
    {
        free(privbin);
        return 0;
    }
    // base64 encode signature
    size_t needed = sodium_base64_ENCODED_LEN(siglen, sodium_base64_VARIANT_ORIGINAL);
    if (needed > out_b64_len)
    {
        free(privbin);
        return 0;
    }
    sodium_bin2base64(out_b64, out_b64_len, sig, siglen, sodium_base64_VARIANT_ORIGINAL);
    free(privbin);
    return 1;
}

#else
int ed25519_sign_base64(const char *privkey_b64, const uint8_t *msg, size_t msglen, char *out_b64, size_t out_b64_len)
{
    // Signing not available; user should enable libsodium or provide an ed25519 implementation.
    (void)privkey_b64; (void)msg; (void)msglen; (void)out_b64; (void)out_b64_len;
    return 0;
}
#endif
