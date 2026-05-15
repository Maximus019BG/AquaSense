// Sensor device: reads water quality sensor and transmits via LoRa
#include <Arduino.h>
#include <Wire.h>
#include <math.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <stdarg.h>
#include "sensor.h"
#include "lora_module.h"
#include "protocol.h"
#include "../lib/ed25519/ed25519_wrapper.h"

#ifndef DEVICE_ID
#define DEVICE_ID "sensor-01"
#endif
#include <string.h>

// Ensure DEVICE_ID is available as a string literal even when the build
// system provides it without quotes (e.g. -D DEVICE_ID=client-01).
#define _STRINGIFY(x) #x
#define STRINGIFY(x) _STRINGIFY(x)
#ifndef DEVICE_ID_STR
#define DEVICE_ID_STR STRINGIFY(DEVICE_ID)
#endif
#include <stdint.h>
#include <SPI.h>

// ADXL345 transport/address/pins are detected at runtime.
uint8_t adxlAddr = 0;
bool adxlSpi = false;
uint8_t adxlCsPin = 0;
uint8_t adxlSdaPin = 0;
uint8_t adxlSclPin = 0;
uint8_t adxlSckPin = 0;
uint8_t adxlMisoPin = 0;
uint8_t adxlMosiPin = 0;
#define BH1750_ADDR 0x23

#define RELAY_MAX_HOPS 3
#define RELAY_CACHE_SIZE 16

static uint32_t relayCache[RELAY_CACHE_SIZE];
static size_t relayCacheIdx = 0;

static uint32_t seqCounter = 0;

static uint32_t fnv1a_hash(const uint8_t *data, size_t len)
{
    uint32_t h = 2166136261u;
    for (size_t i = 0; i < len; ++i)
    {
        h ^= (uint32_t)data[i];
        h *= 16777619u;
    }
    return h;
}

static bool relayCacheHas(uint32_t h)
{
    for (size_t i = 0; i < RELAY_CACHE_SIZE; ++i)
    {
        if (relayCache[i] == h)
            return true;
    }
    return false;
}

static void relayCacheAdd(uint32_t h)
{
    relayCache[relayCacheIdx] = h;
    relayCacheIdx = (relayCacheIdx + 1) % RELAY_CACHE_SIZE;
}

Sensor sensor(SENSOR_PIN);
#ifdef PH_SENSOR_PIN
Sensor phSensor(PH_SENSOR_PIN);
#endif
LoRaModule lora(LORA_FREQUENCY);
bool useLoRa = true;
bool adxlReady = false;
bool bh1750Ready = false;

TwoWire i2cBus(0);
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature oneWireTherm(&oneWire);
bool oneWireReady = false;

void logMessage(const char *level, const char *tag, const char *fmt, ...)
{
    char msg[192];
    va_list args;
    va_start(args, fmt);
    vsnprintf(msg, sizeof(msg), fmt, args);
    va_end(args);

    Serial.printf("[%8lu ms] %-5s %-8s %s\n", (unsigned long)millis(), level, tag, msg);
}

void logInfo(const char *tag, const char *fmt, ...)
{
    char msg[192];
    va_list args;
    va_start(args, fmt);
    vsnprintf(msg, sizeof(msg), fmt, args);
    va_end(args);
    logMessage("INFO", tag, "%s", msg);
}

void logWarn(const char *tag, const char *fmt, ...)
{
    char msg[192];
    va_list args;
    va_start(args, fmt);
    vsnprintf(msg, sizeof(msg), fmt, args);
    va_end(args);
    logMessage("WARN", tag, "%s", msg);
}

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

bool initAdxl345OnCurrentI2C()
{
    const uint8_t candidates[] = {0x53, 0x1D};
    for (size_t i = 0; i < sizeof(candidates); ++i)
    {
        uint8_t addr = candidates[i];
        uint8_t dev = 0;
        if (readBytes(i2cBus, addr, 0x00, &dev, 1) && dev == 0xE5 &&
            writeRegister(i2cBus, addr, 0x2D, 0x08) && writeRegister(i2cBus, addr, 0x31, 0x08))
        {
            adxlAddr = addr;
            adxlSpi = false;
            return true;
        }
    }
    return false;
}

// SPI helpers for ADXL345
bool writeRegisterSpi(uint8_t csPin, uint8_t reg, uint8_t value)
{
    SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE3));
    digitalWrite(csPin, LOW);
    SPI.transfer(reg & 0x7F); // write = bit7 clear
    SPI.transfer(value);
    digitalWrite(csPin, HIGH);
    SPI.endTransaction();
    return true;
}

