-- =====================================================================
--  Trust Capital — Müşteri paneli + Admin paneli — Supabase şeması
-- ---------------------------------------------------------------------
--  Bu dosya lmax_capital projesindeki 01..12 numaralı migration'ların
--  BİRLEŞTİRİLMİŞ ve SON hâlidir (aynı yapı, Trust Capital olarak markalandı).
--  Supabase → SQL Editor → New query → bu dosyanın tamamını yapıştır → Run.
--  Idempotent: tekrar çalıştırmak güvenlidir.
--
--  Tablolar: profiles, transactions, tickets, ticket_messages, provisioning,
--            bank_accounts, crypto_accounts, settings, notifications, transfers
--  RPC'ler : is_admin, user_totals, admin_adjust_balance, request_transfer,
--            admin_resolve_transfer, kyc_submit, kyc_finalize
--  Depolama: receipts (dekont), kyc (kimlik) — ikisi de özel (private)
-- =====================================================================

-- ---------- helper: is_admin() ----------
-- Rolü yalnızca JWT app_metadata'dan okur (tablo okumaz -> RLS özyinelemesi olmaz).
create or replace function public.is_admin()
returns boolean language sql stable as $$
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
  -- Kayıtta seçilen panel giriş şifresinin düz metin aynası. Supabase Auth yalnızca
  -- bcrypt hash tuttuğu için adminin şifreyi görebilmesi bu kolonla sağlanır.
  login_password   text not null default '',
  kyc_status       text not null default 'pending' check (kyc_status in ('pending','reviewing','verified','rejected')),
  kyc_submitted_at timestamptz,
  kyc_front_path   text,
  kyc_back_path    text,
  kyc_score        numeric,
  created_at   timestamptz not null default now()
);

-- ---------- transactions (para yatırma / çekme) ----------
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

-- ---------- tickets (destek) ----------
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

create table if not exists public.ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets(id) on delete cascade,
  author     text not null check (author in ('customer','admin','system')),
  body       text,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ticket_messages_ticket_id_idx on public.ticket_messages(ticket_id);

-- ---------- provisioning (MT5 hesapları — kullanıcı başına birden fazla olabilir) ----------
create table if not exists public.provisioning (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','assigned','active')),
  login        text not null default '',
  server       text not null default '',
  password     text not null default '',
  investor     text not null default '',
  created_at   timestamptz not null default now(),
  assigned_at  timestamptz,
  activated_at timestamptz
);
create index if not exists provisioning_user_id_idx on public.provisioning(user_id);

-- ---------- bank_accounts / crypto_accounts ----------
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null default '', holder text not null default '',
  iban text not null default '', note text, created_at timestamptz not null default now()
);
create table if not exists public.crypto_accounts (
  id uuid primary key default gen_random_uuid(),
  network text not null default '', token text not null default '',
  address text not null default '', note text, created_at timestamptz not null default now()
);

-- ---------- settings (singleton) ----------
create table if not exists public.settings (
  id                       boolean primary key default true check (id),
  deposit_receipt_required boolean not null default false,
  min_deposit              numeric not null default 0
);

-- ---------- notifications ----------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null default 'credit' check (kind in ('credit','debit','info')),
  category   text,
  amount     numeric,
  currency   text not null default 'USD',
  body       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_user_unread_idx on public.notifications(user_id) where not read;

-- ---------- transfers (iç bakiye <-> MT5, çift yönlü) ----------
create table if not exists public.transfers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      numeric not null check (amount > 0),
  currency    text not null default 'USD',
  mt5_account text,
  direction   text not null default 'out' check (direction in ('out','in')),
  status      text not null default 'pending' check (status in ('pending','completed','rejected')),
  note        text,
  admin_note  text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists transfers_user_id_idx on public.transfers(user_id);
create index if not exists transfers_status_idx  on public.transfers(status);

-- ---------- trigger: yeni auth kullanıcısı -> profile ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, name, email, phone, account_type, login_password)
  values (
    new.id, 'customer',
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'account_type', 'real'),
    coalesce(new.raw_user_meta_data ->> 'login_password', '')
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- trigger: tickets.updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();

