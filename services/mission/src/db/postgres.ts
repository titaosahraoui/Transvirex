import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initSchema(): Promise<void> {
  // Create table with full constraint (new databases)
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
                    CHECK (status IN ('pending','assigned','in_progress','completed','failed','cancelled')),
      driver_id     UUID,
      created_by    UUID NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_missions_status     ON missions(status);
    CREATE INDEX IF NOT EXISTS idx_missions_driver_id  ON missions(driver_id);
    CREATE INDEX IF NOT EXISTS idx_missions_created_by ON missions(created_by);
    CREATE INDEX IF NOT EXISTS idx_missions_created_at ON missions(created_at);
  `);

  // Idempotent migration: update the status CHECK constraint on existing databases
  // to include the 'cancelled' status added in this version.
  await pool.query(`
    DO $$
    BEGIN
      ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_status_check;
      ALTER TABLE missions ADD CONSTRAINT missions_status_check
        CHECK (status IN ('pending','assigned','in_progress','completed','failed','cancelled'));
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);

  // Idempotent migration: add pricing and logistics fields.
  await pool.query(`
    DO $$
    BEGIN
      ALTER TABLE missions ADD COLUMN IF NOT EXISTS price        DECIMAL(12,2) NOT NULL DEFAULT 0;
      ALTER TABLE missions ADD COLUMN IF NOT EXISTS mission_type VARCHAR(50)   NOT NULL DEFAULT 'standard';
      ALTER TABLE missions ADD COLUMN IF NOT EXISTS weight_kg    DECIMAL(8,2)  NOT NULL DEFAULT 0;
      ALTER TABLE missions ADD COLUMN IF NOT EXISTS notes        TEXT;
      ALTER TABLE missions ADD COLUMN IF NOT EXISTS priority     VARCHAR(20)   NOT NULL DEFAULT 'medium';
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);

  // Idempotent migration: add SLA tracking and rejection audit columns.
  await pool.query(`
    DO $$
    BEGIN
      ALTER TABLE missions ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ;
      ALTER TABLE missions ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);

  // Idempotent migration: add proof-of-delivery photo URL column.
  await pool.query(`
    DO $$
    BEGIN
      ALTER TABLE missions ADD COLUMN IF NOT EXISTS pod_photo_url TEXT;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);
}
