update public.stores
set
  pdf_footer_image_url = null,
  updated_at = now()
where store_code in ('VFE', 'FMV');

update public.quotations as quotation
set company_settings_snapshot = jsonb_set(
  quotation.company_settings_snapshot,
  '{pdf_footer_image_url}',
  'null'::jsonb,
  true
)
from public.stores as store
where quotation.store_id = store.id
  and store.store_code in ('VFE', 'FMV');
