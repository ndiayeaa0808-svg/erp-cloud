import { createClient } from "./client";

export function getSupabase() {
  return createClient();
}

export async function fetchTable<T>(
  table: string,
  options?: {
    select?: string;
    eq?: Record<string, string>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    search?: { column: string; term: string };
  }
): Promise<{ data: T[]; count: number }> {
  const supabase = getSupabase();
  let query = supabase.from(table).select(options?.select || "*", { count: "exact" });

  if (options?.eq) {
    for (const [key, val] of Object.entries(options.eq)) {
      if (val) query = query.eq(key, val);
    }
  }

  if (options?.search?.term) {
    query = query.ilike(options.search.column, `%${options.search.term}%`);
  }

  if (options?.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: (data || []) as T[], count: count || 0 };
}

export async function insertRow<T>(table: string, values: Partial<T>): Promise<T> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from(table).insert(values as never).select().single();
  if (error) throw error;
  return data as T;
}

export async function updateRow<T>(table: string, id: string, values: Partial<T>): Promise<T> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from(table).update(values as never).eq("id", id).select().single();
  if (error) throw error;
  return data as T;
}

export async function deleteRow(table: string, id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function softDeleteRow(table: string, id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() } as never).eq("id", id);
  if (error) throw error;
}
