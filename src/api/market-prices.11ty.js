// Orijinal sitedeki /update-market-price uç noktasının statik karşılığı.
// Biçim: { live_quote: { SEMBOL: { bid, ask, change, change_percentage } } }
// Gerçek zamanlı fiyat için bu dosyanın bir fiyat sağlayıcısına bağlanan
// bir backend uç noktasıyla değiştirilmesi gerekir.
export const data = {
  permalink: "/api/market-prices.json",
  eleventyExcludeFromCollections: true,
};

export function render({ ticker, homeInstruments }) {
  const quotes = {};

  for (const row of homeInstruments) {
    quotes[row.symbol] = {
      bid: row.bid,
      ask: row.bid,
      change: row.change,
      change_percentage: row.pct.replace("%", ""),
    };
  }

  for (const q of ticker) {
    const existing = quotes[q.symbol];
    quotes[q.symbol] = {
      bid: q.bid,
      ask: q.ask,
      change: existing ? existing.change : q.pct,
      change_percentage: q.pct,
    };
  }

  return JSON.stringify({ live_quote: quotes });
}
