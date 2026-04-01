import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

export function useSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase env vars: VITE_SUPABASE_URL/ANON_KEY");
  }

  supabaseClient = createClient(url, anonKey);
  return supabaseClient;
}
