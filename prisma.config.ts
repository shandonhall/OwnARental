import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

// Load prisma/.env (and root .env if present)
config({ path: resolve(process.cwd(), "prisma/.env") });
config({ path: resolve(process.cwd(), ".env") });

/**
 * `prisma generate` does not connect to the database, but Prisma 7 still
 * requires a datasource URL when loading this config. On Vercel/CI the real
 * URLs live in project env vars (or may be absent during generate-only).
 * Prefer DIRECT_URL for migrate/db push; fall back so client generation works.
 */
function datasourceUrl(): string {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.VERCEL || process.env.CI) {
    return "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
  }
  throw new Error(
    "DIRECT_URL or DATABASE_URL is required (set in prisma/.env or the environment).",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI (migrate / db push) should use DIRECT_URL (direct, not pooler)
    url: datasourceUrl(),
  },
});