bool readBytesSpi(uint8_t csPin, uint8_t reg, uint8_t *buffer, size_t length)
{
    SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE3));
    digitalWrite(csPin, LOW);
    uint8_t cmd = 0x80 | (length > 1 ? 0x40 : 0x00) | (reg & 0x3F);
    SPI.transfer(cmd);
    for (size_t i = 0; i < length; ++i)
        buffer[i] = SPI.transfer(0x00);
    digitalWrite(csPin, HIGH);
    SPI.endTransaction();
    return true;
}

bool initAdxlSpi(uint8_t sck, uint8_t miso, uint8_t mosi, uint8_t csPin)
{
    pinMode(csPin, OUTPUT);
    digitalWrite(csPin, HIGH);
    SPI.begin(sck, miso, mosi, csPin);
    // Verify ADXL345 identity first
    uint8_t devid = 0;
    if (!readBytesSpi(csPin, 0x00, &devid, 1))
        return false;
    if (devid != 0xE5)
    {
        logWarn("ADXL345", "SPI device ID mismatch: 0x%02X", (unsigned)devid);
        return false;
    }

    // Put device in measurement mode
    if (!writeRegisterSpi(csPin, 0x2D, 0x08))
        return false;
    if (!writeRegisterSpi(csPin, 0x31, 0x08))
        return false;
    adxlSpi = true;
    adxlCsPin = csPin;
    adxlSckPin = sck;
    adxlMisoPin = miso;
    adxlMosiPin = mosi;
    return true;
}

bool readAdxl345(int16_t &x, int16_t &y, int16_t &z)
{
    uint8_t raw[6];
    if (adxlSpi)
    {
        SPI.begin(adxlSckPin, adxlMisoPin, adxlMosiPin, adxlCsPin);
        if (!readBytesSpi(adxlCsPin, 0x32, raw, sizeof(raw)))
            return false;
    }
    else
    {
        if (adxlAddr == 0)
            return false;
        i2cBus.end();
        i2cBus.begin(adxlSdaPin, adxlSclPin);
        i2cBus.setClock(400000);
        if (!readBytes(i2cBus, adxlAddr, 0x32, raw, sizeof(raw)))
            return false;
    }

    x = (int16_t)((raw[1] << 8) | raw[0]);
    y = (int16_t)((raw[3] << 8) | raw[2]);
    z = (int16_t)((raw[5] << 8) | raw[4]);
    return true;
}

void i2cScan()
{
    logInfo("I2C", "scan started");
    for (uint8_t addr = 1; addr < 127; ++addr)
    {
        i2cBus.beginTransmission(addr);
        if (i2cBus.endTransmission() == 0)
        {
            logInfo("I2C", "device found at 0x%02X", (unsigned)addr);
            delay(10);
        }
    }
    logInfo("I2C", "scan completed");
}

bool tryAdxlOnPins(uint8_t sda, uint8_t scl)
{
    logInfo("ADXL345", "trying I2C SDA=%d SCL=%d", (int)sda, (int)scl);
    i2cBus.end();
    i2cBus.begin(sda, scl);
    i2cBus.setClock(400000);
    i2cScan();
    bool ok = initAdxl345OnCurrentI2C();
    if (ok)
    {
        adxlSdaPin = sda;
        adxlSclPin = scl;
        logInfo("ADXL345", "detected at 0x%02X on SDA=%d SCL=%d", (unsigned)adxlAddr, (int)sda, (int)scl);
        // Read DEVID (register 0x00) to confirm device identity
        uint8_t dev = 0;
        if (readBytes(i2cBus, adxlAddr, 0x00, &dev, 1))
        {
            logInfo("ADXL345", "device ID: 0x%02X", (unsigned)dev);
        }
    }
    else
    {
        logWarn("ADXL345", "not detected on SDA=%d SCL=%d", (int)sda, (int)scl);
    }
    return ok;
}

bool initBh1750()
{
    i2cBus.end();
    i2cBus.begin(BH1750_SDA_PIN, BH1750_SCL_PIN);
    i2cBus.setClock(400000);
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
    i2cBus.end();
    i2cBus.begin(BH1750_SDA_PIN, BH1750_SCL_PIN);
    i2cBus.setClock(400000);
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
    snprintf(p.id, sizeof(p.id), "%s", DEVICE_ID_STR);
    snprintf(p.metric, sizeof(p.metric), "%s", metric);
    p.value = value;
    p.ts = (uint32_t)(millis() / 1000);
    // assign a per-origin sequence number
    p.seq = ++seqCounter;
}

