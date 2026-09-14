// Arquivo de config do Prisma 7 (precisa se chamar "prisma.config.ts"
// pra ser detectado automaticamente pelo CLI).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // O CLI (migrate/db push/studio) usa esta URL. No Supabase, use a
    // conexão DIRETA (porta 5432, sem pgbouncer) — a pooled (6543) é só
    // para o client em runtime, não serve para migrations.
    url: process.env["DIRECT_URL"],
  },
});
