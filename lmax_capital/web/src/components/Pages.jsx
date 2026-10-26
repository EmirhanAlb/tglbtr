import { useState, useRef, useEffect } from "react";
import { Reveal, AnimatedNumber, Sparkline, Ticker, Mt5Badge } from "./Common.jsx";
import { TiltCard } from "./TiltCard.jsx";
import { FloatingPaths } from "./FloatingPaths.jsx";
import { RotatingEarth } from "./RotatingEarth.jsx";
import { LiquidButton } from "./LiquidButton.jsx";
import { AuthMetrics } from "./AuthMetrics.jsx";
import { HeroComposition, CandleChart } from "./HeroComposition.jsx";
import { BotChart } from "./BotChart.jsx";
import { VERTEX_BOTS } from "../data/bots.js";
import { VERTEX_INSTRUMENTS, VERTEX_MARKET_SPARKS } from "../data/instruments.js";
import { DIAL_CODES } from "../data/dial-codes.js";
import { PhoneCodeSelect } from "./PhoneCodeSelect.jsx";
import {
  signUp,
  signIn,
} from "../data/store.js";

// Tarayıcının saat dilimine göre ülke kodu tahmini (harici IP servisi gerekmez).
const TZ_TO_CC = {
  "Europe/Istanbul": "TR",
  "Europe/London": "GB",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Rome": "IT",
  "Europe/Madrid": "ES",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Zurich": "CH",
  "Europe/Vienna": "AT",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Warsaw": "PL",
  "Europe/Lisbon": "PT",
  "Europe/Athens": "GR",
  "Europe/Bucharest": "RO",
  "Europe/Prague": "CZ",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Toronto": "US",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW",
};

