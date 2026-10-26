-- Vertex / Lmax Capital — Internal balance -> MT5 transfers
-- Adds: transfers table, RLS, request_transfer()/admin_resolve_transfer() RPCs,
-- rewrites user_totals() so the balance subtracts active transfers (the requested
-- amount is "held" the moment a customer submits), and wires realtime.
-- Idempotent: safe to re-run.

-- ---------- transfers ----------
create table if not exists public.transfers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      numeric not null check (amount > 0),
  currency    text not null default 'USD',
  mt5_account text,                                  -- destination MT5 login (snapshot at request time)
  status      text not null default 'pending' check (status in ('pending','completed','rejected')),
  note        text,                                  -- customer note
  admin_note  text,                                  -- admin note written while processing
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists transfers_user_id_idx on public.transfers(user_id);
create index if not exists transfers_status_idx  on public.transfers(status);

alter table public.transfers enable row level security;

-- customer reads own; admin reads all
drop policy if exists transfers_select on public.transfers;
create policy transfers_select on public.transfers for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- direct inserts: admin only (customers go through request_transfer(), a security
-- definer RPC that enforces the balance check and bypasses RLS).
drop policy if exists transfers_insert on public.transfers;
create policy transfers_insert on public.transfers for insert to authenticated
  with check (public.is_admin());

-- updates (status changes): admin only.
drop policy if exists transfers_update on public.transfers;
create policy transfers_update on public.transfers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- customer may cancel (delete) own *pending* request; admin may delete any.
drop policy if exists transfers_delete on public.transfers;
create policy transfers_delete on public.transfers for delete to authenticated
  using (public.is_admin() or ((select auth.uid()) = user_id and status = 'pending'));

-- ---------- user_totals(): now nets out active transfers ----------
-- Active transfers = pending + completed. A pending request immediately reduces the
-- shown balance (the hold); a rejected/cancelled one stops counting (balance restored).
-- Return signature changes (adds `transferred`), so drop before recreating.
drop function if exists public.user_totals(uuid);
create function public.user_totals(p_user_id uuid)
returns table(deposited numeric, withdrawn numeric, transferred numeric, balance numeric)
language sql
stable
as $$
  with tx as (
    select
      coalesce(sum(amount) filter (where type='deposit'    and status='approved'), 0) as deposited,
      coalesce(sum(amount) filter (where type='withdrawal' and status='approved'), 0) as withdrawn
    from public.transactions
    where user_id = p_user_id
  ),
  tr as (
    select coalesce(sum(amount) filter (where status in ('pending','completed')), 0) as transferred
    from public.transfers
    where user_id = p_user_id
  )
  select
    tx.deposited,
    tx.withdrawn,
    tr.transferred,
    tx.deposited - tx.withdrawn - tr.transferred as balance
  from tx, tr;
$$;

-- admin_adjust_balance() returned `select * from user_totals(...)` into a 3-column
-- table; user_totals now has 4 columns, so pin the projection explicitly.
create or replace function public.admin_adjust_balance(
  p_user_id   uuid,
  p_amount    numeric,
  p_direction text,
  p_category  text default 'deposit',
  p_note      text default null,
  p_currency  text default 'USD'
)
returns table(deposited numeric, withdrawn numeric, balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type     text;
  v_kind     text;
  v_note     text;
  v_currency text;
  v_category text;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'user_id required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if p_direction not in ('credit','debit') then
    raise exception 'direction must be credit or debit';
  end if;

  v_type     := case when p_direction = 'debit' then 'withdrawal' else 'deposit' end;
  v_kind     := p_direction;
  v_currency := coalesce(nullif(trim(p_currency), ''), 'USD');
  v_category := coalesce(nullif(trim(p_category), ''), case when p_direction='debit' then 'adjustment' else 'deposit' end);
  v_note     := nullif(trim(p_note), '');

  insert into public.transactions (user_id, type, method, amount, currency, status, note, resolved_at)
  values (p_user_id, v_type, v_category, p_amount, v_currency, 'approved', coalesce(v_note, v_category), now());

  insert into public.notifications (user_id, kind, category, amount, currency, body)
  values (p_user_id, v_kind, v_category, p_amount, v_currency, v_note);

  return query
    select t.deposited, t.withdrawn, t.balance from public.user_totals(p_user_id) t;
end;
$$;

-- ---------- RPC: customer requests an internal -> MT5 transfer ----------
-- Checks transferable balance, snapshots the MT5 login, creates a pending transfer
-- and a customer notification atomically. Returns fresh totals.
create or replace function public.request_transfer(
  p_amount   numeric,
  p_note     text default null,
  p_currency text default 'USD'
)
returns table(deposited numeric, withdrawn numeric, transferred numeric, balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_mt5      text;
  v_balance  numeric;
  v_currency text;
  v_note     text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  select mt5_account into v_mt5 from public.profiles where id = v_uid;
  if v_mt5 is null or trim(v_mt5) = '' then
    raise exception 'mt5 account required' using errcode = 'P0001';
  end if;

  -- Transferable balance already nets out existing active transfers.
  -- Qualify the column: `balance` alone is ambiguous with this function's
  -- RETURNS TABLE output column of the same name.
  select t.balance into v_balance from public.user_totals(v_uid) t;
  if p_amount > v_balance then
    raise exception 'insufficient balance' using errcode = 'P0001';
  end if;

  v_currency := coalesce(nullif(trim(p_currency), ''), 'USD');
  v_note     := nullif(trim(p_note), '');

  insert into public.transfers (user_id, amount, currency, mt5_account, status, note)
  values (v_uid, p_amount, v_currency, v_mt5, 'pending', v_note);

  insert into public.notifications (user_id, kind, category, amount, currency)
  values (v_uid, 'info', 'transfer_request', p_amount, v_currency);

  return query
    select t.deposited, t.withdrawn, t.transferred, t.balance from public.user_totals(v_uid) t;
end;
$$;

revoke all on function public.request_transfer(numeric, text, text) from public;
grant execute on function public.request_transfer(numeric, text, text) to authenticated;

-- ---------- RPC: admin resolves a transfer (complete | reject) ----------
-- Sets status + resolved_at + admin_note and notifies the customer. A rejected
-- transfer stops counting toward `transferred`, restoring the held balance.
create or replace function public.admin_resolve_transfer(
  p_id        uuid,
  p_status    text,
  p_admin_note text default null
)
returns public.transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row  public.transfers;
  v_note text;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('completed','rejected') then
    raise exception 'status must be completed or rejected';
  end if;

  v_note := nullif(trim(p_admin_note), '');

  update public.transfers
     set status      = p_status,
         admin_note  = coalesce(v_note, admin_note),
         resolved_at = now()
   where id = p_id and status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'transfer not found or already resolved';
  end if;

  insert into public.notifications (user_id, kind, category, amount, currency, body)
  values (
    v_row.user_id,
    'info',
    case when p_status = 'completed' then 'transfer_completed' else 'transfer_rejected' end,
    v_row.amount,
    v_row.currency,
    v_note
  );

  return v_row;
end;
$$;

revoke all on function public.admin_resolve_transfer(uuid, text, text) from public;
grant execute on function public.admin_resolve_transfer(uuid, text, text) to authenticated;

-- ---------- Realtime publication ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transfers'
  ) then
    execute 'alter publication supabase_realtime add table public.transfers';
  end if;
end $$;
