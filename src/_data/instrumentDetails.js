import items from './homeInstruments.json' with { type: 'json' };
import pages from './instrumentPages.json' with { type: 'json' };

// /instrumentdetails/<SEMBOL> sayfaları buradan üretilir.
//
// Kaynak yalnızca homeInstruments.json olunca /instruments/* tablolarındaki
// sembollerin bir kısmı (Cent "c" ve Pro "p" varyantları, bazı metal/emtia
// sembolleri) karşılıksız kalıyor ve tablodaki bağlantılar 404 veriyordu.
// Bu yüzden iki kaynağın birleşimi kullanılır.
//
// Varyantların fiyatı ayrı gelmez; aynı enstrümanı izledikleri için taban
// sembolün (EURUSDc -> EURUSD) fiyat alanları kopyalanır.

const BASE_SUFFIXES = ["c", "p", "_MYY", "_myy"];

function baseSymbol(symbol) {
  for (const suffix of BASE_SUFFIXES) {
    if (symbol.length > suffix.length && symbol.endsWith(suffix)) {
      return symbol.slice(0, -suffix.length);
    }
  }
  return null;
}

export default function () {
  const bySlug = new Map();
  for (const item of items) {
    if (item.slug) bySlug.set(item.slug, item);
  }

  // Tablolarda geçen her sembolü topla (sayfa -> panel -> tablo -> satır).
  for (const page of Object.values(pages)) {
    for (const panel of page.panels) {
      for (const table of panel.tables) {
        for (const row of table.rows) {
          if (!row.slug || bySlug.has(row.slug)) continue;

          const base = bySlug.get(baseSymbol(row.slug));
          bySlug.set(row.slug, {
            symbol: row.symbol,
            slug: row.slug,
            name: row.name,
            icons: row.icons.map(icon => icon.cls),
            bid: base ? base.bid : "-",
            change: base ? base.change : "-",
            pct: base ? base.pct : "-",
            color: base ? base.color : "text-gray-500",
            trendImg: base ? base.trendImg : null,
          });
        }
      }
    }
  }

  return [...bySlug.values()];
}
