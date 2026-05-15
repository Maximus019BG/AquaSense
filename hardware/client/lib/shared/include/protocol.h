// Shared protocol definitions between sensor and gateway
#pragma once

#include <stdint.h>
#include <stddef.h>

namespace Shared
{

    struct SensorPayload
    {
        char id[16];
        char metric[16];
        int32_t value;
        uint32_t seq; // per-origin sequence number
        uint8_t hops; // number of relay hops the packet has taken
        uint32_t ts;  // epoch seconds
        // Optional signature field (hex or base64) for end-to-end authentication
        // Stored as a null-terminated string. If empty, no signature present.
        char sig[128];
    };

    // Serialize payload into a compact JSON-ish string into buffer.
    // Returns number of bytes written (excluding terminating 0).
    size_t serializePayload(const SensorPayload &p, char *buf, size_t bufsize);

    // Parse a payload from a received string. Returns true on success.
    bool parsePayload(const char *str, SensorPayload &out);

} // namespace Shared
