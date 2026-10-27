// Canlı fiyat uç noktası: GET /api/market-prices
//
// Sitedeki tüm sembollerin alış/satış/günlük değişim değerlerini tek JSON'da döner.
// Kaynak: TradingView'in herkese açık tarayıcı uç noktası (ücretsiz, anahtar gerekmez;
// forex, metal, kripto ve CFD'lerde anlık, hisselerde 15 dk gecikmeli).
// Kaynak yanıt vermezse derleme anındaki değerler (snapshot) döner; site hiç boş kalmaz.
//
// Yanıt biçimi orijinal sitenin /update-market-price uç noktasıyla aynıdır:
//   { live_quote: { SEMBOL: { bid, ask, change, change_percentage } }, source, updated_at }
//
// Önbellek: Vercel CDN'de 10 sn (s-maxage). Ziyaretçi sayısından bağımsız olarak kaynağa
// en fazla ~6 istek/dk gider. Sembol listesi: api/_symbols.json (tools/build-symbol-map.mjs).

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const SYMBOLS = require("./_symbols.json");

const SCANNER_URL = "https://scanner.tradingview.com/global/scan";
const COLUMNS = ["close", "change", "change_abs", "bid", "ask"];
const CACHE_MS = 8000; // aynı fonksiyon örneği içinde kısa süreli tekrar kullanım
const UPSTREAM_TIMEOUT_MS = 7000;

let memo = { at: 0, body: "", source: "" };

async function fetchLive() {
  const tickers = [...new Set(Object.values(SYMBOLS.base).map((b) => b.tv).filter(Boolean))];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(SCANNER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: { tickers }, columns: COLUMNS }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`upstream HTTP ${res.status}`);
    const data = await res.json();
    const byTicker = {};
    for (const row of data.data || []) {
      const [close, pct, chg, bid, ask] = row.d;
      if (typeof close === "number" && Number.isFinite(close)) byTicker[row.s] = { close, pct, chg, bid, ask };
    }
    return byTicker;
  } finally {
    clearTimeout(timer);
  }
}

const fmt = (n, d) => (Number.isFinite(n) ? n.toFixed(d) : "-");
const signed = (n, d) => (Number.isFinite(n) ? (n > 0 ? "+" : "") + n.toFixed(d) : "-");

function quoteFromSnapshot(entry) {
  const s = entry.snapshot || {};
  if (s.bid == null) return null;
  const bid = Number(s.bid);
  const ask = s.ask != null ? Number(s.ask) : bid + entry.spread;
  const pct = s.pct != null ? Number(s.pct) : 0;
  const chg = s.change != null ? Number(s.change) : (bid * pct) / 100;
  return { bid, ask, chg, pct };
}

function quoteFromLive(entry, live) {
  if (!entry.tv || !live || !live[entry.tv]) return null;
  const q = live[entry.tv];
  const tick = Math.pow(10, -entry.digits);
  const spread = entry.spread > 0 ? entry.spread : tick;
  // Kaynağın alış/satışı bazı endekslerde bayat veya çok geniş gelebiliyor; makul değilse
  // son fiyat ± derleme anındaki spread kullanılır.
  let bid = q.bid, ask = q.ask;
  const maxSpread = Math.max(spread * 5, q.close * 0.002);
  const plausible = typeof bid === "number" && typeof ask === "number" && bid > 0 && ask >= bid &&
    ask - bid <= maxSpread && Math.abs(bid - q.close) <= q.close * 0.005;
  if (!plausible) { bid = q.close; ask = q.close + spread; }
  const pct = typeof q.pct === "number" ? q.pct : 0;
  const chg = typeof q.chg === "number" ? q.chg : (bid * pct) / 100;
  return { bid, ask, chg, pct };
}

function buildQuotes(live) {
  const raw = {}; // taban sembol -> sayısal değerler
  let liveCount = 0;
  for (const [base, entry] of Object.entries(SYMBOLS.base)) {
    if (entry.derive) continue;
    const q = quoteFromLive(entry, live);
    if (q) liveCount++;
    const r = q || quoteFromSnapshot(entry);
    if (r) raw[base] = r;
  }
  // Türetilenler: XAUEUR = XAUUSD / EURUSD
  for (const [base, entry] of Object.entries(SYMBOLS.base)) {
    if (!entry.derive) continue;
    const [num, den] = entry.derive.map((k) => raw[k]);
    if (num && den && den.bid > 0) {
      const bid = num.bid / den.ask;
      const ask = num.ask / den.bid;
      const pct = num.pct - den.pct;
      raw[base] = { bid, ask, chg: (bid * pct) / 100, pct };
    } else {
      const r = quoteFromSnapshot(entry);
      if (r) raw[base] = r;
    }
  }
  const quotes = {};
  for (const [sym, base] of Object.entries(SYMBOLS.aliases)) {
    const r = raw[base];
    const entry = SYMBOLS.base[base];
    if (!r || !entry) continue;
    const d = entry.digits;
    quotes[sym] = {
      bid: fmt(r.bid, d),
      ask: fmt(r.ask, d),
      change: signed(r.chg, Math.min(d, 4)),
      change_percentage: fmt(r.pct, 2),
    };
  }
  return { quotes, liveCount };
}

export default async function handler(req, res) {
  const now = Date.now();
  if (!memo.body || now - memo.at > CACHE_MS) {
    let live = null;
    try {
      live = await fetchLive();
    } catch (err) {
      console.error("canlı fiyat kaynağına ulaşılamadı:", err && err.message);
    }
    const { quotes, liveCount } = buildQuotes(live);
    const source = liveCount > 0 ? "live" : "snapshot";
    memo = {
      at: now,
      source,
      body: JSON.stringify({ live_quote: quotes, source, live_symbols: liveCount, updated_at: new Date(now).toISOString() }),
    };
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=60");
  res.setHeader("X-Price-Source", memo.source);
  res.end(memo.body);
}
