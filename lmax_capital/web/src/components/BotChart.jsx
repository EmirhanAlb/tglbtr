import { useState, useEffect, useRef, useMemo } from "react";

function smoothPath(points) {
  if (points.length < 2) return "";
  const d = [`M ${points[0][0]} ${points[0][1]}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`);
  }
  return d.join(" ");
}

export function BotChart({ pair = "EURUSD", height = 280, t }) {
  const W = 600;
  const H = height;
  const PAD = 24;
  const POINTS = 60;

  const seriesRef = useRef(null);
  if (!seriesRef.current) {
    const arr = [];
    let v = 50 + Math.random() * 10;
    for (let i = 0; i < POINTS; i++) {
      v += (Math.random() - 0.45) * 4;
      arr.push(v);
    }
    seriesRef.current = arr;
  }

  const [tick, setTick] = useState(0);
  const [signals, setSignals] = useState([]);
  const [price, setPrice] = useState(0);
  const [draw, setDraw] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 1600;
    const step = (now) => {
      const k = Math.min(1, (now - start) / dur);
      const e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
      setDraw(e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const s = seriesRef.current;
      const last = s[s.length - 1];
      const next = last + (Math.random() - 0.45) * 3.2;
      s.shift();
      s.push(next);
      setTick((x) => x + 1);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const kind = Math.random() > 0.5 ? "buy" : "sell";
      const idx = Math.floor(POINTS * (0.4 + Math.random() * 0.5));
      const sig = { id: Math.random(), kind, idx, born: performance.now() };
      setSignals((s) => [...s.filter((x) => performance.now() - x.born < 4200), sig]);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const series = seriesRef.current;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = Math.max(1, max - min);
  const xStep = (W - PAD * 2) / (POINTS - 1);
  const points = useMemo(
    () => series.map((v, i) => [PAD + i * xStep, PAD + (1 - (v - min) / range) * (H - PAD * 2)]),
    [tick, H]
  );

  useEffect(() => {
    const target = 1.0500 + (series[series.length - 1] - 50) / 1000;
    let raf;
    const start = price || target;
    const t0 = performance.now();
    const dur = 800;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setPrice(start + (target - start) * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  const path = smoothPath(points);
  const areaPath = path + ` L ${points[points.length - 1][0]} ${H - PAD} L ${points[0][0]} ${H - PAD} Z`;

  return (
    <div className="chartcard">
      <div className="chartcard-head">
        <div className="chartcard-pair">
          <span className="pair-name">{pair}</span>
          <span className="pair-tf">M5</span>
        </div>
        <span className="live-dot">LIVE</span>
      </div>

      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="bc-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bbc6cc" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#bbc6cc" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bc-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#bbc6cc" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
            <filter id="bc-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0.25, 0.5, 0.75].map((p) => (
            <line key={p} x1={PAD} x2={W - PAD} y1={PAD + p * (H - PAD * 2)} y2={PAD + p * (H - PAD * 2)}
                  stroke="rgba(187,198,204,0.05)" strokeWidth="1" />
          ))}

          <path d={areaPath} fill="url(#bc-area)" style={{ opacity: draw }} />

          <path
            d={path}
            fill="none"
            stroke="url(#bc-line)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#bc-glow)"
            style={{
              strokeDasharray: 3000,
              strokeDashoffset: 3000 * (1 - draw),
              transition: "stroke-dashoffset 0.05s linear",
            }}
          />

          {draw > 0.95 && points.length > 0 && (
            <g>
              <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="10"
                      fill="rgba(255,255,255,0.08)">
                <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3"
                      fill="#ffffff" />
            </g>
          )}
        </svg>

        {signals.map((s) => {
          if (s.idx >= points.length) return null;
          const [px, py] = points[s.idx];
          const left = (px / W) * 100;
          const top = (py / H) * 100;
          return (
            <div
              key={s.id}
              className={`signal-badge ${s.kind}`}
              style={{ left: `${left}%`, top: `${Math.max(8, Math.min(90, top))}%`, transform: "translate(-50%, -50%)" }}
            >
              {s.kind === "buy" ? "▲ BUY" : "▼ SELL"}
            </div>
          );
        })}
      </div>

      <div className="chart-stats">
        <div className="chart-stat">
          <div className="stat-label">{t.metrics.win}</div>
          <div className="stat-value gain">73.4%</div>
        </div>
        <div className="chart-stat">
          <div className="stat-label">P/L · 30D</div>
          <div className="stat-value gain">+18.2%</div>
        </div>
        <div className="chart-stat">
          <div className="stat-label">{pair}</div>
          <div className="stat-value mono">{price.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}
