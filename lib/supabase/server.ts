import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { getStoreById } from "@/lib/data";

export async function createServerSupabaseClient() {
  return createSupabaseAdminClient();
}

export async function requireUser() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session) {
    throw new Error("Authentication required");
  }

  const supabase = await createServerSupabaseClient();
  let member:
    | {
        id: string;
        email: string;
        member_name: string;
        role: "Admin" | "Manager" | "Sales Executive";
        branch_location: string;
        profile_photo_url: string | null;
        max_discount_percent: number;
        store_id: string;
      }
    | null = null;
  let storeId = session.storeId || "";

  if (session.memberId) {
    const { data, error } = await supabase
      .from("team_members")
      .select(
        "id, email, member_name, role, branch_location, profile_photo_url, max_discount_percent, store_id"
      )
      .eq("id", session.memberId)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data || data.email.toLowerCase() !== session.email.toLowerCase()) {
      throw new Error("Authentication required");
    }

    member = data;
    storeId = data.store_id;
  } else {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("store_id")
      .eq("email", session.email.toLowerCase())
      .maybeSingle();

    if (error) throw new Error("Authentication required");
    storeId = profile?.store_id || session.storeId || "";
  }

  if (!storeId) {
    throw new Error("Authentication required");
  }

  const store = await getStoreById(supabase, storeId);
  if (!store || store.status !== "active") {
    throw new Error("Authentication required");
  }

  return {
    supabase,
    user: {
      id: member?.id || null,
      storeId,
      storeCode: store.store_code,
      storeName: store.store_name,
      storeLogoUrl: store.logo_url,
      storeProfileImageUrl: store.profile_image_url,
      email: member?.email || session.email,
      name: member?.member_name || session.name,
      role: member?.role || session.role,
      branchLocation: member?.branch_location || session.branchLocation,
      profilePhotoUrl: member?.profile_photo_url || session.profilePhotoUrl,
      maxDiscountPercent:
        member && member.role !== "Admin" ? Number(member.max_discount_percent) : null
    }
  };
}

export async function requireAdmin() {
  const context = await requireUser();

  if (context.user.role !== "Admin") {
    throw new Error("Administrator access required");
  }

  return context;
}
