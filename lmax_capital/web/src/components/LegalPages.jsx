import { useEffect, useState } from "react";

const LEGAL_UPDATED = "14 Mayıs 2026";

const TERMS = {
  eyebrow: "YASAL",
  title: "Kullanım Şartları",
  intro:
    "Bu Kullanım Şartları, Lmax Capital (\"Lmax Capital\", \"biz\", \"kurum\") tarafından sunulan ticaret platformu, web sitesi ve ilgili hizmetlerin (\"Hizmetler\") kullanımını düzenler. Hesap açarak veya Hizmetleri kullanarak, bu şartların tamamını okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan edersiniz.",
  sections: [
    {
      id: "general",
      heading: "1. Genel Hükümler ve Tanımlar",
      blocks: [
        { type: "p", text: "Bu sözleşmenin tarafları; bir tarafta Lmax Capital, diğer tarafta hesap açma başvurusunu tamamlayan gerçek ya da tüzel kişiliktir (\"Müşteri\"). Sözleşme; elektronik ortamda onay verildiği anda yürürlüğe girer ve karşılıklı feshe kadar geçerlidir." },
        { type: "p", text: "Hizmetler kapsamında Lmax Capital; spot döviz (FX), değerli madenler, endeksler, kripto varlık türevleri ve enerji enstrümanları üzerinde fark sözleşmesi (CFD) işlemleri için aracılık sunar. Pozisyonların açılması, kapatılması, marj çağrıları ve yürütmeye ilişkin tüm operasyonel adımlar MT5 platformu ya da yetkilendirilmiş alternatif uçlar üzerinden gerçekleştirilir." },
      ],
    },
    {
      id: "account",
      heading: "2. Hesap Açma ve Müşteri Onayı",
      blocks: [
        { type: "p", text: "Hesap açma başvurusu yapan kişinin 18 yaşını doldurmuş, hukuki ehliyete sahip ve kendi ülkesinin mevzuatı çerçevesinde türev ürün ticareti yapmaya yetkili olması gerekir." },
        { type: "p", text: "Lmax Capital; kimlik doğrulama (KYC), adres ispatı, kaynak fon beyanı ve uygunluk testi gibi adımlar dahil olmak üzere gerekli gördüğü belgeleri talep etme hakkını saklı tutar. Belgelerin eksik, sahte veya yanıltıcı olduğunun tespiti halinde Lmax Capital; hesabı geçici olarak askıya alabilir veya kalıcı olarak kapatabilir." },
        { type: "list", items: [
          "Müşteri, başvuru formundaki bilgilerin doğru, güncel ve eksiksiz olduğunu taahhüt eder.",
          "Bilgi değişikliklerini Lmax Capital'e 7 takvim günü içinde bildirmek müşterinin sorumluluğundadır.",
          "Tek bir gerçek kişi adına birden fazla canlı hesap açılamaz; demo hesaplar bu sınırlamadan muaftır.",
        ]},
      ],
    },
    {
      id: "use",
      heading: "3. Kabul Edilen Kullanım",
      blocks: [
        { type: "p", text: "Hizmetler yalnızca yasal amaçlarla kullanılır. Müşteri; piyasa manipülasyonu, içeriden öğrenenlerin ticareti, kara para aklama, terörün finansmanı veya yaptırım listelerinde yer alan ülke/şahıslarla ilişkili herhangi bir faaliyette bulunmamayı kabul eder." },
        { type: "p", text: "Latency arbitrajı, hatalı fiyat istismarı (\"price fishing\"), platform açıkları üzerinden sistematik kazanç sağlama ve karşılaştırma fiyatlarını kötüye kullanma; tek taraflı olarak ihlal sayılır. Lmax Capital; bu tür işlemleri tespit etmesi halinde pozisyonu iptal etme, kâr iadesi talep etme ve hesabı kapatma hakkını saklı tutar." },
      ],
    },
    {
      id: "execution",
      heading: "4. İşlem Yürütme, Spread ve Komisyon",
      blocks: [
        { type: "p", text: "Tüm pozisyonlar likidite sağlayıcı havuzu üzerinden eşleştirilir. Yürütme; piyasa koşullarına bağlı olarak ortalama 10 milisaniye altında gerçekleştirilir. Olağanüstü volatilite, sistem bakımı veya bağlantı kesintilerinde slippage (kayma) meydana gelebilir." },
        { type: "p", text: "Spread, komisyon ve swap oranları; ilgili enstrüman özelinde web sitesinde yayımlanan koşullar tablosunda ve hesap tipinizde geçerli olan koşullar çerçevesinde uygulanır. Lmax Capital; piyasa şartlarına göre bu parametreleri makul süre içinde bildirimde bulunmak şartıyla revize edebilir." },
      ],
    },
    {
      id: "automation",
      heading: "5. Uzman Danışman ve Harici Bot Entegrasyonu",
      blocks: [
        { type: "p", text: "Müşteri, MT5 hesabında uzman danışman (Expert Advisor / EA) çalıştırma, harici bot bağlama veya FIX 4.4 / REST API üzerinden algoritmik strateji uygulama hakkına sahiptir. Bu entegrasyonlardan doğan tüm işlemsel sonuçlar münhasıran müşteriye aittir." },
        { type: "p", text: "Lmax Capital; üçüncü taraf bot, sinyal sağlayıcı veya algoritmaların performansı, doğruluğu, güvenliği veya yasal uygunluğu konusunda hiçbir garanti vermez ve sorumluluk üstlenmez." },
      ],
    },
    {
      id: "obligations",
      heading: "6. Müşterinin Yükümlülükleri",
      blocks: [
        { type: "list", items: [
          "Hesap erişim bilgilerini, API anahtarlarını ve iki faktörlü kimlik doğrulama cihazlarını üçüncü kişilerle paylaşmamak.",
          "Pozisyon büyüklüğüne uygun marj seviyesini korumak; marj çağrısı sonrasında pozisyonu kapatmamak halinde stop-out mekanizmasının devreye gireceğini kabul etmek.",
          "Kendi yargı bölgesinin vergi ve raporlama yükümlülüklerini bağımsız olarak yerine getirmek.",
        ]},
      ],
    },
    {
      id: "liability",
      heading: "7. Sorumluluğun Sınırlandırılması",
      blocks: [
        { type: "p", text: "Lmax Capital; doğrudan kontrolü dışında gelişen mücbir sebepler, internet altyapı kesintileri, likidite sağlayıcılarındaki problemler, üçüncü taraf yazılım hataları veya kullanıcı kaynaklı yanlış emir girişleri sonucu doğan kayıplardan sorumlu tutulamaz." },
        { type: "p", text: "Lmax Capital'in kümülatif yasal sorumluluğu, ilgili olaydan önceki 6 aylık dönemde müşteriden tahsil edilen komisyon ve spread tutarının toplamı ile sınırlıdır." },
      ],
    },
    {
      id: "suspension",
      heading: "8. Hesabın Askıya Alınması veya Kapatılması",
      blocks: [
        { type: "p", text: "Lmax Capital; aşağıdaki durumlardan herhangi birinin gerçekleşmesi halinde hesabı askıya alma veya kapatma hakkına sahiptir: hesap bilgilerinin yanlış/eksik olması, şüpheli işlem davranışı, regülatif uyum gerekliliklerinin yerine getirilmemesi, vade dolan KYC belgelerinin yenilenmemesi." },
      ],
    },
    {
      id: "changes",
      heading: "9. Sözleşmenin Değiştirilmesi",
      blocks: [
        { type: "p", text: "Lmax Capital; bu Kullanım Şartlarını gerekli gördüğü zamanda revize edebilir. Önemli değişiklikler en az 14 takvim günü önce e-posta ve/veya hesap içi bildirimle müşteriye iletilir. Bildirilen süre içinde sözleşmeyi feshetmeyen müşteri, yeni şartları kabul etmiş sayılır." },
      ],
    },
    {
      id: "law",
      heading: "10. Uyuşmazlıkların Çözümü ve Yetkili Hukuk",
      blocks: [
        { type: "p", text: "Bu sözleşmeden doğacak uyuşmazlıklarda; öncelikle dostane çözüm yolları aranır. Çözüm sağlanamadığı takdirde Lmax Capital'in tabi olduğu lisans makamının düzenlediği tahkim prosedürü uygulanır. Yargı yetkisi bu kurulun bulunduğu ülke mahkemelerine aittir." },
      ],
    },
    {
      id: "contact",
      heading: "11. İletişim",
      blocks: [
        { type: "p", text: "Bu sözleşmeye ilişkin tüm bildirimler, soru ve şikâyetler için resmi iletişim kanalı: legal@lmaxcapital.com" },
      ],
    },
  ],
};

