import type { CompanySettings } from "@/lib/types";

export const DEFAULT_COMPANY_SETTINGS: Omit<
  CompanySettings,
  "id" | "created_at" | "updated_at"
> = {
  store_name: "VELLORE FITNESS EQUIPMENTS",
  company_name: "VELLORE FITNESS EQUIPMENTS",
  store_code: "VFE",
  owner_name: "DHASARATHAN SATHYAN",
  logo_url: null,
  profile_image_url: "/login image/VFE-profile-photo.png",
  pdf_header_image_url: "/pdf/VFE-header-banner.png",
  pdf_footer_image_url: null,
  gst_number: "33BXEPS1191Q1ZX",
  phone_numbers: "7200570570 | 7200571571",
  email: "wcvellore@gmail.com",
  address: "S F NO 45/22B2, KATPADI TO VELLORE MAIN ROAD, VIRUTHAMPET, TAMIL NADU, 632006.",
  company_branch: "VELLORE",
  bank_firm_name: "VELLORE FITNESS EQUIPMENT",
  bank_name: "HDFC BANK",
  bank_account_no: "50200015573250",
  bank_branch: "GANDHINAGAR, VELLORE",
  bank_ifsc: "HDFC0001245",
  pdf_theme_color: "#512B46",
  secondary_theme_color: "#C08A3E",
  default_gst_percent: 18,
  default_gst_mode: "add",
  default_validity_days: 30,
  default_terms: "The prices are valid only for 30 days.",
  default_warranty:
    "One year comprehensive warranty for parts and labor. Warranty does not cover plastic, rubber parts, upholstery, and physical damages. Treadmill warranty will be covered only on use of stabilizer.",
  default_delivery: "As per stock availability.",
  default_transportation:
    "Transportation charges extra. Unloading charges should be arranged by customer.",
  default_payment_terms: "100% advance payment along with purchase order.",
  default_after_sales_support:
    "Dedicated service support within 24 hours of complaint registration.",
  authorized_person_name: "DHASARATHAN SATHYAN",
  authorized_person_designation: "National Head",
  signature_url: null,
  brand_footer_heading: "ASSOCIATED FITNESS BRANDS",
  brand_footer_enabled: true,
  quotation_prefix: "VFE",
  status: "active"
};

export const STOCK_OPTIONS = ["In Stock", "Limited Stock", "On Order", "Out of Stock"];

export const QUOTATION_STATUSES = [
  "Draft",
  "Sent",
  "Accepted",
  "Rejected",
  "Cancelled"
] as const;

export const GST_MODES = [
  { value: "add", label: "Add GST on quote price" },
  { value: "included", label: "GST included in price" },
  { value: "none", label: "No GST" }
] as const;
