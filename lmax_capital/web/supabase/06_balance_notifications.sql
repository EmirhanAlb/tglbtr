-- Vertex / Lmax Capital — Admin balance adjustments + customer notifications
-- Adds: notifications table, RLS, admin_adjust_balance() RPC, realtime publication.
-- Idempotent: safe to re-run.

-- ---------- notifications ----------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null default 'credit' check (kind in ('credit','debit','info')),
  category   text,                                  -- deposit | bonus | adjustment | correction
  amount     numeric,
  currency   text not null default 'USD',
  body       text,                                  -- admin-written description shown to customer
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_user_unread_idx on public.notifications(user_id) where not read;

alter table public.notifications enable row level security;

-- customer reads own; admin reads all
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- customer marks own read (update); admin may update any
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());

-- direct inserts: admin only (RPC below is security definer and bypasses RLS)
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated
  with check (public.is_admin());

-- customer may dismiss/delete own; admin any
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- ---------- RPC: admin adjusts a customer's balance ----------
-- Creates an approved transaction (credit -> deposit, debit -> withdrawal) AND a
-- matching notification, atomically. Authorization enforced via is_admin().
create or replace function public.admin_adjust_balance(
  p_user_id   uuid,
  p_amount    numeric,
  p_direction text,           -- 'credit' | 'debit'
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

  -- 1) approved transaction (drives balance via user_totals)
  insert into public.transactions (user_id, type, method, amount, currency, status, note, resolved_at)
  values (p_user_id, v_type, v_category, p_amount, v_currency, 'approved', coalesce(v_note, v_category), now());

  -- 2) customer-facing notification
  insert into public.notifications (user_id, kind, category, amount, currency, body)
  values (p_user_id, v_kind, v_category, p_amount, v_currency, v_note);

  -- 3) return fresh totals
  return query
    select * from public.user_totals(p_user_id);
end;
$$;

revoke all on function public.admin_adjust_balance(uuid, numeric, text, text, text, text) from public;
grant execute on function public.admin_adjust_balance(uuid, numeric, text, text, text, text) to authenticated;

-- ---------- Realtime publication ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end $$;
