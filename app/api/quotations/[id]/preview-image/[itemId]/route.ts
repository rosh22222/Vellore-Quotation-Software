import { NextResponse } from "next/server";
import { loadOptimizedProductImage } from "@/lib/pdf-product-images";
import { isSafeProductImageUrl } from "@/lib/product-image-url";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

function productImageFallback(storeCode: string) {
  const label = storeCode.replace(/[^a-z0-9-]/gi, "").slice(0, 12).toUpperCase() || "VF";
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" role="img" aria-label="${label}">
      <text x="50" y="54" text-anchor="middle" dominant-baseline="middle"
        fill="#e30613" font-family="Arial, sans-serif" font-size="14" font-weight="900">${label}</text>
    </svg>
  `);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const { supabase, user } = await requireUser();
  const { data: quotation, error: quotationError } = await supabase
    .from("quotations")
    .select("id")
    .eq("id", id)
    .eq("store_id", user.storeId)
    .maybeSingle();

  if (quotationError || !quotation) {
    return NextResponse.json({ error: "Product image not found" }, { status: 404 });
  }

  const { data: item, error } = await supabase
    .from("quotation_items")
    .select("image_url")
    .eq("id", itemId)
    .eq("quotation_id", id)
    .eq("store_id", user.storeId)
    .single();

  if (error || !item?.image_url || !isSafeProductImageUrl(item.image_url)) {
    return NextResponse.json({ error: "Product image not found" }, { status: 404 });
  }

  try {
    const result = await loadOptimizedProductImage(item.image_url);

    if (!result) {
      console.warn(`Using product image fallback for quotation item ${itemId}`);
      const fallback = productImageFallback(user.storeCode);
      return new NextResponse(new Uint8Array(fallback), {
        headers: {
          "Cache-Control": "private, max-age=300",
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Content-Length": String(fallback.length),
          "X-Product-Image-Fallback": "1"
        }
      });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
        "Content-Type": result.contentType,
        "Content-Length": String(result.buffer.length)
      }
    });
  } catch (error) {
    console.warn(`Unable to load quotation preview image ${itemId}`, error);
    return NextResponse.json({ error: "Unable to load product image" }, { status: 502 });
  }
}
