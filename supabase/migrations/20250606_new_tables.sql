CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT,
  user_id UUID,
  user_name TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  initial_amount NUMERIC(12,2) DEFAULT 0,
  expected_amount NUMERIC(12,2) DEFAULT 0,
  actual_amount NUMERIC(12,2),
  difference NUMERIC(12,2),
  total_sales NUMERIC(12,2) DEFAULT 0,
  total_cash NUMERIC(12,2) DEFAULT 0,
  total_mobile NUMERIC(12,2) DEFAULT 0,
  total_other NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  note TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT,
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deleted_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  shop_id TEXT,
  data JSONB DEFAULT '{}',
  deleted_by TEXT,
  deleted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT,
  cash_register_id UUID,
  type TEXT NOT NULL CHECK (type IN ('sale', 'expense', 'payment_in', 'payment_out')),
  category TEXT,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  reference TEXT,
  description TEXT,
  entry_date DATE DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shops ADD COLUMN IF NOT EXISTS ninea TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rccm TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
