update public.team_members as member
set
  email = 'wcvellore@gmail.com',
  updated_at = now()
from public.stores as store
where member.store_id = store.id
  and store.store_code = 'VFE'
  and member.role = 'Admin'
  and lower(member.email) = lower('vellorefitnessequipments@gmail.com');

update public.team_members as member
set
  email = 'herculesfitness@gmail.com',
  updated_at = now()
from public.stores as store
where member.store_id = store.id
  and store.store_code = 'FMV'
  and member.role = 'Admin'
  and lower(member.email) = lower('fitnessmartvellore@gmail.com');

update public.stores
set
  bank_firm_name = '',
  bank_name = '',
  bank_account_no = '',
  bank_branch = '',
  bank_ifsc = '',
  updated_at = now()
where store_code = 'FMV';

update public.quotations as quotation
set company_settings_snapshot = quotation.company_settings_snapshot || jsonb_build_object(
  'bank_firm_name', '',
  'bank_name', '',
  'bank_account_no', '',
  'bank_branch', '',
  'bank_ifsc', ''
)
from public.stores as store
where quotation.store_id = store.id
  and store.store_code = 'FMV';
