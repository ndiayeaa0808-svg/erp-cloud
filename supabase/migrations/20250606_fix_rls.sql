-- ═══════════════════════════════════════════════════════════════
--   FIX: RLS policies for new tables + user_shop_id helper
--   À exécuter dans : Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Helper: get current user's shop_id (handles UUID/TEXT mismatch)
CREATE OR REPLACE FUNCTION public.user_shop_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'shop_id' FROM auth.users WHERE id = auth.uid()),
    (SELECT shop_id::text FROM public.users WHERE id = auth.uid()::text OR id::text = auth.uid()::text LIMIT 1)
  );
$$;

GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Cash registers RLS
DROP POLICY IF EXISTS "Users can view own shop cash registers" ON cash_registers;
DROP POLICY IF EXISTS "shop row access" ON cash_registers;
CREATE POLICY "cash_registers_access" ON cash_registers
  FOR ALL
  USING (shop_id::text = public.user_shop_id())
  WITH CHECK (shop_id::text = public.user_shop_id());

-- Audit logs RLS
DROP POLICY IF EXISTS "Users can view own shop audit logs" ON audit_logs;
DROP POLICY IF EXISTS "shop row access" ON audit_logs;
CREATE POLICY "audit_logs_access" ON audit_logs
  FOR ALL
  USING (shop_id::text = public.user_shop_id())
  WITH CHECK (shop_id::text = public.user_shop_id());

-- Deleted records RLS
DROP POLICY IF EXISTS "Users can view own shop deleted records" ON deleted_records;
DROP POLICY IF EXISTS "shop row access" ON deleted_records;
CREATE POLICY "deleted_records_access" ON deleted_records
  FOR ALL
  USING (shop_id::text = public.user_shop_id())
  WITH CHECK (shop_id::text = public.user_shop_id());

-- Accounting entries RLS
DROP POLICY IF EXISTS "Users can view own shop accounting" ON accounting_entries;
DROP POLICY IF EXISTS "shop row access" ON accounting_entries;
CREATE POLICY "accounting_entries_access" ON accounting_entries
  FOR ALL
  USING (shop_id::text = public.user_shop_id())
  WITH CHECK (shop_id::text = public.user_shop_id());

-- Grant permissions
GRANT ALL ON cash_registers TO authenticated;
GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON deleted_records TO authenticated;
GRANT ALL ON accounting_entries TO authenticated;

-- Backfill shop_id for existing users in raw_user_meta_data
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('shop_id', us.shop_id::text)
FROM public.users us
WHERE (us.id = u.id::text OR us.id::text = u.id::text)
  AND (u.raw_user_meta_data->>'shop_id' IS NULL OR u.raw_user_meta_data->>'shop_id' = '');

SELECT 'RLS fix complete' AS status;
