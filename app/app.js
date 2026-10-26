// Ortak yardımcılar — tüm sayfalar bunu kullanır.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.APP_CONFIG || {};
export const brand = cfg.brand || { name: "Trust Global", tag: "global", logoText: "TRUST", primary: "#0E7A5F", accent: "#D9EB72" };
export const supabase = (cfg.supabaseUrl && cfg.supabaseAnonKey)
  ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
  : null;

if (!supabase) {
  console.error("Supabase yapılandırması eksik. app/config.js dosyasını kontrol edin.");
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

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
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
