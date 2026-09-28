alter table public.stores
alter column pdf_theme_color set default '#0F6B63';

alter table public.stores
alter column secondary_theme_color set default '#C7683D';

update public.stores
set
  pdf_theme_color = '#0F6B63',
  secondary_theme_color = '#C7683D'
where store_code in ('VFE', 'FMV');