const PRIVACY = {
  eyebrow: "YASAL",
  title: "Gizlilik Politikası",
  intro:
    "Lmax Capital olarak kişisel verilerinizin korunmasına en yüksek düzeyde önem veriyoruz. Bu Gizlilik Politikası; sizden hangi verileri topladığımızı, bunları nasıl işlediğimizi, kimlerle paylaştığımızı ve sahip olduğunuz hakları KVKK ve GDPR çerçevesinde açıklar.",
  sections: [
    {
      id: "data",
      heading: "1. Topladığımız Veriler",
      blocks: [
        { type: "p", text: "Hesap açma ve hizmet sunumu sürecinde aşağıdaki kategorilerde veri işleyebiliriz:" },
        { type: "list", items: [
          "Kimlik verileri: ad, soyad, doğum tarihi, T.C. kimlik veya pasaport numarası.",
          "İletişim verileri: e-posta, telefon, ikamet adresi.",
          "Finansal veriler: gelir bandı, varlık beyanı, banka/kart bilgileri.",
          "İşlem verileri: pozisyon geçmişi, marj seviyesi, kâr/zarar kayıtları.",
          "Teknik veriler: IP adresi, cihaz parmak izi, oturum logları, tarayıcı türü.",
          "Davranışsal veriler: hangi sayfaları görüntülediğiniz, hangi enstrümanlarla işlem yaptığınız.",
        ]},
      ],
    },
    {
      id: "purpose",
      heading: "2. İşleme Amaçları",
      blocks: [
        { type: "p", text: "Verilerinizi sözleşmenin ifası, regülatif yükümlülüklerin yerine getirilmesi, hesap güvenliği, dolandırıcılığın önlenmesi, müşteri destek hizmeti, hizmet iyileştirme analitiği ve açık rızanız çerçevesinde pazarlama iletişimi için işleriz." },
      ],
    },
    {
      id: "cookies",
      heading: "3. Çerezler ve İzleme Teknolojileri",
      blocks: [
        { type: "p", text: "Sitemizde oturum yönetimi, tercihlerin hatırlanması, analitik ve performans optimizasyonu için zorunlu ve isteğe bağlı çerezler kullanılır. Çerez tercihinizi alt panelden veya tarayıcı ayarlarınızdan istediğiniz zaman değiştirebilirsiniz." },
      ],
    },
    {
      id: "share",
      heading: "4. Üçüncü Taraflarla Paylaşım",
      blocks: [
        { type: "p", text: "Verileriniz; likidite sağlayıcılar, regülatif kurumlar, KYC/AML hizmeti veren tedarikçiler, kart ödeme altyapı sağlayıcıları, hukuk müşavirleri ve bağımsız denetçilerle yalnızca işin gereği oranda paylaşılır. Üçüncü taraflar veri işleme sözleşmesi (DPA) altında çalışır." },
      ],
    },
    {
      id: "transfer",
      heading: "5. Uluslararası Veri Aktarımı",
      blocks: [
        { type: "p", text: "Bulut hizmetlerinin doğası gereği veriler, Avrupa Birliği veya yeterli koruma sağlayan ülkelerdeki sunucularda saklanabilir. Aktarımlarda Standart Sözleşme Maddeleri (SCC) ve eş değer güvenceler uygulanır." },
      ],
    },
    {
      id: "retention",
      heading: "6. Veri Saklama Süresi",
      blocks: [
        { type: "p", text: "Hesap aktifken ve hesabın kapanmasını izleyen 10 yıl boyunca, regülatif zorunluluklar nedeniyle veriler saklanır. Bu sürenin sonunda veriler anonimleştirilir veya silinir." },
      ],
    },
    {
      id: "rights",
      heading: "7. KVKK ve GDPR Haklarınız",
      blocks: [
        { type: "list", items: [
          "İşlenen verilerinize erişim talep etme.",
          "Yanlış işlenmiş verilerin düzeltilmesini isteme.",
          "Yasal saklama yükümlülüğü dışındaki verilerin silinmesini talep etme.",
          "İşlemenin sınırlandırılmasını isteme veya işlemeye itiraz etme.",
          "Verilerinizin taşınabilirliğini talep etme.",
          "Açık rızanızı her zaman geri çekme hakkı (gelecekteki işlemeyi durdurur).",
        ]},
        { type: "p", text: "Bu hakları kullanmak için talebinizi privacy@lmaxcapital.com adresine iletebilirsiniz. 30 takvim günü içinde dönüş yaparız." },
      ],
    },
    {
      id: "security",
      heading: "8. Veri Güvenliği",
      blocks: [
        { type: "p", text: "Verileriniz 256-bit TLS şifreleme ile aktarılır, hassas alanlar AES-256 ile sunucu tarafında şifrelenir. Ayrıca rol bazlı erişim kontrolü, periyodik sızma testleri ve SOC 2 uyumlu altyapı kullanılır." },
      ],
    },
    {
      id: "changes",
      heading: "9. Politika Değişiklikleri",
      blocks: [
        { type: "p", text: "Bu politikada yapılacak önemli değişiklikler en az 14 gün önce duyurulur. Güncellemeler bu sayfanın üst kısmındaki tarih ile takip edilebilir." },
      ],
    },
    {
      id: "contact",
      heading: "10. Veri Sorumlusu İletişim",
      blocks: [
        { type: "p", text: "Veri Koruma Sorumlusu (DPO) ile iletişim: dpo@lmaxcapital.com" },
      ],
    },
  ],
};

