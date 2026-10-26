-- Vertex / Lmax Capital — Multiple MT5 accounts + transfer destination selection
-- 1) A user may now hold several MT5 accounts (drop the 1-row-per-user unique).
-- 2) request_transfer() takes an explicit destination MT5 login and validates it
--    belongs to the caller (their primary profile login OR one of their active
--    provisioning logins).
-- Idempotent: safe to re-run.

-- ---------- allow multiple provisioning rows per user ----------
alter table public.provisioning drop constraint if exists provisioning_user_id_key;
create index if not exists provisioning_user_id_idx on public.provisioning(user_id);

-- ---------- request_transfer(): now picks a destination MT5 account ----------
-- Signature changed (adds p_mt5_account), so drop the old overload first.
drop function if exists public.request_transfer(numeric, text, text);

create or replace function public.request_transfer(
  p_amount      numeric,
  p_mt5_account text default null,
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

  select mt5_account into v_primary from public.profiles where id = v_uid;
  -- Destination: the requested account, or the primary profile login as fallback.
  v_mt5 := coalesce(nullif(trim(p_mt5_account), ''), nullif(trim(v_primary), ''));
  if v_mt5 is null then
    raise exception 'mt5 account required' using errcode = 'P0001';
  end if;

  -- The destination must belong to the caller: the primary login, or one of
  -- their active provisioning logins.
  v_valid := (v_mt5 = nullif(trim(v_primary), ''))
    or exists (
      select 1 from public.provisioning
      where user_id = v_uid and status = 'active' and trim(login) = v_mt5
    );
  if not v_valid then
    raise exception 'invalid mt5 account' using errcode = 'P0001';
  end if;

  -- Transferable balance already nets out existing active transfers.
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

revoke all on function public.request_transfer(numeric, text, text, text) from public;
grant execute on function public.request_transfer(numeric, text, text, text) to authenticated;
