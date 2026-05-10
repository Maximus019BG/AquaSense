// Gateway: receives LoRa messages and forwards them to an HTTP server
#include <Arduino.h>
#include "gateway_lora.h"
#include "http_sender.h"
#include "protocol.h"

// Configure WiFi and server here or override via build system
static HttpConfig httpCfg = {
    .ssid = "YOUR_SSID",
    .password = "YOUR_PASS",
    .serverUrl = "http://example.com/api/data",
    .apiKey = nullptr
};

GatewayLoRa gateway(LORA_FREQUENCY);
HttpSender sender(httpCfg);

void onLoRaReceive(const uint8_t* data, int len) {
    // null-terminate safely
    static char buf[512];
    int n = (len < (int)sizeof(buf)-1) ? len : ((int)sizeof(buf)-1);
    memcpy(buf, data, n);
    buf[n] = '\0';

    Shared::SensorPayload p;
    if (Shared::parsePayload(buf, p)) {
        Serial.printf("Received payload: %s\n", buf);
        bool ok = sender.sendPayload(p);
        Serial.printf("Forwarded to server: %s\n", ok?"OK":"FAIL");
    } else {
        Serial.printf("Invalid payload: %s\n", buf);
    }
}

void setup() {
    Serial.begin(115200);
    delay(100);
    Serial.println("Gateway starting...");

    if (!gateway.begin()) {
        Serial.println("LoRa init failed");
        while (1) delay(1000);
    }
    gateway.onReceive(onLoRaReceive);

    if (!sender.begin()) {
        Serial.println("WiFi connect failed - gateway will retry per send attempts");
    } else {
        Serial.println("WiFi connected");
    }
}

void loop() {
    gateway.loop();
    delay(10);
}
