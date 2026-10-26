import { useState, useEffect, useCallback } from "react";
import { Nav, Footer } from "./components/Common.jsx";
import { PageHome, PageTrading, PageAccount } from "./components/Pages.jsx";
import { PageTerms, PagePrivacy, PageRisk } from "./components/LegalPages.jsx";
import { PagePanel } from "./components/Panel.jsx";
import { PageAdmin } from "./components/Admin.jsx";
import { VERTEX_I18N, detectLang } from "./i18n.js";
import { getCurrentSession, onAuthChange, signOut } from "./data/store.js";

const PALETTES = {
  silver: {
    "--brand-silver": "#bbc6cc",
    "--brand-silver-bright": "#e3e9ec",
    "--bg-base": "#07090f",
    "--bg-1": "#0b0f17",
    "--bg-2": "#111621",
  },
};

export default function App() {
  const [route, setRoute] = useState("home");
  const [lang, setLang] = useState(detectLang);
  const [session, setSessionState] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(PALETTES.silver).forEach(([k, v]) => root.style.setProperty(k, v));
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentSession().then((s) => {
      if (active) {
        setSessionState(s);
        setAuthReady(true);
      }
    });
    const unsub = onAuthChange((s) => {
      setSessionState(s);
      setAuthReady(true);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [route]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Guard role-restricted routes (wait until auth state resolved)
  useEffect(() => {
    if (!authReady) return;
    if (route === "panel" && (!session || session.role !== "customer")) {
      setRoute(session?.role === "admin" ? "admin" : "account");
    }
    if (route === "admin" && (!session || session.role !== "admin")) {
      setRoute(session?.role === "customer" ? "panel" : "account");
    }
  }, [route, session, authReady]);

  const handleLogout = useCallback(async () => {
    await signOut();
    setRoute("home");
  }, []);

  const tr = VERTEX_I18N[lang] || VERTEX_I18N.en;
  const variant = "";

  let page;
  switch (route) {
    case "trading":
      page = <PageTrading t={tr} setRoute={setRoute} />;
      break;
    case "account":
      page = <PageAccount t={tr} setRoute={setRoute} initialMode="register" />;
      break;
    case "login":
      page = <PageAccount t={tr} setRoute={setRoute} initialMode="login" />;
      break;
    case "panel":
      page = session && session.role === "customer"
        ? <PagePanel t={tr} lang={lang} session={session} setRoute={setRoute} onLogout={handleLogout} />
        : null;
      break;
    case "admin":
      page = session && session.role === "admin"
        ? <PageAdmin t={tr} lang={lang} session={session} setRoute={setRoute} onLogout={handleLogout} />
        : null;
      break;
    case "terms":
      page = <PageTerms t={tr} setRoute={setRoute} />;
      break;
    case "privacy":
      page = <PagePrivacy t={tr} setRoute={setRoute} />;
      break;
    case "risk":
      page = <PageRisk t={tr} setRoute={setRoute} />;
      break;
    default:
      page = <PageHome t={tr} setRoute={setRoute} variant={variant} />;
  }

  const isAuth = route === "account" || route === "login" || route === "panel" || route === "admin";
  return (
    <>
      {!isAuth && <Nav route={route} setRoute={setRoute} lang={lang} setLang={setLang} t={tr} session={session} />}
      <main key={route} data-screen-label={route}>
        {page}
      </main>
      {!isAuth && <Footer t={tr} setRoute={setRoute} />}
    </>
  );
}
