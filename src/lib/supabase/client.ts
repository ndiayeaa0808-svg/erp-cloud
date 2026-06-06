import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export const createClient = () => {
  const config = getSupabaseConfig();

  const url = config?.url || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = config?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return createBrowserClient(url, key);
};
