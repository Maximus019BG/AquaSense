import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt);
const SALT_BYTES = 16;
const KEY_LEN = 64;
const HASH_PREFIX = "scrypt"; // format: scrypt$version$salt$hash
const VERSION = "1";

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derived = (await scryptAsync(password, salt as crypto.BinaryLike, KEY_LEN)) as Buffer;
  return `${HASH_PREFIX}$${VERSION}$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(storedHash: string, password: string) {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4) return false;
    const [prefix, version, salt, hashHex] = parts;
    if (prefix !== HASH_PREFIX) return false;
    // in future versions you can switch on `version` to support param changes
    if (!salt || !hashHex) return false;

    const derived = (await scryptAsync(password, salt as crypto.BinaryLike, KEY_LEN)) as Buffer;
    const derivedBuf = Buffer.from(derived);
    const hashBuf = Buffer.from(hashHex, "hex");

    // Length check then timing-safe compare
    if (hashBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, derivedBuf);
  } catch (err) {
    return false;
  }
}

// Note: If you prefer Argon2 for password hashing, install the `argon2` package and
// call it from server-only code (not imported at build-time). With Next.js/Turbopack,
// top-level imports of native modules can cause build-time resolution errors. If
// you install `argon2`, update this module to use it and ensure your deployment
// environment provides built binaries (or use a pure-JS alternative).
