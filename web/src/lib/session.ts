// src/lib/session.ts
import { verifyAccessToken } from "./auth";
import { cookies } from "next/headers"; // server-only

export async function getCurrentUser() {
  // cookies() can be async in some Next versions / types — await it before accessing .get
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session")?.value;
  if (!cookie) return null;
  const { valid, payload } = await verifyAccessToken(cookie);
  if (!valid) return null;
  return payload;
}