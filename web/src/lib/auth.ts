import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();
const SECRET = process.env.AUTH_JWT_SECRET;
if (!SECRET) {
  throw new Error("AUTH_JWT_SECRET environment variable is required");
}
const secretKey = encoder.encode(SECRET);

export async function createAccessToken(payload: object, expiresIn: string | number = "7d") {
  // expiresIn can be a string like '7d' or seconds number
  const jwt = new SignJWT(payload as Record<string, unknown>);
  jwt.setProtectedHeader({ alg: "HS256" });
  jwt.setIssuedAt();
  // jose supports setExpirationTime with string like '7d' in modern versions
  jwt.setExpirationTime(expiresIn as any);
  return await jwt.sign(secretKey);
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err };
  }
}
