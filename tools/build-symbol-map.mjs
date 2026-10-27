// Sitedeki her enstrüman sembolünü canlı fiyat kaynağındaki (TradingView tarayıcı
// uç noktası) karşılığıyla eşler ve api/_symbols.json dosyasını üretir.
//
//   node tools/build-symbol-map.mjs          -> api/_symbols.json yazar
//   node tools/build-symbol-map.mjs --probe  -> ek olarak her sembolü kaynaktan sorgular,
//                                               karşılığı olmayanları listeler
//
// Girdi: src/_data/ticker.json, homeInstruments.json, instrumentPages.json
// Çıktı: api/_symbols.json  { base: {SEMBOL: {tv, digits, spread, snapshot}}, aliases: {} }
//
// Yeni bir sembol eklendiğinde: forex pariteleri ve kripto otomatik eşlenir; hisse,
// endeks ve emtia için aşağıdaki OVERRIDES tablosuna "SEMBOL": "BORSA:KOD" satırı ekleyin.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));

const ticker = read("src/_data/ticker.json");
const home = read("src/_data/homeInstruments.json");
const pages = read("src/_data/instrumentPages.json");

// Alt varyantlar (Cent "c", Pro "p", vadeli "_MYY" / "_Z26" / ".Z26") taban sembolün fiyatını izler.
const VARIANT_RE = /(c|p|_MYY|_myy|[._][FGHJKMNQUVXZ]\d\d)$/;
const baseOf = (s) => s.replace(VARIANT_RE, "");

const CCY = new Set("USD EUR GBP JPY CHF CAD AUD NZD SEK NOK DKK PLN HUF CZK ZAR MXN SGD HKD CNH TRY AED SAR KWD QAR EGP THB".split(" "));

const CRYPTO = {
  AAVUSD: "AAVEUSDT", ADAUSD: "ADAUSDT", BATUSD: "BATUSDT", BCHUSD: "BCHUSDT", BTCUSD: "BTCUSDT",
  DOGUSD: "DOGEUSDT", DOTUSD: "DOTUSDT", DSHUSD: "DASHUSDT", ETCUSD: "ETCUSDT", ETHUSD: "ETHUSDT",
  FILUSD: "FILUSDT", IOTUSD: "IOTAUSDT", LNKUSD: "LINKUSDT", LTCUSD: "LTCUSDT", NEOUSD: "NEOUSDT",
  SUSUSD: "SUSHIUSDT", TRXUSD: "TRXUSDT", UNIUSD: "UNIUSDT", XLMUSD: "XLMUSDT", XRPUSD: "XRPUSDT",
  XTZUSD: "XTZUSDT", ZECUSD: "ZECUSDT",
};

