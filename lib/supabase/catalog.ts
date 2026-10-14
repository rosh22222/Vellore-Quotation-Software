import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "@/lib/env";

export function getCatalogSupabaseConfigIssue() {
  const supabaseUrl = process.env.CATALOG_SUPABASE_URL || "";
  const serviceRoleKey = process.env.CATALOG_SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl) {
    return "CATALOG_SUPABASE_URL is missing in .env.";
  }

  try {
    const url = new URL(supabaseUrl);
    if (!url.hostname.endsWith(".supabase.co")) {
      return "CATALOG_SUPABASE_URL should use a Supabase project URL.";
    }
  } catch {
    return "CATALOG_SUPABASE_URL is not a valid URL.";
  }

  if (!serviceRoleKey) {
    return "CATALOG_SUPABASE_SERVICE_ROLE_KEY is missing in .env.";
  }

  return null;
}

export function createCatalogSupabaseClient() {
  const issue = getCatalogSupabaseConfigIssue();

  if (issue) {
    throw new Error(`Shared product catalogue is not configured: ${issue}`);
  }

  return createClient(
    getRequiredEnv("CATALOG_SUPABASE_URL"),
    getRequiredEnv("CATALOG_SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
