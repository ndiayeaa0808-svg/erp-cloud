-- ═══════════════════════════════════════════════════════════════
--   FIX: RLS Policies + handle_new_user trigger + audit_logs
--   À exécuter dans : Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Ensure shop_id column exists on ALL tables ─────────────
-- MUST run before any function that references shop_id
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['users','products','sales','sale_items','expenses','credits','clients','activityLog','settings','messages','notifications','deliveries','cash_movements','employees','attendance','payroll','inventory_history','permissions','deleted_records','pending_sales','audit_logs'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS shop_id TEXT DEFAULT ''default''', t);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END LOOP;
END$$;

ALTER TABLE shops ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'FCFA';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS default_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '';

-- ── 2. Replace handle_new_user trigger ─────────────────────────
-- Creates a shop + user row AND sets raw_user_meta_data.shop_id
-- so the client can read user_metadata.shop_id from the JWT.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_shop_id TEXT;
  v_shop_name TEXT;
  v_full_name TEXT;
BEGIN
  v_shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Ma Boutique');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_shop_id   := gen_random_uuid()::text;

  INSERT INTO public.shops (id, name, created_at, updated_at)
  VALUES (v_shop_id, v_shop_name, NOW(), NOW());

  INSERT INTO public.users (id, shop_id, name, login, pass, email, role, created_at, updated_at)
  VALUES (NEW.id::text, v_shop_id, v_full_name, NEW.email, '', NEW.email, 'admin', NOW(), NOW());

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('shop_id', v_shop_id)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. Helper function: get current user's shop_id ─────────────
-- SECURITY DEFINER = bypasses RLS to avoid circular lookups
CREATE OR REPLACE FUNCTION public.user_shop_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT shop_id FROM public.users WHERE id = auth.uid()::text
$$;

GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- ── 4. Backfill shop_id in raw_user_meta_data for EXISTING users ──
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('shop_id', us.shop_id)
FROM public.users us
WHERE us.id = u.id::text
  AND (u.raw_user_meta_data->>'shop_id' IS NULL OR u.raw_user_meta_data->>'shop_id' = '');

-- ── 5. Drop ALL old RLS policies and replace ────────────────────
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['products','sales','sale_items','expenses','credits','clients','activityLog','settings','messages','notifications','deliveries','cash_movements','employees','attendance','payroll','inventory_history','permissions','deleted_records','pending_sales'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "shop row access" ON %I', t);
    EXECUTE format('
      CREATE POLICY "shop row access" ON %I
      FOR ALL
      USING (shop_id = public.user_shop_id())
      WITH CHECK (shop_id = public.user_shop_id())
    ', t);
  END LOOP;
END$$;

-- Users table: separate policy to avoid recursion
DROP POLICY IF EXISTS "shop row access" ON users;
DROP POLICY IF EXISTS "users access" ON users;
CREATE POLICY "users access" ON users
  FOR ALL
  USING (id = auth.uid()::text OR shop_id = public.user_shop_id())
  WITH CHECK (id = auth.uid()::text OR shop_id = public.user_shop_id());

-- Shops policies: read/insert open, update/delete only own
-- Note: shops table has NO shop_id column (its id IS the shop_id)
DROP POLICY IF EXISTS "Select shops" ON shops;
DROP POLICY IF EXISTS "Insert shops" ON shops;
DROP POLICY IF EXISTS "Update shops" ON shops;
DROP POLICY IF EXISTS "Delete shops" ON shops;
CREATE POLICY "Select shops" ON shops FOR SELECT USING (true);
CREATE POLICY "Insert shops" ON shops FOR INSERT WITH CHECK (true);
CREATE POLICY "Update shops" ON shops FOR UPDATE USING (id = public.user_shop_id());
CREATE POLICY "Delete shops" ON shops FOR DELETE USING (id = public.user_shop_id());

-- ── 6. Create audit_logs table ────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT DEFAULT '',
  action TEXT NOT NULL,
  entity TEXT DEFAULT '',
  entity_id TEXT DEFAULT '',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_shop ON audit_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop row access" ON audit_logs;
CREATE POLICY "shop row access" ON audit_logs
  FOR ALL
  USING (shop_id = public.user_shop_id())
  WITH CHECK (shop_id = public.user_shop_id());

GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT SELECT ON audit_logs TO anon;

-- ════════════════════════════════════════
-- VERIFY
-- ════════════════════════════════════════
SELECT 'Migration complete' AS status;