// Elle doğrulanmış eşlemeler (hisse, endeks, metal, enerji, emtia, MENA).
const OVERRIDES = {
  TETUSD: "KRAKEN:USDTUSD",
  // Metaller
  GOLD: "OANDA:XAUUSD", SILVER: "TVC:SILVER", PLATINUM: "TVC:PLATINUM", PALLADIUM: "TVC:PALLADIUM",
  COPPER: "OANDA:XCUUSD", ALUMINIUM: "LME:AH1!", LEAD: "LME:PB1!", ZINC: "LME:ZS1!",
  // Endeksler
  US30: "OANDA:US30USD", US100: "NASDAQ:NDX", US500: "SP:SPX", US2000: "TVC:RUT",
  GER40: "OANDA:DE30EUR", UK100: "TVC:UKX", FRA40: "TVC:CAC40", EU50: "TVC:SX5E",
  JAP225: "TVC:NI225", AUS200: "OANDA:AU200AUD", HKIND: "OANDA:HK33HKD", SPA35: "TVC:IBEX35",
  SWI20: "SIX:SMI", USDIDX: "TVC:DXY",
  // Enerji ve emtia
  USOIL: "NYMEX:CL1!", UKOIL: "ICEEUR:BRN1!", NGAS: "OANDA:NATGASUSD", NATGAS: "OANDA:NATGASUSD",
  COCOA: "ICEUS:CC1!", COFFEE: "ICEUS:KC1!", CORN: "OANDA:CORNUSD", COTTON: "ICEUS:CT1!",
  SOYBEAN: "OANDA:SOYBNUSD", SUGAR: "OANDA:SUGARUSD", WHEAT: "OANDA:WHEATUSD",
  // Avrupa hisseleri
  ADSGn: "XETR:ADS", ALVG: "XETR:ALV", BAYGn: "XETR:BAYN", BMWG: "XETR:BMW", CBKG: "XETR:CBK",
  DBKGn: "XETR:DBK", LHAG: "XETR:LHA", SIEGn: "XETR:SIE", VOWG: "XETR:VOW3", SAN: "BME:SAN",
  TEF: "BME:TEF", RACE: "MIL:RACE", SPCX: "NYSE:SPCE",
  // ABD hisseleri
  AAL: "NASDAQ:AAL", AAPL: "NASDAQ:AAPL", ABNB: "NASDAQ:ABNB", ADBE: "NASDAQ:ADBE", AIG: "NYSE:AIG",
  AMZN: "NASDAQ:AMZN", AXP: "NYSE:AXP", BA: "NYSE:BA", BABA: "NYSE:BABA", BAC: "NYSE:BAC", BK: "NYSE:BNY",
  BKNG: "NASDAQ:BKNG", BMRN: "NASDAQ:BMRN", BMY: "NYSE:BMY", CAT: "NYSE:CAT", CME: "NASDAQ:CME",
  COST: "NASDAQ:COST", CSCO: "NASDAQ:CSCO", DAL: "NYSE:DAL", DELL: "NYSE:DELL", DIS: "NYSE:DIS",
  EBAY: "NASDAQ:EBAY", FDX: "NYSE:FDX", GE: "NYSE:GE", GM: "NYSE:GM", GOOG: "NASDAQ:GOOG",
  GPRO: "NASDAQ:GPRO", GS: "NYSE:GS", GT: "NASDAQ:GT", HD: "NYSE:HD", HLT: "NYSE:HLT", HOG: "NYSE:HOG",
  HPQ: "NYSE:HPQ", IBM: "NYSE:IBM", INTC: "NASDAQ:INTC", JNJ: "NYSE:JNJ", JPM: "NYSE:JPM",
  KMI: "NYSE:KMI", KO: "NYSE:KO", MA: "NYSE:MA", MCD: "NYSE:MCD", MCO: "NYSE:MCO", MMM: "NYSE:MMM",
  MO: "NYSE:MO", MRK: "NYSE:MRK", MRVL: "NASDAQ:MRVL", MS: "NYSE:MS", MSFT: "NASDAQ:MSFT",
  NFLX: "NASDAQ:NFLX", NKE: "NYSE:NKE", NVDA: "NASDAQ:NVDA", ORCL: "NYSE:ORCL", PEP: "NASDAQ:PEP",
  PFE: "NYSE:PFE", PM: "NYSE:PM", PYPL: "NASDAQ:PYPL", QCOM: "NASDAQ:QCOM", ROKU: "NASDAQ:ROKU",
  SBUX: "NASDAQ:SBUX", SHOP: "NASDAQ:SHOP", SPOT: "NYSE:SPOT", TMUS: "NASDAQ:TMUS", TSLA: "NASDAQ:TSLA",
  UA: "NYSE:UA", UAL: "NASDAQ:UAL", UBER: "NYSE:UBER", UPS: "NYSE:UPS", VALE: "NYSE:VALE", VZ: "NYSE:VZ",
  WFC: "NYSE:WFC", WMT: "NASDAQ:WMT", XOM: "NYSE:XOM", YUM: "NYSE:YUM", ZM: "NASDAQ:ZM",
  // MENA hisseleri
  "AD.Aviation": "ADX:ADAVIATION", "AD.Insuran": "ADX:ADNIC", "AD.Insuranc": "ADX:ADNIC",
  "AD.Natl.Tak": "ADX:TKFL", "AD.Shi": "ADX:ADSB", "AD.Ship": "ADX:ADSB", ADCB: "ADX:ADCB",
  ADIB: "ADX:ADIB", "ADNOC.Drill": "ADX:ADNOCDRILL", "ADNOC.Gas": "ADX:ADNOCGAS",
  "ADNOC.Logis": "ADX:ADNOCLS", "Agthia.Gr": "ADX:AGTHIA", "Agthia.Grp": "ADX:AGTHIA",
  "Alpha.Dhabi": "ADX:ALPHADHABI", Apex: "ADX:APEX", CBD: "DFM:CBD", DEWA: "DFM:DEWA", DIB: "DFM:DIB",
  DU: "DFM:DU", "Emaar.Devel": "DFM:EMAARDEV", "Emaar.Propt": "DFM:EMAAR", "FAB.Bank": "ADX:FAB",
  "Ghitha.Hold": "ADX:GHITHA", IHC: "ADX:IHC", Modon: "ADX:MODON", "NBD.Bank": "DFM:EMIRATESNBD",
  NMDC: "ADX:NMDC", "Palms.Sport": "ADX:PALMS", Parkin: "DFM:PARKIN", "Pure.Health": "ADX:PUREHEALTH",
  "RAK.Bank": "ADX:RAKBANK", RPH: "ADX:RPM", Salik: "DFM:SALIK", Taaleem: "DFM:TAALEEM",
  "Tecom.Grou": "DFM:TECOM",
  // Kaynakta karşılığı yok: derleme anındaki değer gösterilir.
  Chimera: null, GULFNAV: null,
};

