-- Vertex / Lmax Capital — Supabase schema
-- All tables in public, UUID PKs, RLS enabled (policies in 02_rls.sql).

-- ---------- helper: is_admin() ----------
-- Reads role from JWT app_metadata only (no table read -> no RLS recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'customer' check (role in ('customer','admin')),
  name         text not null default '',
  email        text not null default '',
  phone        text not null default '',
  account_type text not null default 'real',
  mt5_account  text,
  -- Plaintext panel sign-in password chosen at registration. Supabase Auth keeps
  -- only a bcrypt hash, so this mirror column is what lets admins view it. Only
  -- populated for sign-ups going forward; password resets do not update it.
  login_password text not null default '',
  kyc_status   text not null default 'pending' check (kyc_status in ('pending','verified','rejected')),
  created_at   timestamptz not null default now()
);

-- ---------- transactions ----------
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         text not null check (type in ('deposit','withdrawal')),
  method       text,
  method_id    text,
  amount       numeric not null default 0,
  currency     text not null default 'USD',
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  note         text,
  receipt_path text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_status_idx on public.transactions(status);

-- ---------- tickets ----------
create table if not exists public.tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  subject    text not null default 'Destek Talebi',
  category   text not null default 'general',
  status     text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tickets_user_id_idx on public.tickets(user_id);

-- ---------- ticket_messages ----------
create table if not exists public.ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets(id) on delete cascade,
  author     text not null check (author in ('customer','admin','system')),
  body       text,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ticket_messages_ticket_id_idx on public.ticket_messages(ticket_id);

-- ---------- provisioning (MT5) ----------
create table if not exists public.provisioning (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','assigned','active')),
  login        text not null default '',
  server       text not null default '',
  password     text not null default '',
  investor     text not null default '',
  created_at   timestamptz not null default now(),
  assigned_at  timestamptz,
  activated_at timestamptz
);

-- ---------- bank_accounts ----------
create table if not exists public.bank_accounts (
  id         uuid primary key default gen_random_uuid(),
  bank_name  text not null default '',
  holder     text not null default '',
  iban       text not null default '',
  note       text,
  created_at timestamptz not null default now()
);

-- ---------- crypto_accounts ----------
create table if not exists public.crypto_accounts (
  id         uuid primary key default gen_random_uuid(),
  network    text not null default '',
  token      text not null default '',
  address    text not null default '',
  note       text,
  created_at timestamptz not null default now()
);

-- ---------- settings (singleton) ----------
create table if not exists public.settings (
  id                       boolean primary key default true check (id),
  deposit_receipt_required boolean not null default false,
  min_deposit              numeric not null default 0
);

-- ---------- trigger: new auth user -> profile ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email, phone, account_type, login_password)
  values (
    new.id,
    'customer',  -- role forced; never trust client metadata for authz
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'account_type', 'real'),
    coalesce(new.raw_user_meta_data ->> 'login_password', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- trigger: tickets.updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- ---------- aggregate helpers (RPC) ----------
-- user totals: approved deposits/withdrawals + balance
create or replace function public.user_totals(p_user_id uuid)
returns table(deposited numeric, withdrawn numeric, balance numeric)
language sql
stable
as $$
  select
    coalesce(sum(amount) filter (where type='deposit'  and status='approved'), 0) as deposited,
    coalesce(sum(amount) filter (where type='withdrawal' and status='approved'), 0) as withdrawn,
    coalesce(sum(amount) filter (where type='deposit'  and status='approved'), 0)
      - coalesce(sum(amount) filter (where type='withdrawal' and status='approved'), 0) as balance
  from public.transactions
  where user_id = p_user_id;
$$;
