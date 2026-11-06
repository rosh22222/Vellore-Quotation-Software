import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function createCatalogSupabaseClient() {
  return createSupabaseAdminClient();
}
