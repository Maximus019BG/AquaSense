// Implementation of serialization and parsing used by both ends.
#include "protocol.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

namespace Shared
{

    size_t serializePayload(const SensorPayload &p, char *buf, size_t bufsize)
    {
        int r = snprintf(buf, bufsize, "{\"id\":\"%s\",\"metric\":\"%s\",\"value\":%ld,\"ts\":%lu}",
                         p.id, p.metric, (long)p.value, (unsigned long)p.ts);
        if (r < 0)
            return 0;
        if ((size_t)r >= bufsize)
            return 0;
        return (size_t)r;
    }

    bool parsePayload(const char *str, SensorPayload &out)
    {
        if (!str)
            return false;
        const char *p = strstr(str, "\"id\":\"");
        if (!p)
            return false;
        p += 7; // move to id value
        const char *q = strchr(p, '"');
        if (!q)
            return false;
        size_t len = q - p;
        if (len >= sizeof(out.id))
            return false;
        memcpy(out.id, p, len);
        out.id[len] = '\0';

        const char *metricp = strstr(q, "\"metric\":\"");
        if (metricp)
        {
            metricp += 10;
            const char *metricEnd = strchr(metricp, '"');
            if (!metricEnd)
                return false;
            size_t metricLen = metricEnd - metricp;
            if (metricLen >= sizeof(out.metric))
                return false;
            memcpy(out.metric, metricp, metricLen);
            out.metric[metricLen] = '\0';
        }
        else
        {
            out.metric[0] = '\0';
        }

        const char *valp = strstr(q, "\"value\":");
        if (!valp)
            return false;
        valp += 9;
        out.value = atoi(valp);

        const char *tsp = strstr(valp, "\"ts\":");
        if (!tsp)
        {
            const char *tsp2 = strstr(str, "ts\":");
            if (!tsp2)
                return false;
            tsp = tsp2;
        }
        tsp = strchr(tsp, ':');
        if (!tsp)
            return false;
        tsp++;
        out.ts = (uint32_t)strtoul(tsp, nullptr, 10);
        return true;
    }

} // namespace Shared
