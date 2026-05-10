#include <iostream>
#include <cstdlib>
#include "serial_reader.h"
#include "http_sender.h"
#include "protocol.h"

int main(int argc, char **argv)
{
    std::string device = "/dev/ttyUSB0";
    std::string server = "http://localhost:8000/api/data";
    std::string apikey;

    if (argc > 1)
        device = argv[1];
    if (argc > 2)
        server = argv[2];
    if (argc > 3)
        apikey = argv[3];

    SerialReader reader(device, 9600);
    if (!reader.begin())
        return 1;

    HttpSender sender(server, apikey);

    std::cout << "Gateway listening on " << device << ", forwarding to " << server << "\n";

    reader.run([&](const std::string &line)
               {
        Shared::SensorPayload p;
        if (Shared::parsePayload(line.c_str(), p)) {
            std::cout << "Received: " << line << "\n";
            bool ok = sender.send(p);
            std::cout << "Forward result: " << (ok?"OK":"FAIL") << "\n";
        } else {
            std::cerr << "Invalid payload: " << line << "\n";
        } });

    return 0;
}
// Gateway: receives LoRa messages and forwards them to an HTTP server
#include <Arduino.h>
#include "gateway_lora.h"
#include "http_sender.h"
#include "protocol.h"

// Configure WiFi and server here or override via build system
static HttpConfig httpCfg = {
    .ssid = "YOUR_SSID",
    .password = "YOUR_PASS",
    .serverUrl = "http://example.com/api/data",
    .apiKey = nullptr};

GatewayLoRa gateway(LORA_FREQUENCY);
HttpSender sender(httpCfg);

void onLoRaReceive(const uint8_t *data, int len)
{
    // null-terminate safely
    static char buf[512];
    int n = (len < (int)sizeof(buf) - 1) ? len : ((int)sizeof(buf) - 1);
    memcpy(buf, data, n);
    buf[n] = '\0';

    Shared::SensorPayload p;
    if (Shared::parsePayload(buf, p))
    {
        Serial.printf("Received payload: %s\n", buf);
        bool ok = sender.sendPayload(p);
        Serial.printf("Forwarded to server: %s\n", ok ? "OK" : "FAIL");
    }
    else
    {
        Serial.printf("Invalid payload: %s\n", buf);
    }
}

void setup()
{
    Serial.begin(115200);
    delay(100);
    Serial.println("Gateway starting...");

    if (!gateway.begin())
    {
        Serial.println("LoRa init failed");
        while (1)
            delay(1000);
    }
    gateway.onReceive(onLoRaReceive);

    if (!sender.begin())
    {
        Serial.println("WiFi connect failed - gateway will retry per send attempts");
    }
    else
    {
        Serial.println("WiFi connected");
    }
}

void loop()
{
    gateway.loop();
    delay(10);
}
