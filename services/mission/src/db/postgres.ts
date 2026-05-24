import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS missions (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_name   VARCHAR(255) NOT NULL,
      pickup_address    VARCHAR(500) NOT NULL,
      pickup_lat        DECIMAL(9,6) NOT NULL DEFAULT 0,
      pickup_lng        DECIMAL(9,6) NOT NULL DEFAULT 0,
      delivery_address  VARCHAR(500) NOT NULL,
      delivery_lat      DECIMAL(9,6) NOT NULL DEFAULT 0,
      delivery_lng      DECIMAL(9,6) NOT NULL DEFAULT 0,
      deadline      TIMESTAMPTZ,
      status        VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','assigned','in_progress','completed','failed')),
      driver_id     UUID,
      created_by    UUID NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_missions_status     ON missions(status);
    CREATE INDEX IF NOT EXISTS idx_missions_driver_id  ON missions(driver_id);
    CREATE INDEX IF NOT EXISTS idx_missions_created_by ON missions(created_by);
  `);
}
