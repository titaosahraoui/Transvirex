import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email       VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role        VARCHAR(50)  NOT NULL
                  CHECK (role IN ('driver', 'dispatcher', 'billing', 'management')),
      name        VARCHAR(255) NOT NULL,
      phone       VARCHAR(50),
      created_at  TIMESTAMPTZ  DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      vehicle_type    VARCHAR(100)   DEFAULT 'van',
      lat             DECIMAL(9, 6)  DEFAULT 0,
      lng             DECIMAL(9, 6)  DEFAULT 0,
      status          VARCHAR(50)    DEFAULT 'available'
                      CHECK (status IN ('available', 'on_mission', 'offline')),
      current_load    INTEGER        DEFAULT 0,
      acceptance_rate DECIMAL(5, 2)  DEFAULT 100.00,
      experience_days INTEGER        DEFAULT 0
    );
  `);
  console.log('[auth] database schema ready');
}
