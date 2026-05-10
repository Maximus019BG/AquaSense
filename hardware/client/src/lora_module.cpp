#include "lora_module.h"
#include <LoRa.h>

LoRaModule::LoRaModule(long frequency) : _freq(frequency), _rxCb(nullptr) {}

bool LoRaModule::begin() {
    SPI.begin();
    if (!LoRa.begin(_freq)) {
        return false;
    }
    LoRa.receive();
    return true;
}

bool LoRaModule::send(const uint8_t* data, size_t len) {
    LoRa.beginPacket();
    LoRa.write(data, len);
    int res = LoRa.endPacket();
    return (res == 1);
}

void LoRaModule::onReceive(RxCallback cb) {
    _rxCb = cb;
}

void LoRaModule::loop() {
    int packetSize = LoRa.parsePacket();
    if (packetSize) {
        static uint8_t buf[256];
        int idx = 0;
        while (LoRa.available() && idx < (int)sizeof(buf)) {
            buf[idx++] = (uint8_t)LoRa.read();
        }
        if (_rxCb) _rxCb(buf, idx);
    }
}
