import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  console.warn("DATABASE_URL is not configured; database features will fail at runtime.");
}

const client = connectionString
  ? postgres(connectionString, { prepare: false, max: 5 })
  : null;

export const db = client ? drizzle({ client, schema }) : null;
