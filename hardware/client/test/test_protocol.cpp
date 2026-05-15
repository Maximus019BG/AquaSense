#include <iostream>
#include <cassert>
#include "protocol.h"

int main()
{
    Shared::SensorPayload p;
    strncpy(p.id, "client-01", sizeof(p.id));
    strncpy(p.metric, "turb_raw", sizeof(p.metric));
    p.value = 2048;
    p.seq = 1;
    p.hops = 0;
    p.ts = 1620000000;

    char buf[256];
    size_t n = Shared::serializePayload(p, buf, sizeof(buf));
    if (n == 0)
    {
        std::cerr << "serialize failed\n";
        return 1;
    }

    Shared::SensorPayload q;
    bool ok = Shared::parsePayload(buf, q);
    if (!ok)
    {
        std::cerr << "parse failed\n";
        return 2;
    }

    if (strcmp(p.id, q.id) != 0 || strcmp(p.metric, q.metric) != 0 || p.value != q.value || p.ts != q.ts)
    {
        std::cerr << "mismatch\n";
        return 3;
    }

    std::cout << "client protocol test passed\n";
    return 0;
}
