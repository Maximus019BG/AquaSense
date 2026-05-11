// Sensor device: reads water quality sensor and transmits via LoRa
#include <Arduino.h>
#include "sensor.h"
#include "lora_module.h"
#include "protocol.h"

#define DEVICE_ID "sensor-01"

Sensor sensor(SENSOR_PIN);
LoRaModule lora(LORA_FREQUENCY);
bool useLoRa = true;

void setup()
{
    Serial.begin(115200);
    delay(100);
    Serial.println("Sensor device starting...");

    sensor.begin();
    if (!lora.begin())
    {
        Serial.println("LoRa init failed — continuing without LoRa");
        useLoRa = false;
    }
    else
    {
        Serial.println("LoRa ready");
    }

    Serial.println("Using fixed mapping: raw 1800 -> 100% clear");
}

void loop()
{
    int val = sensor.readValue();

    if (useLoRa)
    {
        Shared::SensorPayload p;
        strncpy(p.id, DEVICE_ID, sizeof(p.id));
        p.value = val;
        p.ts = (uint32_t)(millis() / 1000);

        char buf[256];
        size_t n = Shared::serializePayload(p, buf, sizeof(buf));
        if (n)
        {
            bool ok = lora.send((const uint8_t *)buf, n);
            Serial.printf("Sent %s -> %s\n", buf, ok ? "OK" : "FAIL");
        }
    }
    else
    {
        // No LoRa available: map raw readings so that 1800 => 100% clear
        float pct = (val / 1800.0f) * 100.0f;
        if (pct < 0.0f)
            pct = 0.0f;
        if (pct > 100.0f)
            pct = 100.0f;
        Serial.printf("Turbidity raw=%d -> %.1f%% clear\n", val, pct);
    }

    delay(5000);
}
