alter table public.stores
alter column pdf_theme_color set default '#512B46';

alter table public.stores
alter column secondary_theme_color set default '#C08A3E';

update public.stores
set
  pdf_theme_color = '#512B46',
  secondary_theme_color = '#C08A3E'
where store_code in ('VFE', 'FMV');