const RISK = {
  eyebrow: "YASAL",
  title: "Risk Açıklaması",
  intro:
    "Türev ürünler (FX, CFD, kripto türevleri vb.) üzerinden gerçekleştirilen kaldıraçlı işlemler yüksek seviyede risk içerir ve yatırılan sermayenin tamamının veya bir kısmının kaybedilmesine yol açabilir. Aşağıdaki risk faktörlerini dikkatlice okumadan işlem yapmayınız.",
  sections: [
    {
      id: "general",
      heading: "1. Genel Risk Bildirimi",
      blocks: [
        { type: "p", text: "Geçmiş performans, gelecekteki sonuçların güvencesi değildir. Türev işlemler, kâr potansiyeli kadar zarar potansiyelini de barındırır. Yatırımcının kaybedebileceğinden fazlasını kaybetme riski (negatif bakiye) bulunmaktadır; Lmax Capital bu riski hesap koruma mekanizmalarıyla sınırlar fakat tamamen elimine edemez." },
      ],
    },
    {
      id: "leverage",
      heading: "2. Kaldıraç Riski",
      blocks: [
        { type: "p", text: "Kaldıraç, küçük bir teminat ile büyük bir pozisyon almayı mümkün kılar. Bu durum kazanç oranını yükselttiği gibi kayıp oranını da aynı oranda büyütür. Örneğin 1:500 kaldıraçta piyasanın %0.2 aleyhinize hareket etmesi, teminatınızın %100'üne karşılık gelir." },
      ],
    },
    {
      id: "market",
      heading: "3. Piyasa Riski",
      blocks: [
        { type: "p", text: "Faiz oranları, jeopolitik gelişmeler, ekonomik veri yayınları ve merkez bankası kararları gibi faktörler kısa sürede ani fiyat hareketlerine yol açabilir. Hafta sonu açılış gap'leri, stop-loss seviyelerinin atlanmasına neden olabilir." },
      ],
    },
    {
      id: "liquidity",
      heading: "4. Likidite Riski",
      blocks: [
        { type: "p", text: "Bazı enstrümanlarda, özellikle haber saatlerinde veya kapanışa yakın seanslarda likidite daralabilir. Bu durum spread genişlemesine, yürütme gecikmesine ve istenmeyen seviyelerden eşleştirmeye sebep olabilir." },
      ],
    },
    {
      id: "execution",
      heading: "5. Yürütme ve Slippage Riski",
      blocks: [
        { type: "p", text: "Piyasa emirleri her zaman istenen fiyattan yerine getirilmeyebilir. Yüksek volatilite anlarında pozitif veya negatif slippage ortaya çıkabilir. Stop-loss emirleri garantili değildir; ani gap'lerde bu seviyelerin altında/üstünde de gerçekleşebilir." },
      ],
    },
    {
      id: "counterparty",
      heading: "6. Karşı Taraf Riski",
      blocks: [
        { type: "p", text: "Lmax Capital; lisanslı bir kurum olarak müşteri fonlarını ayrıştırılmış (segregated) hesaplarda tutar. Buna rağmen, bağlantılı bankaların veya likidite sağlayıcılarının iflası gibi sistemik olaylar belli düzeyde karşı taraf riski oluşturabilir." },
      ],
    },
    {
      id: "operational",
      heading: "7. Operasyonel ve Teknolojik Riskler",
      blocks: [
        { type: "p", text: "Donanım arızası, internet bağlantı kesintisi, sunucu bakımı, yazılım hataları ve siber saldırılar; pozisyonların açılmasını/kapatılmasını geciktirebilir veya engelleyebilir. Bu nedenle her zaman alternatif bir bağlantı yolunuzun olması önerilir." },
      ],
    },
    {
      id: "automation",
      heading: "8. Otomatik İşlem (EA / Harici Bot) Riskleri",
      blocks: [
        { type: "p", text: "Uzman danışmanlar (EA) ve harici botlar; geçmişe yönelik veriye dayalı optimizasyon (overfitting), parametre kayması ve beklenmedik piyasa rejimi değişikliklerinden olumsuz etkilenebilir. Otomatik sistem çalışırken bilgisayar/sunucu kesintisi yaşanması pozisyonların yönetilememesine yol açabilir." },
        { type: "p", text: "Üçüncü taraf bot ve sinyal sağlayıcıların performansı, doğruluğu ve uyumu Lmax Capital tarafından garanti edilmez. Botu kullanmadan önce demo hesapta test edilmesi ve risk parametrelerinin müşteriye uygun şekilde ayarlanması zorunludur." },
      ],
    },
    {
      id: "tax",
      heading: "9. Vergi ve Yasal Yükümlülükler",
      blocks: [
        { type: "p", text: "Türev ürünlerden elde edilen kazançların vergisel sınıflandırması ülkeden ülkeye değişiklik gösterir. Yatırımcı; kendi yargı bölgesindeki vergi yükümlülüklerinden ve raporlama gerekliliklerinden bağımsız olarak sorumludur. Lmax Capital; vergi danışmanlığı sunmaz." },
      ],
    },
    {
      id: "suitability",
      heading: "10. Uygunluk Değerlendirmesi",
      blocks: [
        { type: "p", text: "Türev ürünler her yatırımcı için uygun değildir. İşlem yapmadan önce mali durumunuzu, yatırım hedeflerinizi, risk toleransınızı ve bilgi/deneyim seviyenizi değerlendiriniz. Gerekirse bağımsız bir finansal danışmandan görüş alınız." },
      ],
    },
    {
      id: "limit",
      heading: "11. Sorumluluğun Sınırı",
      blocks: [
        { type: "p", text: "Bu metin; risklerin tüm boyutunu tam olarak yansıtmayabilir. Müşteri; işlem yaptığında bu risk açıklamalarını okuduğunu, anladığını ve kabul ettiğini beyan eder. Lmax Capital; bilgi amaçlı yayımlanan bu metinden doğan yorumlardan sorumlu tutulamaz." },
      ],
    },
  ],
};

