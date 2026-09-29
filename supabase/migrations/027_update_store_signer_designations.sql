update public.stores
set authorized_person_designation = 'National Head'
where store_code in ('VFE', 'FMV')
  and authorized_person_designation is distinct from 'National Head';
