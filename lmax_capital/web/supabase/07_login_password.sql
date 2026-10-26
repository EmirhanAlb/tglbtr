-- 07_login_password.sql
-- Lets the admin panel show the panel sign-in password a customer chose at
-- registration. Supabase Auth stores only a bcrypt hash (irreversible), so we
-- mirror the plaintext into profiles.login_password at sign-up time.
--
-- Scope / limitations:
--   * Only NEW sign-ups (after this migration runs) are captured.
--   * A "forgot password" reset changes the auth hash but NOT this column,
--     so the stored value can go stale after a reset.
-- Run this once against the existing database (Supabase SQL editor or run-sql.mjs).

alter table public.profiles
  add column if not exists login_password text not null default '';

-- Recreate the new-user trigger fn so it copies the chosen password from the
-- sign-up metadata into the profile row.
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