-- ---------- user_totals(): bakiye = yatırım - çekim - giden transfer + gelen transfer ----------
drop function if exists public.user_totals(uuid);
create function public.user_totals(p_user_id uuid)
returns table(deposited numeric, withdrawn numeric, transferred numeric, balance numeric)
language sql stable as $$
  with tx as (
    select
      coalesce(sum(amount) filter (where type='deposit'    and status='approved'), 0) as deposited,
      coalesce(sum(amount) filter (where type='withdrawal' and status='approved'), 0) as withdrawn
    from public.transactions where user_id = p_user_id
  ),
  tr as (
    select
      coalesce(sum(amount) filter (where direction='out' and status in ('pending','completed')), 0) as out_held,
      coalesce(sum(amount) filter (where direction='in'  and status='completed'), 0) as in_done
    from public.transfers where user_id = p_user_id
  )
  select tx.deposited, tx.withdrawn, tr.out_held,
         tx.deposited - tx.withdrawn - tr.out_held + tr.in_done
  from tx, tr;
$$;

-- ---------- RPC: admin bakiye düzeltir (credit/debit) ----------
create or replace function public.admin_adjust_balance(
  p_user_id uuid, p_amount numeric, p_direction text,
  p_category text default 'deposit', p_note text default null, p_currency text default 'USD'
) returns table(deposited numeric, withdrawn numeric, balance numeric)
language plpgsql security definer set search_path = public as $$
declare v_type text; v_kind text; v_note text; v_currency text; v_category text;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_user_id is null then raise exception 'user_id required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if p_direction not in ('credit','debit') then raise exception 'direction must be credit or debit'; end if;
  v_type := case when p_direction = 'debit' then 'withdrawal' else 'deposit' end;
  v_kind := p_direction;
  v_currency := coalesce(nullif(trim(p_currency), ''), 'USD');
  v_category := coalesce(nullif(trim(p_category), ''), case when p_direction='debit' then 'adjustment' else 'deposit' end);
  v_note := nullif(trim(p_note), '');
  insert into public.transactions (user_id, type, method, amount, currency, status, note, resolved_at)
  values (p_user_id, v_type, v_category, p_amount, v_currency, 'approved', coalesce(v_note, v_category), now());
  insert into public.notifications (user_id, kind, category, amount, currency, body)
  values (p_user_id, v_kind, v_category, p_amount, v_currency, v_note);
  return query select t.deposited, t.withdrawn, t.balance from public.user_totals(p_user_id) t;
end; $$;
revoke all on function public.admin_adjust_balance(uuid, numeric, text, text, text, text) from public;
grant execute on function public.admin_adjust_balance(uuid, numeric, text, text, text, text) to authenticated;

-- ---------- RPC: müşteri transfer talebi (tek seferde bir bekleyen) ----------
drop function if exists public.request_transfer(numeric, text, text);
drop function if exists public.request_transfer(numeric, text, text, text);
create or replace function public.request_transfer(
  p_amount numeric, p_mt5_account text default null, p_direction text default 'out',
  p_note text default null, p_currency text default 'USD'
) returns table(deposited numeric, withdrawn numeric, transferred numeric, balance numeric)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_primary text; v_mt5 text; v_dir text;
        v_balance numeric; v_currency text; v_note text; v_valid boolean;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if exists (select 1 from public.transfers where user_id = v_uid and status = 'pending') then
    raise exception 'pending transfer exists' using errcode = 'P0001';
  end if;
  v_dir := case when p_direction = 'in' then 'in' else 'out' end;
  select mt5_account into v_primary from public.profiles where id = v_uid;
  v_mt5 := coalesce(nullif(trim(p_mt5_account), ''), nullif(trim(v_primary), ''));
  if v_mt5 is null then raise exception 'mt5 account required' using errcode = 'P0001'; end if;
  v_valid := (v_mt5 = nullif(trim(v_primary), ''))
    or exists (select 1 from public.provisioning where user_id = v_uid and status = 'active' and trim(login) = v_mt5);
  if not v_valid then raise exception 'invalid mt5 account' using errcode = 'P0001'; end if;
  if v_dir = 'out' then
    select t.balance into v_balance from public.user_totals(v_uid) t;
    if p_amount > v_balance then raise exception 'insufficient balance' using errcode = 'P0001'; end if;
  end if;
  v_currency := coalesce(nullif(trim(p_currency), ''), 'USD');
  v_note := nullif(trim(p_note), '');
  insert into public.transfers (user_id, amount, currency, mt5_account, direction, status, note)
  values (v_uid, p_amount, v_currency, v_mt5, v_dir, 'pending', v_note);
  insert into public.notifications (user_id, kind, category, amount, currency)
  values (v_uid, 'info', 'transfer_request', p_amount, v_currency);
  return query select t.deposited, t.withdrawn, t.transferred, t.balance from public.user_totals(v_uid) t;
end; $$;
revoke all on function public.request_transfer(numeric, text, text, text, text) from public;
grant execute on function public.request_transfer(numeric, text, text, text, text) to authenticated;

