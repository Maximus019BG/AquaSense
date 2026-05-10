#pragma once
#include <Arduino.h>

class Sensor
{
public:
    explicit Sensor(int pin);
    void begin();
    // Read and return calibrated sensor value (integer)
    int readValue();

private:
    int _pin;
};
