-- Vertex / Lmax Capital — One pending transfer per user + AI KYC verification
-- 1) request_transfer() now rejects a second concurrent pending request.
-- 2) KYC: front/back ID images, an AI confidence score, a 'reviewing' state and a
--    3-minute auto-approval finalized by kyc_finalize().
-- Idempotent: safe to re-run. Run after 10_transfer_bidirectional.sql.

-- ---------- request_transfer(): one pending request at a time ----------
create or replace function public.request_transfer(
  p_amount      numeric,
  p_mt5_account text default null,
  p_direction   text default 'out',
  p_note        text default null,
  p_currency    text default 'USD'
)
returns table(deposited numeric, withdrawn numeric, transferred numeric, balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_primary  text;
  v_mt5      text;
  v_dir      text;
  v_balance  numeric;
  v_currency text;
  v_note     text;
  v_valid    boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  -- One open request at a time.
  if exists (select 1 from public.transfers where user_id = v_uid and status = 'pending') then
    raise exception 'pending transfer exists' using errcode = 'P0001';
  end if;

  v_dir := case when p_direction = 'in' then 'in' else 'out' end;

  select mt5_account into v_primary from public.profiles where id = v_uid;
  v_mt5 := coalesce(nullif(trim(p_mt5_account), ''), nullif(trim(v_primary), ''));
  if v_mt5 is null then
    raise exception 'mt5 account required' using errcode = 'P0001';
  end if;

  v_valid := (v_mt5 = nullif(trim(v_primary), ''))
    or exists (
      select 1 from public.provisioning
      where user_id = v_uid and status = 'active' and trim(login) = v_mt5
    );
  if not v_valid then
    raise exception 'invalid mt5 account' using errcode = 'P0001';
  end if;

  if v_dir = 'out' then
    select t.balance into v_balance from public.user_totals(v_uid) t;
    if p_amount > v_balance then
      raise exception 'insufficient balance' using errcode = 'P0001';
    end if;
  end if;

  v_currency := coalesce(nullif(trim(p_currency), ''), 'USD');
  v_note     := nullif(trim(p_note), '');

  insert into public.transfers (user_id, amount, currency, mt5_account, direction, status, note)
  values (v_uid, p_amount, v_currency, v_mt5, v_dir, 'pending', v_note);

  insert into public.notifications (user_id, kind, category, amount, currency)
  values (v_uid, 'info', 'transfer_request', p_amount, v_currency);

  return query
    select t.deposited, t.withdrawn, t.transferred, t.balance from public.user_totals(v_uid) t;
end;
$$;

-- ---------- KYC columns + 'reviewing' state ----------
alter table public.profiles add column if not exists kyc_submitted_at timestamptz;
alter table public.profiles add column if not exists kyc_front_path   text;
alter table public.profiles add column if not exists kyc_back_path    text;
alter table public.profiles add column if not exists kyc_score        numeric;

alter table public.profiles drop constraint if exists profiles_kyc_status_check;
alter table public.profiles add constraint profiles_kyc_status_check
  check (kyc_status in ('pending','reviewing','verified','rejected'));

-- ---------- KYC storage bucket (private) ----------
insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', false)
on conflict (id) do nothing;

drop policy if exists kyc_insert on storage.objects;
create policy kyc_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists kyc_select on storage.objects;
create policy kyc_select on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

drop policy if exists kyc_update on storage.objects;
create policy kyc_update on storage.objects for update to authenticated
  using (bucket_id = 'kyc' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- RPC: submit KYC (client AI already validated) ----------
-- Stores the captured images + confidence and moves to 'reviewing'. The actual
-- approval happens 3 minutes later via kyc_finalize().
create or replace function public.kyc_submit(
  p_front text,
  p_back  text,
  p_score numeric
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select kyc_status into v_status from public.profiles where id = v_uid;
  if v_status = 'verified' then
    return 'verified';
  end if;

  update public.profiles
     set kyc_status = 'reviewing',
         kyc_submitted_at = now(),
         kyc_front_path = p_front,
         kyc_back_path  = p_back,
         kyc_score      = p_score
   where id = v_uid;

  insert into public.notifications (user_id, kind, category)
  values (v_uid, 'info', 'kyc_submitted');

  return 'reviewing';
end;
$$;

revoke all on function public.kyc_submit(text, text, numeric) from public;
grant execute on function public.kyc_submit(text, text, numeric) to authenticated;

-- ---------- RPC: finalize KYC (auto-approve after 3 minutes) ----------
create or replace function public.kyc_finalize()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
  v_at     timestamptz;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select kyc_status, kyc_submitted_at into v_status, v_at from public.profiles where id = v_uid;

  if v_status = 'reviewing' and v_at is not null and now() - v_at >= interval '3 minutes' then
    update public.profiles set kyc_status = 'verified' where id = v_uid;
    insert into public.notifications (user_id, kind, category)
    values (v_uid, 'info', 'kyc_verified');
    return 'verified';
  end if;

  return coalesce(v_status, 'pending');
end;
$$;

revoke all on function public.kyc_finalize() from public;
grant execute on function public.kyc_finalize() to authenticated;