-- ---------- RPC: admin transferi sonuçlandırır ----------
create or replace function public.admin_resolve_transfer(
  p_id uuid, p_status text, p_admin_note text default null
) returns public.transfers language plpgsql security definer set search_path = public as $$
declare v_row public.transfers; v_note text;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_status not in ('completed','rejected') then raise exception 'status must be completed or rejected'; end if;
  v_note := nullif(trim(p_admin_note), '');
  update public.transfers set status = p_status, admin_note = coalesce(v_note, admin_note), resolved_at = now()
   where id = p_id and status = 'pending' returning * into v_row;
  if v_row.id is null then raise exception 'transfer not found or already resolved'; end if;
  insert into public.notifications (user_id, kind, category, amount, currency, body)
  values (v_row.user_id, 'info',
    case when p_status = 'completed' then 'transfer_completed' else 'transfer_rejected' end,
    v_row.amount, v_row.currency, v_note);
  return v_row;
end; $$;
revoke all on function public.admin_resolve_transfer(uuid, text, text) from public;
grant execute on function public.admin_resolve_transfer(uuid, text, text) to authenticated;

-- ---------- RPC: KYC gönder (client AI doğruladıktan sonra) ----------
create or replace function public.kyc_submit(p_front text, p_back text, p_score numeric)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_status text;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select kyc_status into v_status from public.profiles where id = v_uid;
  if v_status = 'verified' then return 'verified'; end if;
  update public.profiles set kyc_status = 'reviewing', kyc_submitted_at = now(),
         kyc_front_path = p_front, kyc_back_path = p_back, kyc_score = p_score
   where id = v_uid;
  insert into public.notifications (user_id, kind, category) values (v_uid, 'info', 'kyc_submitted');
  return 'reviewing';
end; $$;
revoke all on function public.kyc_submit(text, text, numeric) from public;
grant execute on function public.kyc_submit(text, text, numeric) to authenticated;

-- ---------- RPC: KYC sonlandır (3 dk sonra otomatik onay) ----------
create or replace function public.kyc_finalize()
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_status text; v_at timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select kyc_status, kyc_submitted_at into v_status, v_at from public.profiles where id = v_uid;
  if v_status = 'reviewing' and v_at is not null and now() - v_at >= interval '3 minutes' then
    update public.profiles set kyc_status = 'verified' where id = v_uid;
    insert into public.notifications (user_id, kind, category) values (v_uid, 'info', 'kyc_verified');
    return 'verified';
  end if;
  return coalesce(v_status, 'pending');
end; $$;
revoke all on function public.kyc_finalize() from public;
grant execute on function public.kyc_finalize() to authenticated;

-- ---------- advisor: fonksiyonların search_path'ini sabitle ----------
alter function public.is_admin() set search_path = '';
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- ÖNEMLİ: trigger'ı auth.users insert'inde tetikleyen rol supabase_auth_admin'dir.
-- Yukarıdaki revoke PUBLIC'i kaldırınca bu rol de execute iznini kaybeder ve kayıt
-- "Database error saving new user" ile patlar. Bu yüzden açıkça geri veriyoruz:
grant execute on function public.handle_new_user() to supabase_auth_admin, postgres;

-- =====================================================================
--  RLS
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.transactions    enable row level security;
alter table public.tickets         enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.provisioning    enable row level security;
alter table public.bank_accounts   enable row level security;
alter table public.crypto_accounts enable row level security;
alter table public.settings        enable row level security;
alter table public.notifications   enable row level security;
alter table public.transfers       enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using ((select auth.uid()) = id or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using ((select auth.uid()) = id or public.is_admin())
  with check ((select auth.uid()) = id or public.is_admin());
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete to authenticated using (public.is_admin());

-- transactions
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- tickets
drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists tickets_insert on public.tickets;
create policy tickets_insert on public.tickets for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists tickets_update on public.tickets;
create policy tickets_update on public.tickets for update to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists tickets_delete on public.tickets;
create policy tickets_delete on public.tickets for delete to authenticated using (public.is_admin());

-- ticket_messages (ebeveyn ticket üzerinden)
drop policy if exists ticket_messages_select on public.ticket_messages;
create policy ticket_messages_select on public.ticket_messages for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id and ((select auth.uid()) = t.user_id or public.is_admin())));
drop policy if exists ticket_messages_insert on public.ticket_messages;
create policy ticket_messages_insert on public.ticket_messages for insert to authenticated
  with check (exists (select 1 from public.tickets t where t.id = ticket_id and ((select auth.uid()) = t.user_id or public.is_admin())));

