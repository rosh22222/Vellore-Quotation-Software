create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  store_name text not null,
  store_code text not null,
  owner_name text,
  logo_url text,
  profile_image_url text,
  pdf_header_image_url text,
  pdf_footer_image_url text,
  address text not null,
  phone_numbers text not null,
  email text not null,
  gst_number text not null,
  bank_firm_name text not null,
  bank_name text not null,
  bank_branch text not null,
  bank_account_no text not null,
  bank_ifsc text not null,
  pdf_theme_color text not null default '#93B5C6',
  secondary_theme_color text not null default '#FFE3E3',
  default_gst_percent numeric(5,2) not null default 18,
  default_gst_mode text not null default 'add' check (default_gst_mode in ('add', 'included', 'none')),
  default_validity_days integer not null default 30,
  default_terms text not null,
  default_warranty text not null,
  default_delivery text not null,
  default_transportation text not null,
  default_payment_terms text not null,
  default_after_sales_support text not null,
  authorized_person_name text not null default 'Authorized Signatory',
  authorized_person_designation text not null default 'Authorized Signatory',
  signature_url text,
  brand_footer_heading text not null default 'ASSOCIATED FITNESS BRANDS',
  brand_footer_enabled boolean not null default true,
  quotation_prefix text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists stores_store_code_lower_idx
on public.stores (lower(store_code));

create unique index if not exists stores_store_code_idx
on public.stores (store_code);

create unique index if not exists stores_quotation_prefix_lower_idx
on public.stores (lower(quotation_prefix));

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

alter table public.stores enable row level security;

insert into public.stores (
  store_name,
  store_code,
  owner_name,
  address,
  phone_numbers,
  email,
  gst_number,
  bank_firm_name,
  bank_name,
  bank_branch,
  bank_account_no,
  bank_ifsc,
  default_terms,
  default_warranty,
  default_delivery,
  default_transportation,
  default_payment_terms,
  default_after_sales_support,
  authorized_person_name,
  authorized_person_designation,
  quotation_prefix,
  status
)
values
  (
    'FITNESS MART VELLORE',
    'FMV',
    'MOHANAM SRIDHAR',
    'GROUND FLOOR, SF NO. 245/2, MM COMPLEX, VELLORE ROAD, DHARAPADAVEDU, VELLORE, TAMIL NADU, 632007.',
    '7200570570 | 7200571571',
    'fitnessmartvellore@gmail.com',
    '33EAXPS6131P1ZQ',
    'VELLORE FITNESS EQUIPMENT',
    'HDFC BANK',
    'GANDHINAGAR, VELLORE',
    '50200015573250',
    'HDFC0001245',
    'The prices are valid only for 30 days.',
    'One year comprehensive warranty for parts and labor. Warranty does not cover plastic, rubber parts, upholstery, and physical damages. Treadmill warranty will be covered only on use of stabilizer.',
    'As per stock availability.',
    'Transportation charges extra. Unloading charges should be arranged by customer.',
    '100% advance payment along with purchase order.',
    'Dedicated service support within 24 hours of complaint registration.',
    'MOHANAM SRIDHAR',
    'For FITNESS MART VELLORE',
    'FMV',
    'active'
  ),
  (
    'VELLORE FITNESS EQUIPMENTS',
    'VFE',
    'DHASARATHAN SATHYAN',
    'S F NO 45/22B2, KATPADI TO VELLORE MAIN ROAD, VIRUTHAMPET, TAMIL NADU, 632006.',
    '7200570570 | 7200571571',
    'vellorefitnessequipments@gmail.com',
    '33BXEPS1191Q1ZX',
    'VELLORE FITNESS EQUIPMENT',
    'HDFC BANK',
    'GANDHINAGAR, VELLORE',
    '50200015573250',
    'HDFC0001245',
    'The prices are valid only for 30 days.',
    'One year comprehensive warranty for parts and labor. Warranty does not cover plastic, rubber parts, upholstery, and physical damages. Treadmill warranty will be covered only on use of stabilizer.',
    'As per stock availability.',
    'Transportation charges extra. Unloading charges should be arranged by customer.',
    '100% advance payment along with purchase order.',
    'Dedicated service support within 24 hours of complaint registration.',
    'DHASARATHAN SATHYAN',
    'For VELLORE FITNESS EQUIPMENTS',
    'VFE',
    'active'
  )
