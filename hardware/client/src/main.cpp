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

bool pinConflictsWithLoRa(uint8_t pin)
{
#ifdef LORA_SCK_PIN
    if (pin == LORA_SCK_PIN)
        return true;
#endif
#ifdef LORA_MISO_PIN
    if (pin == LORA_MISO_PIN)
        return true;
#endif
#ifdef LORA_MOSI_PIN
    if (pin == LORA_MOSI_PIN)
        return true;
#endif
#ifdef LORA_CS_PIN
    if (pin == LORA_CS_PIN)
        return true;
#endif
#ifdef LORA_RST_PIN
    if (pin == LORA_RST_PIN)
        return true;
#endif
#ifdef LORA_DIO0_PIN
    if (pin == LORA_DIO0_PIN)
        return true;
#endif
#ifdef LORA_SERIAL_RX_PIN
    if (pin == LORA_SERIAL_RX_PIN)
        return true;
#endif
#ifdef LORA_SERIAL_TX_PIN
    if (pin == LORA_SERIAL_TX_PIN)
        return true;
#endif
#ifdef LORA_M0_PIN
    if (pin == LORA_M0_PIN)
        return true;
#endif
#ifdef LORA_M1_PIN
    if (pin == LORA_M1_PIN)
        return true;
#endif
#ifdef LORA_AUX_PIN
    if (pin == LORA_AUX_PIN)
        return true;
#endif
    return false;
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

struct SensorSnapshot
{
    int turbRaw;
    int32_t turbidityPct;
    bool hasPh;
    int phRaw;
    bool hasAccel;
    int16_t accelX;
    int16_t accelY;
    int16_t accelZ;
    bool hasLux;
    int32_t lux;
    int tempRaw;
    bool hasTempC;
    int32_t tempCx10;
    float tempC;
};

bool appendJson(char *buf, size_t bufsize, int &offset, const char *fmt, ...)
{
    if (offset < 0 || (size_t)offset >= bufsize)
        return false;

    va_list args;
    va_start(args, fmt);
    int written = vsnprintf(buf + offset, bufsize - (size_t)offset, fmt, args);
    va_end(args);

    if (written < 0 || (size_t)written >= bufsize - (size_t)offset)
        return false;

    offset += written;
    return true;
}

bool buildSnapshotJson(const SensorSnapshot &snapshot, char *buf, size_t bufsize)
{
    int offset = 0;
    uint32_t seq = ++seqCounter;
    uint32_t ts = (uint32_t)(millis() / 1000);

    if (!appendJson(buf, bufsize, offset,
                    "{\"id\":\"%s\",\"type\":\"snapshot\",\"seq\":%lu,\"hops\":0,\"ts\":%lu,\"turb_raw\":%d,\"turbidity\":%ld,\"temp_raw\":%d",
                    DEVICE_ID_STR,
                    (unsigned long)seq,
                    (unsigned long)ts,
                    snapshot.turbRaw,
                    (long)snapshot.turbidityPct,
                    snapshot.tempRaw))
        return false;

    if (snapshot.hasPh && !appendJson(buf, bufsize, offset, ",\"ph_raw\":%d", snapshot.phRaw))
        return false;

    if (snapshot.hasTempC && !appendJson(buf, bufsize, offset, ",\"temp_c_x10\":%ld", (long)snapshot.tempCx10))
        return false;

    if (snapshot.hasTempC && !appendJson(buf, bufsize, offset, ",\"temperature\":%.1f", (double)snapshot.tempC))
        return false;

    if (snapshot.hasLux && !appendJson(buf, bufsize, offset, ",\"lux\":%ld", (long)snapshot.lux))
        return false;

    if (snapshot.hasAccel &&
        !appendJson(buf, bufsize, offset, ",\"accel_x\":%d,\"accel_y\":%d,\"accel_z\":%d",
                    (int)snapshot.accelX,
                    (int)snapshot.accelY,
                    (int)snapshot.accelZ))
        return false;

    return appendJson(buf, bufsize, offset, "}");
}

void logData(const char *label, int32_t value, const char *unit)
{
    if (unit && unit[0] != '\0')
    {
        logInfo("DATA", "%s=%ld %s", label, (long)value, unit);
    }
    else
    {
        logInfo("DATA", "%s=%ld", label, (long)value);
    }
}

void sendSnapshot(const SensorSnapshot &snapshot)
{
    if (!useLoRa)
        return;

    char buf[384];
    if (!buildSnapshotJson(snapshot, buf, sizeof(buf)))
    {
        logWarn("LORA", "snapshot payload too large");
        return;
    }

    size_t n = strlen(buf);
    bool ok = lora.send((const uint8_t *)buf, n);
    if (ok)
        logInfo("LORA", "snapshot tx ok: %s", buf);
    else
        logWarn("LORA", "snapshot tx failed: %s", buf);
}

void serviceLoRaDuringDelay(uint32_t durationMs)
{
    const uint32_t startedAt = millis();
    while ((uint32_t)(millis() - startedAt) < durationMs)
    {
        if (useLoRa)
            lora.loop();
        delay(10);
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

#ifndef DIAGNOSTIC_BUILD
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
        if (pinConflictsWithLoRa(sda) || pinConflictsWithLoRa(scl))
        {
            logWarn("ADXL345", "skipping I2C SDA=%d SCL=%d because it conflicts with LoRa pins", (int)sda, (int)scl);
            continue;
        }
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

    if (pinConflictsWithLoRa(BH1750_SDA_PIN) || pinConflictsWithLoRa(BH1750_SCL_PIN))
    {
        bh1750Ready = false;
        logWarn("BH1750", "skipping I2C SDA=%d SCL=%d because it conflicts with LoRa pins", (int)BH1750_SDA_PIN, (int)BH1750_SCL_PIN);
    }
    else
    {
        bh1750Ready = initBh1750();
        logMessage(bh1750Ready ? "INFO" : "WARN", "BH1750", bh1750Ready ? "ready" : "initialization failed");
    }
#else
    logWarn("SYS", "DIAGNOSTIC_BUILD enabled: skipping ADXL345 and BH1750 probes");
    bh1750Ready = false;
#endif

    pinMode(TEMP_SENSOR_PIN, INPUT_PULLUP);
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
    if (useLoRa)
        lora.loop();

    SensorSnapshot snapshot = {};

    int val = sensor.readValue();
    snapshot.turbRaw = val;

    float pct = (val / 1800.0f) * 100.0f;
    if (pct < 0.0f)
        pct = 0.0f;
    if (pct > 100.0f)
        pct = 100.0f;
    snapshot.turbidityPct = (int32_t)lroundf(pct);

    logInfo("TURB", "raw=%d -> %.1f%% clear", val, pct);
    logData("Turbidity raw", val, "raw");
    logData("Turbidity clear", snapshot.turbidityPct, "%");

#ifdef PH_SENSOR_PIN
    int phVal = phSensor.readValue();
    snapshot.hasPh = true;
    snapshot.phRaw = phVal;
    logInfo("PH", "raw=%d", phVal);
    logData("pH raw", phVal, "raw");
#endif

#ifndef DIAGNOSTIC_BUILD
    if (adxlReady)
    {
        int16_t ax = 0;
        int16_t ay = 0;
        int16_t az = 0;
        if (readAdxl345(ax, ay, az))
        {
            snapshot.hasAccel = true;
            snapshot.accelX = ax;
            snapshot.accelY = ay;
            snapshot.accelZ = az;
            logInfo("ADXL345", "x=%d y=%d z=%d", (int)ax, (int)ay, (int)az);
            logData("ADXL345 X", ax, "raw");
            logData("ADXL345 Y", ay, "raw");
            logData("ADXL345 Z", az, "raw");
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
            snapshot.hasLux = true;
            snapshot.lux = luxInt;
            logInfo("BH1750", "lux=%.1f", lux);
            logData("BH1750 lux", luxInt, "lx");
        }
        else
        {
            logWarn("BH1750", "read failed");
        }
    }
#else
    logInfo("SYS", "DIAGNOSTIC_BUILD: skipping ADXL345 and BH1750 sensor reads");
#endif

    // GPIO 4 is used as a digital OneWire bus for the temperature probe.
    snapshot.tempRaw = -1;
    logInfo("TEMP", "digital OneWire pin %d", TEMP_SENSOR_PIN);

    // Try OneWire (DS18B20 / waterproof probe)
    if (oneWireReady)
    {
        oneWireTherm.requestTemperatures();
        float owTemp = oneWireTherm.getTempCByIndex(0);
        logInfo("TEMP", "OneWire temp=%.2f C", owTemp);
        if (!isnan(owTemp) && owTemp > -55 && owTemp < 125)
        {
            int32_t tempCx10 = (int32_t)lroundf(owTemp * 10.0f);
            snapshot.hasTempC = true;
            snapshot.tempCx10 = tempCx10;
            snapshot.tempC = owTemp;
            logData("Temperature(1W)", tempCx10, "x10C");
        }
    }

    sendSnapshot(snapshot);
    serviceLoRaDuringDelay(5000);
}
