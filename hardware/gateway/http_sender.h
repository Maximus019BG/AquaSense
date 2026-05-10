#pragma once
#include <Arduino.h>
#include "protocol.h"

struct HttpConfig {
    const char* ssid;
    const char* password;
    const char* serverUrl; // full URL e.g. https://example.com/data
    const char* apiKey; // optional, pass nullptr if none
};

class HttpSender {
public:
    HttpSender(const HttpConfig &cfg);
    bool begin();
    // send payload (raw received LoRa text) to server
    bool sendPayload(const Shared::SensorPayload &p);
private:
    HttpConfig _cfg;
};
