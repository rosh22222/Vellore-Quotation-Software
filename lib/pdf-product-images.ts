import sharp from "sharp";
import { isSafeProductImageUrl } from "@/lib/product-image-url";
import type { QuotationItem } from "@/lib/types";

const ALLOWED_SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_OPTIMIZED_BYTES = 220 * 1024;
const FETCH_ATTEMPTS = 2;
const FETCH_TIMEOUT_MS = 6_000;
const MAX_REDIRECTS = 3;
const CONCURRENCY = 6;

export type OptimizedProductImage = {
  buffer: Buffer;
  contentType: "image/jpeg";
};

function retryDelay(attempt: number) {
  return new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
}

async function readBoundedResponse(response: Response) {
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_SOURCE_BYTES) return null;

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length && buffer.length <= MAX_SOURCE_BYTES ? buffer : null;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_SOURCE_BYTES) {
      await reader.cancel();
      return null;
    }

    chunks.push(Buffer.from(value));
  }

  return totalBytes ? Buffer.concat(chunks, totalBytes) : null;
}

async function fetchSafeImage(url: URL, redirectCount = 0): Promise<Response | null> {
  if (!isSafeProductImageUrl(url.toString()) || redirectCount > MAX_REDIRECTS) return null;

  const response = await fetch(url, {
    cache: "no-store",
    redirect: "manual",
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; VelloreQuotationPdf/1.0)"
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) return null;

    return fetchSafeImage(new URL(location, url), redirectCount + 1);
  }

  return response.ok ? response : null;
}

async function optimizeImage(buffer: Buffer) {
  const attempts = [
    { size: 640, quality: 76 },
    { size: 520, quality: 66 },
    { size: 420, quality: 56 }
  ];
  let smallest: Buffer | null = null;

  for (const attempt of attempts) {
    const output = await sharp(buffer, { failOn: "warning" })
      .rotate()
      .resize(attempt.size, attempt.size, {
        fit: "inside",
        withoutEnlargement: true
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: attempt.quality, mozjpeg: true })
      .toBuffer();

    if (!smallest || output.length < smallest.length) smallest = output;
    if (output.length <= MAX_OPTIMIZED_BYTES) return output;
  }

  return smallest;
}

export async function loadOptimizedProductImage(
  imageUrl: string
): Promise<OptimizedProductImage | null> {
  if (!isSafeProductImageUrl(imageUrl)) return null;

  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchSafeImage(new URL(imageUrl));
      if (!response) throw new Error("Image request failed");

      const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase() || "";
      if (!ALLOWED_SOURCE_TYPES.has(contentType)) return null;

      const source = await readBoundedResponse(response);
      if (!source) return null;

      const optimized = await optimizeImage(source);
      if (!optimized?.length) return null;

      return { buffer: optimized, contentType: "image/jpeg" };
    } catch {
      if (attempt < FETCH_ATTEMPTS - 1) {
        await retryDelay(attempt);
      }
    }
  }

  return null;
}

export async function prepareQuotationItemsForPdf(items: QuotationItem[]) {
  const urls = Array.from(
    new Set(
      items
        .map((item) => String(item.image_url || "").trim())
        .filter((url) => url && isSafeProductImageUrl(url))
    )
  );
  const optimizedByUrl = new Map<string, string | null>();

  for (let index = 0; index < urls.length; index += CONCURRENCY) {
    const batch = urls.slice(index, index + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (url) => {
        const image = await loadOptimizedProductImage(url);
        return [
          url,
          image
            ? `data:${image.contentType};base64,${image.buffer.toString("base64")}`
            : null
        ] as const;
      })
    );

    results.forEach(([url, dataUrl]) => optimizedByUrl.set(url, dataUrl));
  }

  return items.map((item) => {
    const imageUrl = String(item.image_url || "").trim();
    if (!imageUrl) return item;

    return {
      ...item,
      image_url: optimizedByUrl.get(imageUrl) || null
    };
  });
}
