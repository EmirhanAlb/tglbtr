export const VERTEX_INSTRUMENTS = {
  fx: [
    { name: "EUR/USD", spread: "0.1", commission: "$5", lev: "1:500" },
    { name: "GBP/USD", spread: "0.4", commission: "$5", lev: "1:500" },
    { name: "USD/JPY", spread: "0.2", commission: "$5", lev: "1:500" },
    { name: "AUD/USD", spread: "0.5", commission: "$5", lev: "1:500" },
    { name: "USD/CHF", spread: "0.6", commission: "$5", lev: "1:500" },
    { name: "USD/TRY", spread: "12.0", commission: "$5", lev: "1:200" },
  ],
  metals: [
    { name: "XAU/USD", spread: "0.12", commission: "$5", lev: "1:200" },
    { name: "XAG/USD", spread: "0.02", commission: "$5", lev: "1:200" },
    { name: "XPT/USD", spread: "1.50", commission: "$5", lev: "1:50" },
  ],
  indices: [
    { name: "NAS100", spread: "0.8", commission: "—", lev: "1:200" },
    { name: "SPX500", spread: "0.4", commission: "—", lev: "1:200" },
    { name: "DAX40",  spread: "1.0", commission: "—", lev: "1:200" },
    { name: "UK100",  spread: "0.6", commission: "—", lev: "1:200" },
    { name: "JP225",  spread: "5.0", commission: "—", lev: "1:200" },
  ],
  crypto: [
    { name: "BTC/USD", spread: "12.0", commission: "—", lev: "1:20" },
    { name: "ETH/USD", spread: "0.8",  commission: "—", lev: "1:20" },
    { name: "XRP/USD", spread: "0.001", commission: "—", lev: "1:10" },
    { name: "SOL/USD", spread: "0.04",  commission: "—", lev: "1:10" },
  ],
  energy: [
    { name: "WTI",     spread: "0.03", commission: "—", lev: "1:100" },
    { name: "BRENT",   spread: "0.04", commission: "—", lev: "1:100" },
    { name: "NATGAS",  spread: "0.01", commission: "—", lev: "1:50" },
  ],
};

export const VERTEX_MARKET_SPARKS = {
  fx:      [50, 51, 50, 52, 51, 53, 52, 54, 55, 53, 56, 55, 57, 58, 60, 59, 61, 62, 64, 63],
  metals:  [40, 42, 41, 45, 48, 47, 52, 54, 53, 58, 62, 60, 64, 68, 70, 73, 76, 78, 82, 86],
  indices: [55, 57, 56, 58, 60, 59, 62, 64, 63, 66, 68, 67, 70, 72, 71, 74, 76, 75, 78, 80],
  crypto:  [38, 40, 36, 44, 50, 47, 56, 60, 55, 64, 70, 66, 74, 80, 76, 84, 88, 84, 92, 96],
  energy:  [60, 58, 62, 60, 64, 62, 66, 64, 68, 66, 70, 68, 72, 70, 74, 72, 76, 74, 78, 76],
};
