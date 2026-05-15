// Implementation of serialization and parsing used by both ends.
#include "protocol.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

namespace Shared
{

    size_t serializePayload(const SensorPayload &p, char *buf, size_t bufsize)
    {
        // Include signature only if present (non-empty)
        if (p.sig[0] != '\0')
        {
            int r = snprintf(buf, bufsize, "{\"id\":\"%s\",\"metric\":\"%s\",\"value\":%ld,\"seq\":%lu,\"hops\":%u,\"ts\":%lu,\"sig\":\"%s\"}",
                             p.id, p.metric, (long)p.value, (unsigned long)p.seq, (unsigned)p.hops, (unsigned long)p.ts, p.sig);
            if (r < 0)
                return 0;
            if ((size_t)r >= bufsize)
                return 0;
            return (size_t)r;
        }
        else
        {
            int r = snprintf(buf, bufsize, "{\"id\":\"%s\",\"metric\":\"%s\",\"value\":%ld,\"seq\":%lu,\"hops\":%u,\"ts\":%lu}",
                             p.id, p.metric, (long)p.value, (unsigned long)p.seq, (unsigned)p.hops, (unsigned long)p.ts);
            if (r < 0)
                return 0;
            if ((size_t)r >= bufsize)
                return 0;
            return (size_t)r;
        }
    }

    bool parsePayload(const char *str, SensorPayload &out)
    {
        if (!str)
            return false;
        // default hops/seq to zero unless present
        out.hops = 0;
        out.seq = 0;
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

        // optional seq field
        const char *seqp = strstr(q, "\"seq\":");
        if (seqp)
        {
            seqp = strchr(seqp, ':');
            if (seqp)
            {
                seqp++;
                out.seq = (uint32_t)strtoul(seqp, nullptr, 10);
            }
            else
            {
                out.seq = 0;
            }
        }

        // optional hops field
        const char *hopsp = strstr(q, "\"hops\":");
        if (hopsp)
        {
            hopsp = strchr(hopsp, ':');
            if (hopsp)
            {
                hopsp++;
                out.hops = (uint8_t)atoi(hopsp);
            }
            else
            {
                out.hops = 0;
            }
        }

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

        // optional signature field
        const char *sigp = strstr(q, "\"sig\":\"");
        if (sigp)
        {
            sigp += 7; // move to signature value
            const char *sigEnd = strchr(sigp, '"');
            if (sigEnd)
            {
                size_t sigLen = sigEnd - sigp;
                if (sigLen >= sizeof(out.sig))
                    sigLen = sizeof(out.sig) - 1;
                memcpy(out.sig, sigp, sigLen);
                out.sig[sigLen] = '\0';
            }
            else
            {
                out.sig[0] = '\0';
            }
        }
        else
        {
            out.sig[0] = '\0';
        }
        return true;
    }

} // namespace Shared
