#pragma once
#include <Arduino.h>

// Gateway LoRa placeholder for compatibility; on Raspberry Pi LoRa is handled
// by a microcontroller that forwards messages over serial. This header keeps
// parity with embedded gateway implementations.

class GatewayLoRa {
public:
    GatewayLoRa(long freq) {}
    bool begin() { return false; }
};
