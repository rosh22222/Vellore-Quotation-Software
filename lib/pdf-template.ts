import {
  Building2,
  ClipboardList,
  FileText,
  HandCoins,
  Headset,
  IndianRupee,
  Landmark,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  type LucideIcon
} from "lucide-react";
import type { CompanySettings, Customer, Quotation, QuotationItem } from "@/lib/types";
import { formatCustomerName, formatDate, normalizeRoundedDisplayNumber } from "@/lib/format";
import type { PdfChromeImages } from "@/lib/pdf-assets";
import { isSafeProductImageUrl } from "@/lib/product-image-url";

type PdfTemplateInput = {
  quotation: Quotation;
  items: QuotationItem[];
  settings: CompanySettings;
  chromeImages?: PdfChromeImages;
  documentVariant?: PdfDocumentVariant;
};

type PdfDocumentVariant = "quotation" | "proforma";

function isFitnessMart(settings: CompanySettings) {
  return settings.store_code.trim().toUpperCase() === "FMV";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function customerFromSnapshot(snapshot: Quotation["customer_snapshot"]) {
  return snapshot as Partial<Customer>;
}

function fitnessMartCustomerName(customer: Partial<Customer>) {
  const suffix = String(customer.suffix || "").trim();
  const displaySuffix = /^(mr|mrs|dr)$/i.test(suffix) && !suffix.endsWith(".")
    ? `${suffix}.`
    : suffix;
  const fullName = [displaySuffix, customer.customer_name]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

  return fullName || String(customer.business_name || "Customer").trim();
}

function customerFullAddress(customer: Partial<Customer>) {
  const parts = [
    ...String(customer.address || "").split(","),
    customer.city,
    customer.state,
    customer.pincode
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const seen = new Set<string>();

  return parts
    .filter((part) => {
      const normalized = part.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join(", ");
}

function amount(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(normalizeRoundedDisplayNumber(Number(value || 0)));
}

function lines(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  return escapeHtml(text).replace(/\r?\n/g, "<br>");
}

function labelLine(label: string, value: unknown) {
  const text = String(value ?? "").trim();
  return text ? `${escapeHtml(label)} : ${escapeHtml(text)}<br>` : "";
}

function productBrand(item: QuotationItem, settings: CompanySettings) {
  const brand = String(item.brand_name || "").trim();
  return brand || settings.quotation_prefix || "VF";
}

function isPreviewImagePath(value: string) {
  return /^\/api\/quotations\/[0-9a-f-]+\/preview-image\/[0-9a-f-]+$/i.test(value);
}

function productImage(item: QuotationItem, settings: CompanySettings) {
  if (
    !item.image_url ||
    (!isSafeProductImageUrl(item.image_url) && !isPreviewImagePath(item.image_url))
  ) {
    return `<div class="product-fallback">${escapeHtml(settings.quotation_prefix || "VF")}</div>`;
  }

  return `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.product_name)}" />`;
}

function productDescription(item: QuotationItem) {
  const detail = [
    lines(item.description),
    labelLine("Dimensions", item.dimensions),
    labelLine("Machine Weight", item.machine_weight),
    labelLine("Stack Weight", item.stack_weight),
    lines(item.specifications)
  ]
    .filter(Boolean)
    .join("");

  return `<strong>${escapeHtml(item.product_name)}</strong>${detail ? `<br><br>${detail}` : ""}`;
}

function fitnessMartProductDescription(item: QuotationItem) {
  const detail = [
    lines(item.description),
    labelLine("Dimensions", item.dimensions),
    labelLine("Machine Weight", item.machine_weight),
    labelLine("Stack Weight", item.stack_weight),
    lines(item.specifications)
  ]
    .filter(Boolean)
    .join("");

  return detail || "-";
}

function fitnessMartTableColumns(documentVariant: PdfDocumentVariant) {
  if (documentVariant === "proforma") {
    return `
      <colgroup>
        <col class="fmv-c-serial" />
        <col class="fmv-c-proforma-name" />
        <col class="fmv-c-list" />
        <col class="fmv-c-offer" />
        <col class="fmv-c-qty" />
        <col class="fmv-c-extension" />
      </colgroup>
    `;
  }

  return `
    <colgroup>
      <col class="fmv-c-serial" />
      <col class="fmv-c-name" />
      <col class="fmv-c-description" />
      <col class="fmv-c-product" />
      <col class="fmv-c-list" />
      <col class="fmv-c-offer" />
      <col class="fmv-c-qty" />
      <col class="fmv-c-extension" />
    </colgroup>
  `;
}

function fitnessMartTableHead(documentVariant: PdfDocumentVariant) {
  if (documentVariant === "proforma") {
    return `
      <thead>
        <tr>
          <th>S.No</th>
          <th>Product Name</th>
          <th>List Price<br>${currencyHeaderMark()}</th>
          <th>Offer Price<br>${currencyHeaderMark()}</th>
          <th>Qty</th>
          <th>Final Price<br>${currencyHeaderMark()}</th>
        </tr>
      </thead>
    `;
  }

  return `
    <thead>
      <tr>
        <th>S.No</th>
        <th>Product Name</th>
        <th>Description</th>
        <th>Product</th>
        <th>List Price<br>${currencyHeaderMark()}</th>
        <th>Offer Price<br>${currencyHeaderMark()}</th>
        <th>Qty</th>
        <th>Final Price<br>${currencyHeaderMark()}</th>
      </tr>
    </thead>
  `;
}

function fitnessMartProductRows(
  items: QuotationItem[],
  settings: CompanySettings,
  documentVariant: PdfDocumentVariant,
  startIndex: number
) {
  if (!items.length) {
    return `
      <tr class="fmv-product-row">
        <td class="center" colspan="${documentVariant === "proforma" ? 6 : 8}">No products selected.</td>
      </tr>
    `;
  }

  return items
    .map(
      (item, index) =>
        documentVariant === "proforma"
          ? `
      <tr class="fmv-product-row">
        <td class="fmv-serial-cell">${startIndex + index + 1}</td>
        <td class="fmv-name-cell">
          <strong>${escapeHtml(item.product_name)}</strong>
        </td>
        <td class="fmv-money-cell">${amount(item.unit_price)}</td>
        <td class="fmv-money-cell"><strong>${amount(item.special_price)}</strong></td>
        <td class="fmv-qty-cell">${amount(item.qty)}</td>
        <td class="fmv-money-cell">${amount(item.line_total)}</td>
      </tr>
    `
          : `
      <tr class="fmv-product-row">
        <td class="fmv-serial-cell">${startIndex + index + 1}</td>
        <td class="fmv-name-cell">
          <strong>${escapeHtml(item.product_name)}</strong>
        </td>
        <td class="fmv-description-cell">${fitnessMartProductDescription(item)}</td>
        <td class="fmv-product-cell">
          <div class="fmv-product-card">
            <div class="fmv-product-photo">${productImage(item, settings)}</div>
            <strong>${escapeHtml(productBrand(item, settings))}</strong>
          </div>
        </td>
        <td class="fmv-money-cell">${amount(item.unit_price)}</td>
        <td class="fmv-money-cell"><strong>${amount(item.special_price)}</strong></td>
        <td class="fmv-qty-cell">${amount(item.qty)}</td>
        <td class="fmv-money-cell">${amount(item.line_total)}</td>
      </tr>
    `
    )
    .join("");
}

function fitnessMartProductTable({
  items,
  settings,
  className = "",
  documentVariant = "quotation",
  startIndex = 0
}: {
  items: QuotationItem[];
  settings: CompanySettings;
  className?: string;
  documentVariant?: PdfDocumentVariant;
  startIndex?: number;
}) {
  return `
    <table class="fmv-product-table ${className}">
      ${fitnessMartTableColumns(documentVariant)}
      ${fitnessMartTableHead(documentVariant)}
      <tbody>${fitnessMartProductRows(items, settings, documentVariant, startIndex)}</tbody>
    </table>
  `;
}

function tableColumns(documentVariant: PdfDocumentVariant) {
  if (documentVariant === "proforma") {
    return `
    <colgroup>
      <col class="c-no" />
      <col class="c-proforma-product" />
      <col class="c-unit" />
      <col class="c-special" />
      <col class="c-qty" />
      <col class="c-total" />
    </colgroup>
  `;
  }

  return `
    <colgroup>
      <col class="c-no" />
      <col class="c-product" />
      <col class="c-desc" />
      <col class="c-unit" />
      <col class="c-special" />
      <col class="c-qty" />
      <col class="c-total" />
    </colgroup>
  `;
}

function currencyHeaderMark() {
  return `<span class="currency-mark" aria-label="Indian rupee">(<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3h12"></path><path d="M6 8h12"></path><path d="M6 13h3"></path><path d="M9 13c6.667 0 6.667-10 0-10"></path><path d="m6 13 8.5 8"></path></svg>)</span>`;
}

function tableHead(documentVariant: PdfDocumentVariant) {
  if (documentVariant === "proforma") {
    return `
    <thead>
      <tr>
        <th>#</th>
        <th>Model/Description</th>
        <th>Unit Price<br>${currencyHeaderMark()}</th>
        <th>Special<br>Price ${currencyHeaderMark()}</th>
        <th>Qty</th>
        <th>Total<br>${currencyHeaderMark()}</th>
      </tr>
    </thead>
  `;
  }

  return `
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Description</th>
        <th>Unit Price<br>${currencyHeaderMark()}</th>
        <th>Special<br>Price ${currencyHeaderMark()}</th>
        <th>Qty</th>
        <th>Total<br>${currencyHeaderMark()}</th>
      </tr>
    </thead>
  `;
}

function productRows(
  items: QuotationItem[],
  startIndex: number,
  settings: CompanySettings,
  documentVariant: PdfDocumentVariant
) {
  if (!items.length) {
    return `
      <tr class="p-row">
        <td class="center top" colspan="${documentVariant === "proforma" ? 6 : 7}">No products selected.</td>
      </tr>
    `;
  }

  return items
    .map((item, index) =>
      documentVariant === "proforma"
        ? `
      <tr class="p-row">
        <td class="center top">${startIndex + index + 1}</td>
        <td class="desc proforma-product-desc"><strong>${escapeHtml(item.product_name)}</strong></td>
        <td class="center top">${amount(item.unit_price)}</td>
        <td class="center top">${amount(item.special_price)}</td>
        <td class="center top">${amount(item.qty)}</td>
        <td class="center top">${amount(item.line_total)}</td>
      </tr>
    `
        : `
      <tr class="p-row">
        <td class="center top">${startIndex + index + 1}</td>
        <td>
          <div class="product-card">
            ${productImage(item, settings)}
            <strong>${escapeHtml(productBrand(item, settings))}</strong>
          </div>
        </td>
        <td class="desc">${productDescription(item)}</td>
        <td class="center top">${amount(item.unit_price)}</td>
        <td class="center top">${amount(item.special_price)}</td>
        <td class="center top">${amount(item.qty)}</td>
        <td class="center top">${amount(item.line_total)}</td>
      </tr>
    `
    )
    .join("");
}

function productTable({
  items,
  startIndex,
  settings,
  className = "",
  showHead = true,
  documentVariant = "quotation"
}: {
  items: QuotationItem[];
  startIndex: number;
  settings: CompanySettings;
  className?: string;
  showHead?: boolean;
  documentVariant?: PdfDocumentVariant;
}) {
  return `
    <table class="product-table ${documentVariant === "proforma" ? "proforma-table" : ""} ${className}">
      ${tableColumns(documentVariant)}
      ${showHead ? tableHead(documentVariant) : ""}
      <tbody>${productRows(items, startIndex, settings, documentVariant)}</tbody>
    </table>
  `;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function splitProductPages(
  items: QuotationItem[],
  fitnessMartLayout: boolean,
  documentVariant: PdfDocumentVariant
) {
  const isProforma = documentVariant === "proforma";
  const firstPageSize = isProforma ? 10 : fitnessMartLayout ? 6 : 4;
  const continuationPageSize = isProforma ? 15 : fitnessMartLayout ? 7 : 5;
  const first = items.slice(0, firstPageSize);
  return {
    first,
    continuation: chunk(items.slice(firstPageSize), continuationPageSize)
  };
}

function headerImage(chromeImages: PdfChromeImages) {
  return chromeImages.top
    ? `<img class="top-banner" src="${escapeHtml(chromeImages.top)}" alt="Quotation header banner" />`
    : "";
}

function iconMarkup(src: string | undefined, alt: string) {
  return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">` : "";
}

function fmvIcon(Icon: LucideIcon) {
  type IconNode = Array<[string, Record<string, string | number>]>;
  type IconRenderer = {
    render: (
      props: Record<string, never>,
      ref: null
    ) => { props: { iconNode: IconNode } };
  };

  const { iconNode } = (Icon as unknown as IconRenderer).render({}, null).props;
  const nodes = iconNode
    .map(([tag, attributes]) => {
      const serializedAttributes = Object.entries(attributes)
        .filter(([name]) => name !== "key")
        .map(([name, value]) => {
          const attributeName = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
          return `${attributeName}="${escapeHtml(value)}"`;
        })
        .join(" ");
      return `<${tag}${serializedAttributes ? ` ${serializedAttributes}` : ""}></${tag}>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${nodes}</svg>`;
}

function gstText(quotation: Quotation) {
  if (quotation.gst_mode === "included") return "* GST Included.";
  if (quotation.gst_mode === "none") return "* No GST.";
  return "* GST Extra.";
}

function termsBlocks(quotation: Quotation) {
  return `
    <div class="terms-entry terms-first"><strong>Terms and Conditions:</strong><br>${lines(quotation.terms)}</div>
    <div class="terms-entry"><strong>Warranty:</strong><br>${lines(quotation.warranty_note)}</div>
    <div class="terms-entry"><strong>Delivery:</strong><br>${lines(quotation.delivery_note)}</div>
    <div class="terms-entry"><strong>Transportation:</strong><br>${lines(quotation.transportation_note)}</div>
    <div class="terms-entry"><strong>GST:</strong><br>${gstText(quotation)}</div>
    <div class="terms-entry"><strong>Payment:</strong><br>${lines(quotation.payment_terms)}</div>
  `;
}

function afterSalesBlock(quotation: Quotation) {
  return `
    <div class="support-block line-bottom">
      <strong>After sales Support:</strong><br>
      ${lines(quotation.after_sales_support)}
    </div>
  `;
}

function totalsTable(quotation: Quotation, hideRoundOff = false) {
  const grandTotal = hideRoundOff ? quotation.net_total : quotation.grand_total;
  const tableClass = hideRoundOff ? "total-table fmv-total-table" : "total-table";

  return `
    <table class="${tableClass}">
      <tr><td>Total List Price</td><td>${amount(quotation.total_list_price)}</td></tr>
      <tr><td>Discount</td><td>${amount(quotation.discount_amount)}</td></tr>
      <tr><td>${hideRoundOff ? "Total Offer Price" : "Total Special Price"}</td><td>${amount(quotation.total_special_price)}</td></tr>
      <tr><td>GST</td><td>${amount(quotation.gst_amount)}</td></tr>
      ${hideRoundOff ? "" : `<tr><td>Net Total</td><td>${amount(quotation.net_total)}</td></tr>`}
      ${hideRoundOff ? "" : `<tr><td>Round Off</td><td>${amount(quotation.round_off)}</td></tr>`}
      <tr><td>Grand Total</td><td>${amount(grandTotal)}</td></tr>
    </table>
  `;
}

function bankBlock(settings: CompanySettings) {
  return `
    <div class="bank-block">
      <strong>Bank Details - NEFT, RTGS, UPI, IMPS:</strong><br>
      Firm Name - ${escapeHtml(settings.bank_firm_name || settings.company_name)}<br>
      Bank Name : ${escapeHtml(settings.bank_name)}<br>
      Account No : ${escapeHtml(settings.bank_account_no)}<br>
      Branch : ${escapeHtml(settings.bank_branch)}<br>
      IFSC Code : ${escapeHtml(settings.bank_ifsc)}
    </div>
  `;
}

function fitnessMartTermItem(
  Icon: LucideIcon,
  number: number,
  heading: string,
  content: string
) {
  return `
    <div class="fmv-term-item">
      <div class="fmv-term-icon">${fmvIcon(Icon)}</div>
      <div>
        <div class="fmv-term-title">${number}. ${escapeHtml(heading)}</div>
        <div>${content}</div>
      </div>
    </div>
  `;
}

function fitnessMartTermsPanel(quotation: Quotation) {
  return `
    <section class="fmv-panel fmv-terms-panel">
      <div class="fmv-panel-heading">${fmvIcon(ClipboardList)}<span>Terms &amp; Conditions</span></div>
      <div class="fmv-terms-grid">
        <div class="fmv-terms-column">
          ${fitnessMartTermItem(FileText, 1, "Prices", lines(quotation.terms))}
          ${fitnessMartTermItem(ShieldCheck, 2, "Warranty", lines(quotation.warranty_note))}
          ${fitnessMartTermItem(Truck, 3, "Delivery", lines(quotation.delivery_note))}
        </div>
        <div class="fmv-terms-column fmv-terms-column-right">
          ${fitnessMartTermItem(Truck, 4, "Transportation", lines(quotation.transportation_note))}
          ${fitnessMartTermItem(IndianRupee, 5, "GST", gstText(quotation))}
          ${fitnessMartTermItem(HandCoins, 6, "Payment", lines(quotation.payment_terms))}
        </div>
      </div>
    </section>
  `;
}

function fitnessMartBankPanel(settings: CompanySettings) {
  const details = [
    ["Firm Name", settings.bank_firm_name || settings.company_name],
    ["Bank Name", settings.bank_name],
    ["Account No", settings.bank_account_no],
    ["Branch", settings.bank_branch],
    ["IFSC Code", settings.bank_ifsc]
  ];

  return `
    <section class="fmv-panel fmv-bank-panel">
      <div class="fmv-panel-heading">${fmvIcon(Landmark)}<span>Bank Details - NEFT, RTGS, UPI, IMPS</span></div>
      <div class="fmv-bank-grid">
        ${details
          .map(
            ([label, value]) => `
              <div class="fmv-bank-cell">
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(value)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function fitnessMartSupportBlock(quotation: Quotation) {
  return `
    <section class="fmv-support-panel">
      <div class="fmv-support-icon">${fmvIcon(Headset)}</div>
      <div><strong>After Sales Support</strong><br>${lines(quotation.after_sales_support)}</div>
    </section>
  `;
}

function fitnessMartSignatureBlock(
  settings: CompanySettings,
  signerName: string,
  signerDesignation: string
) {
  return `
    <section class="fmv-signature-block">
      <div class="fmv-company-signature">
        <strong>For ${escapeHtml(settings.company_name)}</strong>
        <strong>${escapeHtml(settings.company_branch || "VELLORE")}</strong>
      </div>
      <div class="fmv-signer">
        <div class="fmv-signature-line"></div>
        <strong>${escapeHtml(signerName)}</strong>
        ${signerDesignation ? `<span>${escapeHtml(signerDesignation)}</span>` : ""}
      </div>
    </section>
  `;
}

function fitnessMartContactRow(
  Icon: LucideIcon,
  content: string,
  strong = false,
  nowrap = false
) {
  const rowClass = `fmv-contact-row${nowrap ? " fmv-contact-row-nowrap" : ""}`;
  const contentClass = [strong ? "fmv-contact-strong" : "", nowrap ? "fmv-contact-nowrap" : ""]
    .filter(Boolean)
    .join(" ");

  return `
    <div class="${rowClass}">
      <span class="fmv-contact-icon">${fmvIcon(Icon)}</span>
      <span${contentClass ? ` class="${contentClass}"` : ""}>${content}</span>
    </div>
  `;
}

function fitnessMartOfficeBlock(settings: CompanySettings) {
  const primaryPhone = settings.phone_numbers.split("|")[0]?.trim() || settings.phone_numbers;

  return `
    <section class="fmv-office-panel">
      <div class="fmv-office-column">
        <div class="fmv-office-heading">${fmvIcon(Building2)}<span>Branch Office :</span></div>
        ${fitnessMartContactRow(MapPin, lines(settings.address))}
        ${fitnessMartContactRow(Phone, escapeHtml(settings.phone_numbers), true, true)}
        ${fitnessMartContactRow(Mail, escapeHtml(settings.email), false, true)}
        ${fitnessMartContactRow(FileText, `GST NO : ${escapeHtml(settings.gst_number)}`, true, true)}
      </div>
      <div class="fmv-office-column fmv-office-column-right">
        <div class="fmv-office-heading">${fmvIcon(Building2)}<span>Corporate Office :</span></div>
        ${fitnessMartContactRow(
          MapPin,
          `<strong>${escapeHtml(settings.company_name)}</strong><br>${lines(settings.address)}`
        )}
        ${fitnessMartContactRow(Mail, escapeHtml(settings.email), false, true)}
        ${fitnessMartContactRow(Phone, escapeHtml(primaryPhone), true, true)}
      </div>
    </section>
  `;
}

function firstPage({
  quotation,
  items,
  customer,
  settings,
  chromeImages,
  documentVariant
}: {
  quotation: Quotation;
  items: QuotationItem[];
  customer: Partial<Customer>;
  settings: CompanySettings;
  chromeImages: PdfChromeImages;
  documentVariant: PdfDocumentVariant;
}) {
  const isProforma = documentVariant === "proforma";
  const useFitnessMartLayout = isFitnessMart(settings);

  if (useFitnessMartLayout) {
    return `
      <section class="page page-1 product-page fmv-product-page">
        ${headerImage(chromeImages)}

        <h1 class="fmv-estimation-title">${isProforma ? "Proforma Invoice" : "Product Proposal"}</h1>

        <div class="fmv-customer-block">
          <div class="fmv-customer-left">
            <div class="fmv-customer-label">Prepared For</div>
            <strong class="fmv-customer-name">${escapeHtml(fitnessMartCustomerName(customer))}</strong>
            <div class="fmv-customer-detail">
              <span class="fmv-customer-icon">${fmvIcon(MapPin)}</span>
              <span>${escapeHtml(customerFullAddress(customer) || ".")}</span>
            </div>
            <div class="fmv-customer-detail">
              <span class="fmv-customer-icon">${fmvIcon(Phone)}</span>
              <span>${escapeHtml(customer.phone || "")}</span>
            </div>
          </div>
          <div class="fmv-customer-right">
            <div class="fmv-reference-item">
              <span>${isProforma ? "Proforma Invoice No." : "Proposal No."}</span>
              <strong>${escapeHtml(quotation.quote_number)}</strong>
            </div>
            <div class="fmv-reference-item">
              <span>Date</span>
              <strong>${formatDate(quotation.quote_date)}</strong>
            </div>
          </div>
        </div>

        ${fitnessMartProductTable({ items, settings, documentVariant, startIndex: 0 })}
      </section>
    `;
  }

  return `
    <section class="page page-1 product-page">
      ${headerImage(chromeImages)}

      <h1 class="quote-title">${isProforma ? "PROFORMA INVOICE" : "QUOTATION"}</h1>

      <div class="customer-block">
        <div class="customer-left">
          <div class="label">To:</div>
          <div class="customer-name">${escapeHtml(formatCustomerName(customer))},</div>
          <div>${escapeHtml(customer.phone || "")},</div>
          <div>${escapeHtml(customerFullAddress(customer) || ".")}</div>
        </div>
        <div class="customer-right">
          <div><strong>DATE: ${formatDate(quotation.quote_date)}</strong></div>
          <div><strong>${isProforma ? "PROFORMA INVOICE NO" : "QUOTATION NO"}: ${escapeHtml(
            quotation.quote_number
          )}</strong></div>
        </div>
      </div>

      ${productTable({ items, startIndex: 0, settings, documentVariant })}
    </section>
  `;
}

function productOnlyPage({
  items,
  startIndex,
  settings,
  chromeImages,
  documentVariant
}: {
  items: QuotationItem[];
  startIndex: number;
  settings: CompanySettings;
  chromeImages: PdfChromeImages;
  documentVariant: PdfDocumentVariant;
}) {
  const fitnessMartStore = isFitnessMart(settings);
  const useFitnessMartLayout = fitnessMartStore;

  return `
    <section class="page continuation-page product-only-page product-page${useFitnessMartLayout ? " fmv-product-page" : ""}">
      ${fitnessMartStore ? "" : headerImage(chromeImages)}
      ${
        useFitnessMartLayout
          ? fitnessMartProductTable({
              items,
              settings,
              className: "fmv-page2-products",
              documentVariant,
              startIndex
            })
          : productTable({ items, startIndex, settings, className: "page2-products", documentVariant })
      }
    </section>
  `;
}

function detailFlow({
  quotation,
  settings,
  chromeImages
}: {
  quotation: Quotation;
  settings: CompanySettings;
  chromeImages: PdfChromeImages;
}) {
  const phoneIconBig = iconMarkup(chromeImages.phoneIconBig, "phone");
  const phoneIcon = iconMarkup(chromeImages.phoneIcon, "phone");
  const mailIcon = iconMarkup(chromeImages.mailIcon, "mail");
  const signerName =
    settings.authorized_person_name === "Authorized Signatory"
      ? settings.owner_name || settings.company_name
      : settings.authorized_person_name || settings.owner_name || settings.company_name;
  const signerDesignation = /^for\s+/i.test(settings.authorized_person_designation)
    ? "National Head"
    : settings.authorized_person_designation || "National Head";
  const useFitnessMartLayout = isFitnessMart(settings);
  const detailBlocks = useFitnessMartLayout
    ? `
      ${totalsTable(quotation, true)}
      ${fitnessMartTermsPanel(quotation)}
      ${fitnessMartBankPanel(settings)}
      ${fitnessMartSupportBlock(quotation)}
      ${fitnessMartSignatureBlock(settings, signerName, signerDesignation)}
      ${fitnessMartOfficeBlock(settings)}
    `
    : `
      ${totalsTable(quotation)}
      ${termsBlocks(quotation)}
      ${bankBlock(settings)}
      ${afterSalesBlock(quotation)}

      <div class="signatory-block">
        <div class="company-line">
          <strong>For ${escapeHtml(settings.company_name)}</strong>
        </div>
        <div class="signature-row line-bottom">
          <div><strong>${escapeHtml(settings.company_branch || "VELLORE")}</strong></div>
          <div><strong>${escapeHtml(signerName)}</strong>${signerDesignation ? `<br>${escapeHtml(signerDesignation)}` : ""}</div>
        </div>
      </div>

      <div class="office-row">
        <div class="office-col">
          <h3>Branch Office :</h3>
          ${lines(settings.address)}<br>
          <span class="icon-text">${phoneIconBig} ${escapeHtml(settings.phone_numbers)} | ${escapeHtml(settings.email)}</span><br>
          <strong>GST NO : ${escapeHtml(settings.gst_number)}</strong>
        </div>
        <div class="office-col right-office">
          <h3>Corporate Office :</h3>
          <strong>${escapeHtml(settings.company_name)}</strong><br>
          ${escapeHtml(settings.address)}<br><br>
          <span class="icon-text">${mailIcon} ${escapeHtml(settings.email)}</span>
          <span class="sep">|</span>
          <span class="icon-text">${phoneIcon} ${escapeHtml(settings.phone_numbers.split("|")[0]?.trim() || settings.phone_numbers)}</span>
        </div>
      </div>
    `;

  return `
    <template id="pdf-flow-blocks">
      ${detailBlocks}
    </template>

    <template id="pdf-flow-page">
      <section class="page continuation-page details-page${useFitnessMartLayout ? " fmv-details-page" : ""}">
        ${useFitnessMartLayout ? "" : headerImage(chromeImages)}
        <div class="flow-area"></div>
      </section>
    </template>

    <script>
      (() => {
        const paginate = () => {
        const blockTemplate = document.getElementById("pdf-flow-blocks");
        const pageTemplate = document.getElementById("pdf-flow-page");
        const productPages = Array.from(document.querySelectorAll(".product-page"));
        let currentPage = productPages[productPages.length - 1];

        const createArea = (page) => {
          let area = page.querySelector(".flow-area");
          if (!area) {
            area = document.createElement("div");
            area.className = "flow-area";
            page.appendChild(area);
          }
          return area;
        };

        const createDetailsPage = () => {
          const fragment = pageTemplate.content.cloneNode(true);
          const page = fragment.querySelector(".details-page");
          document.body.insertBefore(fragment, blockTemplate);
          return page;
        };

        const blockFits = (page, block) => {
          const pageRect = page.getBoundingClientRect();
          const limit = pageRect.bottom - 45;
          return block.getBoundingClientRect().bottom <= limit + 0.5;
        };

        let area = createArea(currentPage);
        const blocks = Array.from(blockTemplate.content.children);

        for (const sourceBlock of blocks) {
          const block = sourceBlock.cloneNode(true);
          area.appendChild(block);

          if (!blockFits(currentPage, block)) {
            area.removeChild(block);
            currentPage = createDetailsPage();
            area = createArea(currentPage);
            area.appendChild(block);
          }
        }

        blockTemplate.remove();
        pageTemplate.remove();
        document.documentElement.dataset.pdfPagination = "ready";
        };

        if (document.readyState === "complete") paginate();
        else window.addEventListener("load", paginate, { once: true });
      })();
    </script>
  `;
}

export function renderQuotationHtml({
  quotation,
  items,
  settings,
  chromeImages = {},
  documentVariant = "quotation"
}: PdfTemplateInput) {
  const customer = customerFromSnapshot(quotation.customer_snapshot);
  const useFitnessMartLayout = isFitnessMart(settings);
  const { first, continuation } = splitProductPages(
    items,
    useFitnessMartLayout,
    documentVariant
  );
  let nextIndex = first.length;

  const continuationPages = continuation
    .map((pageItems) => {
      const html = productOnlyPage({
        items: pageItems,
        startIndex: nextIndex,
        settings,
        chromeImages,
        documentVariant
      });
      nextIndex += pageItems.length;
      return html;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(
    documentVariant === "proforma"
      ? `Proforma Invoice ${quotation.quote_number}`
      : quotation.quote_number
  )}</title>
  <style>
@font-face {
  font-family: "Quotation Numbers";
  src: local("Arial"), local("Liberation Sans"), local("DejaVu Sans");
  font-style: normal;
  font-weight: 400 600;
  unicode-range: U+0025, U+002C-0039, U+003A, U+20B9;
}

@font-face {
  font-family: "Quotation Numbers";
  src: local("Arial Bold"), local("Liberation Sans Bold"), local("DejaVu Sans Bold");
  font-style: normal;
  font-weight: 700 900;
  unicode-range: U+0025, U+002C-0039, U+003A, U+20B9;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: #e8e8e8;
  color: #000;
  font-family: "Quotation Numbers", Georgia, "Times New Roman", Times, serif;
  letter-spacing: 0;
}

.page {
  width: 210mm;
  height: 297mm;
  margin: 16px auto;
  padding: 8mm 11.7mm 12mm 11.7mm;
  background: #fff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 8px rgba(0,0,0,.22);
  page-break-after: always;
}

.page:last-child { page-break-after: auto; }

.top-banner {
  display: block;
  width: 100%;
  height: auto;
  margin: 0 0 3.2mm 0;
}

.continuation-page .top-banner {
  height: 52mm;
  object-fit: fill;
}

.quote-title {
  font-size: 14pt;
  line-height: 1;
  margin: 1mm 0 2.5mm 0;
  text-align: center;
  font-weight: 900;
}

.customer-block {
  min-height: 22mm;
  display: grid;
  grid-template-columns: 1fr 1fr;
  font-size: 8.3pt;
  line-height: 1.15;
  margin-bottom: 2mm;
}

.customer-left { padding-left: 9mm; }
.customer-left .label { font-size: 10pt; font-weight: 800; margin-bottom: 4.2mm; }
.customer-right { text-align: right; padding-top: 1.3mm; padding-right: 9mm; font-size: 8pt; }

.product-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 7.1pt;
  line-height: 1.12;
}

.product-table th,
.product-table td {
  border: 1.35px solid #000;
  padding: 1.6mm 1.5mm;
  vertical-align: top;
}

.product-table th {
  height: 8.8mm;
  text-align: center;
  font-weight: 900;
  vertical-align: middle;
}

.currency-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .35mm;
  white-space: nowrap;
  vertical-align: -.2mm;
}

.currency-mark svg {
  width: 2.7mm;
  height: 2.7mm;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.25;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.product-table .p-row td { height: 32.5mm; }
.product-table .desc {
  padding-top: 1.9mm;
  font-family: "Quotation Numbers", Verdana, "DejaVu Sans", sans-serif;
}
.center { text-align: center; }
.top { vertical-align: top !important; }

.c-no { width: 4.6%; }
.c-product { width: 19.7%; }
.c-desc { width: 39.7%; }
.c-proforma-product { width: 59.4%; }
.c-unit { width: 9%; }
.c-special { width: 9.2%; }
.c-qty { width: 4.8%; }
.c-total { width: 13%; }

.proforma-product-desc {
  padding-left: 2.2mm;
  padding-right: 2.2mm;
}

.product-card {
  width: 28.7mm;
  height: 29.5mm;
  margin: -0.2mm auto 0 auto;
  border: 1.2px solid #111;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;
  background: #fff;
}

.product-card img {
  width: 22.5mm;
  height: 23.5mm;
  object-fit: contain;
  display: block;
}

.product-fallback {
  width: 22.5mm;
  height: 23.5mm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: #e30613;
}

.product-card strong {
  font-size: 6.8pt;
  line-height: 1;
  padding: 0 0 1.5mm 0;
}

.page2-products {
  margin-top: .3mm;
}
.page2-products .p-row td {
  height: 31.5mm;
  padding-top: .8mm;
  padding-bottom: .8mm;
}

.proforma-invoice .product-table .p-row td {
  height: 10mm;
  padding-top: 1.8mm;
  padding-bottom: 1.8mm;
  vertical-align: middle;
}

.proforma-invoice .fmv-product-table .fmv-product-row td {
  height: 10mm;
  padding-top: 1.8mm;
  padding-bottom: 1.8mm;
  vertical-align: middle;
}

.total-table {
  width: 36%;
  margin: 0 0 0 auto;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 7.8pt;
  line-height: 1.08;
}

.total-table td {
  border: 1.35px solid #000;
  height: 6.6mm;
  padding: 1.4mm 2mm;
}

.total-table td:first-child { width: 63.89%; }
.total-table td:last-child { width: 36.11%; }

.fmv-total-table {
  width: 45%;
}

.fmv-total-table td:first-child { width: 57.5556%; }
.fmv-total-table td:last-child { width: 42.4444%; }

.terms-entry {
  margin-left: 9mm;
  width: 150mm;
  font-size: 8.25pt;
  line-height: 1.2;
  margin-bottom: 1mm;
  break-inside: avoid;
}

.terms-first { margin-top: 2mm; }

.terms-entry strong {
  display: inline-block;
  margin-bottom: .35mm;
  font-size: 8.6pt;
  line-height: 1.1;
}

.bank-block {
  margin: 1mm 9mm 0 9mm;
  padding-top: .9mm;
  padding-bottom: .9mm;
  border-top: 1.35px solid #000;
  border-bottom: 1.35px solid #000;
  font-size: 7.2pt;
  line-height: 1.15;
  min-height: 17mm;
}

.support-block {
  margin-top: 1mm;
  padding: 1.5mm 9mm 1mm 9mm;
  font-size: 7.6pt;
  line-height: 1.15;
}

.line-top { border-top: 1.35px solid #000; }
.line-bottom { border-bottom: 1.35px solid #000; }

.company-line {
  padding: 2.1mm 9mm;
  font-size: 8pt;
}

.signature-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3.2mm 9mm 3.8mm 9mm;
  font-size: 8pt;
  line-height: 1.15;
}
.signature-row div:nth-child(2) { padding-left: 34mm; }

.office-row {
  display: grid;
  grid-template-columns: 1.35fr .85fr;
  column-gap: 12mm;
  padding: 2.5mm 9mm 0 9mm;
  font-size: 7.45pt;
  line-height: 1.18;
}

.office-row h3 {
  font-size: 10pt;
  margin: 0 0 1mm 0;
}

.icon-text {
  display: inline-flex;
  align-items: center;
  gap: 1mm;
}

.icon-text img {
  width: 3.1mm;
  height: 3.1mm;
  object-fit: contain;
}

.sep { margin: 0 1.5mm; }

.fmv-product-page {
  padding: 6mm 6.5mm 10mm 6.5mm;
  font-family: Arial, "Liberation Sans", "DejaVu Sans", sans-serif;
}

.fmv-product-page.continuation-page {
  padding-top: 8mm;
}

.fmv-estimation-title {
  margin: 1.5mm 0 2.5mm 1.5mm;
  font-size: 17pt;
  line-height: 1;
  font-weight: 900;
  text-align: left;
  text-transform: uppercase;
}

.fmv-customer-block {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(48mm, 1fr);
  min-height: 28mm;
  margin-bottom: 2.5mm;
  overflow: hidden;
  border: 1.2px solid #1b1b1b;
  border-left: 2.2mm solid #e30613;
  background: #fff;
  font-size: 7.7pt;
  line-height: 1.2;
}

.fmv-customer-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2.2mm 4.5mm 2.2mm 3.5mm;
}

.fmv-customer-label {
  margin-bottom: .8mm;
  color: #c9000d;
  font-size: 6.2pt;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
}

.fmv-customer-name {
  display: block;
  margin-bottom: 1.2mm;
  color: #111;
  font-size: 10.5pt;
  line-height: 1.05;
}

.fmv-customer-detail {
  display: grid;
  grid-template-columns: 4.5mm minmax(0, 1fr);
  align-items: start;
  min-height: 4mm;
  color: #2d2d2d;
  font-size: 8.2pt;
  line-height: 1.22;
}

.fmv-customer-detail + .fmv-customer-detail {
  margin-top: .35mm;
}

.fmv-customer-icon {
  display: flex;
  padding-top: .15mm;
}

.fmv-customer-icon svg {
  width: 3.4mm;
  height: 3.4mm;
  stroke: #e30613;
}

.fmv-customer-right {
  display: grid;
  grid-template-rows: 1fr 1fr;
  border-left: 1.5mm solid #e30613;
  background: #fff;
  color: #111;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.fmv-reference-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.5mm 5mm;
}

.fmv-reference-item + .fmv-reference-item {
  border-top: 1px solid #c9c9c9;
}

.fmv-reference-item span {
  margin-bottom: .6mm;
  color: #c9000d;
  font-size: 6.1pt;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
}

.fmv-reference-item strong {
  color: #111;
  font-size: 8.7pt;
  line-height: 1.05;
}

.fmv-product-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-family: Arial, "Liberation Sans", "DejaVu Sans", sans-serif;
  font-size: 7.1pt;
  line-height: 1.18;
}

.fmv-product-table th,
.fmv-product-table td {
  border: 1px solid #222;
}

.fmv-product-table th {
  height: 10mm;
  padding: 1.5mm .8mm;
  background: #171717;
  color: #fff;
  font-size: 7.2pt;
  font-weight: 500;
  text-align: center;
  text-transform: uppercase;
  vertical-align: middle;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.fmv-product-table td {
  height: 23mm;
  padding: 1.5mm 1.3mm;
  vertical-align: middle;
  overflow-wrap: anywhere;
}

.fmv-c-serial { width: 4%; }
.fmv-c-name { width: 13%; }
.fmv-c-proforma-name { width: 51%; }
.fmv-c-description { width: 22.5%; }
.fmv-c-product { width: 15.5%; }
.fmv-c-list { width: 11.7%; }
.fmv-c-offer { width: 14.2%; }
.fmv-c-qty { width: 7%; }
.fmv-c-extension { width: 12.1%; }

.fmv-name-cell {
  text-align: center;
}

.fmv-name-cell strong {
  display: block;
  margin-bottom: 1mm;
  font-size: 7.8pt;
}

.fmv-description-cell {
  padding-left: 2.5mm !important;
  padding-right: 2mm !important;
}

.fmv-product-cell,
.fmv-money-cell,
.fmv-serial-cell,
.fmv-qty-cell {
  text-align: center;
}

.fmv-product-card {
  display: flex;
  height: 20mm;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.fmv-product-photo {
  display: flex;
  width: 100%;
  height: 16.5mm;
  align-items: center;
  justify-content: center;
}

.fmv-product-card > strong {
  min-height: 2.5mm;
  padding-top: .5mm;
  font-size: 6.5pt;
  line-height: 1;
  text-transform: uppercase;
}

.fmv-product-photo img,
.fmv-product-photo .product-fallback {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.fmv-product-photo .product-fallback {
  color: #e30613;
  font-weight: 900;
}

.fmv-page2-products {
  margin-top: 0;
}

.fmv-panel,
.fmv-support-panel,
.fmv-signature-block,
.fmv-office-panel {
  break-inside: avoid;
}

.fmv-panel {
  position: relative;
  margin: 5mm 2.2mm 0 2.2mm;
  padding-top: 3.5mm;
  border: 1.35px solid #111;
  border-radius: 2mm;
  font-family: "Quotation Numbers", Georgia, "Times New Roman", Times, serif;
}

.fmv-panel-heading,
.fmv-office-heading {
  display: inline-flex;
  align-items: center;
  gap: 2.2mm;
  color: #fff !important;
  background: #111 !important;
  font-family: "Quotation Numbers", Georgia, "Times New Roman", Times, serif;
  font-weight: 900;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.fmv-panel-heading {
  position: absolute;
  top: -4.7mm;
  left: 3.5mm;
  min-height: 9.2mm;
  padding: 1mm 4.5mm 1mm 2.5mm;
  border-radius: 1.5mm;
  font-size: 11.2pt;
  line-height: 1;
}

.fmv-panel-heading svg {
  width: 6.2mm;
  height: 6.2mm;
  stroke: currentColor;
}

.fmv-terms-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 1.5mm 3.5mm 2.2mm 3.5mm;
}

.fmv-terms-column-right {
  border-left: 1px solid #777;
  padding-left: 3mm;
}

.fmv-terms-column:first-child {
  padding-right: 3mm;
}

.fmv-term-item {
  display: grid;
  grid-template-columns: 10.5mm 1fr;
  column-gap: 1.5mm;
  min-height: 16.5mm;
  padding: 2.1mm .5mm 1.7mm .5mm;
  font-size: 7.45pt;
  line-height: 1.22;
}

.fmv-term-item + .fmv-term-item {
  border-top: 1px solid #777;
}

.fmv-term-icon {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: .2mm;
}

.fmv-term-icon svg {
  width: 8mm;
  height: 8mm;
  stroke: #111;
}

.fmv-term-title {
  margin-bottom: .7mm;
  font-size: 9.2pt;
  line-height: 1;
  font-weight: 900;
}

.fmv-bank-panel {
  min-height: 25mm;
}

.fmv-bank-grid {
  display: grid;
  grid-template-columns: 1.05fr 1.05fr 1.25fr 1fr 1fr;
  min-height: 19mm;
  padding: 2.2mm 3.5mm 2.3mm 3.5mm;
}

.fmv-bank-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 1mm;
  padding: 0 2mm;
  text-align: center;
  font-size: 7.6pt;
  line-height: 1.12;
  overflow-wrap: anywhere;
}

.fmv-bank-cell + .fmv-bank-cell {
  border-left: 1px solid #777;
}

.fmv-bank-cell strong {
  font-size: 8.2pt;
  line-height: 1;
}

.fmv-support-panel {
  display: grid;
  grid-template-columns: 13mm 1fr;
  align-items: center;
  min-height: 15mm;
  margin: 2mm 2.2mm 0 2.2mm;
  padding: 1.5mm 4mm;
  border: 1.35px solid #111;
  border-radius: 2mm;
  font-family: "Quotation Numbers", Georgia, "Times New Roman", Times, serif;
  font-size: 7.8pt;
  line-height: 1.18;
}

.fmv-support-panel strong {
  display: inline-block;
  margin-bottom: .5mm;
  font-size: 9pt;
}

.fmv-support-icon svg {
  width: 8.5mm;
  height: 8.5mm;
  stroke: #111;
}

.fmv-signature-block {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: end;
  min-height: 22mm;
  margin: 0 2.2mm;
  padding: 2.2mm .5mm 2.5mm .5mm;
  border-bottom: 1.35px solid #111;
  font-family: "Quotation Numbers", Georgia, "Times New Roman", Times, serif;
  font-size: 8.3pt;
  line-height: 1.15;
}

.fmv-company-signature {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4mm;
}

.fmv-signer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-left: 18mm;
  text-align: center;
}

.fmv-signature-line {
  width: 100%;
  margin-bottom: 1.2mm;
  border-top: 1.35px solid #111;
}

.fmv-signer strong {
  font-size: 8.3pt;
}

.fmv-signer span {
  font-size: 7.8pt;
}

.fmv-office-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 1.2mm 0 0 0;
  padding: 2.5mm 2.2mm 2mm 2.2mm;
  border-bottom: 1.35px solid #111;
  font-family: "Quotation Numbers", Georgia, "Times New Roman", Times, serif;
  font-size: 7.6pt;
  line-height: 1.19;
}

.fmv-office-column {
  padding: 0 4.5mm 0 2mm;
}

.fmv-office-column-right {
  padding: 0 2mm 0 7mm;
  border-left: 1.2px solid #111;
}

.fmv-office-heading {
  min-width: 43mm;
  min-height: 8mm;
  margin-bottom: 2mm;
  padding: .8mm 3mm .8mm 2.3mm;
  border-radius: 1.5mm;
  font-size: 9.8pt;
  line-height: 1;
}

.fmv-office-heading svg {
  width: 5.5mm;
  height: 5.5mm;
}

.fmv-contact-row {
  display: grid;
  grid-template-columns: 6.2mm minmax(0, 1fr);
  align-items: start;
  min-height: 5.1mm;
  margin-bottom: .3mm;
}

.fmv-contact-row-nowrap {
  align-items: center;
}

.fmv-contact-icon {
  display: flex;
  justify-content: center;
  padding-top: .15mm;
}

.fmv-contact-row-nowrap .fmv-contact-icon {
  padding-top: 0;
}

.fmv-contact-icon svg {
  width: 4.2mm;
  height: 4.2mm;
  fill: none;
  stroke: #111;
}

.fmv-contact-row span:last-child {
  overflow-wrap: anywhere;
}

.fmv-contact-nowrap {
  min-width: 0;
  overflow-wrap: normal !important;
  white-space: nowrap;
}

.fmv-contact-strong {
  font-weight: 900;
  font-size: 8.3pt;
  line-height: 1.12;
}

@media print {
  html, body { background: #fff; }
  .page {
    margin: 0;
    box-shadow: none;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  @page {
    size: A4;
    margin: 0;
  }
}
  </style>
</head>
<body class="${documentVariant === "proforma" ? "proforma-invoice" : "quotation-document"}">
  ${firstPage({ quotation, items: first, customer, settings, chromeImages, documentVariant })}
  ${continuationPages}
  ${detailFlow({ quotation, settings, chromeImages })}
</body>
</html>`;
}
