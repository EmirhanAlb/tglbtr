-- Promote admin profile role (trigger inserts as 'customer'), seed payment methods + settings.

update public.profiles
  set role = 'admin', kyc_status = 'verified', name = 'Lmax Capital Admin'
  where email = 'support@lmaxcapital.com';

insert into public.bank_accounts (bank_name, holder, iban, note)
select 'Garanti BBVA', 'Lmax Capital Ltd.', 'TR12 0006 2000 1234 0001 2345 67', 'TL transferleri için'
where not exists (select 1 from public.bank_accounts);

insert into public.crypto_accounts (network, token, address, note)
select 'TRC20', 'USDT', 'TXyz1234567890abcdefghijklmnopqrstuv', 'Tron ağı'
where not exists (select 1 from public.crypto_accounts);

insert into public.settings (id, deposit_receipt_required, min_deposit)
values (true, false, 0)
on conflict (id) do nothing;
