alter table public.stores
add column if not exists company_branch text;

update public.stores
set company_branch = 'VELLORE'
where company_branch is null or btrim(company_branch) = '';

alter table public.stores
alter column company_branch set default 'VELLORE';

alter table public.stores
alter column company_branch set not null;

notify pgrst, 'reload schema';
