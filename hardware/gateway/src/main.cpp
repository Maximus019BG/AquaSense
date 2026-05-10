#include <iostream>
#include <cstdlib>
#include "serial_reader.h"
#include "http_sender.h"
#include "protocol.h"

int main(int argc, char **argv) {
    std::string device = "/dev/ttyUSB0";
    std::string server = "http://localhost:8000/api/data";
    std::string apikey;

    if (argc > 1) device = argv[1];
    if (argc > 2) server = argv[2];
    if (argc > 3) apikey = argv[3];

    SerialReader reader(device, 9600);
    if (!reader.begin()) return 1;

    HttpSender sender(server, apikey);

    std::cout << "Gateway listening on " << device << ", forwarding to " << server << "\n";

    reader.run([&](const std::string &line) {
        Shared::SensorPayload p;
        if (Shared::parsePayload(line.c_str(), p)) {
            std::cout << "Received: " << line << "\n";
            bool ok = sender.send(p);
            std::cout << "Forward result: " << (ok?"OK":"FAIL") << "\n";
        } else {
            std::cerr << "Invalid payload: " << line << "\n";
        }
    });

    return 0;
}
