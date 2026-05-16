import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "~/lib/auth";

const publicPathPrefixes = ["/_next", "/api/auth", "/api/data", "/api/water-data", "/api/readings", "/public"];
const publicPaths = new Set(["/login", "/register"]);

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const session = req.cookies.get("session")?.value;

  if (publicPathPrefixes.some((prefix) => url.pathname.startsWith(prefix)) || publicPaths.has(url.pathname)) {
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

export const config = {
  matcher: ["/((?!api/auth|_next|favicon.ico).*)"],
};