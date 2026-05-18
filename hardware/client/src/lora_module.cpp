#include "lora_module.h"

#ifdef LORA_USE_SERIAL2

#ifndef LORA_SERIAL_RX_PIN
#define LORA_SERIAL_RX_PIN 16
#endif

#ifndef LORA_SERIAL_TX_PIN
#define LORA_SERIAL_TX_PIN 17
#endif

#ifndef LORA_SERIAL_BAUD
#define LORA_SERIAL_BAUD 9600
#endif

#ifndef LORA_UART_RX_BUFFER_SIZE
#define LORA_UART_RX_BUFFER_SIZE 256
#endif

static uint8_t uartRxBuffer[LORA_UART_RX_BUFFER_SIZE];
static int uartRxLength = 0;

LoRaModule::LoRaModule(long frequency) : _freq(frequency), _rxCb(nullptr) {}

bool LoRaModule::begin()
{
    (void)_freq;

#ifdef LORA_M0_PIN
    pinMode(LORA_M0_PIN, OUTPUT);
    digitalWrite(LORA_M0_PIN, LOW);
#endif
#ifdef LORA_M1_PIN
    pinMode(LORA_M1_PIN, OUTPUT);
    digitalWrite(LORA_M1_PIN, LOW);
#endif
#ifdef LORA_AUX_PIN
    pinMode(LORA_AUX_PIN, INPUT);
#endif

    Serial2.begin(LORA_SERIAL_BAUD, SERIAL_8N1, LORA_SERIAL_RX_PIN, LORA_SERIAL_TX_PIN);
    delay(100);

    Serial.printf("[LORA] init Serial2 UART RX=%d TX=%d baud=%ld\n",
                  LORA_SERIAL_RX_PIN,
                  LORA_SERIAL_TX_PIN,
                  (long)LORA_SERIAL_BAUD);
    Serial.println("[LORA] Serial2 transparent UART mode ready");
    return true;
}

bool LoRaModule::send(const uint8_t *data, size_t len)
{
    size_t written = Serial2.write(data, len);
    Serial2.write('\n');
    Serial2.flush();
    return written == len;
}

void LoRaModule::onReceive(RxCallback cb)
{
    _rxCb = cb;
}

void LoRaModule::loop()
{
    while (Serial2.available())
    {
        int value = Serial2.read();
        if (value < 0)
            return;

        uint8_t byteValue = (uint8_t)value;
        if (byteValue == '\r')
            continue;

        if (byteValue == '\n')
        {
            if (uartRxLength > 0 && _rxCb)
                _rxCb(uartRxBuffer, uartRxLength);
            uartRxLength = 0;
            continue;
        }

        if (uartRxLength < (int)sizeof(uartRxBuffer))
        {
            uartRxBuffer[uartRxLength++] = byteValue;
        }
        else
        {
            if (_rxCb)
                _rxCb(uartRxBuffer, uartRxLength);
            uartRxLength = 0;
        }
    }
}

#else

#include <LoRa.h>
#include <SPI.h>

#ifndef LORA_SCK_PIN
#define LORA_SCK_PIN 23
#endif

#ifndef LORA_MISO_PIN
#define LORA_MISO_PIN 35
#endif

#ifndef LORA_MOSI_PIN
#define LORA_MOSI_PIN 15
#endif

#ifndef LORA_CS_PIN
#define LORA_CS_PIN 22
#endif

#ifndef LORA_RST_PIN
#define LORA_RST_PIN 21
#endif

#ifndef LORA_DIO0_PIN
#define LORA_DIO0_PIN 32
#endif

#ifndef LORA_SPI_FREQUENCY
#define LORA_SPI_FREQUENCY 1000000
#endif

#ifndef LORA_SIGNAL_BANDWIDTH
#define LORA_SIGNAL_BANDWIDTH 125000
#endif

#ifndef LORA_SPREADING_FACTOR
#define LORA_SPREADING_FACTOR 7
#endif

#ifndef LORA_CODING_RATE_DENOMINATOR
#define LORA_CODING_RATE_DENOMINATOR 5
#endif

