-- Vertex / Lmax Capital — Bidirectional transfers (Lmax wallet <-> MT5)
-- Adds a `direction` to transfers:
--   'out' : Lmax internal balance -> MT5 account (held immediately, as before)
--   'in'  : MT5 account -> Lmax internal balance (credited on admin completion)
-- user_totals() now nets both. Idempotent: safe to re-run.

alter table public.transfers
  add column if not exists direction text not null default 'out'
  check (direction in ('out','in'));

-- ---------- user_totals(): net outbound holds and inbound credits ----------
-- transferred (held)  = outbound pending+completed  -> reduces balance
-- inbound (credited)  = inbound completed           -> increases balance
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
    select
      coalesce(sum(amount) filter (where direction='out' and status in ('pending','completed')), 0) as out_held,
      coalesce(sum(amount) filter (where direction='in'  and status='completed'), 0) as in_done
    from public.transfers
    where user_id = p_user_id
  )
  select
    tx.deposited,
    tx.withdrawn,
    tr.out_held as transferred,
    tx.deposited - tx.withdrawn - tr.out_held + tr.in_done as balance
  from tx, tr;
$$;

-- ---------- request_transfer(): now carries a direction ----------
-- Signature changed (adds p_direction), so drop the previous overload.
drop function if exists public.request_transfer(numeric, text, text, text);

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
  v_dir := case when p_direction = 'in' then 'in' else 'out' end;

  select mt5_account into v_primary from public.profiles where id = v_uid;
  -- The MT5 account is the destination (out) or the source (in).
  v_mt5 := coalesce(nullif(trim(p_mt5_account), ''), nullif(trim(v_primary), ''));
  if v_mt5 is null then
    raise exception 'mt5 account required' using errcode = 'P0001';
  end if;

  -- The MT5 account must belong to the caller.
  v_valid := (v_mt5 = nullif(trim(v_primary), ''))
    or exists (
      select 1 from public.provisioning
      where user_id = v_uid and status = 'active' and trim(login) = v_mt5
    );
  if not v_valid then
    raise exception 'invalid mt5 account' using errcode = 'P0001';
  end if;

  -- Outbound (Lmax -> MT5) is capped by the transferable balance and held now.
  -- Inbound (MT5 -> Lmax) is verified/credited by an admin on completion, so no
  -- internal balance check here (we don't track the MT5-side balance).
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

revoke all on function public.request_transfer(numeric, text, text, text, text) from public;
grant execute on function public.request_transfer(numeric, text, text, text, text) to authenticated;
