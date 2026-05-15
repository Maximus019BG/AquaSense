#include <Arduino.h>
#include <unity.h>
#include "ed25519_wrapper.h"

void test_ed25519_sign_available_or_not(void)
{
    const char *priv_b64 = nullptr;
#ifdef PRIVATE_KEY_B64
    priv_b64 = PRIVATE_KEY_B64;
#endif

    const uint8_t msg[] = "hello";
    char out_b64[128];
    int r = ed25519_sign_base64(priv_b64, msg, sizeof(msg) - 1, out_b64, sizeof(out_b64));

#ifdef USE_SODIUM
    // If sodium is enabled and a private key is provided, signing should succeed (return 1)
    if (priv_b64)
    {
        TEST_ASSERT_EQUAL_INT(1, r);
    }
    else
    {
        // no priv key provided at compile time, expect failure
        TEST_ASSERT_EQUAL_INT(0, r);
    }
#else
    // libsodium not enabled: the wrapper returns 0
    TEST_ASSERT_EQUAL_INT(0, r);
#endif
}

void setup()
{
    delay(2000);
    UNITY_BEGIN();
    RUN_TEST(test_ed25519_sign_available_or_not);
    UNITY_END();
}

void loop() {}
