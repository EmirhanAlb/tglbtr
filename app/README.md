# Müşteri Paneli + Admin Paneli

Trust Capital kopyasına entegre, broker tarzı **müşteri paneli** ve **admin paneli**.
Yapı, `lmax_capital` projesindeki admin/panel mimarisinin birebir uyarlamasıdır
(aynı bölümler, aynı veri modeli, aynı akışlar) ve vanilla JS + Supabase ile kurulmuştur.

> Bu uygulama Trust Capital kopyası içindir. Backend olarak **sizin kendi Supabase
> projenizi** kullanır; gerçek para hareketi yoktur, yatırma/çekme/transfer birer
> **talep** olarak kaydedilir ve admin onayı bakiyeyi günceller.

## Dosyalar

```
app/
  auth.html         Giriş / Kayıt / Şifre sıfırlama (my.trustcapital.com/login tasarımı)
  panel.html+panel.js   Müşteri paneli — 8 bölüm
  admin.html+admin.js   Admin paneli — 8 bölüm
  store.js          Supabase veri katmanı (lmax store.js'in vanilla portu)
  app.js            Supabase istemcisi + ortak yardımcılar
  config.js         Marka + Supabase anahtarları (TEK ayar dosyası)
  panel.css         Panel/admin tasarım sistemi (lmax styles.css'ten port)
  login.css         Giriş ekranı stilleri
supabase/schema.sql Tüm şema: tablolar, RPC'ler, RLS, storage, trigger (tek dosya)
```

## Müşteri paneli bölümleri
Özet · MT5 Hesabım · Para Yatır · Para Çek · Transfer · KYC · Destek · Hesabım
(üstte bildirim çanı). Kayıt olan kullanıcı otomatik `profiles`'a düşer ve buraya girer.

## Admin paneli bölümleri
Dashboard · Potansiyel (MT5'siz) · Yatırımcılar (MT5'li) · Destek Talepleri ·
Finans (yatırma/çekme onayı) · Transferler · MT5 Hesapları (atama) · Banka & Kripto.
Müşteri düzenleme ekranında: bakiye ekle/düş, KYC belgelerini onayla/reddet,
MT5 bilgisi ata, panel giriş şifresini gör, işlem geçmişi.

## Kurulum (tek seferlik)

1. **Supabase projesi açın** — supabase.com → *New project*.
2. **Şemayı yükleyin** — *SQL Editor* → *New query* → `supabase/schema.sql`'in
   tamamını yapıştırıp **Run**. (Idempotent: tekrar çalıştırmak güvenlidir.)
3. **Anahtarları girin** — *Project Settings → API*:
   - `Project URL` → `app/config.js` içindeki `supabaseUrl`
   - `anon public` → `app/config.js` içindeki `supabaseAnonKey`
   - ⚠️ `service_role` anahtarını **asla** config.js'e koymayın.
4. **Storage** — `schema.sql` `receipts` ve `kyc` bucket'larını (private) oluşturur;
   ek ayar gerekmez.
5. **(Test kolaylığı)** İlk denemede *Authentication → Providers → Email →
   "Confirm email"* kapalı olursa kayıt sonrası doğrudan panele girilir.

## İlk admini oluşturma

Rol iki yerde tutulur: `profiles.role` (panel verisi) ve JWT `app_metadata.role`
(RLS yetkisi). İkisi de `admin` olmalı:

1. `auth.html`'den normal bir hesap açın (örn. `admin@trustcapital.com`).
2. Supabase *SQL Editor*:
   ```sql
   update public.profiles set role='admin', kyc_status='verified' where email='SİZİN_EPOSTANIZ';
   ```
3. *Authentication → Users → (kullanıcı) → app_metadata* alanına şunu ekleyin:
   ```json
   { "role": "admin" }
   ```
   (RLS `is_admin()` rolü **buradan**, JWT'den okur.) Çıkış yapıp tekrar girin.
4. Artık giriş yapınca otomatik `admin.html`'e yönlendirilirsiniz; müşteriler `panel.html`'e.

## Akış özeti

- **Kayıt** → `profiles` satırı (trigger) → müşteri paneli.
- **KYC** → kimlik ön/arka yüz yükle → `reviewing` → 3 dk sonra otomatik `verified`
  (ya da admin elle onaylar). KYC doğrulanmadan MT5 hesabı açılamaz.
- **MT5** → müşteri talep eder → admin login/sunucu/şifre atar → müşteri onaylar → `active`.
- **Para Yatır/Çek** → `transactions` (pending) + otomatik destek kaydı → admin Finans'tan onaylar.
- **Transfer** → iç bakiye ↔ MT5 (çift yönlü), `request_transfer` RPC bakiyeyi tutar →
  admin Transferler'den tamamlar/reddeder.
- **Admin bakiye** → `admin_adjust_balance` RPC: onaylı işlem + müşteriye bildirim.

## Notlar

- KYC'de lmax'teki tarayıcı-içi AI OCR (tesseract.js) yerine basit bir doğrulama
  skoru kullanılır; sunucu tarafı akış (reviewing → 3 dk → verified) aynıdır.
- `reference-lmax/` ve `lmax_capital/` yalnızca referans içindir; Eleventy çıktısına
  (`_site/`) **dahil edilmez**. İş bittiğinde silinebilirler.
