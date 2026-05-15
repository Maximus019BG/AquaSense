import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { usersTable } from "~/server/db/schema";
import { createAccessToken } from "~/lib/auth";
import { hashPassword, verifyAny } from "~/server/lib/password";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    const body = await request.json();

    if (action === "register") {
      const parsed = registerSchema.parse(body);
      const existing = await db.select().from(usersTable).where(eq(usersTable.email, parsed.email));
      if (existing.length > 0) {
        return NextResponse.json({ success: false, error: "Email already in use" }, { status: 400 });
      }

      const hash = await hashPassword(parsed.password);
      const result = await db.insert(usersTable).values({ email: parsed.email, password_hash: hash }).returning();
      const user = result[0]!; // non-null assertion: insert returning should return the created user
      // create token and set cookie
      const token = await createAccessToken({ userId: user.id });
      const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
      // add SameSite and HttpOnly; Secure should be enabled in production (set via env-aware logic if needed)
      res.headers.set("Set-Cookie", `session=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`);
      return res;
    }

    if (action === "login") {
      const parsed = loginSchema.parse(body);
      const rows = await db.select().from(usersTable).where(eq(usersTable.email, parsed.email));
      const user = rows[0];
      if (!user) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
      }
      const { ok, needsUpgrade } = await verifyAny(user.password_hash, parsed.password);
      if (!ok) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
      }
      // If the password was verified against the legacy scrypt format, re-hash with Argon2 and update DB
      if (needsUpgrade) {
        const newHash = await hashPassword(parsed.password);
        await db.update(usersTable).set({ password_hash: newHash }).where(eq(usersTable.id, user.id));
      }
      const token = await createAccessToken({ userId: user.id });
      const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
      res.headers.set("Set-Cookie", `session=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`);
      return res;
    }

    if (action === "logout") {
      const res = NextResponse.json({ success: true });
      res.headers.set("Set-Cookie", `session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
      return res;
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Zod validation errors are available on `issues`
      return NextResponse.json({ success: false, error: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
