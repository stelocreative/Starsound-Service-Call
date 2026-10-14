"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabaseEnv } from "./env";

let browserClient: SupabaseClient<Database> | undefined;

/** Browser Supabase client (singleton so realtime channels and auth state are shared). */
export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const { url, key } = supabaseEnv();
  browserClient = createBrowserClient<Database>(url, key);
  return browserClient;
}
