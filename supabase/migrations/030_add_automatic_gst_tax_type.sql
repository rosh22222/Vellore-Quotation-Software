alter table public.quotations
add column if not exists place_of_supply text not null default 'Tamil Nadu',
add column if not exists gst_type text not null default 'cgst_sgst',
add column if not exists cgst_amount numeric(12,2) not null default 0,
add column if not exists sgst_amount numeric(12,2) not null default 0,
add column if not exists igst_amount numeric(12,2) not null default 0;

alter table public.quotation_items
add column if not exists taxable_value numeric(12,2) not null default 0,
add column if not exists cgst_amount numeric(12,2) not null default 0,
add column if not exists sgst_amount numeric(12,2) not null default 0,
add column if not exists igst_amount numeric(12,2) not null default 0;

update public.quotations
set
  place_of_supply = coalesce(nullif(customer_snapshot->>'state', ''), 'Tamil Nadu'),
  gst_type = case
    when gst_mode = 'none' then 'none'
    when lower(coalesce(nullif(customer_snapshot->>'state', ''), 'Tamil Nadu')) = 'tamil nadu'
      then 'cgst_sgst'
    else 'igst'
  end;

update public.quotation_items as item
set
  taxable_value = case
    when quotation.gst_mode = 'included' then item.special_total - item.gst_amount
    else item.special_total
  end,
  cgst_amount = case
    when quotation.gst_type = 'cgst_sgst' then round(item.gst_amount / 2, 2)
    else 0
  end,
  sgst_amount = case
    when quotation.gst_type = 'cgst_sgst'
      then item.gst_amount - round(item.gst_amount / 2, 2)
    else 0
  end,
  igst_amount = case
    when quotation.gst_type = 'igst' then item.gst_amount
    else 0
  end
from public.quotations as quotation
where quotation.id = item.quotation_id;

with tax_totals as (
  select
    quotation_id,
    coalesce(sum(gst_amount), 0) as gst_amount,
    coalesce(sum(cgst_amount), 0) as cgst_amount,
    coalesce(sum(sgst_amount), 0) as sgst_amount,
    coalesce(sum(igst_amount), 0) as igst_amount
  from public.quotation_items
  group by quotation_id
)
update public.quotations as quotation
set
  gst_amount = tax_totals.gst_amount,
  cgst_amount = tax_totals.cgst_amount,
  sgst_amount = tax_totals.sgst_amount,
  igst_amount = tax_totals.igst_amount
from tax_totals
where tax_totals.quotation_id = quotation.id;

alter table public.quotations
drop constraint if exists quotations_gst_type_check;

alter table public.quotations
add constraint quotations_gst_type_check
check (gst_type in ('cgst_sgst', 'igst', 'none'));

alter table public.quotations
drop constraint if exists quotations_gst_amounts_match_type_check;

alter table public.quotations
add constraint quotations_gst_amounts_match_type_check
check (
  (gst_type = 'cgst_sgst' and igst_amount = 0 and cgst_amount + sgst_amount = gst_amount)
  or (gst_type = 'igst' and cgst_amount = 0 and sgst_amount = 0 and igst_amount = gst_amount)
  or (gst_type = 'none' and cgst_amount = 0 and sgst_amount = 0 and igst_amount = 0 and gst_amount = 0)
);

alter table public.quotation_items
drop constraint if exists quotation_items_gst_amounts_match_check;

alter table public.quotation_items
add constraint quotation_items_gst_amounts_match_check
check (cgst_amount + sgst_amount + igst_amount = gst_amount);

