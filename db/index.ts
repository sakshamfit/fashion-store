import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Connection string for the Postgres database. Vercel's Neon integration sets
 * DATABASE_URL (and POSTGRES_URL); either works.
 */
export function databaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Connect a Postgres database (e.g. Neon) to this project.");
  }
  return url;
}

export function getDb() {
  return drizzle(neon(databaseUrl()), { schema });
}
