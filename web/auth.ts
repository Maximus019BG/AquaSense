import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./src/server/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", 
  }),

  // Minimal setup: email/password only. Leave providers empty.
  providers: [],

  // Keep defaults for other settings; customize later if needed.
});