// Sensor device: reads water quality sensor and transmits via LoRa
#include <Arduino.h>
#include <Wire.h>
#include <math.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "sensor.h"
#include "lora_module.h"
#include "protocol.h"

#define DEVICE_ID "sensor-01"
#define ADXL345_ADDR 0x53
#define BH1750_ADDR 0x23

#ifndef TEMP_SENSOR_TYPE
#define TEMP_SENSOR_TYPE DHT22
#endif

Sensor sensor(SENSOR_PIN);
LoRaModule lora(LORA_FREQUENCY);
bool useLoRa = true;
bool adxlReady = false;
bool bh1750Ready = false;

TwoWire i2cBus(0);
DHT tempSensor(TEMP_SENSOR_PIN, TEMP_SENSOR_TYPE);
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature oneWireTherm(&oneWire);
bool oneWireReady = false;

bool writeRegister(TwoWire &bus, uint8_t address, uint8_t reg, uint8_t value)
{
    bus.beginTransmission(address);
    bus.write(reg);
    bus.write(value);
    return bus.endTransmission() == 0;
}

bool readBytes(TwoWire &bus, uint8_t address, uint8_t reg, uint8_t *buffer, size_t length)
{
    bus.beginTransmission(address);
    bus.write(reg);
    if (bus.endTransmission(false) != 0)
        return false;

    if (bus.requestFrom(address, (uint8_t)length) != (int)length)
        return false;

    for (size_t i = 0; i < length; ++i)
    {
        buffer[i] = (uint8_t)bus.read();
    }
    return true;
}

bool initAdxl345()
{
    if (!writeRegister(i2cBus, ADXL345_ADDR, 0x2D, 0x08))
        return false;
    if (!writeRegister(i2cBus, ADXL345_ADDR, 0x31, 0x08))
        return false;
    return true;
}

bool readAdxl345(int16_t &x, int16_t &y, int16_t &z)
{
    uint8_t raw[6];
    if (!readBytes(i2cBus, ADXL345_ADDR, 0x32, raw, sizeof(raw)))
        return false;

    x = (int16_t)((raw[1] << 8) | raw[0]);
    y = (int16_t)((raw[3] << 8) | raw[2]);
    z = (int16_t)((raw[5] << 8) | raw[4]);
    return true;
}

bool initBh1750()
{
    i2cBus.beginTransmission(BH1750_ADDR);
    i2cBus.write(0x01);
    if (i2cBus.endTransmission() != 0)
        return false;

    i2cBus.beginTransmission(BH1750_ADDR);
    i2cBus.write(0x10);
    return i2cBus.endTransmission() == 0;
}

bool readBh1750(float &lux)
{
    i2cBus.beginTransmission(BH1750_ADDR);
    i2cBus.write(0x10);
    if (i2cBus.endTransmission() != 0)
        return false;

    delay(180);

    if (i2cBus.requestFrom((uint16_t)BH1750_ADDR, (uint8_t)2) != 2)
        return false;

    uint16_t raw = ((uint16_t)i2cBus.read() << 8) | (uint16_t)i2cBus.read();
    lux = raw / 1.2f;
    return true;
}

void setPayload(Shared::SensorPayload &p, const char *metric, int32_t value)
{
    memset(&p, 0, sizeof(p));
    snprintf(p.id, sizeof(p.id), "%s", DEVICE_ID);
    snprintf(p.metric, sizeof(p.metric), "%s", metric);
    p.value = value;
    p.ts = (uint32_t)(millis() / 1000);
}

void logAndSend(const char *label, const char *metric, int32_t value, const char *unit)
{
    if (unit && unit[0] != '\0')
    {
        Serial.printf("%s: %ld %s\n", label, (long)value, unit);
    }
    else
    {
        Serial.printf("%s: %ld\n", label, (long)value);
    }

    if (!useLoRa)
        return;

    Shared::SensorPayload p;
    setPayload(p, metric, value);

    char buf[256];
    size_t n = Shared::serializePayload(p, buf, sizeof(buf));
    if (n)
    {
        bool ok = lora.send((const uint8_t *)buf, n);
        Serial.printf("Sent %s -> %s\n", buf, ok ? "OK" : "FAIL");
    }
}

