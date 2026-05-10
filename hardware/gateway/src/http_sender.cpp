#include "http_sender.h"
#include <curl/curl.h>
#include <iostream>

HttpSender::HttpSender(const std::string &url, const std::string &apiKey)
  : _url(url), _apiKey(apiKey) {}

bool HttpSender::send(const Shared::SensorPayload &p) {
    char body[512];
    Shared::serializePayload(p, body, sizeof(body));

    CURL *curl = curl_easy_init();
    if (!curl) return false;
    struct curl_slist *headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    if (!_apiKey.empty()) {
        std::string h = "x-api-key: " + _apiKey;
        headers = curl_slist_append(headers, h.c_str());
    }

    curl_easy_setopt(curl, CURLOPT_URL, _url.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

    CURLcode res = curl_easy_perform(curl);
    long code = 0;
    if (res == CURLE_OK) curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &code);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        std::cerr << "HTTP request failed: " << curl_easy_strerror(res) << "\n";
        return false;
    }
    return (code >= 200 && code < 300);
}
