#pragma once
#include <functional>
#include <string>

using LineCallback = std::function<void(const std::string&)>;

class SerialReader {
public:
    SerialReader(const std::string &device, int baud = 9600);
    ~SerialReader();
    bool begin();
    void run(LineCallback cb);
    void stop();
private:
    std::string _device;
    int _baud;
    int _fd{-1};
    bool _running{false};
};
