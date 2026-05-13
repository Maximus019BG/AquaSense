import argon2 from "argon2";
import crypto from "crypto";
import { promisify } from "util";

// Production-ready Argon2 password utilities (server-only)
// Install: npm install argon2

const ARGON2_OPTIONS = {
  // cast to any to avoid mismatched TypeScript typings in this environment
  type: (argon2 as any).argon2id,
  memoryCost: 2 ** 16, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};

const scryptAsync = promisify(crypto.scrypt);
const SCRYPT_KEY_LEN = 64;
const SCRYPT_PREFIX = "scrypt"; // expected fallback format: scrypt$version$salt$hashHex

export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (_err) {
    return false;
  }
}

async function verifyScryptHash(storedHash: string, password: string): Promise<boolean> {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4) return false;
    const [prefix, version, salt, hashHex] = parts;
    if (prefix !== SCRYPT_PREFIX) return false;
    if (!salt || !hashHex) return false;

    const derived = (await scryptAsync(password, salt as crypto.BinaryLike, SCRYPT_KEY_LEN)) as Buffer;
    const derivedBuf = Buffer.from(derived);
    const hashBuf = Buffer.from(hashHex, "hex");

    if (hashBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, derivedBuf);
  } catch (err) {
    return false;
  }
}

// verifyAny: verifies either Argon2 or scrypt fallback. If scrypt succeeds, needsUpgrade=true
export async function verifyAny(storedHash: string, password: string): Promise<{ ok: boolean; needsUpgrade: boolean }> {
  if (!storedHash) return { ok: false, needsUpgrade: false };
  if (storedHash.startsWith(`${SCRYPT_PREFIX}$`)) {
    const ok = await verifyScryptHash(storedHash, password);
    return { ok, needsUpgrade: ok };
  }

  const ok = await verifyPassword(storedHash, password);
  return { ok, needsUpgrade: false };
}