on conflict (store_code) do update
set
  store_name = excluded.store_name,
  owner_name = excluded.owner_name,
  address = excluded.address,
  phone_numbers = excluded.phone_numbers,
  email = excluded.email,
  gst_number = excluded.gst_number,
  bank_firm_name = excluded.bank_firm_name,
  bank_name = excluded.bank_name,
  bank_branch = excluded.bank_branch,
  bank_account_no = excluded.bank_account_no,
  bank_ifsc = excluded.bank_ifsc,
  authorized_person_name = excluded.authorized_person_name,
  authorized_person_designation = excluded.authorized_person_designation,
  quotation_prefix = excluded.quotation_prefix,
  status = excluded.status,
  updated_at = now();

alter table public.profiles
add column if not exists store_id uuid references public.stores(id);

alter table public.team_members
add column if not exists store_id uuid references public.stores(id);

alter table public.customers
add column if not exists store_id uuid references public.stores(id);

alter table public.quotations
add column if not exists store_id uuid references public.stores(id);

alter table public.quotation_items
add column if not exists store_id uuid references public.stores(id);

alter table public.pdf_files
add column if not exists store_id uuid references public.stores(id);

alter table public.activity_logs
add column if not exists store_id uuid references public.stores(id);

alter table public.brand_footer_logos
add column if not exists store_id uuid references public.stores(id);

with default_store as (
  select id from public.stores where store_code = 'VFE' limit 1
)
update public.profiles
set store_id = default_store.id
from default_store
where public.profiles.store_id is null;

with default_store as (
  select id from public.stores where store_code = 'VFE' limit 1
)
update public.team_members
set store_id = default_store.id
from default_store
where public.team_members.store_id is null;

with default_store as (
  select id from public.stores where store_code = 'VFE' limit 1
)
update public.customers
set store_id = default_store.id
from default_store
where public.customers.store_id is null;

with default_store as (
  select id from public.stores where store_code = 'VFE' limit 1
)
update public.quotations
set store_id = default_store.id
from default_store
where public.quotations.store_id is null;

update public.quotation_items as item
set store_id = quotation.store_id
from public.quotations as quotation
where item.quotation_id = quotation.id
  and item.store_id is null;

with default_store as (
  select id from public.stores where store_code = 'VFE' limit 1
)
update public.quotation_items
set store_id = default_store.id
from default_store
where public.quotation_items.store_id is null;

update public.pdf_files as file
set store_id = quotation.store_id
from public.quotations as quotation
where file.quotation_id = quotation.id
  and file.store_id is null;

with default_store as (
  select id from public.stores where store_code = 'VFE' limit 1
)
update public.pdf_files
set store_id = default_store.id
from default_store
where public.pdf_files.store_id is null;

with default_store as (
  select id from public.stores where store_code = 'VFE' limit 1
)
update public.activity_logs
set store_id = default_store.id
from default_store
where public.activity_logs.store_id is null;

with default_store as (
  select id from public.stores where store_code = 'VFE' limit 1
)
update public.brand_footer_logos
set store_id = default_store.id
from default_store
where public.brand_footer_logos.store_id is null;

alter table public.profiles
alter column store_id set not null;

alter table public.team_members
alter column store_id set not null;

alter table public.customers
alter column store_id set not null;

alter table public.quotations
alter column store_id set not null;

alter table public.quotation_items
alter column store_id set not null;

alter table public.pdf_files
alter column store_id set not null;

alter table public.activity_logs
alter column store_id set not null;

alter table public.brand_footer_logos
alter column store_id set not null;

create index if not exists profiles_store_id_idx on public.profiles(store_id);
create index if not exists team_members_store_id_idx on public.team_members(store_id);
create index if not exists customers_store_id_updated_idx on public.customers(store_id, updated_at desc);
create index if not exists quotations_store_id_created_idx on public.quotations(store_id, created_at desc);
create index if not exists quotation_items_store_id_quotation_idx on public.quotation_items(store_id, quotation_id);
create index if not exists pdf_files_store_id_created_idx on public.pdf_files(store_id, created_at);
create index if not exists activity_logs_store_id_created_idx on public.activity_logs(store_id, created_at desc);
create index if not exists brand_footer_logos_store_id_sort_idx on public.brand_footer_logos(store_id, sort_order);

