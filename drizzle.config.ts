import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations use the session pooler / direct connection; the app uses the transaction pooler.
  dbCredentials: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://placeholder" },
});