void setup()
{
    Serial.begin(115200);
    delay(100);
    Serial.println("Sensor device starting...");

    sensor.begin();

    i2cBus.begin(ADXL345_SDA_PIN, ADXL345_SCL_PIN);
    i2cBus.setClock(400000);
    adxlReady = initAdxl345();
    Serial.println(adxlReady ? "ADXL345 ready" : "ADXL345 init failed");

    bh1750Ready = initBh1750();
    Serial.println(bh1750Ready ? "BH1750 ready" : "BH1750 init failed");

    tempSensor.begin();
    oneWireTherm.begin();
    uint8_t count = oneWireTherm.getDeviceCount();
    oneWireReady = (count > 0);
    Serial.printf("OneWire devices=%u\n", (unsigned)count);
    Serial.println("Temperature sensor ready");

    if (!lora.begin())
    {
        Serial.println("LoRa init failed — continuing without LoRa");
        useLoRa = false;
    }
    else
    {
        Serial.println("LoRa ready");
    }

    Serial.println("Using fixed mapping: raw 1800 -> 100% clear");
}

void loop()
{
    int val = sensor.readValue();

    float pct = (val / 1800.0f) * 100.0f;
    if (pct < 0.0f)
        pct = 0.0f;
    if (pct > 100.0f)
        pct = 100.0f;

    Serial.printf("Turbidity raw=%d -> %.1f%% clear\n", val, pct);
    logAndSend("Turbidity raw", "turb_raw", val, "raw");
    logAndSend("Turbidity clear", "turb_pct_x10", (int32_t)lroundf(pct * 10.0f), "%");

    if (adxlReady)
    {
        int16_t ax = 0;
        int16_t ay = 0;
        int16_t az = 0;
        if (readAdxl345(ax, ay, az))
        {
            Serial.printf("ADXL345 x=%d y=%d z=%d\n", (int)ax, (int)ay, (int)az);
            logAndSend("ADXL345 X", "accel_x", ax, "raw");
            logAndSend("ADXL345 Y", "accel_y", ay, "raw");
            logAndSend("ADXL345 Z", "accel_z", az, "raw");
        }
        else
        {
            Serial.println("ADXL345 read failed");
        }
    }

    if (bh1750Ready)
    {
        float lux = 0.0f;
        if (readBh1750(lux))
        {
            int32_t luxInt = (int32_t)lroundf(lux);
            Serial.printf("BH1750 lux=%.1f\n", lux);
            logAndSend("BH1750 lux", "lux", luxInt, "lx");
        }
        else
        {
            Serial.println("BH1750 read failed");
        }
    }

    // Try analog read (thermistor/LM35 style probe)
    int analogRaw = analogRead(TEMP_SENSOR_PIN);
    Serial.printf("Analog read (pin %d) = %d\n", TEMP_SENSOR_PIN, analogRaw);

    // Try DHT read (if it was a DHT sensor)
    float tempC = tempSensor.readTemperature();
    Serial.printf("DHT raw read: tempC=%.2f (isnan=%d)\n", tempC, isnan(tempC));
    if (!isnan(tempC) && tempC > -40.0f && tempC < 80.0f)
    {
        int32_t tempCx10 = (int32_t)lroundf(tempC * 10.0f);
        Serial.printf("Temperature (DHT)=%.1f C\n", tempC);
        logAndSend("Temperature(DHT)", "temp_c_x10", tempCx10, "x10C");
    }
    else
    {
        Serial.printf("Temperature DHT read failed (raw=%.2f)\n", tempC);
    }

    // Try OneWire (DS18B20 / waterproof probe)
    if (oneWireReady)
    {
        oneWireTherm.requestTemperatures();
        float owTemp = oneWireTherm.getTempCByIndex(0);
        Serial.printf("OneWire temp=%.2f C\n", owTemp);
        if (!isnan(owTemp) && owTemp > -55 && owTemp < 125)
        {
            int32_t tempCx10 = (int32_t)lroundf(owTemp * 10.0f);
            logAndSend("Temperature(1W)", "temp_c_x10", tempCx10, "x10C");
        }
    }

    delay(5000);
}
