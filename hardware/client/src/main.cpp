// Sensor device: reads water quality sensor and transmits via LoRa
#include <Arduino.h>
#include "sensor.h"
#include "lora_module.h"
#include "protocol.h"

#define DEVICE_ID "sensor-01"

Sensor sensor(SENSOR_PIN);
LoRaModule lora(LORA_FREQUENCY);

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("Sensor device starting...");

  sensor.begin();
  if (!lora.begin()) {
    Serial.println("LoRa init failed");
    while (1) delay(1000);
  }
  Serial.println("LoRa ready");
}

void loop() {
  int val = sensor.readValue();

  Shared::SensorPayload p;
  strncpy(p.id, DEVICE_ID, sizeof(p.id));
  p.value = val;
  p.ts = (uint32_t)(millis() / 1000);

  char buf[256];
  size_t n = Shared::serializePayload(p, buf, sizeof(buf));
  if (n) {
    bool ok = lora.send((const uint8_t*)buf, n);
    Serial.printf("Sent %s -> %s\n", buf, ok?"OK":"FAIL");
  }

  delay(5000);
}
