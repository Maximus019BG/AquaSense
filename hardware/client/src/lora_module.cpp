#include "lora_module.h"
#include <LoRa.h>
#include <SPI.h>

LoRaModule::LoRaModule(long frequency) : _freq(frequency), _rxCb(nullptr) {}

bool LoRaModule::begin()
{
    // SPI pins: SCK=23, MISO=35, MOSI=15
    SPI.begin(23, 35, 15);

    // Candidate control pins to try (CS). Reset and DIO0 fixed for now.
    const int candidateCsPins[] = {22, 5, 15, 18, 21, 0, 2, 4};
    const size_t csCount = sizeof(candidateCsPins) / sizeof(candidateCsPins[0]);
    const int resetPin = 21;
    const int dio0Pin = 32;
    const uint8_t regVersion = 0x42;

    Serial.printf("[LORA] init SPI SCK=%d MISO=%d MOSI=%d reset=%d dio0=%d\n", 23, 35, 15, resetPin, dio0Pin);

    // Quick MISO pin health check
    pinMode(35, INPUT_PULLUP);
    int miso_state = digitalRead(35);
    Serial.printf("[LORA] MISO pin %d digitalRead=%d\n", 35, miso_state);

    pinMode(resetPin, OUTPUT);
    digitalWrite(resetPin, HIGH);

    for (size_t i = 0; i < csCount; ++i)
    {
        int cs = candidateCsPins[i];
        pinMode(cs, OUTPUT);
        digitalWrite(cs, HIGH); // deselect

        // Manual reset pulse before probing
        digitalWrite(resetPin, LOW);
        delay(10);
        digitalWrite(resetPin, HIGH);
        delay(10);

        Serial.printf("[LORA] probing CS=%d\n", cs);

        uint8_t v_as_is = 0, v_mask7 = 0, v_or80 = 0;

        SPI.beginTransaction(SPISettings(8000000, MSBFIRST, SPI_MODE0));
        digitalWrite(cs, LOW);
        SPI.transfer(regVersion);
        v_as_is = SPI.transfer(0x00);
        digitalWrite(cs, HIGH);
        SPI.endTransaction();

        delay(5);

        SPI.beginTransaction(SPISettings(8000000, MSBFIRST, SPI_MODE0));
        digitalWrite(cs, LOW);
        SPI.transfer(regVersion & 0x7F);
        v_mask7 = SPI.transfer(0x00);
        digitalWrite(cs, HIGH);
        SPI.endTransaction();

        delay(5);

        SPI.beginTransaction(SPISettings(8000000, MSBFIRST, SPI_MODE0));
        digitalWrite(cs, LOW);
        SPI.transfer(regVersion | 0x80);
        v_or80 = SPI.transfer(0x00);
        digitalWrite(cs, HIGH);
        SPI.endTransaction();

        Serial.printf("[LORA] probe CS=%d -> as-is=0x%02X mask7=0x%02X or80=0x%02X\n", cs, v_as_is, v_mask7, v_or80);

        // If any probe returned non-zero, try initializing LoRa with this CS
        if (v_as_is != 0 || v_mask7 != 0 || v_or80 != 0)
        {
            Serial.printf("[LORA] attempting LoRa.begin() with CS=%d\n", cs);
            LoRa.setPins(cs, resetPin, dio0Pin);
            if (LoRa.begin(_freq))
            {
                Serial.printf("[LORA] begin ok with CS=%d\n", cs);
                LoRa.receive();
                return true;
            }
            else
            {
                Serial.printf("[LORA] begin failed with CS=%d\n", cs);
            }
        }
    }

    // No candidate CS produced a response — try default pins anyway and return failure
    LoRa.setPins(candidateCsPins[0], resetPin, dio0Pin);
    if (!LoRa.begin(_freq))
    {
        Serial.println("[LORA] begin failed");
        return false;
    }
    Serial.println("[LORA] begin ok");
    LoRa.receive();
    return true;
}

bool LoRaModule::send(const uint8_t *data, size_t len)
{
    LoRa.beginPacket();
    LoRa.write(data, len);
    int res = LoRa.endPacket();
    // Return to receive mode after transmitting
    LoRa.receive();
    return (res == 1);
}

void LoRaModule::onReceive(RxCallback cb)
{
    _rxCb = cb;
}

void LoRaModule::loop()
{
    int packetSize = LoRa.parsePacket();
    if (packetSize)
    {
        static uint8_t buf[256];
        int idx = 0;
        while (LoRa.available() && idx < (int)sizeof(buf))
        {
            buf[idx++] = (uint8_t)LoRa.read();
        }
        if (_rxCb)
            _rxCb(buf, idx);
    }
}