#ifndef LORA_SYNC_WORD
#define LORA_SYNC_WORD 0x12
#endif

#ifndef LORA_PREAMBLE_LENGTH
#define LORA_PREAMBLE_LENGTH 8
#endif

#ifndef LORA_TX_POWER
#define LORA_TX_POWER 17
#endif

static void configureLoRaSpi()
{
    SPI.begin(LORA_SCK_PIN, LORA_MISO_PIN, LORA_MOSI_PIN, LORA_CS_PIN);
}

static uint8_t readLoRaRegister(uint8_t reg)
{
    configureLoRaSpi();
    SPI.beginTransaction(SPISettings(LORA_SPI_FREQUENCY, MSBFIRST, SPI_MODE0));
    digitalWrite(LORA_CS_PIN, LOW);
    SPI.transfer(reg & 0x7F);
    uint8_t value = SPI.transfer(0x00);
    digitalWrite(LORA_CS_PIN, HIGH);
    SPI.endTransaction();
    return value;
}

LoRaModule::LoRaModule(long frequency) : _freq(frequency), _rxCb(nullptr) {}

bool LoRaModule::begin()
{
    configureLoRaSpi();

    Serial.printf("[LORA] init SPI SCK=%d MISO=%d MOSI=%d CS=%d RST=%d DIO0=%d FREQ=%ld\n",
                  LORA_SCK_PIN,
                  LORA_MISO_PIN,
                  LORA_MOSI_PIN,
                  LORA_CS_PIN,
                  LORA_RST_PIN,
                  LORA_DIO0_PIN,
                  _freq);

    pinMode(LORA_CS_PIN, OUTPUT);
    digitalWrite(LORA_CS_PIN, HIGH);
    pinMode(LORA_RST_PIN, OUTPUT);
    digitalWrite(LORA_RST_PIN, HIGH);
    delay(10);
    digitalWrite(LORA_RST_PIN, LOW);
    delay(10);
    digitalWrite(LORA_RST_PIN, HIGH);
    delay(20);

    uint8_t version = readLoRaRegister(0x42);
    Serial.printf("[LORA] RegVersion 0x42 -> 0x%02X (expected 0x12 for SX127x)\n", version);
    if (version != 0x12)
    {
        Serial.println("[LORA] SPI probe did not see the radio. Check power, GND, CS/SCK/MISO/MOSI/RST wiring, and module voltage.");
    }

    LoRa.setPins(LORA_CS_PIN, LORA_RST_PIN, LORA_DIO0_PIN);
    LoRa.setSPIFrequency(LORA_SPI_FREQUENCY);
    if (!LoRa.begin(_freq))
    {
        Serial.println("[LORA] begin failed");
        return false;
    }

    LoRa.setSignalBandwidth(LORA_SIGNAL_BANDWIDTH);
    LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);
    LoRa.setCodingRate4(LORA_CODING_RATE_DENOMINATOR);
    LoRa.setSyncWord(LORA_SYNC_WORD);
    LoRa.setPreambleLength(LORA_PREAMBLE_LENGTH);
    LoRa.setTxPower(LORA_TX_POWER);

    Serial.printf("[LORA] begin ok: bw=%ld sf=%d cr=4/%d sync=0x%02X preamble=%d txPower=%d\n",
                  (long)LORA_SIGNAL_BANDWIDTH,
                  LORA_SPREADING_FACTOR,
                  LORA_CODING_RATE_DENOMINATOR,
                  LORA_SYNC_WORD,
                  LORA_PREAMBLE_LENGTH,
                  LORA_TX_POWER);
    LoRa.receive();
    return true;
}

bool LoRaModule::send(const uint8_t *data, size_t len)
{
    configureLoRaSpi();
    LoRa.beginPacket();
    LoRa.write(data, len);
    int res = LoRa.endPacket();
    LoRa.receive();
    return (res == 1);
}

void LoRaModule::onReceive(RxCallback cb)
{
    _rxCb = cb;
}

void LoRaModule::loop()
{
    configureLoRaSpi();
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

#endif