alter table public.quotation_number_counters
add column if not exists store_id uuid references public.stores(id);

with default_store as (
  select id from public.stores where store_code = 'VFE' limit 1
)
update public.quotation_number_counters
set store_id = default_store.id
from default_store
where public.quotation_number_counters.store_id is null;

alter table public.quotation_number_counters
alter column store_id set not null;

alter table public.quotation_number_counters
drop constraint if exists quotation_number_counters_pkey;

alter table public.quotation_number_counters
add constraint quotation_number_counters_pkey primary key (store_id, quote_year);

alter table public.quotations
drop constraint if exists quotations_base_quote_number_revision_key;

create unique index if not exists quotations_store_base_revision_uidx
on public.quotations(store_id, base_quote_number, revision);

insert into public.brand_footer_logos (store_id, label, sort_order, is_active)
select store.id, store.store_name, 1, true
from public.stores as store
where not exists (
  select 1
  from public.brand_footer_logos as logo
  where logo.store_id = store.id
    and lower(logo.label) = lower(store.store_name)
);

insert into public.team_members (
  store_id,
  member_name,
  phone_number,
  email,
  password_hash,
  role,
  branch_location,
  max_discount_percent,
  status
)
select
  store.id,
  'MOHANAM SRIDHAR',
  '7200570570',
  'fitnessmartvellore@gmail.com',
  'pbkdf2:sha256:210000:lgFd0EGedQhUMXhiGJOXRg:Rm2hfgJdOOU7PKU4qgWGMufdH5a0809iyG1Y3JMUKkg',
  'Admin',
  store.store_name,
  100,
  'active'
from public.stores as store
where store.store_code = 'FMV'
  and not exists (
    select 1 from public.team_members where lower(email) = lower('fitnessmartvellore@gmail.com')
  );

insert into public.team_members (
  store_id,
  member_name,
  phone_number,
  email,
  password_hash,
  role,
  branch_location,
  max_discount_percent,
  status
)
select
  store.id,
  'DHASARATHAN SATHYAN',
  '7200570570',
  'vellorefitnessequipments@gmail.com',
  'pbkdf2:sha256:210000:tQbc7zX36BwsHLPo0lDu-g:TD17ovMa_f7ZWAo9Ock6RlpL9jRIZw4C_rDXtrgpz50',
  'Admin',
  store.store_name,
  100,
  'active'
from public.stores as store
where store.store_code = 'VFE'
  and not exists (
    select 1 from public.team_members where lower(email) = lower('vellorefitnessequipments@gmail.com')
  );

update public.team_members as member
set
  store_id = store.id,
  member_name = 'MOHANAM SRIDHAR',
  phone_number = '7200570570',
  password_hash = 'pbkdf2:sha256:210000:lgFd0EGedQhUMXhiGJOXRg:Rm2hfgJdOOU7PKU4qgWGMufdH5a0809iyG1Y3JMUKkg',
  role = 'Admin',
  branch_location = store.store_name,
  max_discount_percent = 100,
  status = 'active'
from public.stores as store
where store.store_code = 'FMV'
  and lower(member.email) = lower('fitnessmartvellore@gmail.com');

update public.team_members as member
set
  store_id = store.id,
  member_name = 'DHASARATHAN SATHYAN',
  phone_number = '7200570570',
  password_hash = 'pbkdf2:sha256:210000:tQbc7zX36BwsHLPo0lDu-g:TD17ovMa_f7ZWAo9Ock6RlpL9jRIZw4C_rDXtrgpz50',
  role = 'Admin',
  branch_location = store.store_name,
  max_discount_percent = 100,
  status = 'active'
from public.stores as store
where store.store_code = 'VFE'
  and lower(member.email) = lower('vellorefitnessequipments@gmail.com');

drop function if exists public.next_quotation_base_number(date);

