# Trustglobal — trustcapital.com Türkçe kopyası

[trustcapital.com](https://trustcapital.com) sitesinin birebir Türkçe kopyası.
[Eleventy (11ty)](https://www.11ty.dev/) ve Nunjucks şablonlarıyla yazılmış statik bir sitedir;
çıktısı (`_site/`) herhangi bir web sunucusunda barındırılabilen düz HTML/CSS/JS'tir.

## Çalıştırma

```bash
npm install      # ilk seferde
npm run dev      # http://localhost:8080 — dosya değiştikçe sayfa kendini yeniler
npm run build    # yayına hazır çıktıyı _site/ klasörüne üretir
```

## Klasör yapısı

```
src/
  _data/                 Şablonların kullandığı veriler
    site.json            Ortak linkler (giriş, uygulama mağazaları, sosyal medya...)
    nav.json             Üst menü + mega menülerin Türkçe başlıkları ve linkleri
    ticker.json          Üstteki kayan fiyat bandı
    homeInstruments.json Ana sayfadaki enstrüman tablosu
    instrumentPages.json /instruments/* sayfalarının tüm içeriği (aşağıya bakın)
    instrumentDetails.js /instrumentdetails/<SEMBOL> sayfalarının listesi
  _includes/
    layouts/base.njk     Tüm sayfaların iskeleti (<head>, header, footer)
    macros/
      instrument-landing.njk  /instruments/* sayfalarının ortak gövdesi
    partials/            Header, mega menüler, fiyat bandı, footer, widget'lar
  index.njk              Ana sayfa
  instruments/           Piyasalar menüsündeki 7 enstrüman sayfası
  api/market-prices.11ty.js  Fiyat güncelleme JSON'u (aşağıya bakın)
public/                  Olduğu gibi sitenin köküne kopyalanan dosyalar
  build/assets/          Orijinal sitenin derlenmiş CSS/JS paketleri, fontlar, görseller
  images/  video/  docs/ Görseller, hero videosu, PDF'ler
```

`public/` altındaki yollar orijinal siteyle aynıdır (`/build/assets/...`, `/images/...`).
Böylece orijinal CSS içindeki `url(/build/assets/...)` referansları değiştirilmeden çalışır.

## Yeni sayfa eklemek

1. Orijinal sayfanın HTML'ini inceleyin.
2. `src/<sayfa-adı>.njk` oluşturun, en üste front matter yazın:
   ```yaml
   ---
   layout: layouts/base.njk
   permalink: /about-us/
   title: "Hakkımızda | Trust Capital"
   description: "..."
   styles: [ ... ]   # o sayfanın orijinalde yüklediği CSS dosyaları
   scripts: [ ... ]  # o sayfanın orijinalde yüklediği JS dosyaları
   ---
   ```
3. Sayfa gövdesini orijinal markup'ı koruyarak, metinleri Türkçeleştirerek yazın.
   **Class ve id'leri değiştirmeyin** — orijinal JS bunlara bağlı çalışıyor.

## Enstrüman sayfaları (`/instruments/*`)

Piyasalar menüsündeki yedi sayfa (`spot-forex`, `spot-metals`, `cfd-indices`,
`cfd-shares`, `cfd-mena-shares`, `cfd-energy`, `cfd-commodity`) orijinaldeki
tek bir şablonun varyantlarıdır. Bu yüzden markup tek yerde durur:

- **`src/_includes/macros/instrument-landing.njk`** — orijinal sayfanın gövdesi
  birebir kopyalanmıştır: başlık, hesap türü sekmeleri, kayan fiyat şeridi,
  tablolar, dipnotlar. **Class ve id'leri değiştirmeyin**, orijinal JS bunlara bağlı:
  - `.tab-click` + `data-class="acc-types"` → `utils-939e6257.js` içindeki
    `commonTab()` sekmeye göre `.acc-typesselected-div` panellerini gösterir/gizler.
  - `.scroller` → aynı dosya `--animation-duration`'ı *3 × çocuk sayısı* saniye
    olarak kendisi hesaplar; bu yüzden şablonda `style` yazılmaz.
    (Forex sayfasında 58 sembol → 174s, orijinaldeki değerle aynı.)
  - `.<SEMBOL>_bid` / `.<SEMBOL>_ask` → `get_live_share_value()` 8 saniyede bir
    bu class'ları günceller.
- **`src/_data/instrumentPages.json`** — sayfaların tüm içeriği (başlıklar,
  sekmeler, şerit sembolleri, tablo satırları, dipnotlar). Orijinal sayfalardan
  çıkarılıp Türkçeleştirilmiştir. Satır sayıları orijinalle aynıdır
  (ör. Forex: 28 majör + 30 minör × Standard/Pro/Cent).
- Sayfa dosyalarının kendisi (`src/instruments/*.njk`) yalnızca front matter +
  iki satırdır; içerik değişikliği JSON'dan yapılır.

Sayfalar orijinalin yüklediği CSS/JS setini aynı sırayla yükler ve üstteki kayan
fiyat bandını göstermez (`showTicker: false`) — orijinalde de yoktur.

## Orijinal derlemedeki eksikler için eklenen dosyalar

Bu kopyaya alınan `build/assets/` klasörü eksikti; aşağıdaki dosyalar o boşlukları
kapatır ve **her sayfada** `base.njk` tarafından yüklenir. Orijinal paketlerin
hiçbiri değiştirilmemiştir, hepsi onlardan *sonra* yüklenen ek dosyalardır:

| Dosya | Neyi çözüyor |
| --- | --- |
| `footer-shared.css` | Footer kuralları orijinalde yalnızca ana sayfanın yüklediği `home-dc5eafe7.css` içindeydi; alt sayfalarda footer tamamen stilsiz kalıyordu. Kurallar oradan aynen çıkarıldı. |
| `utilities-missing.css` | Şablonların kullandığı bazı Tailwind sınıfları orijinal derlemede yok (orijinal site onları kullanmıyor). En önemlisi `bg-[#003E3C]`: 25 alt sayfada koyu yeşil hero arka plansız kalıyor, açık renk yazı beyaz zeminde görünmüyordu. |
| `symbol-icons-missing.css` + `icons/` | `symbol-d300c5e6.css`'in referans verdiği enstrüman ikonlarının 107 tanesi klasörde yoktu (boş ikon, bir kısmı 404). Görseller orijinalden PNG olarak indirildi. |
| `ionicons-*.woff2/woff/ttf/eot/svg` | İkon fontu hiç kopyalanmamıştı; dipnotlardaki ✓ işaretleri boş kare görünüyordu. Ionicons 4.5.9-1'den alındı. |
| `images/live_green.svg`, `images/live_red.svg`, `images/up.png`, `images/down.png` | Fiyat şeridindeki yön okları eksikti. |
| `header-menu.js` | Üst menü davranışı (mega menüler, mobil hamburger, "Giriş" açılır listesi) orijinalde ana sayfa için `home-48a5a3ec.js`, alt sayfalar için `innerpages-886314ef.js` içinde. İkincisi bu kopyaya alınmamıştı; alt sayfalarda menülere tıklayınca mega menü açılmıyor, onun yerine `<li>` içindeki dar liste açılıp linkler taşıyordu. Bu dosya o paketin yaptığı işi yapar ve `base.njk` tarafından **yalnızca** `home-48a5a3ec.js` yüklemeyen sayfalara eklenir (ana sayfada eklenmez, yoksa iki dinleyici çakışır). Menü↔mega eşleşmesi sabit id yerine `nav.json`'daki `section` alanından (`<li data-section>`) kurulur. |

## Giriş ekranı (`/app/auth.html`)

Üst menüdeki **Giriş → Müşteri** bağlantısı `/app/auth.html`'e gider. Bu sayfa
[my.trustcapital.com/login](https://my.trustcapital.com/login) tasarımına
uyarlanmıştır: solda koyu lacivert görsel panel (masaüstü), sağda beyaz form.

- Markup `app/auth.html`, stiller `app/login.css` (dashboard/admin'in paylaştığı
  `app/style.css`'e dokunulmadı).
- Backend aynı: form alanlarının id'leri (`l_email`, `loginBtn`, `regView` …)
  korunduğu için `app/app.js` içindeki Supabase giriş/kayıt/şifre-sıfırlama
  mantığı değişmeden çalışır.
- QR kodu sitenin kendi `qrcode-ee012d8f.js` modülüyle çizilir.
- Koyu panel için beyaz logo `images/blocks/tc-logo-white.png`, mobil başlık için
  koyu logo `images/blocks/tc-logo-dark.png` eklendi.
- Marka adı/renkleri `app/config.js` içindeki `brand` bölümünden gelir
  (Trust Capital olarak ayarlandı).

`.fi-lead`, `.fi-zinc`, `.fi-aluminium`, `.fi-goldp`, `.fi-cocoa_myy` gibi birkaç
sınıfın `symbol-d300c5e6.css`'te hiç kuralı yok; bunlar **orijinal sitede de**
ikonsuz görünür, o yüzden bilerek eklenmedi.

## Mobil görünüm ve alt navigasyon

- `public/build/assets/mobile.css`: ≤767px için düzen düzeltmeleri (taşan tablolar yatay kaydırılır,
  ana sayfa bölümleri, başlık boyutları, WhatsApp düğmesinin konumu).
- `src/_includes/partials/mobile-nav.njk` + `mobile-nav.css/js`: altta sabit duran koyu navigasyon barı
  (Ana Sayfa · Piyasalar · Hesap Aç · Giriş · Menü) ve "Menü"ye basınca açılan, tüm siteyi gruplar
  hâlinde listeleyen alt sayfa. Bağlantılar `src/_data/nav.json`'dan gelir; başlıktaki ☰ düğmesi de
  aynı sayfayı açar. Masaüstünde görünmez.
- Panel ve admin (`app/panel-mobile.js`): ≤900px'de aynı tarz alt bar; "Menü" tüm bölümleri,
  kullanıcı kartını ve Çıkış'ı listeleyen alt sayfayı açar (yan çekmece ve ☰ mobilde yok).
  `panel.html#deposit`, `admin.html#investors` gibi bağlantılarla bölüm doğrudan açılır.

## Panel: kredi kartı ile yatırım, müşteri silme, giriş bilgisi değiştirme

- **Kredi Kartı** sekmesi (Para Yatır): "WhatsApp ile Devam Et" düğmesi `app/config.js` içindeki
  `whatsapp` numarasına hazır mesajla sohbet açar ve Destek'te otomatik talep kaydı oluşturur.
- **Sil** düğmeleri (Potansiyel ve Yatırımcılar listeleri + müşteri düzenleme ekranı): panel önce
  müşterinin `kyc/` ve `receipts/` belgelerini Storage API ile kaldırır, sonra `admin_delete_customer`
  RPC'si auth kullanıcısını siler (profil ve bağlı kayıtlar cascade ile gider). Supabase,
  `storage.objects` tablosundan SQL ile silmeyi yasakladığı için eski RPC her silmede 403 veriyordu.
- **Giriş bilgisi**: müşteri düzenleme ekranındaki E-posta ve Panel Giriş Şifresi alanları artık
  yazılabilir; Kaydet'e basınca `admin_update_customer_login` RPC'si auth.users'ı (bcrypt) ve
  `profiles.login_password` aynasını günceller, müşterinin açık oturumlarını kapatır.
- **Veritabanı güncellemesi**: `schema_version()` RPC'si `store.js`'teki `REQUIRED_SCHEMA_VERSION`'dan
  küçükse (ya da yoksa) yönetim paneli üstte sarı kutu gösterir; "SQL'i kopyala" `app/db-update.sql`
  dosyasını panoya alır, "Supabase SQL Editor'ü aç" doğru projeyi açar. Yeni bir SQL değişikliği
  gerektiğinde: schema.sql'deki bloğu güncelle, `schema_version()` değerini ve
  `REQUIRED_SCHEMA_VERSION`'ı artır, `app/db-update.sql`'i yeniden üret.

## Panel: yatırım talebi düzenleme, TL bildirim, sekme bilgilendirme metinleri, hesap başına limit (şema sürüm 4–7)

- **Banka havalesi TL ile bildirilir**: müşteri Para Yatır → Banka Havalesi'nde tutarı TL yazar;
  işlem `currency='TRY'` ile kaydedilir ve listelerde `+₺50.000,00` görünür. Kripto USD kalır.
  Bakiye USD tutulur; `transactions_guard_approval` trigger'ı USD dışı bir satırın `approved`
  olmasını engeller.
- **Finans → Düzenle**: bekleyen her talep onaydan önce düzenlenebilir (tutar, not; dekont bağlantısı).
  TL bildirimde "Bakiyeye eklenecek tutar (USD)" girilir (isteğe bağlı kur alanı otomatik hesaplar);
  kaydedilince `amount/currency` USD olur, müşterinin bildirdiği tutar `declared_amount/declared_currency`
  alanlarında kalır ve tabloda "(₺50.000,00 bildirildi)" olarak gösterilir. "Onayla" TL satırda
  doğrudan onaylamaz, bu modalı açar. "Kaydet ve Onayla" tek adımda onaylar.
- **Yatırım sekmesi ayarları** (Banka & Kripto → Yatırım Ayarları): her sekme (banka / kripto / kredi
  kartı) için bilgilendirme metni ve "müşteriye göster" anahtarı. `settings.deposit_info` (jsonb) içinde
  `{bank:{text,show},crypto:{…},card:{…}}`; müşteri panelinde sekmenin üstünde sarı kutu olarak çıkar.
  (Sürüm 4'teki sekme başına min/max alanları sürüm 7 ile hesap başına limite taşındı; aşağıya bakın.)
- **Şifre görünürlüğü**: Potansiyel ve Yatırımcılar listelerinde "Şifre" sütunu; müşteri sayfasının
  üstünde "Panel Giriş Bilgileri" kartı (e-posta + şifre, Kopyala). Şifre boşsa nedeni ve çözümü yazılır.
  Boş şifrelerin kaynağı: sitedeki `src/live-account.njk` kayıt formu `login_password`/`name` göndermiyordu
  (düzeltildi); daha önce siteden kaydolanlar için yönetici yeni şifre belirler.
- **MT5 talebini reddetme (sürüm 5)**: MT5 Hesapları ve Potansiyel listelerinde bekleyen talep için "Reddet";
  not zorunludur, `provisioning.status='rejected'` + `admin_note` yazılır ve müşteriye `mt5_rejected`
  bildirimi düşer. Müşteri notu MT5 Hesabım sayfasında görür, yeniden talep oluşturabilir. Reddedilen
  satır "Kaldır" ile silinebilir (admin delete policy).
- **IBAN/cüzdan yalnızca KYC onaylılara (sürüm 6)**: müşteri panelinde Banka Havalesi ve Kripto sekmeleri
  KYC doğrulanmadan "Önce kimlik doğrulaması gerekli" kapısı gösterir; sunucu tarafında `bank_select` /
  `crypto_select` politikaları `is_admin() or is_kyc_verified()` ile sınırlıdır. Kredi Kartı sekmesi açık kalır.
- Site: ana sayfa kahraman düğmesi "KAYIT OL" (`/live-account`), masaüstü başlıkta Giriş'in solunda "Kayıt Ol"
  (`.registerButton`, stil `public/build/assets/utilities-missing.css`); mobil alt barda zaten "Hesap Aç" var.
  Canlı hesap formunda hesap türü seçenekleri: ECN / Standard / Professional.
- **IBAN / cüzdan başına limit ve para birimi (sürüm 7)**: Banka & Kripto sayfasında her banka hesabının
  para birimi (`bank_accounts.currency`: TRY / USD), alt ve üst limiti (`min_amount` / `max_amount`, boş = sınırsız)
  ve açıklaması vardır; kripto cüzdanlarında aynı limitler USD'dir. Satırdaki "Düzenle" mevcut hesabı günceller.
  Sekme başına eski min/max ayarı kaldırıldı; "Yatırım Ayarları" yalnızca bilgilendirme metni + göster/gizle ve
  dekont zorunluluğunu tutar (`settings.min_deposit` artık okunmaz).
- **Müşteri hesap seçer**: Para Yatır'da IBAN'lar / cüzdanlar seçilebilir kart olarak listelenir (tek hesap varsa
  otomatik seçili). Tutar alanı seçilen hesabın para birimiyle (TL hesapta ₺, USD hesapta $) ve limitiyle etiketlenir;
  limit dışı tutar reddedilir. Bildirim `transactions.account_id` + `account_label` ("HALKBANK TL IBAN · TR40 …")
  ile kaydedilir; Finans listesinde, müşteri sayfasındaki geçmişte, müşterinin kendi listesinde ve düzenleme
  modalında "Hesap" olarak görünür. USD hesaba yapılan bildirim kur çevrimi gerekmeden onaylanabilir.
  Şema 7 kurulmadan yapılan bildirimde hesap bilgisi not alanına yazılır (bildirim düşmez).
- Sürüm 3–7 SQL blokları: `supabase/schema.sql` sonunda ve `app/db-update.sql` içinde (hepsi birlikte).

## Oturumlar: yönetici ve müşteri ayrı

`app/app.js` iki Supabase istemcisi kurar: müşteri paneli `sb-<ref>-auth-token`, yönetim paneli
`sb-<ref>-admin-auth-token` anahtarını kullanır. Aynı tarayıcıda hem yönetici hem müşteri girişi
yapılabilir; müşteri girişi yöneticinin oturumunu ezmez (eski tek anahtarlı düzen, yönetici
"müşteri olarak giriş yapınca" admin panelini bozuyor ve giriş sayfasına düşürüyordu).

- `auth.html` girişte rolü belirleyip oturumu doğru anahtara yazar (`signInByRole`). Eski sürümden
  müşteri anahtarında kalmış bir yönetici oturumu ilk açılışta otomatik taşınır.
- `auth.html?as=admin` ile gelindiğinde müşteri oturumu olsa bile giriş formu gösterilir
  (yönetim panelinden çıkış/yeniden giriş bu adrese gider).
- Çıkış yalnızca o cihazdaki oturumu kapatır (`scope: "local"`); önceden tüm cihazlardaki
  oturumlar iptal ediliyordu.
- Şifre sıfırlama bağlantısı (`auth.html?reset=1`) artık "Yeni şifre belirleyin" ekranını açar.
- Canlı (realtime) yenileme bir forma yazılırken ya da modal açıkken ekranı silmez; yakalanmamış
  hatalar sağ altta kırmızı bildirim olarak görünür, oturum düşerse "Yeniden Giriş Yap" kutusu çıkar.

## Bilinmesi gerekenler

- **Orijinal JS paketleri yeniden kullanılıyor.** Kullanıcıya görünen İngilizce metin içeren
  yerler doğrudan paket içinde Türkçeleştirildi:
  - `public/build/assets/home-48a5a3ec.js` → tablo sayfalama metinleri (Önceki/Sonraki, "Sayfa X / Y").
- **Canlı fiyatlar:** Orijinal sitede fiyatlar 8 saniyede bir sunucudan çekiliyor. Burada
  `/api/market-prices.json` derleme anındaki verilerden üretilen sabit bir anlık görüntüdür.
  Gerçek zamanlı fiyat için bu adresi bir fiyat sağlayıcısına bağlı bir backend uç noktasıyla
  değiştirmek gerekir (`src/_includes/partials/widgets.njk` içindeki `__LIVE_MARKETDATA_URL__`).
- **Kaldırılanlar:** Orijinaldeki analiz/izleme kodları (Google Tag Manager, Hotjar, Snap Pixel,
  Finteza) ve LiveChat sohbet widget'ı bilerek eklenmedi; bunlar orijinal şirketin hesaplarına bağlı.
- **`text-transform: capitalize` ve Türkçe "i":** Tarayıcılar bu CSS kuralında "i" harfini
  "I" yapıyor. Bu kuralın uygulandığı yerlerde (ör. `.trading_essentials_left h6`, `.capitalize`)
  "i" ile başlayan kelimeleri baştan "İ" ile yazın.
- Dış linkler (müşteri girişi `my.trustcapital.com`, uygulama mağazaları, MT5 indirme) orijinal
  adreslere gider; hepsi `src/_data/site.json` içinden değiştirilebilir.

## Canlı fiyatlar

Sitedeki tüm fiyatlar (ana sayfa bandı ve tablosu, `/instruments/*` kayan kartları,
`/all-instruments`, `/instrumentdetails/*`) **10 saniyede bir** canlı güncellenir.

| Parça | Görevi |
| --- | --- |
| `api/market-prices.js` | Vercel sunucu fonksiyonu: `GET /api/market-prices`. Kaynak olarak TradingView'in herkese açık tarayıcı uç noktasını kullanır (ücretsiz, API anahtarı gerekmez; forex/metal/kripto/CFD anlık, hisseler 15 dk gecikmeli). Yanıt Vercel CDN'de 10 sn önbelleklenir; kaynak yanıt vermezse derleme anındaki değerler döner. |
| `api/_symbols.json` | Site sembolü → kaynak kodu eşlemesi, ondalık ve spread bilgisi. `npm run symbols` ile yeniden üretilir (`tools/build-symbol-map.mjs`). Yeni hisse/endeks eklerken bu dosyadaki `OVERRIDES` tablosuna satır ekleyin; forex ve kripto otomatik eşlenir. |
| `public/build/assets/live-prices.js` | Tarayıcı tarafı: `.SEMBOL_bid`, `_ask`, `_change`, `_change_percentage`, `_position`, `_rate_img`, `_dirimg` sınıflı öğeleri günceller, yön renklerini (`lp-up` / `lp-down`) ve tik vurgusunu uygular. Her sayfada `base.njk` ile yüklenir. |
| `public/build/assets/live-prices.css` | Fiyat renkleri, kayan kart ve tablo stilleri. |
| `src/api/market-prices.11ty.js` | Aynı biçimde statik kopya (`/api/market-prices.json`); fonksiyona ulaşılamazsa yedek olarak kullanılır. |

Yerelde canlı fiyatlarla önizleme (Eleventy'nin `dev` sunucusu fonksiyonu çalıştıramaz):

```bash
npm run build && npm run preview   # http://localhost:8080
```