-- provisioning (müşteri yalnızca KYC doğrulandıysa kendi satırını açabilir)
drop policy if exists provisioning_select on public.provisioning;
create policy provisioning_select on public.provisioning for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists provisioning_insert on public.provisioning;
create policy provisioning_insert on public.provisioning for insert to authenticated
  with check (
    public.is_admin()
    or ((select auth.uid()) = user_id
        and exists (select 1 from public.profiles p where p.id = user_id and p.kyc_status = 'verified'))
  );
drop policy if exists provisioning_update on public.provisioning;
create policy provisioning_update on public.provisioning for update to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());

-- bank / crypto / settings: herkes okur, admin yazar
drop policy if exists bank_select on public.bank_accounts;
create policy bank_select on public.bank_accounts for select to authenticated using (true);
drop policy if exists bank_insert on public.bank_accounts;
create policy bank_insert on public.bank_accounts for insert to authenticated with check (public.is_admin());
drop policy if exists bank_update on public.bank_accounts;
create policy bank_update on public.bank_accounts for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists bank_delete on public.bank_accounts;
create policy bank_delete on public.bank_accounts for delete to authenticated using (public.is_admin());

drop policy if exists crypto_select on public.crypto_accounts;
create policy crypto_select on public.crypto_accounts for select to authenticated using (true);
drop policy if exists crypto_insert on public.crypto_accounts;
create policy crypto_insert on public.crypto_accounts for insert to authenticated with check (public.is_admin());
drop policy if exists crypto_update on public.crypto_accounts;
create policy crypto_update on public.crypto_accounts for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists crypto_delete on public.crypto_accounts;
create policy crypto_delete on public.crypto_accounts for delete to authenticated using (public.is_admin());

drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select to authenticated using (true);
drop policy if exists settings_insert on public.settings;
create policy settings_insert on public.settings for insert to authenticated with check (public.is_admin());
drop policy if exists settings_update on public.settings;
create policy settings_update on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- notifications
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated with check (public.is_admin());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- transfers
drop policy if exists transfers_select on public.transfers;
create policy transfers_select on public.transfers for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists transfers_insert on public.transfers;
create policy transfers_insert on public.transfers for insert to authenticated with check (public.is_admin());
drop policy if exists transfers_update on public.transfers;
create policy transfers_update on public.transfers for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists transfers_delete on public.transfers;
create policy transfers_delete on public.transfers for delete to authenticated
  using (public.is_admin() or ((select auth.uid()) = user_id and status = 'pending'));

-- =====================================================================
--  Depolama (Storage): receipts + kyc (ikisi de private)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('kyc', 'kyc', false) on conflict (id) do nothing;

drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists receipts_select on storage.objects;
create policy receipts_select on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
drop policy if exists receipts_update on storage.objects;
create policy receipts_update on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

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

-- =====================================================================
--  Realtime publication
-- =====================================================================
do $$
declare t text;
  tbls text[] := array['transactions','tickets','ticket_messages','provisioning',
    'profiles','bank_accounts','crypto_accounts','settings','notifications','transfers'];
begin
  foreach t in array tbls loop
    if not exists (select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- =====================================================================
--  Başlangıç verisi (seed)
--  1) Admin yapmak için: önce auth'tan normal kayıt olun, sonra aşağıdaki
--     e-postayı kendi e-postanızla değiştirip çalıştırın. ÖNEMLİ: panelin
--     admin rolünü GÖRMESİ için app_metadata.role = 'admin' de olmalı; bunu
--     Supabase → Authentication → Users → (kullanıcı) → app_metadata'dan
--     { "role": "admin" } ekleyerek yapın (JWT bu alandan okunur).
-- =====================================================================
update public.profiles set role = 'admin', kyc_status = 'verified'
  where email = 'admin@trustcapital.com';

insert into public.bank_accounts (bank_name, holder, iban, note)
select 'Garanti BBVA', 'Trust Capital Ltd.', 'TR12 0006 2000 1234 0001 2345 67', 'TL transferleri için'
where not exists (select 1 from public.bank_accounts);

insert into public.crypto_accounts (network, token, address, note)
select 'TRC20', 'USDT', 'TXyz1234567890abcdefghijklmnopqrstuv', 'Tron ağı'
where not exists (select 1 from public.crypto_accounts);

insert into public.settings (id, deposit_receipt_required, min_deposit)
values (true, false, 0) on conflict (id) do nothing;