function BotCard({ bot, variant, t }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div className="botcard" ref={ref} onMouseMove={onMove}>
      <div className="botcard-head">
        <img className="botcard-logo" src={bot.logo} alt={bot.name} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span className="metric-l">P/L · {bot.months}{t.metrics.mo}</span>
          <span className="metric-v gain">+<AnimatedNumber value={bot.profit} decimals={1} suffix="%" /></span>
        </div>
      </div>
      <div>
        <div className="botcard-style">{bot.pair} · {t.bots.style[bot.styleKey]}</div>
        <Mt5Badge t={t} />
      </div>
      <Sparkline data={bot.spark} width={variant === "wide" ? 200 : 280} height={40} />
      <div className="botcard-metrics">
        <div>
          <div className="metric-l">{t.metrics.win}</div>
          <div className="metric-v">{bot.win.toFixed(1)}%</div>
        </div>
        <div>
          <div className="metric-l">{t.metrics.sharpe}</div>
          <div className="metric-v">{bot.sharpe.toFixed(2)}</div>
        </div>
        <div>
          <div className="metric-l">{t.metrics.dd}</div>
          <div className="metric-v">{bot.dd.toFixed(1)}%</div>
        </div>
        <div>
          <div className="metric-l">{t.metrics.trades}</div>
          <div className="metric-v">{bot.trades.toLocaleString()}</div>
        </div>
      </div>
      <div className="botcard-foot">
        <div className="botcard-price">
          <span className="v">${bot.price.toLocaleString()}</span>
          <span className="c">USD</span>
        </div>
        <button className="btn btn-ghost" style={{ height: 38, padding: "0 18px", fontSize: 13 }}>
          {t.bots.buy} <span className="btn-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

export function PageHome({ t, setRoute, variant }) {
  const sparks = VERTEX_MARKET_SPARKS;
  const marketsList = [
    { key: "fx",      sym: "EUR/USD", price: "1.0842",  chg: "+0.18%" },
    { key: "metals",  sym: "XAU/USD", price: "2384.50", chg: "+1.12%" },
    { key: "indices", sym: "NAS100",  price: "18,752",  chg: "+0.62%" },
    { key: "crypto",  sym: "BTC/USD", price: "68,420",  chg: "+2.45%" },
  ];

  return (
    <div className="page">
      <section className="hero">
        <div className="field"><div className="field-grid" /></div>
        <div className="container hero-grid">
          <div>
            <Reveal className="section-eyebrow" delay={0}>{t.hero.eyebrow}</Reveal>
            <Reveal delay={150}>
              <h1 className="hero-h1" style={{ marginTop: 24 }}>
                {t.hero.title_a} <span className="accent">{t.hero.title_b}</span>
                <br />{t.hero.title_c}
              </h1>
            </Reveal>
            <Reveal delay={300}>
              <p className="hero-sub">{t.hero.sub}</p>
            </Reveal>
            <Reveal delay={450}>
              <div className="hero-cta">
                <LiquidButton size="lg" onClick={() => setRoute("account")}>
                  {t.hero.cta_primary} <span className="btn-arrow">→</span>
                </LiquidButton>
                <button className="btn btn-ghost btn-lg" onClick={() => setRoute("trading")}>
                  {t.hero.cta_secondary}
                </button>
              </div>
            </Reveal>
          </div>
          <Reveal delay={300}>
            <HeroComposition t={t} />
          </Reveal>
        </div>
      </section>

      <Ticker />

      <section className="section">
        <div className="container">
          <Reveal className="section-eyebrow">{t.home.markets_eyebrow}</Reveal>
          <Reveal delay={100}><h2 className="section-title">{t.home.markets_title}</h2></Reveal>
          <Reveal delay={200}><p className="section-sub">{t.home.markets_sub}</p></Reveal>
          <Reveal delay={300}>
            <div className="markets-grid">
              {marketsList.map((m) => {
                const up = m.chg.startsWith("+");
                return (
                  <div key={m.key} className="market-card">
                    <div>
                      <div className="market-card-name">{t.markets[m.key]}</div>
                      <div className="market-card-count">{m.sym}</div>
                    </div>
                    <Sparkline data={sparks[m.key]} width={200} height={50} color={up ? "#7eddb3" : "#e6826e"} />
                    <div className="market-card-stat">
                      <span className="v">{m.price}</span>
                      <span className="c" style={{ color: up ? "var(--gain)" : "var(--loss)" }}>{m.chg}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
              <button
                className="btn btn-ghost btn-lg"
                onClick={() => {
                  setRoute("trading");
                  setTimeout(() => {
                    document.getElementById("instruments")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 350);
                }}
              >
                {t.home.markets_cta} <span className="btn-arrow">→</span>
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          <Reveal className="section-eyebrow">{t.home.why_eyebrow}</Reveal>
          <Reveal delay={100}><h2 className="section-title">{t.home.why_title}</h2></Reveal>
          <Reveal delay={300}>
            <div className="pillars pillars-rich">
              {[
                { k: "a", t: t.home.why_a_t, d: t.home.why_a_d, stat: t.home.why_a_stat, meta: t.home.why_a_meta },
                { k: "b", t: t.home.why_b_t, d: t.home.why_b_d, stat: t.home.why_b_stat, meta: t.home.why_b_meta },
                { k: "c", t: t.home.why_c_t, d: t.home.why_c_d, stat: t.home.why_c_stat, meta: t.home.why_c_meta },
                { k: "d", t: t.home.why_d_t, d: t.home.why_d_d, stat: t.home.why_d_stat, meta: t.home.why_d_meta },
                {
                  k: "e",
                  t: t.home.why_e_t,
                  d: t.home.why_e_d,
                  stat: t.home.why_e_stat,
                  meta: t.home.why_e_meta,
                  cta: t.home.why_e_cta,
                  onCta: () => document.getElementById("otomasyon")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                },
                {
                  k: "f",
                  t: t.home.why_f_t,
                  d: t.home.why_f_d,
                  stat: t.home.why_f_stat,
                  meta: t.home.why_f_meta,
                  cta: t.home.why_f_cta,
                  onCta: () => setRoute("account"),
                },
              ].map((p) => (
                <TiltCard
                  key={p.k}
                  className="pillar"
                  tiltLimit={8}
                  scale={1.02}
                  perspective={1400}
                  effect="evade"
                  spotlight
                >
                  <div className="pillar-top">
                    <span className="pillar-ico" aria-hidden="true">
                      <i className="pillar-ico-glow" />
                      {WHY_ICONS[p.k]}
                    </span>
                    <div className="pillar-stat">
                      <span className="pillar-stat-v">{p.stat}</span>
                      <span className="pillar-stat-m">{p.meta}</span>
                    </div>
                  </div>
                  <div className="pillar-body">
                    <div className="pillar-t">{p.t}</div>
                    <p className="pillar-d">{p.d}</p>
                  </div>
                  {p.cta && (
                    <button type="button" className="pillar-cta" onClick={p.onCta}>
                      {p.cta} <span className="btn-arrow">→</span>
                    </button>
                  )}
                  <span className="pillar-line" aria-hidden="true" />
                </TiltCard>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="otomasyon" className="section" style={{ paddingTop: 40, scrollMarginTop: 96 }}>
        <div className="container">
          <Reveal className="section-eyebrow">{t.home.integ_eyebrow}</Reveal>
          <Reveal delay={100}><h2 className="section-title">{t.home.integ_title}</h2></Reveal>
          <Reveal delay={200}><p className="section-sub">{t.home.integ_sub}</p></Reveal>
          <Reveal delay={300}>
            <div className="pillars pillars-integ" style={{ marginTop: 56 }}>
              {[
                { k: "a", t: t.home.integ_a_t, d: t.home.integ_a_d, img: "/assets/otomasyon/MetaTrader_5_Clear_240px.png", tint: false },
                { k: "b", t: t.home.integ_b_t, d: t.home.integ_b_d, img: "/assets/otomasyon/bot.png", tint: true },
                { k: "c", t: t.home.integ_c_t, d: t.home.integ_c_d, img: "/assets/otomasyon/code.png", tint: true },
              ].map((p) => (
                <div key={p.k} className="pillar">
                  {p.tint ? (
                    <span
                      className="pillar-img pillar-img-mask"
                      role="img"
                      aria-label={p.t}
                      style={{
                        WebkitMaskImage: `url(${p.img})`,
                        maskImage: `url(${p.img})`,
                      }}
                    />
                  ) : (
                    <img className="pillar-img" src={p.img} alt={p.t} />
                  )}
                  <div className="pillar-t">{p.t}</div>
                  <p className="pillar-d">{p.d}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <div style={{ marginTop: 80 }}>
            <Reveal className="section-eyebrow">{t.home.sec2_eyebrow}</Reveal>
            <Reveal delay={100}><h3 className="section-title" style={{ fontSize: "clamp(28px, 3vw, 40px)" }}>{t.home.sec2_title}</h3></Reveal>
            <Reveal delay={300}>
              <div className="steps" style={{ marginTop: 40 }}>
                <div className="step" data-step-num="01">
                  <span className="step-ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/><path d="M19 4v4M21 6h-4"/></svg>
                  </span>
                  <span className="step-num">STEP 01</span>
                  <div className="step-t">{t.home.step1_t}</div>
                  <p className="step-d">{t.home.step1_d}</p>
                </div>
                <div className="step" data-step-num="02">
                  <span className="step-ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M16 15h2"/></svg>
                  </span>
                  <span className="step-num">STEP 02</span>
                  <div className="step-t">{t.home.step2_t}</div>
                  <p className="step-d">{t.home.step2_d}</p>
                </div>
                <div className="step" data-step-num="03">
                  <span className="step-ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/></svg>
                  </span>
                  <span className="step-num">STEP 03</span>
                  <div className="step-t">{t.home.step3_t}</div>
                  <p className="step-d">{t.home.step3_d}</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="fiber-banner" aria-labelledby="fiber-banner-title">
        <div className="fiber-banner__bg" aria-hidden="true">
          <div className="fiber-banner__img" />
          <div className="fiber-banner__vignette" />
          <div className="fiber-banner__grid" />
          <span className="fiber-banner__orb fiber-banner__orb--a" />
          <span className="fiber-banner__orb fiber-banner__orb--b" />
        </div>

        <div className="container fiber-banner__inner">
          <Reveal>
            <h2 id="fiber-banner-title" className="fiber-banner__title">
              {t.trading.fiber_title}
            </h2>
          </Reveal>

          <Reveal delay={220} className="fiber-banner__ctaRow">
            <LiquidButton size="lg" onClick={() => setRoute && setRoute("account")}>
              {t.trading.fiber_cta} <span className="btn-arrow">→</span>
            </LiquidButton>
          </Reveal>
        </div>
      </section>

    </div>
  );
}

const WHY_ICONS = {
  a: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  ),
  b: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-6 4 3 5-8" />
      <circle cx="20" cy="4" r="1.5" />
    </svg>
  ),
  c: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13a8 8 0 1 1 16 0v3a3 3 0 0 1-3 3h-1v-7h4" />
      <path d="M4 13v3a3 3 0 0 0 3 3h1v-7H4" />
    </svg>
  ),
  d: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  e: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M9 9 6 11l3 2M15 9l3 2-3 2M13 7l-2 8" />
    </svg>
  ),
  f: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
};

export function PageBots({ t, variant }) {
  return (
    <div className="page">
      <section className="section" style={{ paddingTop: 120 }}>
        <div className="container">
          <Reveal className="section-eyebrow">{t.bots.eyebrow}</Reveal>
          <Reveal delay={100}>
            <h2 className="section-title">{t.bots.title}</h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="section-sub">{t.bots.sub}</p>
          </Reveal>
          <Reveal delay={300}>
            <div className={`bots-grid ${variant}`}>
              {VERTEX_BOTS.map((b) => (
                <BotCard key={b.id} bot={b} variant={variant} t={t} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          <Reveal className="section-eyebrow">{t.bots.anatomy_eyebrow}</Reveal>
          <Reveal delay={100}>
            <h2 className="section-title">{t.bots.anatomy_title}</h2>
          </Reveal>
          <Reveal delay={300}>
            <div className="anatomy">
              {t.bots.anatomy.map((a, i) => (
                <div key={i} className="anatomy-node">
                  <span className="anatomy-step">0{i + 1} / 04</span>
                  <div className="anatomy-t">{a.t}</div>
                  <p className="anatomy-d">{a.d}</p>
                  <div className="anatomy-glyph">
                    <span className="blip" /><span className="blip" /><span className="blip" />
                    <span className="blip" /><span className="blip" /><span className="blip" />
                    <span className="blip" />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

export function PageTrading({ t, setRoute }) {
  const [tab, setTab] = useState("fx");
  const tabKeys = ["fx", "metals", "indices", "crypto", "energy"];
  const rows = VERTEX_INSTRUMENTS[tab];

  return (
    <div className="page">
      <section className="section" style={{ paddingTop: 120 }}>
        <div className="container">
          <Reveal className="section-eyebrow">{t.trading.platforms_t}</Reveal>
          <Reveal delay={100}>
            <h2 className="section-title">MT5 · WebTrader</h2>
          </Reveal>
          <Reveal delay={300}>
            <div className="bento-grid">
              {[
                {
                  title: "MetaTrader 5",
                  meta: "MT5 · v5.0",
                  description: t.trading.mt5_d,
                  status: t.trading.mt5_status,
                  statusKind: "active",
                  tags: ["EA Hazır", "FIX 4.4", "Çoklu Hesap"],
                  icon: <img src="/assets/mt5-logo.png" alt="" className="bento-ico-img" />,
                  colSpan: 2,
                  persistentHover: true,
                  cta: "Şimdi Hesap Aç →",
                  onClick: () => setRoute && setRoute("account"),
                },
                {
                  title: "WebTrader",
                  meta: "Web · v1.0",
                  description: t.trading.web_d,
                  status: t.trading.web_status,
                  statusKind: "soon",
                  tags: ["Cross-Platform", "Cloud"],
                  icon: <img src="/assets/icon.png" alt="" className="bento-ico-img" />,
                  colSpan: 1,
                  cta: "Yakında",
                },
              ].map((it, i) => (
                <div
                  key={i}
                  className={`bento-card ${it.colSpan === 2 ? "bento-span-2" : ""} ${it.persistentHover ? "is-hover" : ""} ${it.onClick ? "is-clickable" : ""}`}
                  onClick={it.onClick}
                  role={it.onClick ? "button" : undefined}
                  tabIndex={it.onClick ? 0 : undefined}
                  onKeyDown={it.onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); it.onClick(); } } : undefined}
                >
                  <div className="bento-dots" aria-hidden="true" />
                  <div className="bento-content">
                    <div className="bento-head">
                      <div className="bento-ico">{it.icon}</div>
                      <span className={`bento-status bento-status-${it.statusKind}`}>
                        <span className="bento-status-dot" />
                        {it.status}
                      </span>
                    </div>
                    <div className="bento-body">
                      <h3 className="bento-title">
                        {it.title}
                        <span className="bento-meta">{it.meta}</span>
                      </h3>
                      <p className="bento-desc">{it.description}</p>
                    </div>
                    <div className="bento-foot">
                      <div className="bento-tags">
                        {it.tags.map((tg, j) => (
                          <span key={j} className="bento-tag">#{tg}</span>
                        ))}
                      </div>
                      <span className="bento-cta">{it.cta}</span>
                    </div>
                  </div>
                  <div className="bento-ring" aria-hidden="true" />
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section trading-cond-section" style={{ paddingTop: 40 }}>
        <div className="trading-cond-bg" aria-hidden="true" />
        <div className="container">
          <Reveal delay={100}>
            <h2 className="section-title">{t.trading.title}</h2>
          </Reveal>
          <Reveal delay={150}><Mt5Badge t={t} /></Reveal>

          <Reveal delay={300}>
            <div className="specs" style={{ marginTop: 56 }}>
              <div className="spec">
                <div className="spec-v"><AnimatedNumber value={0.1} decimals={1} suffix=" pip" /></div>
                <div className="spec-l">{t.trading.specs.spread}</div>
              </div>
              <div className="spec">
                <div className="spec-v">1:500</div>
                <div className="spec-l">{t.trading.specs.lev}</div>
              </div>
              <div className="spec">
                <div className="spec-v"><AnimatedNumber value={10} decimals={0} suffix=" ms" /></div>
                <div className="spec-l">{t.trading.specs.exec}</div>
              </div>
              <div className="spec">
                <div className="spec-v"><AnimatedNumber value={200} suffix="+" /></div>
                <div className="spec-l">{t.trading.specs.inst}</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="instruments" className="section" style={{ paddingTop: 0, scrollMarginTop: 96 }}>
        <div className="container">
          <Reveal delay={100}>
            <h2 className="section-title">{t.trading.tabs_title}</h2>
          </Reveal>
          <Reveal delay={200}>
            <div className="tabs">
              {tabKeys.map((k) => (
                <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
                  {t.markets[k]}
                </button>
              ))}
            </div>
          </Reveal>
          <Reveal delay={300}>
            <div className="spread-table" key={tab}>
              <div className="spread-row head">
                <span className="spread-cell">{t.trading.spread_h.instrument}</span>
                <span className="spread-cell">{t.trading.spread_h.spread}</span>
                <span className="spread-cell">{t.trading.spread_h.commission}</span>
                <span className="spread-cell">{t.trading.spread_h.lev}</span>
              </div>
              {rows.map((r, i) => (
                <div key={r.name} className="spread-row" style={{ animation: `sig-slide 0.5s var(--ease-out-expo) ${i * 50}ms both` }}>
                  <span className="spread-cell">{r.name}</span>
                  <span className="spread-cell">{r.spread}</span>
                  <span className="spread-cell">{r.commission}</span>
                  <span className="spread-cell">{r.lev}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section cta-globe-section">
        <div className="container cta-globe-wrap">
          <div className="cta-globe-canvas">
            <RotatingEarth width={680} height={680} />
          </div>
          <div className="cta-globe-content">
            <Reveal delay={100}><h2 className="section-title cta-globe-title">{t.home.cta_title}</h2></Reveal>
            <Reveal delay={200}><p className="section-sub cta-globe-sub">{t.home.cta_sub}</p></Reveal>
            <Reveal delay={300}>
              <LiquidButton size="xl" className="cta-globe-btn" onClick={() => setRoute && setRoute("account")}>
                {t.home.cta_button} <span className="btn-arrow">→</span>
              </LiquidButton>
            </Reveal>
          </div>
        </div>
      </section>

    </div>
  );
}

export function PageAccount({ t, setRoute, initialMode }) {
  const [mode, setMode] = useState(initialMode === "login" ? "login" : "register");
  const [type, setType] = useState("real");
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [dialCode, setDialCode] = useState("+90");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [resentMsg, setResentMsg] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((v) => (v <= 1 ? 0 : v - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const formatPhone = (digits, dial) => {
    if (dial === "+90") {
      const g1 = digits.slice(0, 3);
      const g2 = digits.slice(3, 6);
      const g3 = digits.slice(6, 8);
      const g4 = digits.slice(8, 10);
      return [g1, g2, g3, g4].filter(Boolean).join(" ");
    }
    return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
  };

  const phoneMax = dialCode === "+90" ? 10 : 15;
  const phoneDisplay = formatPhone(phone, dialCode);

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, phoneMax);
    setPhone(digits);
    if (phoneError) setPhoneError("");
  };

  useEffect(() => {
    if (dialCode === "+90" && phone.length > 10) setPhone(phone.slice(0, 10));
  }, [dialCode]);

  useEffect(() => {
    let cancelled = false;
    // Ziyaretçinin ülkesine göre telefon kodunu ön-seç.
    // Tarayıcının yerel saat dilimini kullanır — harici IP servisi gerektirmez,
    // bu yüzden güvenlik tarayıcılarını tetiklemez.
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const cc = TZ_TO_CC[tz];
      if (!cancelled && cc) {
        const m = DIAL_CODES.find((c) => c.code === cc);
        if (m) setDialCode(m.dial);
      }
    } catch {}
    return () => {
      cancelled = true;
    };
  }, []);
  const isLogin = mode === "login";
  const isForgot = mode === "forgot";
  const copy = isForgot ? t.forgot : isLogin ? t.login : t.account;
  return (
    <div className="page auth-page">
      <main className="auth-layout">
        <div className="auth-bg-icon" aria-hidden="true" />
        <aside className="auth-side">
          <div className="auth-side-fade" />
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
          <button
            type="button"
            className="auth-side-brand"
            onClick={() => setRoute && setRoute("home")}
            aria-label="Lmax Capital"
          >
            <img src="/assets/logo.png" alt="Lmax Capital" />
          </button>
          <div className="auth-side-chart herofx-chart">
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
          <blockquote className="auth-side-quote">
            <p>{t.auth.brand_quote}</p>
            <footer>{t.auth.brand_author}</footer>
          </blockquote>
        </aside>
        <section className="auth-main">
          <button type="button" className="auth-back" onClick={() => setRoute && setRoute("home")}>
            ← {t.auth.back}
          </button>
          <div className="auth-main-inner">
            <div className="auth-heading">
              <h1 className="auth-title">{copy.title}</h1>
            </div>
            <Reveal delay={200}>
              <form
                className="acc-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (mode === "register") {
                    let bad = false;
                    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRe.test(email)) {
                      setEmailError(t.account.err_email);
                      bad = true;
                    } else setEmailError("");

                    if (phone.length > 0) {
                      if (dialCode === "+90") {
                        if (phone.length !== 10 || phone[0] !== "5") {
                          setPhoneError(t.account.err_phone_tr);
                          bad = true;
                        } else setPhoneError("");
                      } else if (phone.length < 6) {
                        setPhoneError(t.account.err_phone);
                        bad = true;
                      } else setPhoneError("");
                    } else setPhoneError("");

                    if (pwd.length < 8) {
                      setPwdError(t.account.password_short);
                      bad = true;
                    } else if (pwd !== pwdConfirm) {
                      setPwdError(t.account.password_mismatch);
                      bad = true;
                    } else setPwdError("");

                    if (!consent) {
                      setConsentError(t.account.consent_required);
                      bad = true;
                    } else setConsentError("");

                    if (bad) return;

                    try {
                      const fullPhone = phone ? `${dialCode} ${phone}` : "";
                      const sess = await signUp({
                        name: name.trim() || email.split("@")[0],
                        email,
                        phone: fullPhone,
                        password: pwd,
                        accountType: type,
                      });
                      // MT5 account is requested from the panel only after KYC
                      // verification — not auto-created at signup.
                      setRoute && setRoute("panel");
                      return;
                    } catch (err) {
                      const msg = String(err?.message || "");
                      if (/registered|already|exists/i.test(msg)) {
                        setEmailError(t.account.err_email);
                      } else {
                        setEmailError(msg || t.account.err_email);
                      }
                      return;
                    }
                  }
                  if (mode === "login") {
                    setLoginError("");
                    try {
                      const sess = await signIn(loginEmail, loginPwd);
                      setRoute && setRoute(sess.role === "admin" ? "admin" : "panel");
                    } catch (err) {
                      setLoginError("E-posta veya şifre hatalı.");
                    }
                    return;
                  }
                  setSubmitted(true);
                }}
              >
                {submitted && mode === "register" ? (
                  <div className="acc-verify">
                    <div className="acc-verify-ico" aria-hidden="true">
                      <svg viewBox="0 0 56 56" fill="none">
                        <rect x="6" y="14" width="44" height="32" rx="6" stroke="currentColor" strokeWidth="2" />
                        <path d="m6 18 22 14 22-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <circle cx="44" cy="40" r="10" fill="#0a0d14" stroke="currentColor" strokeWidth="2" />
                        <path d="m40 40 3 3 6-6" stroke="var(--gain)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </div>
                    <h3 className="acc-verify-t">{t.verify.title}</h3>
                    <p className="acc-verify-sub">{t.verify.sub}</p>
                    <div className="acc-verify-email">{email}</div>
                    <p className="acc-verify-d">{t.verify.desc}</p>
                    <div className="acc-verify-spam">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
                      <span>{t.verify.spam}</span>
                    </div>
                    <div className="acc-verify-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={resendIn > 0}
                        onClick={() => {
                          setResendIn(60);
                          setResentMsg(t.verify.resent);
                          setTimeout(() => setResentMsg(""), 4000);
                        }}
                      >
                        {resendIn > 0 ? t.verify.resend_in.replace("{s}", resendIn) : t.verify.resend}
                      </button>
                      <button
                        type="button"
                        className="acc-link"
                        onClick={() => {
                          setSubmitted(false);
                          setMode("login");
                        }}
                      >
                        {t.verify.back_login} →
                      </button>
                    </div>
                    {resentMsg && <p className="acc-verify-resent">{resentMsg}</p>}
                  </div>
                ) : submitted ? (
                  <div className="acc-success">
                    <div className="acc-success-ring">✓</div>
                    <div className="acc-success-t">{isForgot ? t.forgot.success_t : copy.submit}</div>
                    <p className="acc-success-d">{isForgot ? t.forgot.success_d : copy.sub}</p>
                  </div>
                ) : (
                  <>
                    {!isForgot && (
                      <div className="acc-tabs" data-mode={mode}>
                        <div className="acc-tabs-thumb" />
                        <button
                          type="button"
                          className={`acc-tab ${!isLogin ? "active" : ""}`}
                          onClick={() => setMode("register")}
                        >
                          {t.account.tab_register}
                        </button>
                        <button
                          type="button"
                          className={`acc-tab ${isLogin ? "active" : ""}`}
                          onClick={() => setMode("login")}
                        >
                          {t.account.tab_login}
                        </button>
                      </div>
                    )}

                    {isForgot ? (
                      <>
                        <div className="acc-form-head">
                          <div className="acc-form-title">{t.forgot.eyebrow}</div>
                          <button type="button" className="acc-link" onClick={() => setMode("login")}>← {t.forgot.back}</button>
                        </div>

                        <div className="field-group">
                          <label className="field-l">{t.forgot.f_email}</label>
                          <div className="field-wrap">
                            <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                            <input className="field-i" type="email" placeholder="you@example.com" required />
                          </div>
                        </div>

                        <button className="btn btn-primary btn-lg" type="submit" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                          {t.forgot.submit} <span className="btn-arrow">→</span>
                        </button>

                        <div className="acc-form-foot">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                          <span>256-bit SSL Güvenli Giriş</span>
                        </div>
                      </>
                    ) : isLogin ? (
                      <>
                        <div className="field-group">
                          <label className="field-l">{t.login.f_email}</label>
                          <div className="field-wrap">
                            <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                            <input
                              className="field-i"
                              type="email"
                              placeholder="you@example.com"
                              required
                              value={loginEmail}
                              onChange={(e) => { setLoginEmail(e.target.value); if (loginError) setLoginError(""); }}
                            />
                          </div>
                        </div>

                        <div className="field-group">
                          <label className="field-l">{t.login.f_password}</label>
                          <div className="field-wrap">
                            <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                            <input
                              className="field-i"
                              type="password"
                              placeholder="••••••••"
                              required
                              value={loginPwd}
                              onChange={(e) => { setLoginPwd(e.target.value); if (loginError) setLoginError(""); }}
                            />
                          </div>
                          {loginError && <p className="field-err">{loginError}</p>}
                        </div>

                        <div className="acc-row-between">
                          <label className="acc-check">
                            <input type="checkbox" defaultChecked />
                            {t.login.remember}
                          </label>
                          <button type="button" className="acc-link" onClick={() => setMode("forgot")}>{t.login.forgot}</button>
                        </div>

                        <button className="btn btn-primary btn-lg" type="submit" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                          {t.login.submit} <span className="btn-arrow">→</span>
                        </button>

                        <p className="acc-altcta">
                          {t.login.no_account}
                          <button type="button" className="acc-link" onClick={() => setMode("register")}>
                            {t.login.register_cta}
                          </button>
                        </p>

                        <div className="acc-form-foot">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                          <span>256-bit SSL Güvenli Giriş</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="field-group">
                          <label className="field-l">{t.account.f_name}</label>
                          <div className="field-wrap">
                            <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
                            <input
                              className="field-i"
                              type="text"
                              placeholder="Ahmet Yılmaz"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="field-group">
                          <label className="field-l">{t.account.f_email}</label>
                          <div className="field-wrap">
                            <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                            <input
                              className="field-i"
                              type="email"
                              placeholder="you@example.com"
                              required
                              value={email}
                              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                            />
                          </div>
                          {emailError && <p className="field-err">{emailError}</p>}
                        </div>

                        <div className="field-group">
                          <label className="field-l">{t.account.f_phone}</label>
                          <div className="field-wrap field-wrap-phone">
                            <PhoneCodeSelect value={dialCode} onChange={(v) => { setDialCode(v); if (phoneError) setPhoneError(""); }} />
                            <input
                              className="field-i"
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel-national"
                              placeholder={dialCode === "+90" ? "5xx xxx xx xx" : "000 000 0000"}
                              value={phoneDisplay}
                              onChange={handlePhoneChange}
                            />
                          </div>
                          {phoneError && <p className="field-err">{phoneError}</p>}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                          <div className="field-group">
                            <label className="field-l">{t.account.f_password}</label>
                            <div className="field-wrap">
                              <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                              <input
                                className="field-i"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={pwd}
                                onChange={(e) => { setPwd(e.target.value); if (pwdError) setPwdError(""); }}
                              />
                            </div>
                          </div>
                          <div className="field-group">
                            <label className="field-l">{t.account.f_password_confirm}</label>
                            <div className="field-wrap">
                              <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="m10 16 2 2 4-4"/></svg>
                              <input
                                className="field-i"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={pwdConfirm}
                                onChange={(e) => { setPwdConfirm(e.target.value); if (pwdError) setPwdError(""); }}
                              />
                            </div>
                          </div>
                        </div>
                        {pwdError && <p className="field-err" style={{ marginTop: -8, marginBottom: 8 }}>{pwdError}</p>}

                        <div className="field-group">
                          <label className="field-l">{t.account.f_type}</label>
                          <div className="acc-types two">
                            {[
                              { id: "real", label: t.account.type_real, sub: t.account.type_real_d },
                              { id: "demo", label: t.account.type_demo, sub: t.account.type_demo_d },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                className={`acc-type ${type === opt.id ? "selected" : ""}`}
                                onClick={() => setType(opt.id)}
                              >
                                <div className="acc-type-name">{opt.label}</div>
                                <div className="acc-type-min">{opt.sub}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <label className="legal-consent-row">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => { setConsent(e.target.checked); if (consentError) setConsentError(""); }}
                          />
                          <span className="legal-consent">
                            <button type="button" className="legal-consent-link" onClick={() => setRoute && setRoute("terms")}>Kullanım Şartları</button>,{" "}
                            <button type="button" className="legal-consent-link" onClick={() => setRoute && setRoute("privacy")}>Gizlilik Politikası</button> ve{" "}
                            <button type="button" className="legal-consent-link" onClick={() => setRoute && setRoute("risk")}>Risk Açıklaması</button>{" "}
                            belgelerini okudum, kabul ediyorum.
                          </span>
                        </label>
                        {consentError && <p className="field-err" style={{ marginTop: 4 }}>{consentError}</p>}

                        <button className="btn btn-primary btn-lg" type="submit" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                          {t.account.submit} <span className="btn-arrow">→</span>
                        </button>
                        <div className="acc-form-foot">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                          <span>256-bit SSL Güvenli Giriş</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </form>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
}
