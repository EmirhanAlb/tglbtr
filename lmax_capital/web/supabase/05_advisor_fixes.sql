-- Address security/perf advisor findings.

-- 1. Pin search_path on functions (immutable search_path).
alter function public.is_admin() set search_path = '';
alter function public.set_updated_at() set search_path = '';
alter function public.user_totals(uuid) set search_path = public, pg_temp;

-- 2. handle_new_user is a trigger fn only — revoke PUBLIC execute (anon/authenticated).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 3. Remove duplicate permissive SELECT policies: replace FOR ALL write policies
--    with explicit insert/update/delete so SELECT has a single policy each.
drop policy if exists bank_write on public.bank_accounts;
create policy bank_insert on public.bank_accounts for insert to authenticated with check (public.is_admin());
create policy bank_update on public.bank_accounts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy bank_delete on public.bank_accounts for delete to authenticated using (public.is_admin());

drop policy if exists crypto_write on public.crypto_accounts;
create policy crypto_insert on public.crypto_accounts for insert to authenticated with check (public.is_admin());
create policy crypto_update on public.crypto_accounts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy crypto_delete on public.crypto_accounts for delete to authenticated using (public.is_admin());

drop policy if exists settings_write on public.settings;
create policy settings_insert on public.settings for insert to authenticated with check (public.is_admin());
create policy settings_update on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
