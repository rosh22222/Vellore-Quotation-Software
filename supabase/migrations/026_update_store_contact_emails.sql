update public.stores
set
  email = 'wcvellore@gmail.com',
  updated_at = now()
where store_code = 'VFE';

update public.stores
set
  email = 'herculesfitness@gmail.com',
  updated_at = now()
where store_code = 'FMV';

update public.quotations as quotation
set company_settings_snapshot = jsonb_set(
  quotation.company_settings_snapshot,
  '{email}',
  to_jsonb((
    case store.store_code
      when 'VFE' then 'wcvellore@gmail.com'
      when 'FMV' then 'herculesfitness@gmail.com'
    end
  )::text),
  true
)
from public.stores as store
where quotation.store_id = store.id
  and store.store_code in ('VFE', 'FMV');