void logAndSend(const char *label, const char *metric, int32_t value, const char *unit)
{
    if (unit && unit[0] != '\0')
    {
        logInfo("DATA", "%s=%ld %s", label, (long)value, unit);
    }
    else
    {
        logInfo("DATA", "%s=%ld", label, (long)value);
    }

    if (!useLoRa)
        return;

    Shared::SensorPayload p;
    setPayload(p, metric, value);

    // First, serialize payload without signature to produce canonical bytes to sign
    p.sig[0] = '\0';
    char buf[256];
    size_t n = Shared::serializePayload(p, buf, sizeof(buf));
    if (n)
    {
        // Attempt to sign using ed25519 wrapper. PRIVATE_KEY_B64 can be provided at build time.
        char sigbuf[128];
        bool signed_ok = false;
#ifdef PRIVATE_KEY_B64
        if (ed25519_sign_base64(PRIVATE_KEY_B64, (const uint8_t *)buf, n, sigbuf, sizeof(sigbuf)))
        {
            // attach signature and reserialize
            strncpy(p.sig, sigbuf, sizeof(p.sig) - 1);
            p.sig[sizeof(p.sig) - 1] = '\0';
            size_t m = Shared::serializePayload(p, buf, sizeof(buf));
            if (m)
            {
                n = m;
                signed_ok = true;
            }
        }
#endif
        // If signing failed or not available, still send unsigned payload (for testing)
        bool ok = lora.send((const uint8_t *)buf, n);
        if (ok)
            logInfo("LORA", "tx ok: %s", buf);
        else
            logWarn("LORA", "tx failed: %s", buf);
        if (!signed_ok)
            logWarn("LORA", "payload sent without signature (signing not available)");
    }
}

void setup()
{
    Serial.begin(115200);
    delay(100);
    logInfo("SYS", "sensor device starting");

    sensor.begin();
#ifdef PH_SENSOR_PIN
    phSensor.begin();
#endif

    // Try confirmed ADXL345 wiring first, then light fallbacks.
    const uint8_t pinPairs[][2] = {
        {5, 18},
        {ADXL345_SDA_PIN, ADXL345_SCL_PIN},
        {16, 17},
        {21, 22},
    };

    for (size_t i = 0; i < sizeof(pinPairs) / 2; ++i)
    {
        uint8_t sda = pinPairs[i][0];
        uint8_t scl = pinPairs[i][1];
        if (tryAdxlOnPins(sda, scl))
        {
            adxlReady = true;
            break;
        }
    }

    // If I2C attempts fail, try a minimal SPI fallback set.
    if (!adxlReady)
    {
        const uint8_t spiBuses[][3] = {{18, 19, 23}};
        const uint8_t csCandidates[] = {5, 15};

        logWarn("ADXL345", "I2C not found; trying SPI combinations");
        for (size_t b = 0; b < sizeof(spiBuses) / 3 && !adxlReady; ++b)
        {
            uint8_t sck = spiBuses[b][0];
            uint8_t miso = spiBuses[b][1];
            uint8_t mosi = spiBuses[b][2];
            for (size_t c = 0; c < sizeof(csCandidates) && !adxlReady; ++c)
            {
                uint8_t cs = csCandidates[c];
                logInfo("ADXL345", "trying SPI SCK=%d MISO=%d MOSI=%d CS=%d", (int)sck, (int)miso, (int)mosi, (int)cs);
                if (initAdxlSpi(sck, miso, mosi, cs))
                {
                    adxlReady = true;
                    logInfo("ADXL345", "SPI ready SCK=%d MISO=%d MOSI=%d CS=%d", (int)sck, (int)miso, (int)mosi, (int)cs);
                }
            }
        }

        if (!adxlReady)
            logWarn("ADXL345", "initialization failed");
    }

    bh1750Ready = initBh1750();
    logMessage(bh1750Ready ? "INFO" : "WARN", "BH1750", bh1750Ready ? "ready" : "initialization failed");

    oneWireTherm.begin();
    uint8_t count = oneWireTherm.getDeviceCount();
    oneWireReady = (count > 0);
    logInfo("TEMP", "OneWire devices=%u", (unsigned)count);
    logInfo("TEMP", "temperature sensor ready");

    if (!lora.begin())
    {
        logWarn("LORA", "initialization failed; continuing without LoRa");
        useLoRa = false;
    }
    else
    {
        logInfo("LORA", "ready");

        // Register receive handler: parse payloads and act as a simple relay
        lora.onReceive([](const uint8_t *data, int len)
                       {
            // copy into buffer and null-terminate for parser
            char buf[256];
            int n = len;
            if (n > (int)sizeof(buf) - 1)
                n = (int)sizeof(buf) - 1;
            memcpy(buf, data, n);
            buf[n] = '\0';

            Shared::SensorPayload p;
            if (!Shared::parsePayload(buf, p))
            {
                logWarn("LORA", "rx invalid payload");
                return;
            }

            logInfo("LORA", "rx: %s", buf);

            // ignore packets originating from this device
            if (strncmp(p.id, DEVICE_ID_STR, sizeof(p.id)) == 0)
                return;

            // compute origin-based dedupe key (ignore fields that change during relay)
            char dedupeKey[128];
            int dklen = snprintf(dedupeKey, sizeof(dedupeKey), "%s|%lu", p.id, (unsigned long)p.seq);
            if (dklen < 0)
            {
                logWarn("LORA", "dedupe key build failed");
                return;
            }
            uint32_t h = fnv1a_hash((const uint8_t *)dedupeKey, (size_t)dklen);
            if (relayCacheHas(h))
            {
                logInfo("LORA", "rx duplicate, not relaying");
                return;
            }

            // only relay if hops < max
            if (p.hops >= RELAY_MAX_HOPS)
            {
                logInfo("LORA", "max hops reached (%u), not relaying", (unsigned)p.hops);
                return;
            }

            // increment hop count and resend
            p.hops++;
            char outbuf[256];
            size_t outn = Shared::serializePayload(p, outbuf, sizeof(outbuf));
            if (outn == 0)
            {
                logWarn("LORA", "failed to serialize for relay");
                return;
            }

            bool ok = lora.send((const uint8_t *)outbuf, outn);
            if (ok)
            {
                // store dedupe key hash so future copies of the same origin+payload are not re-relayed
                relayCacheAdd(h);
                logInfo("LORA", "relayed: %s", outbuf);
            }
            else
            {
                logWarn("LORA", "relay send failed");
            } });
    }

    logInfo("TURB", "fixed mapping enabled: raw 1800 => 100%% clear");
}

