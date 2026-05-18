import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();
let secretKey: Uint8Array | undefined;

function getSecretKey() {
  if (!secretKey) {
    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret) {
      throw new Error("AUTH_JWT_SECRET environment variable is required");
    }
    secretKey = encoder.encode(secret);
  }

  return secretKey;
}

export async function createAccessToken(payload: object, expiresIn: string | number = "7d") {
  // expiresIn can be a string like '7d' or seconds number
  const jwt = new SignJWT(payload as Record<string, unknown>);
  jwt.setProtectedHeader({ alg: "HS256" });
  jwt.setIssuedAt();
  // jose supports setExpirationTime with string like '7d' in modern versions
  jwt.setExpirationTime(expiresIn as any);
  return await jwt.sign(getSecretKey());
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err };
  }
}
