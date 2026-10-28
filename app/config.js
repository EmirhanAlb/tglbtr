// =====================================================================
//  TEK AYAR DOSYASI — markanızı ve Supabase bağlantınızı buradan yönetin.
//  Başka hiçbir dosyayı değiştirmenize gerek yok.
// =====================================================================
window.APP_CONFIG = {
  brand: {
    name: "Trust Capital",     // Markanızın adı (her yerde otomatik yazılır)
    tag: "trustglobal",        // Bu ön yüzden gelen kullanıcıların etiketi (çoklu marka ayrımı)
    logoText: "TRUST CAPITAL", // Metin logo (giriş ekranı artık görsel logo kullanıyor)
    primary: "#0E7365",        // Ana renk (teal — sitenin secondary-color'ı)
    accent:  "#D9EB72"         // Vurgu rengi (fıstık yeşili — sitenin primary-color'ı)
  },

  // KENDİ Supabase projenizin bilgileri:
  //   supabase.com → New project → Project Settings → API
  //   - Project URL        -> supabaseUrl
  //   - Project API keys / anon public -> supabaseAnonKey
  // DİKKAT: "service_role" anahtarını ASLA buraya yazmayın. O gizlidir ve
  //         yalnızca sunucu tarafında kullanılır. Buraya sadece "anon public" gelir.
  // Destek WhatsApp hattı (ülke koduyla, boşluksuz). Kredi kartı yatırım talepleri buraya yönlenir.
  whatsapp: "905355560834",

  supabaseUrl:     "https://znysfafwhcfuteucgmnu.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpueXNmYWZ3aGNmdXRldWNnbW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NzY5ODAsImV4cCI6MjEwODI1Mjk4MH0.UWamWIq-bqF9Lxfod3lXnRXlgC2iArHeukZCGsYDwkY"
};
