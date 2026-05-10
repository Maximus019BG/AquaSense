#pragma once
#include <string>
#include "protocol.h"

class HttpSender
{
public:
    HttpSender(const std::string &url, const std::string &apiKey = "");
    bool send(const Shared::SensorPayload &p);

private:
    std::string _url;
    std::string _apiKey;
};