create or replace function public.next_quotation_base_number(
  p_store_id uuid,
  p_quote_date date default current_date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_date date := coalesce(p_quote_date, current_date);
  target_year integer := extract(year from target_date)::integer;
  next_number integer;
  prefix text;
begin
  select quotation_prefix
  into prefix
  from public.stores
  where id = p_store_id
    and status = 'active';

  if prefix is null then
    raise exception 'Store not found or inactive';
  end if;

  insert into public.quotation_number_counters as counters (
    store_id,
    quote_year,
    last_number,
    updated_at
  )
  values (p_store_id, target_year, 1, now())
  on conflict (store_id, quote_year) do update
  set
    last_number = counters.last_number + 1,
    updated_at = now()
  returning last_number into next_number;

  return concat(
    prefix,
    '-',
    to_char(target_date, 'YY'),
    '-',
    lpad(next_number::text, 4, '0')
  );
end;
$$;

revoke all on function public.next_quotation_base_number(uuid, date) from public;
grant execute on function public.next_quotation_base_number(uuid, date) to service_role;

drop function if exists public.save_quotation_transaction(
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text
);

create or replace function public.save_quotation_transaction(
  p_store_id uuid,
  p_quotation_id uuid,
  p_customer_id uuid,
  p_customer_payload jsonb,
  p_quotation_payload jsonb,
  p_items jsonb,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_quotation_id uuid;
  saved_customer_id uuid;
  customer_record public.customers%rowtype;
  saved_customer_snapshot jsonb;
  base_number text;
begin
  if not exists (select 1 from public.stores where id = p_store_id and status = 'active') then
    raise exception 'Store not found or inactive';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one quotation item is required';
  end if;

  if p_customer_id is not null then
    select *
    into customer_record
    from public.customers
    where id = p_customer_id
      and store_id = p_store_id;

    if not found then
      raise exception 'Customer not found';
    end if;

    saved_customer_id := customer_record.id;
    saved_customer_snapshot := to_jsonb(customer_record);
  else
    if p_customer_payload is null then
      raise exception 'Customer details are required';
    end if;

    insert into public.customers (
      store_id,
      customer_name,
      business_name,
      phone,
      suffix,
      alternate_phone,
      email,
      gst_number,
      address,
      city,
      state,
      pincode,
      notes
    )
    values (
      p_store_id,
      p_customer_payload->>'customer_name',
      nullif(p_customer_payload->>'business_name', ''),
      p_customer_payload->>'phone',
      nullif(p_customer_payload->>'suffix', ''),
      nullif(p_customer_payload->>'alternate_phone', ''),
      nullif(p_customer_payload->>'email', ''),
      nullif(p_customer_payload->>'gst_number', ''),
      nullif(p_customer_payload->>'address', ''),
      nullif(p_customer_payload->>'city', ''),
      nullif(p_customer_payload->>'state', ''),
      nullif(p_customer_payload->>'pincode', ''),
      nullif(p_customer_payload->>'notes', '')
    )
    returning * into customer_record;

    saved_customer_id := customer_record.id;
    saved_customer_snapshot := to_jsonb(customer_record);
  end if;

  if p_quotation_id is null then
    base_number := public.next_quotation_base_number(
      p_store_id,
      (p_quotation_payload->>'quote_date')::date
    );

    insert into public.quotations (
      store_id,
      base_quote_number,
      revision,
      quote_number,
      quote_date,
      validity_days,
      customer_id,
      customer_snapshot,
      total_list_price,
      discount_amount,
      total_special_price,
      gst_amount,
      net_total,
      round_off,
      grand_total,
      gst_mode,
      terms,
      payment_terms,
      transportation_note,
      delivery_note,
      warranty_note,
      after_sales_support,
      bank_details,
      company_settings_snapshot,
      prepared_by,
      status,
      created_by
    )
    values (
      p_store_id,
      base_number,
      0,
      base_number,
      (p_quotation_payload->>'quote_date')::date,
      (p_quotation_payload->>'validity_days')::integer,
      saved_customer_id,
      saved_customer_snapshot,
      (p_quotation_payload->>'total_list_price')::numeric,
      (p_quotation_payload->>'discount_amount')::numeric,
      (p_quotation_payload->>'total_special_price')::numeric,
      (p_quotation_payload->>'gst_amount')::numeric,
      (p_quotation_payload->>'net_total')::numeric,
      (p_quotation_payload->>'round_off')::numeric,
      (p_quotation_payload->>'grand_total')::numeric,
      p_quotation_payload->>'gst_mode',
      p_quotation_payload->>'terms',
      p_quotation_payload->>'payment_terms',
      p_quotation_payload->>'transportation_note',
      p_quotation_payload->>'delivery_note',
      p_quotation_payload->>'warranty_note',
      p_quotation_payload->>'after_sales_support',
      p_quotation_payload->'bank_details',
      p_quotation_payload->'company_settings_snapshot',
      p_quotation_payload->>'prepared_by',
      p_quotation_payload->>'status',
      p_created_by
    )
    returning id into saved_quotation_id;
  else
    update public.quotations
    set
      quote_date = (p_quotation_payload->>'quote_date')::date,
      validity_days = (p_quotation_payload->>'validity_days')::integer,
      customer_id = saved_customer_id,
      customer_snapshot = saved_customer_snapshot,
      total_list_price = (p_quotation_payload->>'total_list_price')::numeric,
      discount_amount = (p_quotation_payload->>'discount_amount')::numeric,
      total_special_price = (p_quotation_payload->>'total_special_price')::numeric,
      gst_amount = (p_quotation_payload->>'gst_amount')::numeric,
      net_total = (p_quotation_payload->>'net_total')::numeric,
      round_off = (p_quotation_payload->>'round_off')::numeric,
      grand_total = (p_quotation_payload->>'grand_total')::numeric,
      gst_mode = p_quotation_payload->>'gst_mode',
      terms = p_quotation_payload->>'terms',
      payment_terms = p_quotation_payload->>'payment_terms',
      transportation_note = p_quotation_payload->>'transportation_note',
      delivery_note = p_quotation_payload->>'delivery_note',
      warranty_note = p_quotation_payload->>'warranty_note',
      after_sales_support = p_quotation_payload->>'after_sales_support',
      bank_details = p_quotation_payload->'bank_details',
      company_settings_snapshot = p_quotation_payload->'company_settings_snapshot',
      prepared_by = p_quotation_payload->>'prepared_by',
      status = p_quotation_payload->>'status',
      pdf_url = null,
      pdf_path = null,
      excel_path = null
    where id = p_quotation_id
      and store_id = p_store_id
    returning id into saved_quotation_id;

    if saved_quotation_id is null then
      raise exception 'Quotation not found';
    end if;

    delete from public.quotation_items
    where quotation_id = saved_quotation_id
      and store_id = p_store_id;

    delete from public.pdf_files
    where quotation_id = saved_quotation_id
      and store_id = p_store_id;
  end if;

  insert into public.quotation_items (
    store_id,
    quotation_id,
    sort_order,
    product_id,
    sku,
    product_name,
    brand_name,
    image_url,
    description,
    specifications,
    dimensions,
    machine_weight,
    stack_weight,
    unit_price,
    special_price,
    qty,
    gst_percent,
    list_total,
    special_total,
    gst_amount,
    line_total
  )
  select
    p_store_id,
    saved_quotation_id,
    coalesce(nullif(item.value->>'sort_order', '')::integer, item.ordinality::integer),
    nullif(item.value->>'product_id', '')::uuid,
    coalesce(item.value->>'sku', ''),
    item.value->>'product_name',
    coalesce(item.value->>'brand_name', ''),
    nullif(item.value->>'image_url', ''),
    nullif(item.value->>'description', ''),
    nullif(item.value->>'specifications', ''),
    nullif(item.value->>'dimensions', ''),
    nullif(item.value->>'machine_weight', ''),
    nullif(item.value->>'stack_weight', ''),
    coalesce(nullif(item.value->>'unit_price', '')::numeric, 0),
    coalesce(nullif(item.value->>'special_price', '')::numeric, 0),
    coalesce(nullif(item.value->>'qty', '')::numeric, 1),
    coalesce(nullif(item.value->>'gst_percent', '')::numeric, 0),
    coalesce(nullif(item.value->>'list_total', '')::numeric, 0),
    coalesce(nullif(item.value->>'special_total', '')::numeric, 0),
    coalesce(nullif(item.value->>'gst_amount', '')::numeric, 0),
    coalesce(nullif(item.value->>'line_total', '')::numeric, 0)
  from jsonb_array_elements(p_items) with ordinality as item(value, ordinality);

  return saved_quotation_id;
end;
$$;

revoke all on function public.save_quotation_transaction(
  uuid,
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text
) from public, anon, authenticated;

grant execute on function public.save_quotation_transaction(
  uuid,
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text
) to service_role;

drop function if exists public.create_quotation_revision_transaction(uuid, text);

create or replace function public.create_quotation_revision_transaction(
  p_store_id uuid,
  p_source_quotation_id uuid,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_quotation public.quotations%rowtype;
  next_revision integer;
  new_quotation_id uuid;
begin
  select *
  into source_quotation
  from public.quotations
  where id = p_source_quotation_id
    and store_id = p_store_id;

  if not found then
    raise exception 'Quotation not found';
  end if;

  if not exists (
    select 1
    from public.quotation_items
    where quotation_id = p_source_quotation_id
      and store_id = p_store_id
  ) then
    raise exception 'Quotation has no items';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(concat(p_store_id::text, ':', source_quotation.base_quote_number), 0));

  select coalesce(max(revision), 0) + 1
  into next_revision
  from public.quotations
  where store_id = p_store_id
    and base_quote_number = source_quotation.base_quote_number;

  insert into public.quotations (
    store_id,
    base_quote_number,
    revision,
    quote_number,
    quote_date,
    validity_days,
    customer_id,
    customer_snapshot,
    total_list_price,
    discount_amount,
    total_special_price,
    gst_amount,
    net_total,
    round_off,
    grand_total,
    gst_mode,
    terms,
    payment_terms,
    transportation_note,
    delivery_note,
    warranty_note,
    after_sales_support,
    bank_details,
    company_settings_snapshot,
    prepared_by,
    status,
    created_by
  )
  values (
    p_store_id,
    source_quotation.base_quote_number,
    next_revision,
    concat(source_quotation.base_quote_number, '-R', next_revision),
    current_date,
    source_quotation.validity_days,
    source_quotation.customer_id,
    source_quotation.customer_snapshot,
    source_quotation.total_list_price,
    source_quotation.discount_amount,
    source_quotation.total_special_price,
    source_quotation.gst_amount,
    source_quotation.net_total,
    source_quotation.round_off,
    source_quotation.grand_total,
    source_quotation.gst_mode,
    source_quotation.terms,
    source_quotation.payment_terms,
    source_quotation.transportation_note,
    source_quotation.delivery_note,
    source_quotation.warranty_note,
    source_quotation.after_sales_support,
    source_quotation.bank_details,
    source_quotation.company_settings_snapshot,
    source_quotation.prepared_by,
    'Draft',
    p_created_by
  )
  returning id into new_quotation_id;

  insert into public.quotation_items (
    store_id,
    quotation_id,
    sort_order,
    product_id,
    sku,
    product_name,
    brand_name,
    image_url,
    description,
    specifications,
    dimensions,
    machine_weight,
    stack_weight,
    unit_price,
    special_price,
    qty,
    gst_percent,
    list_total,
    special_total,
    gst_amount,
    line_total
  )
  select
    p_store_id,
    new_quotation_id,
    sort_order,
    product_id,
    sku,
    product_name,
    brand_name,
    image_url,
    description,
    specifications,
    dimensions,
    machine_weight,
    stack_weight,
    unit_price,
    special_price,
    qty,
    gst_percent,
    list_total,
    special_total,
    gst_amount,
    line_total
  from public.quotation_items
  where quotation_id = p_source_quotation_id
    and store_id = p_store_id
  order by sort_order asc, created_at asc, id asc;

  return new_quotation_id;
end;
$$;

revoke all on function public.create_quotation_revision_transaction(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function public.create_quotation_revision_transaction(uuid, uuid, text)
to service_role;
