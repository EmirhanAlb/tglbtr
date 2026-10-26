-- Vertex / Lmax Capital — Require KYC before a customer can create an MT5 account
-- Customers may only insert their own provisioning row once their profile is
-- kyc_status = 'verified'. Admins are unrestricted. Idempotent: safe to re-run.

drop policy if exists provisioning_insert on public.provisioning;
create policy provisioning_insert on public.provisioning for insert to authenticated
  with check (
    public.is_admin()
    or (
      (select auth.uid()) = user_id
      and exists (
        select 1 from public.profiles p
        where p.id = user_id and p.kyc_status = 'verified'
      )
    )
  );
