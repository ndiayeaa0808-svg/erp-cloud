"use client";

const STORAGE_KEY = "erp_supabase_config";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getStoredConfig(): SupabaseConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export function storeConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasValidConfig(): boolean {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    envUrl &&
    envKey &&
    !envUrl.includes("xxxxx") &&
    envUrl.includes("supabase.co") &&
    envKey.length > 20
  ) {
    return true;
  }

  const stored = getStoredConfig();
  if (stored && stored.url && stored.anonKey && stored.url.includes("supabase.co")) {
    return true;
  }

  return false;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    envUrl &&
    envKey &&
    !envUrl.includes("xxxxx") &&
    envUrl.includes("supabase.co") &&
    envKey.length > 20
  ) {
    return { url: envUrl, anonKey: envKey };
  }

  return getStoredConfig();
}
