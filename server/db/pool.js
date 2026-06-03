/**
 * db/pool.js — Neon PostgreSQL connection pool
 *
 * Uses the 'pg' (node-postgres) library with a connection pool.
 * CONNECTION_STRING is read from the DATABASE_URL environment variable.
 *
 * Neon requires SSL — ssl: { rejectUnauthorized: false } works for Neon's
 * serverless endpoint without needing to bundle a CA certificate.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Neon
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Connected to Neon PostgreSQL');
    release();
  }
});

module.exports = pool;
