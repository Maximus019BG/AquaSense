#include "serial_reader.h"
#include <termios.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <string.h>
#include <iostream>

SerialReader::SerialReader(const std::string &device, int baud) : _device(device), _baud(baud) {}

SerialReader::~SerialReader() { stop(); }

static speed_t baud_to_speed(int baud)
{
    switch (baud)
    {
    case 9600:
        return B9600;
    case 19200:
        return B19200;
    case 38400:
        return B38400;
    case 57600:
        return B57600;
    case 115200:
        return B115200;
    default:
        return B9600;
    }
}

bool SerialReader::begin()
{
    _fd = open(_device.c_str(), O_RDONLY | O_NOCTTY | O_NONBLOCK);
    if (_fd < 0)
    {
        std::cerr << "Failed to open serial device " << _device << ": " << strerror(errno) << "\n";
        return false;
    }

    struct termios tty;
    if (tcgetattr(_fd, &tty) != 0)
    {
        std::cerr << "tcgetattr failed: " << strerror(errno) << "\n";
        close(_fd);
        _fd = -1;
        return false;
    }

    cfmakeraw(&tty);
    cfsetispeed(&tty, baud_to_speed(_baud));
    cfsetospeed(&tty, baud_to_speed(_baud));
    tty.c_cflag |= CLOCAL | CREAD;
    tty.c_cflag &= ~CRTSCTS;
    tty.c_cc[VMIN] = 0;
    tty.c_cc[VTIME] = 10;

    if (tcsetattr(_fd, TCSANOW, &tty) != 0)
    {
        std::cerr << "tcsetattr failed: " << strerror(errno) << "\n";
        close(_fd);
        _fd = -1;
        return false;
    }

    _running = true;
    return true;
}

void SerialReader::run(LineCallback cb)
{
    if (_fd < 0)
        return;
    std::string buffer;
    while (_running)
    {
        char tmp[128];
        ssize_t n = read(_fd, tmp, sizeof(tmp));
        if (n > 0)
        {
            buffer.append(tmp, tmp + n);
            size_t pos;
            while ((pos = buffer.find('\n')) != std::string::npos)
            {
                std::string line = buffer.substr(0, pos);
                if (!line.empty() && line.back() == '\r')
                    line.pop_back();
                if (!line.empty())
                    cb(line);
                buffer.erase(0, pos + 1);
            }
        }
        else
        {
            usleep(100000);
        }
    }
}

void SerialReader::stop()
{
    _running = false;
    if (_fd >= 0)
    {
        close(_fd);
        _fd = -1;
    }
}
