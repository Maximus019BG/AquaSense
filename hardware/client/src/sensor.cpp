#include "sensor.h"

Sensor::Sensor(int pin) : _pin(pin) {}

void Sensor::begin() {
    // If using analog pin, ensure ADC is configured (ESP32 does this in core)
    pinMode(_pin, INPUT);
}

int Sensor::readValue() {
    // Use analogRead for higher resolution. On ESP32 this returns 0-4095.
    int v = analogRead(_pin);
    return v;
}
