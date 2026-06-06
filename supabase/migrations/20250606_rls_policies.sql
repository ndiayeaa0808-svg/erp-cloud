GRANT ALL ON cash_registers TO authenticated;
GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON deleted_records TO authenticated;
GRANT ALL ON accounting_entries TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE cash_registers;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE accounting_entries;
