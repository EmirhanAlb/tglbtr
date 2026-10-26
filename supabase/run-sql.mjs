// Bir .sql dosyasını Supabase Management API üzerinden çalıştırır.
// DDL (tablo/RPC/RLS oluşturma) için anon key yetmez; bu yüzden Supabase hesabından
// alınan KİŞİSEL ERİŞİM TOKEN'ı kullanılır (service_role veya DB şifresi GEREKMEZ).
//
// Kullanım:
//   1) Token al: https://supabase.com/dashboard/account/tokens → "Generate new token"
//   2) Terminalde (tek satır):
//        SUPABASE_ACCESS_TOKEN=sbp_xxx node supabase/run-sql.mjs supabase/schema.sql
//
// Proje ref'i app/config.js'teki supabaseUrl'den otomatik okunur
// (https://<REF>.supabase.co). İstersek SUPABASE_PROJECT_REF ile override edilir.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));

function projectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  try {
    const cfg = readFileSync(resolve(__dir, "../app/config.js"), "utf8");
    const m = cfg.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    if (m) return m[1];
  } catch {}
  return null;
}

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = projectRef();
const file = process.argv[2] || "supabase/schema.sql";

if (!TOKEN) {
  console.error("HATA: SUPABASE_ACCESS_TOKEN ortam değişkeni gerekli.");
  console.error("  https://supabase.com/dashboard/account/tokens adresinden alın, sonra:");
  console.error("  SUPABASE_ACCESS_TOKEN=sbp_xxx node supabase/run-sql.mjs supabase/schema.sql");
  process.exit(1);
}
if (!REF) {
  console.error("HATA: Proje ref bulunamadı. SUPABASE_PROJECT_REF=xxxxx ile verin.");
  process.exit(1);
}

const query = readFileSync(resolve(process.cwd(), file), "utf8");
console.log(`→ Çalıştırılıyor: ${file}  (proje: ${REF})`);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/database/query`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }
);

const text = await res.text();
console.log(`[HTTP ${res.status}]`);
console.log(text || "(boş yanıt — genellikle başarı demektir)");
if (!res.ok) { console.error("✗ Başarısız."); process.exit(1); }
console.log("✓ Tamamlandı.");
