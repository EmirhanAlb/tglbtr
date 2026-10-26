-- Vertex / Lmax Capital — Bir müşterinin TÜM verisini sıfırla (hesabı korunur).
-- Hesabın kendisi (giriş bilgileri) silinmez; sadece içerik "hiç yazılmamış" gibi olur:
-- işlemler, transferler, bildirimler, destek talepleri, MT5 hesapları silinir;
-- KYC 'pending'e döner, MT5 numarası ve bakiye sıfırlanır.
--
-- KULLANIM: Aşağıdaki e-postayı doğrula, sonra Supabase SQL Editor'da çalıştır.

do $$
declare
  v_email text := 'emiralbayrak038@gmail.com';  -- <-- HEDEF KULLANICININ E-POSTASI
  v_uid   uuid;
begin
  select id into v_uid from public.profiles where lower(email) = lower(v_email);
  if v_uid is null then
    raise exception 'Kullanici bulunamadi: %  (e-postayi kontrol et)', v_email;
  end if;
  if (select role from public.profiles where id = v_uid) = 'admin' then
    raise exception 'Bu bir admin hesabi, sifirlama iptal edildi: %', v_email;
  end if;

  delete from public.transfers     where user_id = v_uid;
  delete from public.transactions  where user_id = v_uid;
  delete from public.notifications where user_id = v_uid;
  delete from public.tickets       where user_id = v_uid;  -- ticket_messages cascade ile gider
  delete from public.provisioning  where user_id = v_uid;  -- MT5 hesap(lar)i

  update public.profiles
     set mt5_account      = null,
         kyc_status       = 'pending',
         kyc_submitted_at = null,
         kyc_front_path   = null,
         kyc_back_path    = null,
         kyc_score        = null
   where id = v_uid;

  raise notice 'Sifirlandi: %  (id=%)', v_email, v_uid;
end $$;
