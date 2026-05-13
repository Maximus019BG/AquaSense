// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "~/lib/auth";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const session = req.cookies.get("session")?.value;
  // allow public paths
  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/public") || url.pathname === "/login" || url.pathname === "/register") {
    return NextResponse.next();
  }
  if (!session) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  const { valid } = await verifyAccessToken(session);
  if (!valid) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!api/auth|_next|favicon.ico).*)"] };