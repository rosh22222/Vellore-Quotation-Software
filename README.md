# Vellore Fitness Quotation Management System

Multi-store quotation system for:

- VELLORE FITNESS EQUIPMENTS (`VFE`)
- FITNESS MART VELLORE (`FMV`)

The app is built with Next.js, TypeScript, Tailwind CSS, custom signed-cookie authentication, Supabase PostgreSQL, Supabase Storage, and server-side PDF/Excel generation.

## Multi-Store Model

- Products, brands, and categories are shared across both stores.
- Customers, quotations, quotation numbers, generated PDFs, members, dashboard statistics, activity logs, and store settings are scoped by `store_id`.
- Quotation numbers are independent per store, for example `VFE-26-0001` and `FMV-26-0001`.
- Store-specific PDF settings include logo, profile image, PDF header/footer images, contact details, GST, bank details, terms, warranty, delivery, transportation, payment notes, theme colors, and quotation prefix.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your own Supabase and app values:

```powershell
Copy-Item .env.example .env
```

Do not commit `.env`, service-role keys, R2 credentials, or real passwords.

3. Apply Supabase migrations in order:

```bash
supabase db push
```

If using the Supabase SQL Editor manually, run all files in `supabase/migrations`, including `016_add_multi_store_support.sql`.

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000/login`.

## Seeded Stores

Migration `016_add_multi_store_support.sql` creates:

- `FITNESS MART VELLORE`, prefix `FMV`
- `VELLORE FITNESS EQUIPMENTS`, prefix `VFE`

It also creates starter admin member rows for the two store emails using salted PBKDF2 hashes. Rotate these credentials before production use. Do not store plain passwords in this repository.

## Storage Buckets

Existing bucket names are preserved:

- `product-images`
- `company-assets`
- `quotation-pdfs`
- `quotation-excels`
- `member-photos`

Generated quotation files are stored under store-code paths inside the existing buckets.

## Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

For end-to-end testing, use a migrated non-production Supabase project and a running local server:

```bash
npm run dev
npm run test:e2e
```

The e2e audit creates temporary members, products, customers, quotations, PDFs, and Excel files, checks both stores, verifies cross-store URL/API access is blocked, and then cleans up its test data.
