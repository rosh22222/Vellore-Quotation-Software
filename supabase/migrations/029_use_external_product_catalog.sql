-- Product IDs now refer to the shared Span Fitness catalogue, which is hosted
-- in a separate Supabase project. PostgreSQL cannot enforce a cross-database
-- foreign key, so retain the UUID as an external reference and keep the full
-- product snapshot on each quotation item.
alter table public.quotation_items
drop constraint if exists quotation_items_product_id_fkey;

comment on column public.quotation_items.product_id is
  'External product UUID from the shared Span Fitness catalogue.';
