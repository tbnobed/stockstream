const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require("../shared/schema");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use postgres-js for Docker deployment (standard PostgreSQL connection)
const connection = postgres(process.env.DATABASE_URL);
const db = drizzle({ client: connection, schema });

module.exports = { db, connection };