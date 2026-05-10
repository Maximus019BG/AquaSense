#include <iostream>
#include <string>
#include <cassert>
#include "protocol.h"

int main()
{
    Shared::SensorPayload p;
    strncpy(p.id, "t1", sizeof(p.id));
    p.value = 1234;
    p.ts = 1610000000;

    char buf[256];
    size_t n = Shared::serializePayload(p, buf, sizeof(buf));
    if (n == 0)
    {
        std::cerr << "serialize failed" << std::endl;
        return 2;
    }

    Shared::SensorPayload q;
    bool ok = Shared::parsePayload(buf, q);
    if (!ok)
    {
        std::cerr << "parse failed" << std::endl;
        return 3;
    }

    if (strcmp(p.id, q.id) != 0 || p.value != q.value || p.ts != q.ts)
    {
        std::cerr << "mismatch" << std::endl;
        return 4;
    }

    std::cout << "protocol test passed" << std::endl;
    return 0;
}
