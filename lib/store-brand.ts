export function getStoreMarkUrl(
  storeCode?: string | null,
  storeName?: string | null
) {
  const code = String(storeCode || "").trim().toUpperCase();
  const name = String(storeName || "").trim().toUpperCase();

  if (code === "FMV" || name.includes("FITNESS MART")) {
    return "/login image/logo-FMV.png";
  }

  if (code === "VFE" || name.includes("VELLORE FITNESS")) {
    return "/login image/logo-VFE.png";
  }

  return null;
}
