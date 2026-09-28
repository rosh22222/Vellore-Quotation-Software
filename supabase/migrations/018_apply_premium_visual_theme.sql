alter table public.stores
alter column pdf_theme_color set default '#0F5C4C';

alter table public.stores
alter column secondary_theme_color set default '#A9586A';

update public.stores
set
  pdf_theme_color = '#0F5C4C',
  secondary_theme_color = '#A9586A'
where store_code in ('VFE', 'FMV');
