import { DEFAULT_COMPANY_SETTINGS } from "@/lib/constants";
import type {
  BrandFooterLogo,
  CompanySettings,
  Product,
  Quotation,
  QuotationItem,
  Store
} from "@/lib/types";

const PRODUCT_PAGE_SIZE = 1000;

function normalizeStoreSettings(store: Store): CompanySettings {
  return {
    ...store,
    company_name: store.store_name
  };
}

function storeInsertPayload(settings: typeof DEFAULT_COMPANY_SETTINGS) {
  const { company_name: _companyName, ...payload } = settings;
  return payload;
}

export async function getStoreById(
  supabase: any,
  storeId: string
): Promise<CompanySettings | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return normalizeStoreSettings(data as Store);
  }

  return null;
}

export async function getCompanySettings(
  supabase: any,
  storeId?: string
): Promise<CompanySettings> {
  if (storeId) {
    const store = await getStoreById(supabase, storeId);

    if (!store) {
      throw new Error("Store settings not found");
    }

    return store;
  }

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return normalizeStoreSettings(data as Store);
  }

  const { data: created, error: createError } = await supabase
    .from("stores")
    .insert(storeInsertPayload(DEFAULT_COMPANY_SETTINGS))
    .select("*")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return normalizeStoreSettings(created as Store);
}

export async function getFooterLogos(
  supabase: any,
  storeId: string
): Promise<BrandFooterLogo[]> {
  const { data, error } = await supabase
    .from("brand_footer_logos")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as BrandFooterLogo[];
}

export async function getActiveQuotationProducts(supabase: any): Promise<Product[]> {
  const products: Product[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("*, brand:brands!products_brand_id_fkey(id,name)")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("product_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PRODUCT_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data || []) as Product[];
    products.push(...page);

    if (page.length < PRODUCT_PAGE_SIZE) {
      return products;
    }

    from += PRODUCT_PAGE_SIZE;
  }
}

export async function getQuotationWithItems(
  supabase: any,
  id: string,
  storeId?: string
): Promise<{ quotation: Quotation; items: QuotationItem[] }> {
  let quotationQuery = supabase
    .from("quotations")
    .select("*")
    .eq("id", id);

  if (storeId) quotationQuery = quotationQuery.eq("store_id", storeId);

  const { data: quotation, error: quotationError } = await quotationQuery.single();

  if (quotationError) {
    throw new Error(quotationError.message);
  }

  const { data: items, error: itemsError } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", id)
    .eq("store_id", quotation.store_id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return {
    quotation: quotation as Quotation,
    items: (items || []) as QuotationItem[]
  };
}

export async function logActivity(
  supabase: any,
  input: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    storeId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("activity_logs").insert({
    store_id: input.storeId || null,
    user_id: input.userId || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    metadata: input.metadata || {}
  });
}
