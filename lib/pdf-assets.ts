import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CompanySettings } from "@/lib/types";

type PdfImageName = "top" | "phoneIconBig" | "phoneIcon" | "mailIcon";

type PdfImageCandidate = {
  file: string;
  mime: string;
};

export type PdfChromeImages = {
  top?: string;
  phoneIconBig?: string;
  phoneIcon?: string;
  mailIcon?: string;
};

const imageCandidates: Record<PdfImageName, PdfImageCandidate[]> = {
  top: [
    { file: "header-banner.png", mime: "image/png" },
    { file: "top.png", mime: "image/png" },
    { file: "top.jpg", mime: "image/jpeg" },
    { file: "top.jpeg", mime: "image/jpeg" },
    { file: "top.webp", mime: "image/webp" }
  ],
  phoneIconBig: [
    { file: "phone-icon-big.png", mime: "image/png" },
    { file: "phone-icon-big.jpg", mime: "image/jpeg" },
    { file: "phone-icon-big.jpeg", mime: "image/jpeg" },
    { file: "phone-icon-big.webp", mime: "image/webp" }
  ],
  phoneIcon: [
    { file: "phone-icon.png", mime: "image/png" },
    { file: "phone-icon.jpg", mime: "image/jpeg" },
    { file: "phone-icon.jpeg", mime: "image/jpeg" },
    { file: "phone-icon.webp", mime: "image/webp" }
  ],
  mailIcon: [
    { file: "mail-icon.png", mime: "image/png" },
    { file: "mail-icon.jpg", mime: "image/jpeg" },
    { file: "mail-icon.jpeg", mime: "image/jpeg" },
    { file: "mail-icon.webp", mime: "image/webp" }
  ]
};

const remoteImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const localImageTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

export type ConfiguredPdfImage = {
  buffer: Buffer;
  mime: string;
};

async function readLocalPdfImage(url: string): Promise<ConfiguredPdfImage | undefined> {
  try {
    const pathname = decodeURIComponent(url.split(/[?#]/, 1)[0]);
    const match = pathname.match(/^\/pdf\/([a-z0-9][a-z0-9._-]*)$/i);
    if (!match) return undefined;

    const mime = localImageTypes[path.extname(match[1]).toLowerCase()];
    if (!mime) return undefined;

    const buffer = await readFile(path.join(process.cwd(), "public", "pdf", match[1]));
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) return undefined;

    return { buffer, mime };
  } catch {
    return undefined;
  }
}

async function readRemoteImage(url: string): Promise<ConfiguredPdfImage | undefined> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== "https:") return undefined;

  try {
    const response = await fetch(parsed, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000)
    });
    const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase() || "";
    const declaredSize = Number(response.headers.get("content-length") || 0);

    if (!response.ok || !remoteImageTypes.has(contentType) || declaredSize > 8 * 1024 * 1024) {
      return undefined;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) return undefined;

    return { buffer, mime: contentType };
  } catch {
    return undefined;
  }
}

export async function readConfiguredPdfImage(
  url: string | null | undefined
): Promise<ConfiguredPdfImage | undefined> {
  if (!url) return undefined;

  const normalized = url.trim();
  return normalized.startsWith("/")
    ? readLocalPdfImage(normalized)
    : readRemoteImage(normalized);
}

async function readPdfImage(name: PdfImageName) {
  for (const candidate of imageCandidates[name]) {
    const filePath = path.join(process.cwd(), "public", "pdf", candidate.file);

    try {
      const buffer = await readFile(filePath);
      return `data:${candidate.mime};base64,${buffer.toString("base64")}`;
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  return undefined;
}

export async function getPdfChromeImages(
  settings?: Pick<CompanySettings, "pdf_header_image_url">
): Promise<PdfChromeImages> {
  const [top, phoneIconBig, phoneIcon, mailIcon] = await Promise.all([
    readConfiguredPdfImage(settings?.pdf_header_image_url).then(
      (image) =>
        (image ? `data:${image.mime};base64,${image.buffer.toString("base64")}` : undefined) ||
        readPdfImage("top")
    ),
    readPdfImage("phoneIconBig"),
    readPdfImage("phoneIcon"),
    readPdfImage("mailIcon")
  ]);

  return { top, phoneIconBig, phoneIcon, mailIcon };
}