const DOCS = { terms: TERMS, privacy: PRIVACY, risk: RISK };

function LegalLayout({ doc, t, setRoute }) {
  const [active, setActive] = useState(doc.sections[0].id);

  useEffect(() => {
    const ids = doc.sections.map((s) => s.id);
    const onScroll = () => {
      const offsets = ids
        .map((id) => {
          const el = document.getElementById(id);
          if (!el) return null;
          return { id, top: el.getBoundingClientRect().top };
        })
        .filter(Boolean);
      const current = offsets.reduce((acc, o) => {
        if (o.top - 120 <= 0) return o;
        return acc;
      }, offsets[0]);
      if (current) setActive(current.id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [doc]);

  return (
    <div className="page legal-page">
      <section className="section legal-hero">
        <div className="container">
          <span className="section-eyebrow">{doc.eyebrow}</span>
          <h1 className="legal-title">{doc.title}</h1>
          <p className="legal-updated">Son güncelleme: {LEGAL_UPDATED}</p>
          <p className="legal-intro">{doc.intro}</p>
        </div>
      </section>

      <section className="section legal-body">
        <div className="container legal-grid">
          <aside className="legal-toc">
            <div className="legal-toc-h">İçindekiler</div>
            <ul>
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={active === s.id ? "active" : ""}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
            </ul>
            <div className="legal-toc-foot">
              <button type="button" className="legal-link" onClick={() => setRoute && setRoute("home")}>← {t?.auth?.back || "Ana Sayfa"}</button>
            </div>
          </aside>

          <div className="legal-content">
            {doc.sections.map((s) => (
              <article id={s.id} key={s.id} className="legal-section">
                <h2 className="legal-h2">{s.heading}</h2>
                {s.blocks.map((b, i) => {
                  if (b.type === "p") return <p key={i} className="legal-p">{b.text}</p>;
                  if (b.type === "list") return (
                    <ul key={i} className="legal-list">
                      {b.items.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  );
                  return null;
                })}
              </article>
            ))}

            <div className="legal-note">
              Bu belge bilgilendirme amaçlıdır. Yasal yorum gerektiren durumlarda lütfen bağımsız hukuk danışmanlığı alınız.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PageTerms({ t, setRoute }) {
  return <LegalLayout doc={DOCS.terms} t={t} setRoute={setRoute} />;
}
export function PagePrivacy({ t, setRoute }) {
  return <LegalLayout doc={DOCS.privacy} t={t} setRoute={setRoute} />;
}
export function PageRisk({ t, setRoute }) {
  return <LegalLayout doc={DOCS.risk} t={t} setRoute={setRoute} />;
}
