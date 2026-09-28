update public.stores
set
  pdf_header_image_url = '/pdf/FMV-header-banner.png',
  pdf_footer_image_url = '/pdf/FMV-brands-footer.png'
where store_code = 'FMV';

update public.stores
set
  pdf_header_image_url = '/pdf/VFE-header-banner.png',
  pdf_footer_image_url = '/pdf/VFE-brands-footer.png'
where store_code = 'VFE';
