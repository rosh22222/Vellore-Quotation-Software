"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCompanySettings, logActivity } from "@/lib/data";
import {
  isValidPhoneList,
  PHONE_LIST_VALIDATION_MESSAGE
} from "@/lib/phone";
import { requireAdmin } from "@/lib/supabase/server";
import {
  imageExtension,
  imageUploadError,
  MAX_COMPANY_ASSET_BYTES
} from "@/lib/upload-limits";

function clean(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function safeRedirectPath(value: FormDataEntryValue | null) {
  const path = String(value || "/settings/company");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/settings/company";
}

async function uploadAsset(
  supabase: any,
  file: File | null,
  existingUrl: string | null | undefined,
  folder: string,
  storeCode: string
) {
  if (!file || file.size === 0) {
    return existingUrl || null;
  }

  const validationError = imageUploadError(file, MAX_COMPANY_ASSET_BYTES);
  if (validationError) throw new Error(validationError);

  const extension = imageExtension(file);
  if (!extension) throw new Error("Unsupported company image type.");

  const path = `stores/${storeCode}/${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("company-assets").upload(path, file, {
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message);

  const {
    data: { publicUrl }
  } = supabase.storage.from("company-assets").getPublicUrl(path);

  return publicUrl;
}

export async function saveCompanySettingsAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const current = await getCompanySettings(supabase, user.storeId);
  const logoUrl = await uploadAsset(
    supabase,
    formData.get("logo") as File | null,
    clean(formData.get("logo_url")),
    "logos",
    user.storeCode
  );
  const profileImageUrl = await uploadAsset(
    supabase,
    formData.get("profile_image") as File | null,
    clean(formData.get("profile_image_url")),
    "profile-images",
    user.storeCode
  );
  const pdfHeaderImageUrl = await uploadAsset(
    supabase,
    formData.get("pdf_header_image") as File | null,
    clean(formData.get("pdf_header_image_url")),
    "pdf-headers",
    user.storeCode
  );
  const signatureUrl = await uploadAsset(
    supabase,
    formData.get("signature") as File | null,
    clean(formData.get("signature_url")),
    "signatures",
    user.storeCode
  );

  const payload = {
    store_name: z.string().min(1).parse(String(formData.get("company_name") || "").trim()),
    store_code: z.string().min(1).parse(String(formData.get("store_code") || current.store_code).trim().toUpperCase()),
    owner_name: clean(formData.get("owner_name")),
    logo_url: logoUrl,
    profile_image_url: profileImageUrl,
    pdf_header_image_url: pdfHeaderImageUrl,
    pdf_footer_image_url: null,
    gst_number: String(formData.get("gst_number") || "").trim(),
    phone_numbers: z
      .string()
      .trim()
      .refine(
        (value) => !value || isValidPhoneList(value),
        PHONE_LIST_VALIDATION_MESSAGE
      )
      .parse(formData.get("phone_numbers")),
    email: String(formData.get("email") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    bank_firm_name: String(formData.get("bank_firm_name") || "").trim(),
    bank_name: String(formData.get("bank_name") || "").trim(),
    bank_account_no: String(formData.get("bank_account_no") || "").trim(),
    bank_branch: String(formData.get("bank_branch") || "").trim(),
    bank_ifsc: String(formData.get("bank_ifsc") || "").trim(),
    pdf_theme_color: String(formData.get("pdf_theme_color") || "#512B46").trim(),
    secondary_theme_color: String(formData.get("secondary_theme_color") || "#C08A3E").trim(),
    default_gst_percent: z.coerce.number().min(0).max(100).parse(formData.get("default_gst_percent")),
    default_gst_mode: z.enum(["add", "included", "none"]).parse(formData.get("default_gst_mode")),
    default_validity_days: z.coerce.number().int().min(1).parse(formData.get("default_validity_days")),
    default_terms: String(formData.get("default_terms") || "").trim(),
    default_warranty: String(formData.get("default_warranty") || "").trim(),
    default_delivery: String(formData.get("default_delivery") || "").trim(),
    default_transportation: String(formData.get("default_transportation") || "").trim(),
    default_payment_terms: String(formData.get("default_payment_terms") || "").trim(),
    default_after_sales_support: String(formData.get("default_after_sales_support") || "").trim(),
    authorized_person_name: String(formData.get("authorized_person_name") || "").trim(),
    authorized_person_designation: String(formData.get("authorized_person_designation") || "").trim(),
    signature_url: signatureUrl,
    brand_footer_heading: String(formData.get("brand_footer_heading") || "").trim(),
    brand_footer_enabled: formData.get("brand_footer_enabled") === "on",
    quotation_prefix: z.string().min(1).parse(String(formData.get("quotation_prefix") || current.quotation_prefix).trim().toUpperCase()),
    status: z.enum(["active", "inactive"]).parse(formData.get("status") || current.status)
  };

  const { error } = await supabase.from("stores").update(payload).eq("id", user.storeId);
  if (error) throw new Error(error.message);

  await logActivity(supabase, {
    userId: user.id,
    storeId: user.storeId,
    action: "Store settings updated",
    entityType: "store",
    entityId: current.id
  });

  revalidatePath("/settings/company");
  revalidatePath("/settings/terms");
  redirect(safeRedirectPath(formData.get("return_to")));
}

export async function saveFooterLogoAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const file = formData.get("image") as File | null;
  const imageUrl = await uploadAsset(
    supabase,
    file,
    clean(formData.get("image_url")),
    "brand-logos",
    user.storeCode
  );
  const id = String(formData.get("id") || "");
  const payload = {
    store_id: user.storeId,
    label: z.string().min(1).parse(String(formData.get("label") || "").trim()),
    image_url: imageUrl,
    sort_order: z.coerce.number().int().parse(formData.get("sort_order") || 0),
    is_active: formData.get("is_active") === "on"
  };

  if (id) {
    const { error } = await supabase
      .from("brand_footer_logos")
      .update(payload)
      .eq("id", id)
      .eq("store_id", user.storeId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("brand_footer_logos").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/settings/company");
}
