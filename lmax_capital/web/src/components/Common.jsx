import { useState, useEffect, useRef } from "react";
import { LiquidButton } from "./LiquidButton.jsx";

export function Reveal({ children, delay = 0, as: As = "div", className = "", ...rest }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (ents) => ents.forEach((e) => e.isIntersecting && setVis(true)),
      { threshold: 0.15, rootMargin: "-40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <As
      ref={ref}
      className={`reveal ${vis ? "in" : ""} ${className}`}
      data-delay={delay || undefined}
      {...rest}
    >
      {children}
    </As>
  );
}

export function AnimatedNumber({ value, decimals = 0, prefix = "", suffix = "", duration = 1400 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (ents) => ents.forEach((e) => e.isIntersecting && setStarted(true)),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let raf;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / duration);
      const e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
      setShown(value * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [started, value, duration]);

  return (
    <span ref={ref} className="mono">
      {prefix}
      {shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

export function Sparkline({ data, color = "#bbc6cc", height = 36, width = 200, fill = true }) {
  const W = width;
  const H = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);
  const step = W / (data.length - 1);
  const pts = data.map((v, i) => [i * step, H - ((v - min) / range) * (H - 4) - 2]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const cpx = (prev[0] + cur[0]) / 2;
    d += ` Q ${cpx} ${prev[1]}, ${cpx} ${(prev[1] + cur[1]) / 2} T ${cur[0]} ${cur[1]}`;
  }
  const area = d + ` L ${W} ${H} L 0 ${H} Z`;
  const gid = `spark-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="botcard-spark">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Nav({ route, setRoute, lang, setLang, t, session }) {
  const items = [
    { id: "home", label: t.nav.home },
    { id: "automation", label: t.nav.automation, anchor: "otomasyon" },
    { id: "trading", label: t.nav.trading },
  ];

  const goAutomation = () => {
    const scroll = () => document.getElementById("otomasyon")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (route === "home") {
      scroll();
    } else {
      setRoute("home");
      setTimeout(scroll, 350);
    }
  };
  return (
    <nav className="nav">
      <div className="nav-inner">
        <a
          href="#home"
          className="nav-logo"
          onClick={(e) => {
            e.preventDefault();
            setRoute("home");
          }}
        >
          <img src="/assets/logo.png" alt="Lmax Capital" />
        </a>
        <div className="nav-links">
          {items.map((it) => (
            <a
              key={it.id}
              href={`#${it.anchor || it.id}`}
              className={`nav-link ${!it.anchor && route === it.id ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                if (it.anchor) goAutomation();
                else setRoute(it.id);
              }}
            >
              {it.label}
            </a>
          ))}
          <button
            className="nav-link"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em" }}
            onClick={() => {
              const next = lang === "tr" ? "en" : "tr";
              setLang(next);
              try { localStorage.setItem("vertex.lang", next); } catch (e) {}
            }}
          >
            {lang === "tr" ? "EN" : "TR"}
          </button>
          {session ? (
            <LiquidButton
              size="sm"
              className="cta-link"
              onClick={() => setRoute(session.role === "admin" ? "admin" : "panel")}
            >
              {session.role === "admin" ? (t.admin?.brand || "Admin") : (t.panel?.nav_overview || "Panel")}
              {" "}<span className="btn-arrow">→</span>
            </LiquidButton>
          ) : (
            <>
              <button type="button" className="nav-login" onClick={() => setRoute("login")}>
                {t.nav.login}
              </button>
              <LiquidButton size="sm" className="cta-link" onClick={() => setRoute("account")}>
                {t.nav.cta} <span className="btn-arrow">→</span>
              </LiquidButton>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const TICKER_DATA = [
  ["EURUSD", "1.0842", "+0.18", "up"],
  ["GBPUSD", "1.2731", "+0.04", "up"],
  ["XAUUSD", "2384.50", "+1.12", "up"],
  ["USDJPY", "152.18", "-0.22", "down"],
  ["BTCUSD", "68420", "+2.45", "up"],
  ["USDTRY", "32.61", "+0.08", "up"],
  ["NAS100", "18752", "+0.62", "up"],
  ["WTI", "78.40", "-0.85", "down"],
  ["ETHUSD", "3742", "+1.92", "up"],
  ["DAX40", "18234", "-0.14", "down"],
  ["AUDUSD", "0.6612", "+0.21", "up"],
  ["SPX500", "5420", "+0.34", "up"],
];

export function Ticker() {
  const items = [...TICKER_DATA, ...TICKER_DATA];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((it, i) => (
          <span key={i} className="ticker-item">
            <span className="ticker-pair">{it[0]}</span>
            <span className="ticker-price">{it[1]}</span>
            <span className={`ticker-chg ${it[3]}`}>
              {it[3] === "up" ? "▲" : "▼"} {Math.abs(parseFloat(it[2])).toFixed(2)}%
            </span>
            <span className="ticker-dot" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Footer({ t, setRoute }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <img src="/assets/logo.png" alt="Lmax Capital" style={{ height: 44, display: "block" }} />
            <p style={{ marginTop: 16, color: "var(--text-secondary)", fontSize: 14, maxWidth: 280, lineHeight: 1.6 }}>
              {t.footer.tagline}
            </p>
            <p className="disclaimer">{t.footer.disclaimer}</p>
          </div>
          <div>
            <div className="foot-h">{t.footer.product}</div>
            <a className="foot-l" href="#trading" onClick={(e) => { e.preventDefault(); setRoute("trading"); }}>{t.nav.trading}</a>
            <a className="foot-l" href="#account" onClick={(e) => { e.preventDefault(); setRoute("account"); }}>{t.nav.cta}</a>
          </div>
          <div>
            <div className="foot-h">{t.footer.company}</div>
            <a className="foot-l" href="#">{t.footer.about}</a>
            <a className="foot-l" href="#">{t.footer.careers}</a>
            <a className="foot-l" href="#">{t.footer.blog}</a>
          </div>
          <div>
            <div className="foot-h">{t.footer.legal}</div>
            <a className="foot-l" href="#terms" onClick={(e) => { e.preventDefault(); setRoute("terms"); }}>{t.footer.terms}</a>
            <a className="foot-l" href="#privacy" onClick={(e) => { e.preventDefault(); setRoute("privacy"); }}>{t.footer.privacy}</a>
            <a className="foot-l" href="#risk" onClick={(e) => { e.preventDefault(); setRoute("risk"); }}>{t.footer.risk}</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t.footer.copyright}</span>
          <span>v.2026.05</span>
        </div>
      </div>
    </footer>
  );
}

export function Mt5Badge({ t }) {
  return (
    <span className="mt5-badge">
      <img src="/assets/mt5-logo.png" alt="MT5" />
      {t.mt5.supported}
    </span>
  );
}

export function TrustStrip({ t }) {
  return (
    <div className="trust-strip container">
      <span>{t.trust.a}</span>
      <span className="trust-dot" />
      <span>{t.trust.b}</span>
      <span className="trust-dot" />
      <span>{t.trust.c}</span>
      <span className="trust-dot" />
      <span>{t.trust.d}</span>
    </div>
  );
}