void loop()
{
    int val = sensor.readValue();

    float pct = (val / 1800.0f) * 100.0f;
    if (pct < 0.0f)
        pct = 0.0f;
    if (pct > 100.0f)
        pct = 100.0f;

    logInfo("TURB", "raw=%d -> %.1f%% clear", val, pct);
    logAndSend("Turbidity raw", "turb_raw", val, "raw");
    logAndSend("Turbidity clear", "turb_pct", (int32_t)lroundf(pct), "%");

#ifdef PH_SENSOR_PIN
    int phVal = phSensor.readValue();
    logInfo("PH", "raw=%d", phVal);
    logAndSend("pH raw", "ph_raw", phVal, "raw");
#endif

    if (adxlReady)
    {
        int16_t ax = 0;
        int16_t ay = 0;
        int16_t az = 0;
        if (readAdxl345(ax, ay, az))
        {
            logInfo("ADXL345", "x=%d y=%d z=%d", (int)ax, (int)ay, (int)az);
            logAndSend("ADXL345 X", "accel_x", ax, "raw");
            logAndSend("ADXL345 Y", "accel_y", ay, "raw");
            logAndSend("ADXL345 Z", "accel_z", az, "raw");
        }
        else
        {
            logWarn("ADXL345", "read failed");
        }
    }

    if (bh1750Ready)
    {
        float lux = 0.0f;
        if (readBh1750(lux))
        {
            int32_t luxInt = (int32_t)lroundf(lux);
            logInfo("BH1750", "lux=%.1f", lux);
            logAndSend("BH1750 lux", "lux", luxInt, "lx");
        }
        else
        {
            logWarn("BH1750", "read failed");
        }
    }

    // Try analog read (thermistor/LM35 style probe)
    int analogRaw = analogRead(TEMP_SENSOR_PIN);
    logInfo("TEMP", "analog pin %d raw=%d", TEMP_SENSOR_PIN, analogRaw);

    // Try OneWire (DS18B20 / waterproof probe)
    if (oneWireReady)
    {
        oneWireTherm.requestTemperatures();
        float owTemp = oneWireTherm.getTempCByIndex(0);
        logInfo("TEMP", "OneWire temp=%.2f C", owTemp);
        if (!isnan(owTemp) && owTemp > -55 && owTemp < 125)
        {
            int32_t tempCx10 = (int32_t)lroundf(owTemp * 10.0f);
            logAndSend("Temperature(1W)", "temp_c_x10", tempCx10, "x10C");
        }
    }

    delay(5000);
}
