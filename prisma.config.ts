import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig, env } from "prisma/config";

// Load prisma/.env (and root .env if present)
config({ path: resolve(process.cwd(), "prisma/.env") });
config({ path: resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI (migrate / db push) must use the direct connection, not the pooler
    url: env("DIRECT_URL"),
  },
});
