#include "http_sender.h"
#include <WiFi.h>
#include <HTTPClient.h>

HttpSender::HttpSender(const HttpConfig &cfg) : _cfg(cfg) {}

bool HttpSender::begin() {
    if (!_cfg.ssid || !_cfg.password) return false;
    WiFi.begin(_cfg.ssid, _cfg.password);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
        delay(200);
    }
    return WiFi.status() == WL_CONNECTED;
}

bool HttpSender::sendPayload(const Shared::SensorPayload &p) {
    if (WiFi.status() != WL_CONNECTED) return false;
    HTTPClient http;
    http.begin(_cfg.serverUrl);
    if (_cfg.apiKey) {
        http.addHeader("x-api-key", _cfg.apiKey);
    }
    http.addHeader("Content-Type", "application/json");

    char body[256];
    Shared::serializePayload(p, body, sizeof(body));
    int code = http.POST((const uint8_t*)body, strlen(body));
    http.end();
    return (code >= 200 && code < 300);
}
