import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mission_id    UUID NOT NULL,
      client_name   VARCHAR(255) NOT NULL,
      amount        DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
      status        VARCHAR(50) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','paid')),
      generated_at  TIMESTAMPTZ DEFAULT NOW(),
      paid_at       TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS payments (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount        DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
      payment_date  TIMESTAMPTZ DEFAULT NOW(),
      method        VARCHAR(100) DEFAULT 'bank_transfer'
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_mission_id ON invoices(mission_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
  `);

  await pool.query(`
    DO $$
    BEGIN
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by UUID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);
}
