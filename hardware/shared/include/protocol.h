#include <cstddef>
// Shared protocol definitions between sensor and gateway
#pragma once

#include <stdint.h>

namespace Shared
{

    struct SensorPayload
    {
        char id[16];
        int32_t value;
        uint32_t ts; // epoch seconds
    };

    // Serialize payload into a compact JSON-ish string into buffer.
    // Returns number of bytes written (excluding terminating 0).
    size_t serializePayload(const SensorPayload &p, char *buf, size_t bufsize);

    // Parse a payload from a received string. Returns true on success.
    bool parsePayload(const char *str, SensorPayload &out);

} // namespace Shared
