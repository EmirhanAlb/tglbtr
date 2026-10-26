import { useState, useEffect, useRef } from "react";
import { AnimatedNumber, Sparkline } from "./Common.jsx";

const PAIRS = [
  { sym: "EUR/USD", base: 1.0842, range: 0.0008, dec: 4 },
  { sym: "XAU/USD", base: 2384.5, range: 1.8, dec: 2 },
  { sym: "BTC/USD", base: 68420, range: 80, dec: 0 },
];

function LivePrice({ pair }) {
  const [price, setPrice] = useState(pair.base);
  const [dir, setDir] = useState(0);
  const lastRef = useRef(pair.base);

  useEffect(() => {
    const id = setInterval(() => {
      const drift = (Math.random() - 0.48) * pair.range;
      const next = lastRef.current + drift;
      setDir(next >= lastRef.current ? 1 : -1);
      lastRef.current = next;
      setPrice(next);
    }, 1500 + Math.random() * 600);
    return () => clearInterval(id);
  }, []);

  const chg = ((price - pair.base) / pair.base) * 100;
  const up = chg >= 0;

  return (
    <div className={`am-tick ${up ? "up" : "down"}`}>
      <span className="am-tick-sym">{pair.sym}</span>
      <span className={`am-tick-price mono ${dir > 0 ? "flash-up" : dir < 0 ? "flash-down" : ""}`}>
        {price.toLocaleString(undefined, { minimumFractionDigits: pair.dec, maximumFractionDigits: pair.dec })}
      </span>
      <span className="am-tick-chg mono">
        {up ? "▲" : "▼"} {Math.abs(chg).toFixed(2)}%
      </span>
    </div>
  );
}

function genSeries(n = 24, base = 50) {
  const out = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (Math.random() - 0.45) * 4;
    out.push(v);
  }
  return out;
}

export function AuthMetrics({ t }) {
  const sparkRef = useRef(null);
  if (!sparkRef.current) sparkRef.current = genSeries(28, 50);
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const s = sparkRef.current;
      s.shift();
      s.push(s[s.length - 1] + (Math.random() - 0.4) * 4);
      force((x) => x + 1);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="auth-metrics">
      <div className="am-chart">
        <Sparkline data={sparkRef.current} width={520} height={70} color="#bbc6cc" />
      </div>

      <div className="am-ticks">
        {PAIRS.map((p) => (
          <LivePrice key={p.sym} pair={p} />
        ))}
      </div>

      <div className="am-grid">
        <div className="am-cell">
          <div className="am-cell-v">$<AnimatedNumber value={2.4} decimals={1} suffix="B" /></div>
          <div className="am-cell-l">{t.auth.m_volume}</div>
        </div>
        <div className="am-cell">
          <div className="am-cell-v"><AnimatedNumber value={10} suffix=" MS" /></div>
          <div className="am-cell-l">{t.auth.m_exec}</div>
        </div>
      </div>
    </div>
  );
}
