#pragma once
#include <Arduino.h>
#include <functional>

using RxCallback = std::function<void(const uint8_t *data, int len)>;

class LoRaModule
{
public:
    LoRaModule(long frequency);
    bool begin();
    // send raw buffer
    bool send(const uint8_t *data, size_t len);
    // set receive callback
    void onReceive(RxCallback cb);
    void loop();

private:
    long _freq;
    RxCallback _rxCb;
};
