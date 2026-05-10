import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema/**/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  out: "./src/server/db/migrations",
  migrations: {
    table: "__drizzle_migrations__",
    schema: "drizzle",
  },
});
