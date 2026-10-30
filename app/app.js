// Ortak yardımcılar — tüm sayfalar bunu kullanır.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.APP_CONFIG || {};
export const brand = cfg.brand || { name: "Trust Global", tag: "global", logoText: "TRUST", primary: "#0E7A5F", accent: "#D9EB72" };

// Supabase proje kısaltması (ör. znysfafwhcfuteucgmnu) — oturum anahtarlarının adında kullanılır.
const REF = (String(cfg.supabaseUrl || "").match(/^https?:\/\/([^./]+)/) || [])[1] || "app";

// İKİ AYRI OTURUM:
//   customerClient -> localStorage "sb-<ref>-auth-token"       (müşteri paneli; eski oturumlar geçerli kalır)
//   adminClient    -> localStorage "sb-<ref>-admin-auth-token" (yönetim paneli)
// Böylece aynı tarayıcıda hem yönetici hem müşteri girişi yapılabilir; müşteri olarak giriş
// yapmak yöneticinin oturumunu ezmez (önceden tek anahtar paylaşıldığı için eziyordu).
const hasCfg = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
export const customerClient = hasCfg
  ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { storageKey: `sb-${REF}-auth-token` } })
  : null;
export const adminClient = hasCfg
  ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { storageKey: `sb-${REF}-admin-auth-token`, detectSessionInUrl: false } })
  : null;

// Sayfaya uygun istemci: admin.html (body[data-panel=admin]) yönetici oturumunu, diğerleri müşteri oturumunu kullanır.
export const isAdminPage = document.body?.dataset?.panel === "admin" || /\/admin\.html$/.test(location.pathname);
export const supabase = isAdminPage ? adminClient : customerClient;

if (!supabase) {
  console.error("Supabase yapılandırması eksik. app/config.js dosyasını kontrol edin.");
}

const roleOf = (user) => (user?.app_metadata?.role === "admin" ? "admin" : "customer");

// E-posta + şifre ile giriş; rolüne göre doğru oturum anahtarına yazar ve rolü döndürür.
export async function signInByRole(email, password) {
  const tmp = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { storageKey: `sb-${REF}-login-tmp`, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await tmp.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const role = roleOf(data.user);
  const target = role === "admin" ? adminClient : customerClient;
  const { error: e2 } = await target.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  if (e2) throw e2;
  return role;
}

// Eski sürümde yönetici oturumu müşteri anahtarında tutuluyordu; bulursa yönetici anahtarına taşır.
export async function migrateLegacyAdminSession() {
  if (!customerClient || !adminClient) return false;
  try {
    const { data } = await customerClient.auth.getSession();
    const s = data?.session;
    if (!s || roleOf(s.user) !== "admin") return false;
    const { error } = await adminClient.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token });
    if (error) return false;
    await customerClient.auth.signOut({ scope: "local" });
    return true;
  } catch (e) { return false; }
}

// Her iki oturumun durumu: { customer: user|null, admin: user|null }
export async function sessionsOverview() {
  await migrateLegacyAdminSession();
  const [c, a] = await Promise.all([
    customerClient ? customerClient.auth.getSession() : { data: {} },
    adminClient ? adminClient.auth.getSession() : { data: {} },
  ]);
  return { customer: c.data?.session?.user || null, admin: a.data?.session?.user || null };
}

// Marka ismini/renklerini sayfaya uygula
export function applyBrand() {
  const r = document.documentElement.style;
  r.setProperty("--primary", brand.primary);
  r.setProperty("--accent", brand.accent);
  document.querySelectorAll("[data-brand-name]").forEach(e => (e.textContent = brand.name));
  document.querySelectorAll("[data-brand-logo]").forEach(e => (e.textContent = brand.logoText));
  if (document.title.includes("__BRAND__"))
    document.title = document.title.replaceAll("__BRAND__", brand.name);
}

export async function currentUser() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    // Giriş yapılmamışsa "Auth session missing" normaldir; hata olarak loglamayalım.
    if (error) { if (!/session missing/i.test(error.message)) console.error("currentUser error:", error.message); return null; }
    return data.user;
  } catch (e) { console.error("currentUser exception:", e); return null; }
}

export async function currentProfile() {
  if (!supabase) return null;
  const user = await currentUser();
  if (!user) return null;
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (error) { console.error("currentProfile error:", error.message); return null; }
    return data;
  } catch (e) { console.error("currentProfile exception:", e); return null; }
}

export async function requireAuth() {
  if (!supabase) { alert("Supabase bağlantısı kurulamadı."); location.replace("auth.html"); throw new Error("supabase yok"); }
  const user = await currentUser();
  if (!user) { location.replace("auth.html"); throw new Error("giriş gerekli"); }
  return user;
}

export async function requireAdmin() {
  if (!supabase) { alert("Supabase bağlantısı kurulamadı."); location.replace("auth.html"); throw new Error("supabase yok"); }
  const p = await currentProfile();
  if (!p) { location.replace("auth.html"); throw new Error("giriş gerekli"); }
  if (p.role !== "admin") { location.replace("dashboard.html"); throw new Error("yetki yok"); }
  return p;
}

// Yalnızca bu cihazdaki oturumu kapatır (scope: local). Varsayılan "global" kapsam aynı hesabın
// diğer cihazlardaki oturumlarını da iptal ediyor ve oradaki paneli giriş sayfasına düşürüyordu.
export async function signOut() {
  if (supabase) await supabase.auth.signOut({ scope: "local" });
  location.replace("auth.html");
}

export const money = (n, c = "USD") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: c, maximumFractionDigits: 2 })
    .format(Number(n || 0));

export const fmtDate = (s) => (s ? new Date(s).toLocaleString("tr-TR") : "—");

export const badge = (status) => {
  const tr = { pending: "Beklemede", approved: "Onaylandı", rejected: "Reddedildi" };
  return `<span class="badge ${status}">${tr[status] || status}</span>`;
};

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
