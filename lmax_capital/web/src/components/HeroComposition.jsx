import { useState, useEffect, useRef } from "react";

function genCandles(n, seed = 100) {
  const out = [];
  let v = seed;
  for (let i = 0; i < n; i++) {
    const drift = (Math.random() - 0.45) * 1.6;
    const vol = 0.6 + Math.random() * 1.2;
    const open = v;
    const close = v + drift;
    const hi = Math.max(open, close) + Math.random() * vol;
    const lo = Math.min(open, close) - Math.random() * vol;
    out.push({ o: open, c: close, h: hi, l: lo });
    v = close;
  }
  return out;
}

export function CandleChart() {
  const W = 720;
  const H = 380;
  const PAD_T = 24;
  const PAD_B = 28;
  const PAD_X = 16;
  const N = 56;
  const candlesRef = useRef(null);
  if (!candlesRef.current) candlesRef.current = genCandles(N, 100);

  const [tick, setTick] = useState(0);
  const [drawIn, setDrawIn] = useState(0);

  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const dur = 1500;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      setDrawIn(e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const c = candlesRef.current;
      const last = c[c.length - 1].c;
      const drift = (Math.random() - 0.45) * 1.6;
      const vol = 0.6 + Math.random() * 1.4;
      const open = last;
      const close = last + drift;
      const hi = Math.max(open, close) + Math.random() * vol;
      const lo = Math.min(open, close) - Math.random() * vol;
      c.shift();
      c.push({ o: open, c: close, h: hi, l: lo });
      setTick((x) => x + 1);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  const candles = candlesRef.current;
  const lows = candles.map((c) => c.l);
  const highs = candles.map((c) => c.h);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const range = Math.max(1, max - min) * 1.08;
  const cw = (W - PAD_X * 2) / N;
  const bodyW = cw * 0.62;

  const y = (v) => PAD_T + (1 - (v - min) / range) * (H - PAD_T - PAD_B);

  const lastClose = candles[candles.length - 1].c;
  const firstOpen = candles[0].o;
  const overallUp = lastClose > firstOpen;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none"
         style={{ display: "block", opacity: drawIn }}>
      <defs>
        <linearGradient id="hc-glow-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7eddb3" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7eddb3" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hc-bg-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bbc6cc" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#bbc6cc" stopOpacity="0" />
        </linearGradient>
        <filter id="hc-blur">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {[0.2, 0.4, 0.6, 0.8].map((p) => (
        <line key={p}
              x1={PAD_X} x2={W - PAD_X}
              y1={PAD_T + p * (H - PAD_T - PAD_B)} y2={PAD_T + p * (H - PAD_T - PAD_B)}
              stroke="rgba(187,198,204,0.05)" strokeWidth="1" strokeDasharray="2 4" />
      ))}

      {candles.map((c, i) => {
        const x = PAD_X + i * cw + cw / 2;
        const isUp = c.c >= c.o;
        const color = isUp ? "#7eddb3" : "#e6826e";
        const yo = y(c.o);
        const yc = y(c.c);
        const top = Math.min(yo, yc);
        const bodyH = Math.max(1, Math.abs(yc - yo));
        const isLast = i === candles.length - 1;
        const appearK = Math.max(0, Math.min(1, (drawIn * candles.length - i) / 2));

        return (
          <g key={i} opacity={appearK}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1" opacity={0.7} />
            <rect x={x - bodyW / 2} y={top} width={bodyW} height={bodyH}
                  fill={color} opacity={0.85} rx="0.5" />
            {isLast && (
              <>
                <circle cx={x} cy={y(c.c)} r="3" fill={color} />
                <circle cx={x} cy={y(c.c)} r="9" fill={color} opacity="0.3">
                  <animate attributeName="r" values="6;14;6" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </g>
        );
      })}

      <line x1={PAD_X} x2={W - PAD_X} y1={y(lastClose)} y2={y(lastClose)}
            stroke={overallUp ? "#7eddb3" : "#e6826e"}
            strokeWidth="0.8" strokeDasharray="3 4" opacity="0.5" />
    </svg>
  );
}

const SIGNAL_TEMPLATES = [
  { sym: "EURUSD", side: "BUY",  reason: "Engulfing · M5", bot: "Vega" },
  { sym: "EURUSD", side: "SELL", reason: "MA cross · M15", bot: "Vega" },
  { sym: "XAUUSD", side: "BUY",  reason: "Breakout · H1",  bot: "Atlas" },
  { sym: "XAUUSD", side: "SELL", reason: "RSI div · H1",   bot: "Atlas" },
  { sym: "BTCUSD", side: "BUY",  reason: "Volume spike",   bot: "Orion" },
  { sym: "BTCUSD", side: "SELL", reason: "Reject · H4",    bot: "Orion" },
];

function SignalFeed({ label, nowLabel = "now" }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);
  const nowRef = useRef(nowLabel);
  nowRef.current = nowLabel;

  useEffect(() => {
    const seed = [];
    for (let i = 0; i < 2; i++) {
      const tpl = SIGNAL_TEMPLATES[(Math.random() * SIGNAL_TEMPLATES.length) | 0];
      seed.push({ ...tpl, id: idRef.current++, ago: `${i * 3 + 4}s` });
    }
    setItems(seed);
    const id = setInterval(() => {
      const tpl = SIGNAL_TEMPLATES[(Math.random() * SIGNAL_TEMPLATES.length) | 0];
      setItems((prev) => [
        { ...tpl, id: idRef.current++, ago: nowRef.current },
        ...prev.slice(0, 1).map((it) => ({ ...it, ago: it.ago === nowRef.current ? "3s" : it.ago })),
      ]);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="herofx-card sigfeed">
      <div className="herofx-card-h">
        <span className="herofx-eyebrow"><span className="herofx-pulse" /> {label}</span>
      </div>
      <div className="sigfeed-list">
        {items.map((it, i) => (
          <div key={it.id} className={`sigitem ${it.side.toLowerCase()}`} style={{ "--i": i }}>
            <div className="sigitem-bot">
              <span className="sigitem-mark">{it.bot[0]}</span>
              <div>
                <div className="sigitem-sym">
                  <span className="sigitem-side">{it.side}</span> {it.sym}
                </div>
                <div className="sigitem-reason">{it.reason}</div>
              </div>
            </div>
            <div className="sigitem-ago mono">{it.ago}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderBook({ label }) {
  const [tick, setTick] = useState(0);
  const dataRef = useRef(null);
  if (!dataRef.current) {
    const mid = 1.0842;
    const ask = [];
    const bid = [];
    for (let i = 0; i < 3; i++) {
      ask.push({ p: mid + (i + 1) * 0.0002, v: Math.round(50 + Math.random() * 200) });
      bid.push({ p: mid - (i + 1) * 0.0002, v: Math.round(50 + Math.random() * 200) });
    }
    dataRef.current = { ask, bid, mid };
  }

  useEffect(() => {
    const id = setInterval(() => {
      const d = dataRef.current;
      d.ask = d.ask.map((r) => ({ ...r, v: Math.max(10, r.v + ((Math.random() - 0.5) * 50) | 0) }));
      d.bid = d.bid.map((r) => ({ ...r, v: Math.max(10, r.v + ((Math.random() - 0.5) * 50) | 0) }));
      d.mid += (Math.random() - 0.5) * 0.0001;
      setTick((x) => x + 1);
    }, 700);
    return () => clearInterval(id);
  }, []);

  const d = dataRef.current;
  const maxV = Math.max(...d.ask.map((r) => r.v), ...d.bid.map((r) => r.v));

  return (
    <div className="herofx-card depth">
      <div className="herofx-card-h">
        <span className="herofx-eyebrow">{label}</span>
        <span className="depth-mid-inline mono">{d.mid.toFixed(4)} <span className="depth-mid-l">MID</span></span>
      </div>
      <div className="depth-cols">
        <div className="depth-col bids">
          {d.bid.map((r, i) => (
            <div key={`b${i}`} className="depth-row bid">
              <div className="depth-bar" style={{ width: `${(r.v / maxV) * 100}%` }} />
              <span className="depth-v mono">{r.v}</span>
              <span className="depth-p mono">{r.p.toFixed(4)}</span>
            </div>
          ))}
        </div>
        <div className="depth-col asks">
          {d.ask.map((r, i) => (
            <div key={`a${i}`} className="depth-row ask">
              <div className="depth-bar" style={{ width: `${(r.v / maxV) * 100}%` }} />
              <span className="depth-p mono">{r.p.toFixed(4)}</span>
              <span className="depth-v mono">{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PositionCard({ label }) {
  const [pnl, setPnl] = useState(2418.50);
  useEffect(() => {
    const id = setInterval(() => {
      setPnl((p) => p + (Math.random() - 0.3) * 12);
    }, 900);
    return () => clearInterval(id);
  }, []);
  const positive = pnl > 0;
  return (
    <div className="herofx-card pos">
      <div className="herofx-card-h">
        <span className="herofx-eyebrow">{label}</span>
      </div>
      <div className="pos-row">
        <div>
          <div className="pos-sym">XAUUSD</div>
          <div className="pos-sub mono">LONG · 1.5 LOT</div>
        </div>
        <div className={`pos-pnl ${positive ? "gain" : "loss"}`}>
          {positive ? "+" : "−"}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

export function HeroComposition({ t }) {
  const stageRef = useRef(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onMove = (e) => {
      const r = stage.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - 0.5;
      const my = (e.clientY - r.top) / r.height - 0.5;
      stage.style.setProperty("--px", `${mx * 6}px`);
      stage.style.setProperty("--py", `${my * 6}px`);
    };
    stage.addEventListener("mousemove", onMove);
    return () => stage.removeEventListener("mousemove", onMove);
  }, []);
  return (
    <div className="herofx-stage" ref={stageRef}>
      <div className="herofx-chart">
        <div className="herofx-chart-head">
          <div className="herofx-chart-meta">
            <span className="herofx-pair">EUR/USD</span>
            <span className="herofx-tf">5M</span>
          </div>
        </div>
        <div className="herofx-chart-body">
          <CandleChart />
        </div>
      </div>

      <div className="herofx-row">
        <div className="herofx-tile sig">
          <SignalFeed label={t?.herofx?.signal || "RECENT TRADES"} nowLabel={t?.herofx?.now || "now"} />
        </div>
        <div className="herofx-tile depth">
          <OrderBook label={t?.herofx?.depth || "DEPTH · EURUSD"} />
        </div>
      </div>

      <div className="herofx-glow" />
    </div>
  );
}