// Başka sembollerden türetilenler: [pay, payda]
const DERIVED = { XAUEUR: ["GOLD", "EURUSD"] };

function tvFor(base) {
  if (base in OVERRIDES) return OVERRIDES[base];
  if (base in CRYPTO) return "BINANCE:" + CRYPTO[base];
  if (base.length === 6 && CCY.has(base.slice(0, 3)) && CCY.has(base.slice(3))) return "FX_IDC:" + base;
  return null;
}

// --- Derleme anı değerleri (snapshot) ve ondalık/spread bilgisi ---
const snap = {}; // sembol -> {bid, ask, change, pct}
const put = (sym, v) => { snap[sym] = { ...(snap[sym] || {}), ...Object.fromEntries(Object.entries(v).filter(([, x]) => x != null && x !== "" && x !== "-")) }; };
for (const q of ticker) put(q.symbol, { bid: q.bid, ask: q.ask, pct: q.pct });
for (const r of home) put(r.symbol, { bid: r.bid, change: r.change, pct: String(r.pct).replace("%", "") });
for (const page of Object.values(pages)) {
  for (const panel of page.panels) {
    for (const q of panel.marquee || []) put(q.symbol, { bid: q.bid, ask: q.ask });
    for (const t of panel.tables) for (const r of t.rows) if (!(r.symbol in snap)) snap[r.symbol] = {};
  }
}

const allSymbols = Object.keys(snap);
const aliases = {};
for (const s of allSymbols) aliases[s] = baseOf(s);
const bases = [...new Set(Object.values(aliases))].sort();

const decimals = (s) => (String(s).split(".")[1] || "").length;
function snapshotFor(base) {
  // Taban sembolün kendi değeri yoksa varyantlarından (EURUSDc gibi) alınır.
  const cands = [base, ...allSymbols.filter((s) => s !== base && aliases[s] === base)];
  const merged = {};
  for (const s of cands) for (const [k, v] of Object.entries(snap[s] || {})) if (!(k in merged)) merged[k] = v;
  return merged;
}

const out = { generatedAt: new Date().toISOString(), base: {}, aliases };
for (const b of bases) {
  const s = snapshotFor(b);
  // Ondalık sayısı: taban ve varyantlarının tüm alış/satış değerlerindeki en uzun kesir.
  const digitsSeen = [b, ...allSymbols.filter((x) => aliases[x] === b)]
    .flatMap((x) => [snap[x]?.bid, snap[x]?.ask]).filter((v) => v != null).map(decimals);
  const digits = digitsSeen.length ? Math.max(...digitsSeen) : 2;
  const spread = s.bid != null && s.ask != null ? Math.max(0, +(Number(s.ask) - Number(s.bid)).toFixed(8)) : 0;
  const entry = { tv: DERIVED[b] ? null : tvFor(b), digits, spread, snapshot: s };
  if (DERIVED[b]) entry.derive = DERIVED[b];
  out.base[b] = entry;
}

writeFileSync(resolve(root, "api/_symbols.json"), JSON.stringify(out, null, 1) + "\n");
const mapped = bases.filter((b) => out.base[b].tv || out.base[b].derive).length;
console.log(`api/_symbols.json yazıldı: ${allSymbols.length} sembol, ${bases.length} taban, ${mapped} canlı kaynağa bağlı.`);
const none = bases.filter((b) => !out.base[b].tv && !out.base[b].derive);
if (none.length) console.log("Canlı karşılığı olmayan (sabit kalacak):", none.join(", "));

if (process.argv.includes("--probe")) {
  const tickers = [...new Set(bases.map((b) => out.base[b].tv).filter(Boolean))];
  const res = await fetch("https://scanner.tradingview.com/global/scan", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols: { tickers }, columns: ["close"] }),
  });
  const data = await res.json();
  const found = new Set((data.data || []).filter((r) => r.d[0] != null).map((r) => r.s));
  const missing = tickers.filter((t) => !found.has(t));
  console.log(`Sorgu: ${tickers.length} kod, ${found.size} yanıt.`);
  if (missing.length) console.log("Kaynakta bulunamayan kodlar:", missing.join(", "));
}
