import { NextResponse } from "next/server";
import { isSafeProductImageUrl } from "@/lib/product-image-url";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PREVIEW_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 8_000;

type PreviewImageResult =
  | { ok: true; image: ArrayBuffer; contentType: string }
  | { ok: false; error: string; status: number };

function retryDelay(attempt: number) {
  return new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
}

async function loadPreviewImage(imageUrl: string): Promise<PreviewImageResult> {
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(imageUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });
      const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase() || "";
      const declaredSize = Number(response.headers.get("content-length") || 0);

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < FETCH_ATTEMPTS - 1) {
          await retryDelay(attempt);
          continue;
        }

        return { ok: false, error: "Unable to load product image", status: 502 };
      }

      if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
        return { ok: false, error: "Unsupported product image", status: 415 };
      }

      if (declaredSize > MAX_PREVIEW_IMAGE_BYTES) {
        return { ok: false, error: "Product image is too large", status: 413 };
      }

      const image = await response.arrayBuffer();
      if (image.byteLength > MAX_PREVIEW_IMAGE_BYTES) {
        return { ok: false, error: "Product image is too large", status: 413 };
      }

      return { ok: true, image, contentType };
    } catch {
      if (attempt < FETCH_ATTEMPTS - 1) {
        await retryDelay(attempt);
        continue;
      }
    }
  }

  return { ok: false, error: "Unable to load product image", status: 502 };
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
    const result = await loadPreviewImage(item.image_url);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return new NextResponse(result.image, {
      headers: {
        "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
        "Content-Type": result.contentType,
        "Content-Length": String(result.image.byteLength)
      }
    });
  } catch (error) {
    console.warn(`Unable to load quotation preview image ${itemId}`, error);
    return NextResponse.json({ error: "Unable to load product image" }, { status: 502 });
  }
}
