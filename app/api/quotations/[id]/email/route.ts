import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("quotations")
    .select("id")
    .eq("id", id)
    .eq("store_id", user.storeId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      error:
        "Email delivery is structured as a future module. Add SMTP or transactional email credentials to enable sending."
    },
    { status: 501 }
  );
}
