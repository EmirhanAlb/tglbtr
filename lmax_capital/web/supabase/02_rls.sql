-- RLS policies. Enable RLS on every table, then add policies.
-- All policies target authenticated role + ownership/is_admin() predicate.

alter table public.profiles        enable row level security;
alter table public.transactions    enable row level security;
alter table public.tickets         enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.provisioning    enable row level security;
alter table public.bank_accounts   enable row level security;
alter table public.crypto_accounts enable row level security;
alter table public.settings        enable row level security;

-- ---------- profiles ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using ((select auth.uid()) = id or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using ((select auth.uid()) = id or public.is_admin())
  with check ((select auth.uid()) = id or public.is_admin());

-- admin may delete customers (deleteUser)
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete to authenticated
  using (public.is_admin());

-- insert handled by handle_new_user() trigger (security definer); no client insert.

-- ---------- transactions ----------
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- tickets ----------
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
create policy tickets_delete on public.tickets for delete to authenticated
  using (public.is_admin());

-- ---------- ticket_messages (access via parent ticket) ----------
drop policy if exists ticket_messages_select on public.ticket_messages;
create policy ticket_messages_select on public.ticket_messages for select to authenticated
  using (exists (
    select 1 from public.tickets t
    where t.id = ticket_id and ((select auth.uid()) = t.user_id or public.is_admin())
  ));

drop policy if exists ticket_messages_insert on public.ticket_messages;
create policy ticket_messages_insert on public.ticket_messages for insert to authenticated
  with check (exists (
    select 1 from public.tickets t
    where t.id = ticket_id and ((select auth.uid()) = t.user_id or public.is_admin())
  ));

-- ---------- provisioning ----------
drop policy if exists provisioning_select on public.provisioning;
create policy provisioning_select on public.provisioning for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- customer may activate own (activateProvisioning sets status/activated_at);
-- admin may assign/update credentials.
drop policy if exists provisioning_insert on public.provisioning;
create policy provisioning_insert on public.provisioning for insert to authenticated
  with check ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists provisioning_update on public.provisioning;
create policy provisioning_update on public.provisioning for update to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());

-- ---------- bank_accounts / crypto_accounts / settings ----------
-- readable by all authenticated; writable by admin only.
drop policy if exists bank_select on public.bank_accounts;
create policy bank_select on public.bank_accounts for select to authenticated using (true);
drop policy if exists bank_write on public.bank_accounts;
create policy bank_write on public.bank_accounts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists crypto_select on public.crypto_accounts;
create policy crypto_select on public.crypto_accounts for select to authenticated using (true);
drop policy if exists crypto_write on public.crypto_accounts;
create policy crypto_write on public.crypto_accounts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select to authenticated using (true);
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
