#pragma once
#include <Arduino.h>
#include <functional>
using RxCallback = std::function<void(const uint8_t* data, int len)>;

class GatewayLoRa {
public:
    GatewayLoRa(long frequency);
    bool begin();
    void onReceive(RxCallback cb);
    void loop();
private:
    long _freq;
    RxCallback _rxCb;
};
