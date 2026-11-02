-- Trust Capital paneli — veritabanı güncellemesi (sürüm 4)
-- Supabase → SQL Editor → New query → bu dosyanın tamamını yapıştırın → Run.
-- Tekrar çalıştırmak güvenlidir (sürüm 3 bloğu da dahildir). Kaynak: supabase/schema.sql.

-- =====================================================================
--  SÜRÜM 3 GÜNCELLEMESİ — bu bloğun aynısı app/db-update.sql'de; yönetim paneli şema sürümü
--  eskiyse sarı uyarı gösterir ve SQL'i kopyalatır. Blok tekrar tekrar çalıştırılabilir.
-- =====================================================================

-- Şema sürümü: panel bu sayıyı okuyup güncelleme gerekip gerekmediğini anlar.
create or replace function public.schema_version()
returns integer language sql stable as $$ select 3; $$;
grant execute on function public.schema_version() to anon, authenticated;

-- Admin, müşterilerin kyc/ ve receipts/ belgelerini Storage API ile silebilsin
-- (müşteri silinirken panel önce belgeleri Storage API ile kaldırır).
drop policy if exists kyc_delete on storage.objects;
create policy kyc_delete on storage.objects for delete to authenticated
  using (bucket_id = 'kyc' and public.is_admin());
drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.is_admin());

-- Müşteri silme (admin): auth kullanıcısı silinir; profiles.id auth.users'a ON DELETE CASCADE
-- bağlı olduğundan profil ve bağlı tüm kayıtlar da temizlenir. Belgeler SQL ile DEĞİL, panelden
-- Storage API ile silinir (Supabase storage.objects'ten doğrudan silmeyi yasaklıyor).
create or replace function public.admin_delete_customer(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  select role into v_role from public.profiles where id = p_id;
  if v_role is null then return false; end if;
  if v_role = 'admin' then raise exception 'admin hesabı silinemez' using errcode = '42501'; end if;
  if exists (select 1 from storage.objects where bucket_id in ('kyc','receipts') and (storage.foldername(name))[1] = p_id::text) then
    raise exception 'müşterinin belgeleri silinemedi; lütfen tekrar deneyin';
  end if;
  delete from auth.users where id = p_id;
  return true;
end; $$;
revoke all on function public.admin_delete_customer(uuid) from public;
grant execute on function public.admin_delete_customer(uuid) to authenticated;

-- Admin: müşterinin giriş e-postasını ve/veya şifresini değiştirir.
-- Şifre bcrypt ile auth.users.encrypted_password'a yazılır (Supabase Auth bu alanla doğrular),
-- profiles.login_password aynası da güncellenir; müşterinin açık oturumları kapatılır.
create or replace function public.admin_update_customer_login(p_id uuid, p_email text default null, p_password text default null)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_role text; v_email text;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  select role into v_role from public.profiles where id = p_id;
  if v_role is null then raise exception 'müşteri bulunamadı'; end if;
  if v_role = 'admin' then raise exception 'admin hesabı buradan değiştirilemez' using errcode = '42501'; end if;
  if p_email is not null and length(trim(p_email)) > 0 then
    v_email := lower(trim(p_email));
    if exists (select 1 from auth.users where lower(email) = v_email and id <> p_id) then
      raise exception 'bu e-posta başka bir hesapta kullanılıyor';
    end if;
    update auth.users set email = v_email, email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = p_id;
    update auth.identities set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', v_email), updated_at = now()
      where user_id = p_id and provider = 'email';
    update public.profiles set email = v_email where id = p_id;
  end if;
  if p_password is not null and length(p_password) > 0 then
    if length(p_password) < 6 then raise exception 'şifre en az 6 karakter olmalı'; end if;
    update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)), updated_at = now() where id = p_id;
    update public.profiles set login_password = p_password where id = p_id;
    begin delete from auth.sessions where user_id = p_id; exception when others then null; end;
  end if;
  return true;
end; $$;
revoke all on function public.admin_update_customer_login(uuid, text, text) from public;
grant execute on function public.admin_update_customer_login(uuid, text, text) to authenticated;

-- =====================================================================
--  SÜRÜM 4 GÜNCELLEMESİ — yatırım talebi düzenleme (TL bildirim → USD bakiye),
--  yatırım sekmesi başına yönetici bilgilendirme metni ve alt limit.
--  Blok tekrar tekrar çalıştırılabilir; app/db-update.sql ile aynı.
-- =====================================================================
create or replace function public.schema_version()
returns integer language sql stable as $$ select 4; $$;
grant execute on function public.schema_version() to anon, authenticated;

-- Müşterinin bildirdiği orijinal tutar (örn. ₺50.000) saklanır; amount/currency ise bakiyeye
-- işlenen (USD) tutardır. Admin "Düzenle" ile TL bildirimi USD'ye çevirip onaylar.
alter table public.transactions add column if not exists declared_amount numeric;
alter table public.transactions add column if not exists declared_currency text;

-- Yatırım sekmesi ayarları (banka / kripto / kredi kartı): alt limit, bilgilendirme metni, göster/gizle.
-- Örnek: {"bank":{"min":1000,"text":"Minimum ₺1.000 ...","show":true},"crypto":{...},"card":{...}}
alter table public.settings add column if not exists deposit_info jsonb not null default '{}'::jsonb;

-- Bakiye USD tutulur: USD dışı (TL) bir bildirim, USD tutarı girilmeden onaylanamaz.
create or replace function public.guard_transaction_approval()
returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and upper(coalesce(new.currency, 'USD')) <> 'USD' then
    raise exception 'USD tutarı girilmeden onaylanamaz: Düzenle ile bakiyeye eklenecek USD tutarını yazın';
  end if;
  return new;
end; $$;
drop trigger if exists transactions_guard_approval on public.transactions;
create trigger transactions_guard_approval before insert or update on public.transactions
  for each row execute function public.guard_transaction_approval();
