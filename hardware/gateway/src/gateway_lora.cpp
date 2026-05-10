#include "gateway_lora.h"

// On Raspberry Pi this is a placeholder; LoRa is handled by sensor microcontroller
// which forwards payloads over serial to this gateway. The implementation here
// intentionally does nothing and exists for API parity.

GatewayLoRa::GatewayLoRa(long freq) {}

bool GatewayLoRa::begin() { return false; }
