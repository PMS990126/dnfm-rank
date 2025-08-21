import { createClient } from "@supabase/supabase-js";

export function getDb() {
  const url = process.env.SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE ?? "";
  
  if (!url || !serviceKey) {
    throw new Error("Supabase env missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
