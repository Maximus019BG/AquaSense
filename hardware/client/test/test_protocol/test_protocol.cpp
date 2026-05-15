#include <Arduino.h>
#include <unity.h>
#include "protocol.h"

void test_serialize_parse(void)
{
    Shared::SensorPayload p;
    strncpy(p.id, "client-01", sizeof(p.id));
    strncpy(p.metric, "turb_raw", sizeof(p.metric));
    p.value = 2048;
    p.seq = 1;
    p.hops = 0;
    p.ts = 1620000000;
    p.sig[0] = '\0';

    char buf[256];
    size_t n = Shared::serializePayload(p, buf, sizeof(buf));
    TEST_ASSERT(n > 0);

    Shared::SensorPayload q;
    bool ok = Shared::parsePayload(buf, q);
    TEST_ASSERT(ok);

    TEST_ASSERT_EQUAL_STRING(p.id, q.id);
    TEST_ASSERT_EQUAL_STRING(p.metric, q.metric);
    TEST_ASSERT_EQUAL(p.value, q.value);
    TEST_ASSERT_EQUAL(p.ts, q.ts);
}

void setup()
{
    delay(2000); // wait for serial
    UNITY_BEGIN();
    RUN_TEST(test_serialize_parse);
    UNITY_END();
}

void loop() {}