create or replace function public.save_quotation_with_gst_transaction(
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
  saved_gst_type text;
  saved_gst_mode text;
begin
  saved_gst_type := p_quotation_payload->>'gst_type';
  saved_gst_mode := p_quotation_payload->>'gst_mode';

  if saved_gst_type not in ('cgst_sgst', 'igst', 'none') then
    raise exception 'Invalid GST type';
  end if;

  if nullif(btrim(p_quotation_payload->>'place_of_supply'), '') is null then
    raise exception 'Place of supply is required';
  end if;

  if saved_gst_mode = 'none' and saved_gst_type <> 'none' then
    raise exception 'No-GST quotation must use GST type none';
  end if;

  if saved_gst_mode <> 'none' and saved_gst_type = 'none' then
    raise exception 'Taxable quotation requires a GST type';
  end if;

  saved_quotation_id := public.save_quotation_transaction(
    p_store_id,
    p_quotation_id,
    p_customer_id,
    p_customer_payload,
    p_quotation_payload,
    p_items,
    p_created_by
  );

  update public.quotations
  set
    place_of_supply = btrim(p_quotation_payload->>'place_of_supply'),
    gst_type = saved_gst_type
  where id = saved_quotation_id
    and store_id = p_store_id;

  update public.quotation_items as item
  set
    taxable_value = case
      when saved_gst_mode = 'included' then item.special_total - item.gst_amount
      else item.special_total
    end,
    cgst_amount = case
      when saved_gst_type = 'cgst_sgst' then round(item.gst_amount / 2, 2)
      else 0
    end,
    sgst_amount = case
      when saved_gst_type = 'cgst_sgst'
        then item.gst_amount - round(item.gst_amount / 2, 2)
      else 0
    end,
    igst_amount = case
      when saved_gst_type = 'igst' then item.gst_amount
      else 0
    end
  where item.quotation_id = saved_quotation_id
    and item.store_id = p_store_id;

  update public.quotations as quotation
  set
    gst_amount = totals.gst_amount,
    cgst_amount = totals.cgst_amount,
    sgst_amount = totals.sgst_amount,
    igst_amount = totals.igst_amount
  from (
    select
      coalesce(sum(gst_amount), 0) as gst_amount,
      coalesce(sum(cgst_amount), 0) as cgst_amount,
      coalesce(sum(sgst_amount), 0) as sgst_amount,
      coalesce(sum(igst_amount), 0) as igst_amount
    from public.quotation_items
    where quotation_id = saved_quotation_id
      and store_id = p_store_id
  ) as totals
  where quotation.id = saved_quotation_id
    and quotation.store_id = p_store_id;

  return saved_quotation_id;
end;
$$;

revoke all on function public.save_quotation_with_gst_transaction(
  uuid, uuid, uuid, jsonb, jsonb, jsonb, text
) from public, anon, authenticated;

grant execute on function public.save_quotation_with_gst_transaction(
  uuid, uuid, uuid, jsonb, jsonb, jsonb, text
) to service_role;

create or replace function public.create_quotation_revision_with_gst_transaction(
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
  new_quotation_id uuid;
begin
  new_quotation_id := public.create_quotation_revision_transaction(
    p_store_id,
    p_source_quotation_id,
    p_created_by
  );

  update public.quotations as target
  set
    place_of_supply = source.place_of_supply,
    gst_type = source.gst_type,
    cgst_amount = source.cgst_amount,
    sgst_amount = source.sgst_amount,
    igst_amount = source.igst_amount
  from public.quotations as source
  where target.id = new_quotation_id
    and target.store_id = p_store_id
    and source.id = p_source_quotation_id
    and source.store_id = p_store_id;

  update public.quotation_items as target
  set
    taxable_value = source.taxable_value,
    cgst_amount = source.cgst_amount,
    sgst_amount = source.sgst_amount,
    igst_amount = source.igst_amount
  from public.quotation_items as source
  where target.quotation_id = new_quotation_id
    and target.store_id = p_store_id
    and source.quotation_id = p_source_quotation_id
    and source.store_id = p_store_id
    and source.sort_order = target.sort_order;

  return new_quotation_id;
end;
$$;

revoke all on function public.create_quotation_revision_with_gst_transaction(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function public.create_quotation_revision_with_gst_transaction(uuid, uuid, text)
to service_role;
