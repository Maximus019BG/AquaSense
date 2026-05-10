#include "gateway_lora.h"
#include <LoRa.h>

GatewayLoRa::GatewayLoRa(long frequency): _freq(frequency), _rxCb(nullptr) {}

bool GatewayLoRa::begin() {
    SPI.begin();
    if (!LoRa.begin(_freq)) return false;
    LoRa.receive();
    return true;
}

void GatewayLoRa::onReceive(RxCallback cb) {
    _rxCb = cb;
}

void GatewayLoRa::loop() {
    int packetSize = LoRa.parsePacket();
    if (packetSize) {
        static uint8_t buf[512];
        int idx = 0;
        while (LoRa.available() && idx < (int)sizeof(buf)) {
            buf[idx++] = (uint8_t)LoRa.read();
        }
        if (_rxCb) _rxCb(buf, idx);
    }
}
