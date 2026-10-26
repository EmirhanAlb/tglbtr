import { useState, useEffect, useMemo, useRef } from "react";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { analyzeKyc } from "../lib/kyc-ai.js";
import {
  getUser,
  listTransactions,
  createTransaction,
  listTransfers,
  requestTransfer,
  cancelTransfer,
  listTickets,
  getTicket,
  createTicket,
  postMessage,
  updateTicket,
  canCustomerReply,
  listBankAccounts,
  listCryptoAccounts,
  userTotals,
  getProvisioningByUser,
  listProvisioning,
  requestAdditionalMt5,
  listUserMt5Accounts,
  activateProvisioning,
  getSettings,
  uploadReceipt,
  uploadKycImage,
  submitKyc,
  finalizeKyc,
  kycUrl,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../data/store.js";

const ICON = {
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
  ),
  deposit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v14"/><path d="m6 11 6 6 6-6"/><path d="M5 21h14"/></svg>
  ),
  withdraw: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21V7"/><path d="m6 13 6-6 6 6"/><path d="M5 3h14"/></svg>
  ),
  transfer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h15"/><path d="m15 3 4 4-4 4"/><path d="M20 17H5"/><path d="m9 21-4-4 4-4"/></svg>
  ),
  swap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 3 4 4-4 4"/><path d="M21 7H8a4 4 0 0 0-4 4"/><path d="m7 21-4-4 4-4"/><path d="M3 17h13a4 4 0 0 0 4-4"/></svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 12a9.5 9.5 0 1 1-19 0 9.5 9.5 0 0 1 19 0Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
  ),
  kyc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2.2"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0"/><path d="M15 9h4"/><path d="M15 13h4"/></svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  ),
  scan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
  ),
  mt5: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 8h2l2 4 2-4h2v8"/><path d="M7 20h10"/></svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
  ),
  notifUp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
  ),
  notifDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  ),
};

const FIELD_ICO = {
  dollar: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ),
  note: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
  ),
  hash: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/></svg>
  ),
  wallet: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2"/><path d="M3 10h18"/></svg>
  ),
  network: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>
  ),
  subject: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/></svg>
  ),
  tag: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.4"/></svg>
  ),
  key: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
  ),
  lock: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
  ),
  server: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/><path d="M7 7h.01"/><path d="M7 17h.01"/></svg>
  ),
  eye: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  bank: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="m12 3 10 5H2l10-5Z"/><path d="M5 10v8"/><path d="M9 10v8"/><path d="M15 10v8"/><path d="M19 10v8"/></svg>
  ),
  user: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
  ),
  coin: (
    <svg className="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14 9.5C13 8.5 11 8.5 10 9.5s-1 2.5 0 3 3 .5 4 1.5-1 2-2 2-2-.5-2.5-1.5"/><path d="M12 7v2"/><path d="M12 15v2"/></svg>
  ),
};

export { FIELD_ICO };

function fmtMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

function fmtDate(iso, lang) {
  try {
    return new Date(iso).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch (e) {
    return "—";
  }
}

function fmtDateTime(iso, lang) {
  try {
    return new Date(iso).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "—";
  }
}

// Reusable, on-brand confirmation modal — replaces the native window.confirm().
// Controlled: render with `open` and supply onConfirm / onClose.
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "İptal",
  tone = "primary", // "primary" | "danger"
  busy = false,
  icon,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
      if (e.key === "Enter" && !busy) onConfirm?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose, onConfirm]);

  if (!open) return null;
  const danger = tone === "danger";
  return (
    <div className="panel-confirm-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="panel-confirm-dialog confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className={`confirm-modal-ico ${danger ? "danger" : "primary"}`}>
          {icon || (danger ? ICON.alert : ICON.check)}
        </div>
        <div className="panel-confirm-dialog-title">{title}</div>
        {body && <p className="panel-confirm-dialog-body">{body}</p>}
        <div className="panel-confirm-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PagePanel({ t, lang, session, setRoute, onLogout }) {
  const [view, setView] = useState("overview");
  const { data: user, loading } = useAsyncData(
    () => getUser(session.userId),
    [session.userId]
  );

  useEffect(() => {
    if (!loading && user === null) onLogout();
  }, [loading, user, onLogout]);

  if (loading) {
    return (
      <div className="panel-shell">
        <main className="panel-main">
          <div className="panel-empty">— …—</div>
        </main>
      </div>
    );
  }
  if (!user) return null;

  const nav = [
    { id: "overview", label: t.panel.nav_overview, icon: ICON.overview },
    { id: "mt5", label: t.panel.nav_mt5, icon: ICON.mt5 },
    { id: "deposit", label: t.panel.nav_deposit, icon: ICON.deposit },
    { id: "withdraw", label: t.panel.nav_withdraw, icon: ICON.withdraw },
    { id: "transfer", label: t.panel.nav_transfer, icon: ICON.transfer },
    { id: "kyc", label: t.panel.nav_kyc, icon: ICON.kyc },
    { id: "support", label: t.panel.nav_support, icon: ICON.support },
    { id: "account", label: t.panel.nav_account, icon: ICON.account },
  ];

  return (
    <div className="panel-shell">
      <aside className="panel-side">
        <button
          type="button"
          className="panel-side-brand"
          onClick={() => setRoute("home")}
          aria-label={t.panel.back_to_site}
        >
          <img src="/assets/logo.png" alt="Lmax Capital" />
          <span className="panel-side-brand-tag">Client</span>
        </button>
        <nav className="panel-side-nav">
          {nav.map((it) => (
            <button
              key={it.id}
              type="button"
              className={`panel-side-link ${view === it.id ? "active" : ""}`}
              onClick={() => setView(it.id)}
            >
              {it.icon}
              <span>{it.label}</span>
            </button>
          ))}
        </nav>
        <div className="panel-side-foot">
          <div className="panel-side-user">
            <div className="panel-side-avatar">{initials(user.name)}</div>
            <div className="panel-side-user-meta">
              <div className="panel-side-user-name">{user.name}</div>
              <div className="panel-side-user-email">{user.email}</div>
            </div>
          </div>
          <button type="button" className="panel-side-link" onClick={onLogout}>
            {ICON.logout}
            <span>{t.panel.logout}</span>
          </button>
        </div>
      </aside>
      <main className="panel-main">
        {view === "overview" && <PanelOverview t={t} lang={lang} user={user} setView={setView} />}
        {view === "mt5" && <PanelMT5 t={t} lang={lang} user={user} setView={setView} />}
        {view === "deposit" && <PanelDeposit t={t} lang={lang} user={user} />}
        {view === "withdraw" && <PanelWithdraw t={t} lang={lang} user={user} />}
        {view === "transfer" && <PanelTransfer t={t} lang={lang} user={user} />}
        {view === "kyc" && <PanelKyc t={t} lang={lang} user={user} />}
        {view === "support" && <PanelSupport t={t} lang={lang} user={user} />}
        {view === "account" && <PanelAccount t={t} lang={lang} user={user} />}
      </main>
    </div>
  );
}

function fmtNotifAmount(n) {
  const v = fmtMoney(n.amount || 0);
  return n.currency && n.currency !== "USD" ? `${v} ${n.currency}` : `$${v}`;
}

function PanelNotifications({ t, lang, user }) {
  const { data: items, refresh } = useAsyncData(
    () => listNotifications(user.id, { limit: 12 }),
    [user.id],
    []
  );
  const [busy, setBusy] = useState(false);

  const list = items || [];
  const unread = list.filter((n) => !n.read).length;

  if (list.length === 0) return null;

  const markAll = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead(user.id);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (id) => {
    await deleteNotification(id);
    refresh();
  };

  const TRANSFER_TITLES = {
    transfer_request: t.panel_notifications.transfer_request_title,
    transfer_completed: t.panel_notifications.transfer_completed_title,
    transfer_rejected: t.panel_notifications.transfer_rejected_title,
    kyc_submitted: t.panel_notifications.kyc_submitted_title,
    kyc_verified: t.panel_notifications.kyc_verified_title,
  };
  const TRANSFER_MSGS = {
    transfer_request: t.panel_notifications.transfer_request_msg,
    transfer_completed: t.panel_notifications.transfer_completed_msg,
    transfer_rejected: t.panel_notifications.transfer_rejected_msg,
    kyc_submitted: t.panel_notifications.kyc_submitted_msg,
    kyc_verified: t.panel_notifications.kyc_verified_msg,
  };

  const titleFor = (n) =>
    (n.category && TRANSFER_TITLES[n.category]) ||
    (n.kind === "credit" ? t.panel_notifications.credit_title
    : n.kind === "debit" ? t.panel_notifications.debit_title
    : t.panel_notifications.info_title);

  const msgFor = (n) => {
    const amount = fmtNotifAmount(n);
    if (n.category && TRANSFER_MSGS[n.category]) {
      return (n.body ? n.body + " · " : "") + TRANSFER_MSGS[n.category].replace("{amount}", amount);
    }
    if (n.body) return n.body;
    const tpl = n.kind === "debit" ? t.panel_notifications.debit_msg : t.panel_notifications.credit_msg;
    return tpl.replace("{amount}", amount);
  };

  const catLabel = (n) => {
    const map = {
      deposit: t.panel_notifications.cat_deposit,
      bonus: t.panel_notifications.cat_bonus,
      adjustment: t.panel_notifications.cat_adjustment,
      correction: t.panel_notifications.cat_correction,
      transfer_request: t.panel_notifications.cat_transfer,
      transfer_completed: t.panel_notifications.cat_transfer,
      transfer_rejected: t.panel_notifications.cat_transfer,
      kyc_submitted: t.panel_notifications.cat_kyc,
      kyc_verified: t.panel_notifications.cat_kyc,
    };
    return n.category ? map[n.category] || n.category : null;
  };

  return (
    <div className="panel-notifs">
      <div className="panel-notifs-head">
        <div className="panel-notifs-title">
          <span className="panel-notifs-bell">
            {ICON.bell}
            {unread > 0 && <span className="panel-notifs-count">{unread}</span>}
          </span>
          {t.panel_notifications.title}
        </div>
        {unread > 0 && (
          <button type="button" className="panel-notifs-markall" onClick={markAll} disabled={busy}>
            {t.panel_notifications.mark_all}
          </button>
        )}
      </div>

      <ul className="panel-notifs-list">
        {list.map((n) => (
          <li key={n.id} className={`panel-notif ${n.read ? "" : "unread"} ${n.kind}`}>
            <span className={`panel-notif-ico ${n.kind}`}>
              {n.kind === "debit" ? ICON.notifDown : ICON.notifUp}
            </span>
            <div className="panel-notif-body">
              <div className="panel-notif-top">
                <span className="panel-notif-title">{titleFor(n)}</span>
                {n.amount != null && (
                  <span className={`panel-notif-amount ${n.kind === "debit" ? "loss" : "gain"}`}>
                    {n.kind === "debit" ? "−" : "+"}{fmtNotifAmount(n)}
                  </span>
                )}
              </div>
              <div className="panel-notif-msg">{msgFor(n)}</div>
              <div className="panel-notif-meta">
                {catLabel(n) && <span className="panel-notif-cat">{catLabel(n)}</span>}
                <span className="panel-notif-date">{fmtDateTime(n.createdAt, lang)}</span>
                {!n.read && <span className="panel-notif-new">{t.panel_notifications.new}</span>}
              </div>
            </div>
            <button
              type="button"
              className="panel-notif-dismiss"
              onClick={() => dismiss(n.id)}
              aria-label={t.panel_notifications.dismiss}
              title={t.panel_notifications.dismiss}
            >
              {ICON.close}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanelOverview({ t, lang, user, setView }) {
  const { data } = useAsyncData(
    async () => {
      const [totals, allTx, tickets] = await Promise.all([
        userTotals(user.id),
        listTransactions(user.id),
        listTickets(user.id),
      ]);
      return { totals, allTx, tickets };
    },
    [user.id],
    { totals: { deposited: 0, withdrawn: 0, balance: 0 }, allTx: [], tickets: [] }
  );
  const totals = data.totals;
  const allTx = data.allTx;
  const txs = allTx.slice(0, 5);
  const tickets = data.tickets;
  const openTickets = tickets.filter((tk) => tk.status !== "closed").length;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PanelNotifications t={t} lang={lang} user={user} />

      <div className="panel-welcome">
        <div className="panel-welcome-grid">
          <div>
            <h1 className="panel-welcome-title">
              {firstName}, <em>{t.panel_overview.title.toLowerCase()}</em>
            </h1>
            <p className="panel-welcome-sub">{t.panel_overview.sub}</p>
          </div>
          <div className="panel-welcome-aside">
            <div className="panel-welcome-balance-l">{t.panel_overview.balance}</div>
            <div className="panel-welcome-balance">
              <span className="currency">$</span>{fmtMoney(totals.balance)}
            </div>
            <div className="panel-welcome-mini">
              <div>
                <div className="v gain">+${fmtMoney(totals.deposited)}</div>
                <div className="l">{t.panel_overview.deposited}</div>
              </div>
              <div>
                <div className="v loss">−${fmtMoney(totals.withdrawn)}</div>
                <div className="l">{t.panel_overview.withdrawn}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-grid cols-4">
        <div className="panel-card clickable" onClick={() => setView("mt5")}>
          <div className="panel-stat-label">{t.panel_overview.mt5_account}</div>
          <div className={`panel-stat-value small ${user.mt5Account ? "" : "warn"}`}>
            {user.mt5Account || t.panel_overview.mt5_pending}
          </div>
          <div className="panel-stat-sub">{user.mt5Account ? "MT5 · LIVE" : "MT5 · " + t.panel_overview.mt5_pending}</div>
        </div>
        <div className="panel-card clickable" onClick={() => setView("support")}>
          <div className="panel-stat-label">{t.panel_overview.open_tickets}</div>
          <div className="panel-stat-value small">{openTickets}</div>
          <div className="panel-stat-sub">{tickets.length} {t.panel_support.title.toLowerCase()}</div>
        </div>
        <div className="panel-card clickable" onClick={() => setView("deposit")}>
          <div className="panel-stat-label">{t.panel_overview.deposited}</div>
          <div className="panel-stat-value small gain">${fmtMoney(totals.deposited)}</div>
          <div className="panel-stat-sub">USD · Total</div>
        </div>
        <div className="panel-card clickable" onClick={() => setView("kyc")}>
          <div className="panel-stat-label">{t.panel_overview.kyc}</div>
          <div className={`panel-stat-value small ${user.kycStatus === "verified" ? "gain" : "warn"}`}>
            {user.kycStatus === "verified" ? t.panel_overview.kyc_verified
              : user.kycStatus === "reviewing" ? t.panel_overview.kyc_reviewing
              : t.panel_overview.kyc_pending}
          </div>
          <div className="panel-stat-sub">{user.kycStatus === "verified" ? "✓ Active" : user.kycStatus === "reviewing" ? "AI · Reviewing" : "Tap to verify"}</div>
        </div>
      </div>

      <div className="panel-section-head">
        <h2>{t.panel_overview.recent_tx}</h2>
        <span className="panel-section-meta">{txs.length} / {allTx.length}</span>
      </div>
      <div className="panel-table-wrap">
        {txs.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— No Activity —</div>
            <div>{t.panel_overview.empty_tx}</div>
          </div>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>{t.admin_transactions.col_date}</th>
                <th>{t.admin_transactions.col_type}</th>
                <th>{t.admin_transactions.col_method}</th>
                <th>{t.admin_transactions.col_amount}</th>
                <th>{t.admin_transactions.col_status}</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr key={tx.id}>
                  <td>{fmtDate(tx.createdAt, lang)}</td>
                  <td>{tx.type === "deposit" ? t.admin_transactions.type_deposit : t.admin_transactions.type_withdrawal}</td>
                  <td className="mono" style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: "0.06em" }}>{tx.method}</td>
                  <td className={`mono ${tx.type === "deposit" ? "gain" : "loss"}`}>
                    {tx.type === "deposit" ? "+" : "−"}${fmtMoney(tx.amount)}
                  </td>
                  <td><span className={`panel-badge ${tx.status}`}>{t.admin_transactions[`status_${tx.status}`]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

const DEPOSIT_PRESETS = [250, 500, 1000, 2500, 5000, 10000];

function PanelDeposit({ t, lang, user }) {
  const { data } = useAsyncData(
    async () => {
      const [settings, banks, cryptos] = await Promise.all([
        getSettings(),
        listBankAccounts(),
        listCryptoAccounts(),
      ]);
      return { settings, banks, cryptos };
    },
    [],
    { settings: { minDeposit: 0, depositReceiptRequired: false }, banks: [], cryptos: [] }
  );
  const minDeposit = Number(data.settings.minDeposit) || 0;
  const receiptRequired = !!data.settings.depositReceiptRequired;

  const [amount, setAmount] = useState("");
  const [tab, setTab] = useState("bank");
  const [selectedId, setSelectedId] = useState(null);
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [err, setErr] = useState("");

  const banks = data.banks;
  const cryptos = data.cryptos;
  const list = tab === "bank" ? banks : cryptos;

  const amountNum = parseFloat(amount) || 0;
  const amountAboveMin = minDeposit > 0 ? amountNum >= minDeposit : amountNum > 0;
  const amountOk = amountNum > 0 && amountAboveMin;
  const methodOk = !!selectedId;
  const selected = list.find((x) => x.id === selectedId) || null;
  const needsReceipt = receiptRequired && tab === "bank";
  const receiptOk = !needsReceipt || !!receipt;

  useEffect(() => {
    setSelectedId(null);
  }, [tab]);

  const handleCopy = (text, key) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch (e) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!methodOk || submitting) return;
    if (!amountOk) {
      if (minDeposit > 0 && amountNum > 0 && amountNum < minDeposit) {
        setErr(`${t.panel_deposit.err_min} $${fmtMoney(minDeposit)}`);
      }
      return;
    }
    if (!receiptOk) {
      setErr(t.panel_deposit.err_receipt);
      return;
    }
    setSubmitting(true);
    try {
      let receiptPath = null;
      if (receipt) {
        receiptPath = await uploadReceipt(user.id, receipt);
      }
      await createTransaction({
        userId: user.id,
        type: "deposit",
        method: tab,
        methodId: selectedId,
        amount: amountNum,
        note: reference,
        receiptPath,
      });
      const methodLabel = tab === "bank"
        ? `${selected.bankName} · ${selected.iban}`
        : `${selected.network} ${selected.token} · ${selected.address}`;
      await createTicket({
        userId: user.id,
        subject: `${t.panel_deposit.title} · $${fmtMoney(amountNum)}`,
        category: "deposit_notify",
        systemMessage: `${t.panel_deposit.title}: $${fmtMoney(amountNum)} · ${methodLabel}${reference ? " · " + reference : ""}${receipt ? " · " + t.panel_deposit.receipt + ": " + receipt.name : ""}`,
      });
      setAmount("");
      setReference("");
      setSelectedId(null);
      setReceipt(null);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e2) {
      setErr(e2.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.panel_deposit.title}</h1>
          <p className="panel-head-sub">{t.panel_deposit.sub}</p>
        </div>
      </div>

      {submitted && (
        <div className="panel-notice">
          {t.panel_deposit.success} {t.panel_deposit.auto_ticket}
        </div>
      )}
      {err && <div className="panel-notice error">{err}</div>}

      <div className="panel-steps">
        {/* Step 1 — Method */}
        <div className={`panel-step ${methodOk ? "done" : "active"}`}>
          <div className="panel-step-head">
            <div className="panel-step-num">{methodOk ? "✓" : "1"}</div>
            <div className="panel-step-title">{t.panel_deposit.choose_method || (lang === "tr" ? "Yöntem Seç" : "Choose Method")}</div>
            <div className="panel-step-meta">{tab === "bank" ? t.panel_deposit.tab_bank : t.panel_deposit.tab_crypto}</div>
          </div>
          <div className="panel-step-body">
            <div className="panel-tabs" style={{ marginBottom: 18 }}>
              <button type="button" className={`panel-tab ${tab === "bank" ? "active" : ""}`} onClick={() => setTab("bank")}>
                {t.panel_deposit.tab_bank}
              </button>
              <button type="button" className={`panel-tab ${tab === "crypto" ? "active" : ""}`} onClick={() => setTab("crypto")}>
                {t.panel_deposit.tab_crypto}
              </button>
            </div>

            {list.length === 0 ? (
              <div className="panel-empty" style={{ padding: 24 }}>
                <div className="panel-empty-eyebrow">— Unavailable —</div>
                <div>{t.panel_deposit.no_methods}</div>
              </div>
            ) : (
              <div className="panel-method-grid">
                {list.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className={`panel-method-pick ${selectedId === m.id ? "selected" : ""}`}
                    onClick={() => setSelectedId(m.id)}
                  >
                    <span className="panel-method-pick-name">
                      {tab === "bank" ? m.bankName : `${m.network} · ${m.token}`}
                    </span>
                    <span className="panel-method-pick-mark" aria-hidden="true">
                      {selectedId === m.id ? "✓" : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 2 — Amount */}
        <div className={`panel-step ${!methodOk ? "locked" : amountOk ? "done" : "active"}`}>
          <div className="panel-step-head">
            <div className="panel-step-num">{amountOk ? "✓" : "2"}</div>
            <div className="panel-step-title">{t.panel_deposit.amount}</div>
            <div className="panel-step-meta">USD</div>
          </div>
          <div className="panel-step-body">
            <div className="panel-amount-input-wrap">
              <span className="currency">$</span>
              <input
                className="panel-amount-input"
                type="number"
                inputMode="decimal"
                min="1"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!methodOk}
              />
              <span className="panel-amount-suffix">USD</span>
            </div>
            <div className="panel-amount-chips">
              {DEPOSIT_PRESETS.filter((v) => minDeposit === 0 || v >= minDeposit).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`panel-amount-chip ${amountNum === v ? "active" : ""}`}
                  disabled={!methodOk}
                  onClick={() => setAmount(String(v))}
                >
                  ${v.toLocaleString("en-US")}
                </button>
              ))}
            </div>
            {minDeposit > 0 && (
              <div className={`panel-min-hint ${amountNum > 0 && !amountAboveMin ? "warn" : ""}`}>
                {t.panel_deposit.min_hint} ${fmtMoney(minDeposit)}
              </div>
            )}
          </div>
        </div>

        {/* Step 3 — Confirm */}
        <form
          className={`panel-step ${!amountOk || !methodOk ? "locked" : "active"}`}
          onSubmit={handleSubmit}
        >
          <div className="panel-step-head">
            <div className="panel-step-num">3</div>
            <div className="panel-step-title">{t.panel_deposit.submit}</div>
            <div className="panel-step-meta">{t.panel_deposit.confirm_meta}</div>
          </div>
          <div className="panel-step-body">
            <div className="panel-confirm">
              <div className="panel-confirm-summary">
                <div className="panel-confirm-cell">
                  <div className="panel-confirm-cell-l">{t.panel_deposit.amount}</div>
                  <div className="panel-confirm-cell-v big">${fmtMoney(amountNum)}</div>
                </div>
                <div className="panel-confirm-cell">
                  <div className="panel-confirm-cell-l">{t.panel_deposit[tab === "bank" ? "tab_bank" : "tab_crypto"]}</div>
                  <div className="panel-confirm-cell-v">
                    {selected
                      ? (tab === "bank" ? selected.bankName : `${selected.network} · ${selected.token}`)
                      : "—"}
                  </div>
                </div>
              </div>
              {selected && (
                <div className="panel-deposit-account">
                  {tab === "bank" ? (
                    <>
                      <div className="panel-deposit-account-row">
                        <span className="panel-deposit-account-l">{t.panel_deposit.holder}</span>
                        <span className="panel-deposit-account-v">{selected.holder || "—"}</span>
                        {selected.holder && (
                          <button
                            type="button"
                            className="panel-row-action"
                            onClick={() => handleCopy(selected.holder, `${selected.id}-holder`)}
                          >
                            {copiedKey === `${selected.id}-holder` ? t.panel_deposit.copied : t.panel_deposit.copy}
                          </button>
                        )}
                      </div>
                      <div className="panel-deposit-account-row">
                        <span className="panel-deposit-account-l">IBAN</span>
                        <span className="panel-deposit-account-v mono">{selected.iban}</span>
                        <button
                          type="button"
                          className="panel-row-action"
                          onClick={() => handleCopy(selected.iban, `${selected.id}-iban`)}
                        >
                          {copiedKey === `${selected.id}-iban` ? t.panel_deposit.copied : t.panel_deposit.copy}
                        </button>
                      </div>
                      {selected.note && (
                        <div className="panel-deposit-account-row">
                          <span className="panel-deposit-account-l">{t.panel_deposit.note}</span>
                          <span className="panel-deposit-account-v">{selected.note}</span>
                          <button
                            type="button"
                            className="panel-row-action"
                            onClick={() => handleCopy(selected.note, `${selected.id}-note`)}
                          >
                            {copiedKey === `${selected.id}-note` ? t.panel_deposit.copied : t.panel_deposit.copy}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="panel-deposit-account-row">
                        <span className="panel-deposit-account-l">{t.panel_deposit.address}</span>
                        <span className="panel-deposit-account-v mono">{selected.address}</span>
                        <button
                          type="button"
                          className="panel-row-action"
                          onClick={() => handleCopy(selected.address, `${selected.id}-address`)}
                        >
                          {copiedKey === `${selected.id}-address` ? t.panel_deposit.copied : t.panel_deposit.copy}
                        </button>
                      </div>
                      {selected.note && (
                        <div className="panel-deposit-account-row">
                          <span className="panel-deposit-account-l">{t.panel_deposit.note}</span>
                          <span className="panel-deposit-account-v">{selected.note}</span>
                          <button
                            type="button"
                            className="panel-row-action"
                            onClick={() => handleCopy(selected.note, `${selected.id}-note`)}
                          >
                            {copiedKey === `${selected.id}-note` ? t.panel_deposit.copied : t.panel_deposit.copy}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              <div className="panel-step-reference">
                <div className="field-group">
                  <label className="field-l">{t.panel_deposit.reference}</label>
                  <div className="field-wrap">
                    {FIELD_ICO.note}
                    <input
                      className="field-i"
                      type="text"
                      placeholder={lang === "tr" ? "İsteğe bağlı — açıklama veya işlem referansı" : "Optional — note or transaction reference"}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </div>
                {tab === "bank" && (
                  <div className="field-group" style={{ marginTop: 12 }}>
                    <label className="field-l">
                      {t.panel_deposit.receipt}
                      {needsReceipt && <span style={{ color: "var(--warn)" }}> *</span>}
                      {!receiptRequired && (
                        <span className="panel-side-user-email" style={{ marginLeft: 8 }}>
                          ({t.panel_deposit.receipt_optional})
                        </span>
                      )}
                    </label>
                    <label className="panel-receipt-drop">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                        style={{ display: "none" }}
                      />
                      <span className="panel-receipt-drop-label">
                        {receipt ? receipt.name : t.panel_deposit.receipt_pick}
                      </span>
                      {receipt && (
                        <button
                          type="button"
                          className="panel-row-action"
                          onClick={(e) => {
                            e.preventDefault();
                            setReceipt(null);
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </label>
                  </div>
                )}
              </div>
              <button
                className="btn btn-primary btn-lg"
                type="submit"
                disabled={!amountOk || !methodOk || submitting}
              >
                {t.panel_deposit.submit} <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

function PanelWithdraw({ t, lang, user }) {
  const { data: totals } = useAsyncData(
    () => userTotals(user.id),
    [user.id],
    { deposited: 0, withdrawn: 0, balance: 0 }
  );
  const [method, setMethod] = useState("bank");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [network, setNetwork] = useState("TRC20");
  const [err, setErr] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (submitting) return;
    const n = parseFloat(amount);
    if (!n || n <= 0) {
      setErr(t.panel_withdraw.err_amount);
      return;
    }
    if (n > totals.balance) {
      setErr(t.panel_withdraw.err_insufficient);
      return;
    }
    if (!destination) return;

    setSubmitting(true);
    try {
      await createTransaction({
        userId: user.id,
        type: "withdrawal",
        method,
        amount: n,
        destination,
        network: method === "crypto" ? network : null,
      });
      const dest = method === "crypto" ? `${network} · ${destination}` : destination;
      await createTicket({
        userId: user.id,
        subject: `${t.panel_withdraw.title} · $${fmtMoney(n)}`,
        category: "withdrawal_request",
        systemMessage: `${t.panel_withdraw.title}: $${fmtMoney(n)} · ${dest}`,
      });
      setAmount("");
      setDestination("");
      setSubmitted(true);
    } catch (e2) {
      setErr(e2.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.panel_withdraw.title}</h1>
          <p className="panel-head-sub">{t.panel_withdraw.sub}</p>
        </div>
        <div className="panel-head-actions">
          <div className="panel-inline-stat">
            <div className="panel-stat-label">{t.panel_withdraw.available}</div>
            <div className="panel-stat-value tiny"><span className="currency">$</span>{fmtMoney(totals.balance)}</div>
          </div>
        </div>
      </div>

      {submitted && <div className="panel-notice">{t.panel_withdraw.success}</div>}
      {err && <div className="panel-notice error">{err}</div>}

      <form className="panel-form-card panel-form" onSubmit={handleSubmit}>
        <div className="panel-card-head">
          <div className="panel-card-title">{t.panel_withdraw.submit}</div>
          <span className="panel-section-meta">USD</span>
        </div>
        <div className="field-group">
          <label className="field-l">{t.panel_withdraw.method}</label>
          <div className="panel-tabs" style={{ marginBottom: 0 }}>
            <button type="button" className={`panel-tab ${method === "bank" ? "active" : ""}`} onClick={() => setMethod("bank")}>
              {t.panel_withdraw.method_bank}
            </button>
            <button type="button" className={`panel-tab ${method === "crypto" ? "active" : ""}`} onClick={() => setMethod("crypto")}>
              {t.panel_withdraw.method_crypto}
            </button>
          </div>
        </div>

        <div className="panel-form-row">
          <div className="field-group">
            <label className="field-l">{t.panel_withdraw.amount}</label>
            <div className="field-wrap">
              {FIELD_ICO.dollar}
              <input
                className="field-i"
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          {method === "crypto" && (
            <div className="field-group">
              <label className="field-l">{t.panel_withdraw.network}</label>
              <div className="field-wrap">
                {FIELD_ICO.network}
                <select className="field-i" value={network} onChange={(e) => setNetwork(e.target.value)}>
                  <option value="TRC20">TRC20</option>
                  <option value="ERC20">ERC20</option>
                  <option value="BEP20">BEP20</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="field-group">
          <label className="field-l">{method === "bank" ? t.panel_withdraw.iban : t.panel_withdraw.address}</label>
          <div className="field-wrap">
            {method === "bank" ? FIELD_ICO.hash : FIELD_ICO.wallet}
            <input
              className="field-i"
              type="text"
              placeholder={method === "bank" ? "TR00 0000 0000 0000 0000 0000 00" : "0x… / T…"}
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
        </div>

        <div className="panel-form-actions">
          <button className="btn btn-primary btn-lg" type="submit">
            {t.panel_withdraw.submit} <span className="btn-arrow">→</span>
          </button>
        </div>
      </form>
    </>
  );
}

const TRANSFER_PRESETS = [100, 250, 500, 1000, 2500];

function PanelTransfer({ t, lang, user }) {
  const { data: totals, refresh: refreshTotals } = useAsyncData(
    () => userTotals(user.id),
    [user.id],
    { deposited: 0, withdrawn: 0, transferred: 0, balance: 0 }
  );
  const { data: transfers, refresh: refreshTransfers } = useAsyncData(
    () => listTransfers(user.id),
    [user.id],
    []
  );
  const { data: accounts } = useAsyncData(
    () => listUserMt5Accounts(user.id),
    [user.id],
    []
  );

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dest, setDest] = useState("");
  const [direction, setDirection] = useState("out"); // "out": Lmax->MT5, "in": MT5->Lmax
  const [err, setErr] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const available = Number(totals.balance) || 0;
  const mt5List = accounts || [];
  const hasMt5 = mt5List.length > 0;
  const amountNum = parseFloat(amount) || 0;
  const list = transfers || [];
  const hasPending = list.some((tr) => tr.status === "pending");
  const isOut = direction === "out";
  // Outbound is capped by the Lmax wallet balance; inbound (MT5 -> Lmax) is
  // verified by an admin, so it isn't capped on the client.
  const overBalance = isOut && amountNum > available;

  // Default the MT5 account to the first one once accounts load (or if the
  // selected one disappears).
  useEffect(() => {
    if (mt5List.length === 0) return;
    if (!dest || !mt5List.some((a) => a.login === dest)) {
      setDest(mt5List[0].login);
    }
  }, [mt5List, dest]);

  const refreshAll = () => { refreshTotals(); refreshTransfers(); };

  const toggleDirection = () => {
    setDirection((d) => (d === "out" ? "in" : "out"));
    setErr("");
    setSubmitted(false);
    setAmount("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (submitting) return;
    if (hasPending) { setErr(t.panel_transfer.err_pending); return; }
    if (!dest) return;
    if (!amountNum || amountNum <= 0) { setErr(t.panel_transfer.err_amount); return; }
    if (overBalance) { setErr(t.panel_transfer.err_insufficient); return; }
    setSubmitting(true);
    try {
      await requestTransfer({ amount: amountNum, mt5Account: dest, direction, note: note || null, currency: "USD" });
      setAmount("");
      setNote("");
      setSubmitted(true);
      refreshAll();
    } catch (e2) {
      const msg = String(e2.message || "");
      if (msg.includes("pending transfer")) setErr(t.panel_transfer.err_pending);
      else if (msg.includes("insufficient")) setErr(t.panel_transfer.err_insufficient);
      else setErr(msg || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const onCancelConfirm = async () => {
    if (!cancelId) return;
    setCancelBusy(true);
    try {
      await cancelTransfer(cancelId);
      setCancelId(null);
      refreshAll();
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setCancelBusy(false);
    }
  };

  // One node of the flow card. `role` ("source" | "dest") drives the label so the
  // same Lmax / MT5 node renders correctly whichever way the transfer flows.
  const renderNode = (kind, role) => {
    const isLmax = kind === "lmax";
    return (
      <div className={`transfer-node ${isLmax ? "" : "accent"}`}>
        <span className={`transfer-node-logo ${isLmax ? "lmax" : "mt5"}`}>
          <img
            src={isLmax ? "/assets/icon.png" : "/assets/otomasyon/MetaTrader_5_Clear_240px.png"}
            alt={isLmax ? "Lmax Capital" : "MetaTrader 5"}
          />
        </span>
        <div className="transfer-node-meta">
          <div className="transfer-node-label">{role === "source" ? t.panel_transfer.source_label : t.panel_transfer.dest_label}</div>
          <div className={`transfer-node-value ${isLmax ? "" : "mono"}`}>
            {isLmax ? <><span className="currency">$</span>{fmtMoney(available)}</> : (dest || "—")}
          </div>
          <div className="transfer-node-sub">
            {isLmax ? t.panel_transfer.lmax_name : t.panel_transfer.mt5_name}
            {!isLmax && mt5List.length > 1 ? ` · ${mt5List.length} ${t.panel_transfer.accounts_word}` : ""}
          </div>
        </div>
      </div>
    );
  };

  const head = (
    <div className="panel-head">
      <div>
        <h1 className="panel-head-title">{t.panel_transfer.title}</h1>
        <p className="panel-head-sub">{t.panel_transfer.sub}</p>
      </div>
      <div className="panel-head-actions">
        <div className="panel-inline-stat">
          <div className="panel-stat-label">{t.panel_transfer.available}</div>
          <div className="panel-stat-value tiny"><span className="currency">$</span>{fmtMoney(available)}</div>
        </div>
      </div>
    </div>
  );

  if (!hasMt5) {
    return (
      <>
        {head}
        <div className="panel-card">
          <div className="panel-mt5-state">
            <div className="panel-mt5-state-eyebrow warn">MT5</div>
            <div className="panel-mt5-state-title">{t.panel_transfer.no_mt5_title}</div>
            <p className="panel-mt5-state-sub">{t.panel_transfer.no_mt5_body}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {head}

      {submitted && <div className="panel-notice">{t.panel_transfer.success}</div>}
      {err && <div className="panel-notice error">{err}</div>}
      {hasPending && !err && (
        <div className="panel-notice info">
          <span className="panel-notice-strong">{t.panel_transfer.pending_title}</span> {t.panel_transfer.pending_notice}
        </div>
      )}

      <div className="transfer-flow">
        {isOut ? renderNode("lmax", "source") : renderNode("mt5", "source")}
        <button
          type="button"
          className="transfer-swap"
          onClick={toggleDirection}
          title={t.panel_transfer.swap}
          aria-label={t.panel_transfer.swap}
        >
          <span className="transfer-arrow-line" />
          <span className="transfer-arrow-dot" />
          <span className="transfer-swap-glyph">{ICON.swap}</span>
        </button>
        {isOut ? renderNode("mt5", "dest") : renderNode("lmax", "dest")}
      </div>

      <div className="transfer-dir-cap">
        <span className="transfer-dir-pill">{isOut ? t.panel_transfer.dir_out : t.panel_transfer.dir_in}</span>
        <span className="transfer-dir-hint">{t.panel_transfer.swap_hint}</span>
      </div>

      <div className="panel-notice info transfer-eta">
        <span className="transfer-eta-ico">{ICON.clock}</span>
        <div>
          <div className="transfer-eta-title">{t.panel_transfer.info_title}</div>
          <div className="transfer-eta-body">{t.panel_transfer.info_body}</div>
        </div>
        <span className="transfer-eta-badge">{t.panel_transfer.eta}</span>
      </div>

      <form className="panel-form-card panel-form" onSubmit={handleSubmit}>
        <div className="panel-card-head">
          <div className="panel-card-title">{t.panel_transfer.amount}</div>
          <span className="panel-section-meta">USD</span>
        </div>

        <div className="field-group">
          <label className="field-l">{isOut ? t.panel_transfer.dest : t.panel_transfer.src}</label>
          {mt5List.length > 1 ? (
            <div className="field-wrap">
              {FIELD_ICO.server}
              <select className="field-i" value={dest} onChange={(e) => setDest(e.target.value)}>
                {mt5List.map((a) => (
                  <option key={a.login} value={a.login}>
                    {a.login}{a.server ? ` · ${a.server}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="transfer-dest-single">
              <span className="transfer-dest-ico">{ICON.mt5}</span>
              <span className="transfer-dest-login mono">{dest || "—"}</span>
              {mt5List[0]?.server && <span className="transfer-dest-server">{mt5List[0].server}</span>}
            </div>
          )}
          <div className="panel-min-hint">{isOut ? t.panel_transfer.dest_hint : t.panel_transfer.src_hint}</div>
        </div>

        <div className="field-group">
          <label className="field-l">{t.panel_transfer.amount}</label>
          <div className="field-wrap field-wrap-max">
            {FIELD_ICO.dollar}
            <input
              className="field-i"
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {isOut && (
              <button
                type="button"
                className="field-max"
                onClick={() => setAmount(available > 0 ? String(available) : "")}
              >
                {t.panel_transfer.max}
              </button>
            )}
          </div>
          <div className="panel-amount-chips">
            {TRANSFER_PRESETS.filter((v) => !isOut || v <= available).map((v) => (
              <button
                key={v}
                type="button"
                className={`panel-amount-chip ${amountNum === v ? "active" : ""}`}
                onClick={() => setAmount(String(v))}
              >
                ${v.toLocaleString("en-US")}
              </button>
            ))}
          </div>
          <div className={`panel-min-hint ${overBalance ? "warn" : ""}`}>
            {overBalance ? t.panel_transfer.err_insufficient : (isOut ? t.panel_transfer.amount_hint : t.panel_transfer.amount_hint_in)}
          </div>
        </div>

        <div className="field-group">
          <label className="field-l">{t.panel_transfer.note}</label>
          <div className="field-wrap">
            {FIELD_ICO.note}
            <input
              className="field-i"
              type="text"
              maxLength={140}
              placeholder={t.panel_transfer.note_ph}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="panel-form-actions">
          <button className="btn btn-primary btn-lg" type="submit" disabled={submitting || hasPending || amountNum <= 0 || overBalance}>
            {t.panel_transfer.submit} <span className="btn-arrow">→</span>
          </button>
        </div>
      </form>

      <div className="panel-section-head">
        <h2>{t.panel_transfer.recent}</h2>
        <span className="panel-section-meta">{list.length}</span>
      </div>
      <div className="panel-table-wrap">
        {list.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— No Transfers —</div>
            <div>{t.panel_transfer.empty}</div>
          </div>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>{t.panel_transfer.col_date}</th>
                <th>{t.panel_transfer.col_route}</th>
                <th>{t.panel_transfer.col_amount}</th>
                <th>{t.panel_transfer.col_status}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((tr) => (
                <tr key={tr.id}>
                  <td>{fmtDateTime(tr.createdAt, lang)}</td>
                  <td>
                    <span className="transfer-row-dir">
                      <span className={`transfer-dir-tag ${tr.direction}`}>{tr.direction === "out" ? t.panel_transfer.dir_out : t.panel_transfer.dir_in}</span>
                      <span className="mono transfer-row-acct">{tr.mt5Account || "—"}</span>
                    </span>
                  </td>
                  <td className={`mono ${tr.direction === "out" ? "loss" : "gain"}`}>{tr.direction === "out" ? "−" : "+"}${fmtMoney(tr.amount)}</td>
                  <td><span className={`panel-badge ${tr.status}`}>{t.panel_transfer[`status_${tr.status}`]}</span></td>
                  <td style={{ textAlign: "right" }}>
                    {tr.status === "pending" && (
                      <button type="button" className="panel-row-action danger" onClick={() => setCancelId(tr.id)}>
                        {t.panel_transfer.cancel}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!cancelId}
        tone="danger"
        title={t.panel_transfer.cancel_title}
        body={t.panel_transfer.cancel_confirm}
        confirmLabel={t.panel_transfer.cancel}
        cancelLabel={t.panel_transfer.cancel_keep}
        busy={cancelBusy}
        onConfirm={onCancelConfirm}
        onClose={() => setCancelId(null)}
      />
    </>
  );
}

const KYC_REVIEW_SECONDS = 3 * 60;

function KycUpload({ t, side, file, preview, onPick }) {
  const inputRef = useRef(null);
  const label = side === "front" ? t.panel_kyc.front : t.panel_kyc.back;
  return (
    <div className={`kyc-upload ${file ? "has" : ""}`} onClick={() => inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0] || null)} />
      {preview ? (
        <>
          <img src={preview} alt={label} className="kyc-upload-img" />
          <span className="kyc-upload-badge">{label}</span>
          <span className="kyc-upload-change">{t.panel_kyc.change}</span>
        </>
      ) : (
        <div className="kyc-upload-empty">
          <span className="kyc-upload-ico">{ICON.scan}</span>
          <div className="kyc-upload-label">{label}</div>
          <div className="kyc-upload-hint">{t.panel_kyc.pick_hint}</div>
        </div>
      )}
    </div>
  );
}

function PanelKyc({ t, lang, user }) {
  const { data: me, refresh } = useAsyncData(() => getUser(user.id), [user.id], user);
  const status = me?.kycStatus || "pending";

  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [frontUrl, setFrontUrl] = useState(null);
  const [backUrl, setBackUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aiResult, setAiResult] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!front) { setFrontUrl(null); return; }
    const u = URL.createObjectURL(front);
    setFrontUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [front]);
  useEffect(() => {
    if (!back) { setBackUrl(null); return; }
    const u = URL.createObjectURL(back);
    setBackUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [back]);

  // While reviewing: silently auto-finalize once the review window elapses (no
  // countdown shown to the user). Self-heals on reload, too.
  useEffect(() => {
    if (status !== "reviewing" || !me?.kycSubmittedAt) return;
    const started = new Date(me.kycSubmittedAt).getTime();
    let stopped = false;
    const tick = async () => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      if (elapsed >= KYC_REVIEW_SECONDS && !stopped) {
        stopped = true;
        const s = await finalizeKyc();
        if (s === "verified") refresh();
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { stopped = true; clearInterval(id); };
  }, [status, me?.kycSubmittedAt]);

  const runVerify = async () => {
    setErr("");
    setAiResult(null);
    if (!front || !back || analyzing) return;
    setAnalyzing(true);
    setProgress(0);
    try {
      const result = await analyzeKyc(front, back, setProgress);
      setAiResult(result);
      if (!result.ok) {
        setErr(t.panel_kyc[`err_${result.reason}`] || t.panel_kyc.err_generic);
        return;
      }
      const [fp, bp] = await Promise.all([
        uploadKycImage(user.id, front, "front"),
        uploadKycImage(user.id, back, "back"),
      ]);
      await submitKyc({ frontPath: fp, backPath: bp, score: result.score });
      refresh();
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setAnalyzing(false);
    }
  };

  const head = (
    <div className="panel-head">
      <div>
        <h1 className="panel-head-title">{t.panel_kyc.title}</h1>
        <p className="panel-head-sub">{t.panel_kyc.sub}</p>
      </div>
    </div>
  );

  if (status === "verified") {
    return (
      <>
        {head}
        <div className="panel-card kyc-result">
          <span className="kyc-result-ico ok">{ICON.shield}</span>
          <div className="kyc-result-title">{t.panel_kyc.verified_title}</div>
          <p className="kyc-result-sub">{t.panel_kyc.verified_sub}</p>
        </div>
      </>
    );
  }

  if (status === "reviewing") {
    return (
      <>
        {head}
        <div className="panel-card kyc-review">
          <span className="kyc-result-ico scan">{ICON.scan}</span>
          <div className="kyc-result-title">{t.panel_kyc.review_title}</div>
          <p className="kyc-result-sub">{t.panel_kyc.review_sub}</p>
          <div className="kyc-progress indet"><div className="kyc-progress-bar" /></div>
          <div className="kyc-result-note">{t.panel_kyc.review_note}</div>
        </div>
      </>
    );
  }

  // pending / rejected → capture + AI verify
  return (
    <>
      {head}

      {err && <div className="panel-notice error">{err}</div>}
      {aiResult && !aiResult.ok && (
        <div className="kyc-ai-readout fail">
          <span className={`kyc-ai-chip ${aiResult.front?.ok ? "ok" : "bad"}`}>{t.panel_kyc.chip_front}</span>
          <span className={`kyc-ai-chip ${aiResult.back?.ok ? "ok" : "bad"}`}>{t.panel_kyc.chip_back}</span>
          <span className="kyc-ai-chip score">{t.panel_kyc.ai_score}: {aiResult.score}%</span>
        </div>
      )}

      <div className="panel-notice info kyc-info">
        <span className="kyc-info-ico">{ICON.shield}</span>
        <div>
          <div className="kyc-info-title">{t.panel_kyc.ai_title}</div>
          <div className="kyc-info-body">{t.panel_kyc.ai_body}</div>
        </div>
      </div>

      <div className="kyc-grid">
        <KycUpload t={t} side="front" file={front} preview={frontUrl} onPick={setFront} />
        <KycUpload t={t} side="back" file={back} preview={backUrl} onPick={setBack} />
      </div>

      {analyzing ? (
        <div className="kyc-analyzing">
          <div className="kyc-analyzing-row">
            <span className="kyc-spinner" />
            <span>{t.panel_kyc.analyzing} {Math.round(progress * 100)}%</span>
          </div>
          <div className="kyc-progress"><div className="kyc-progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        </div>
      ) : (
        <div className="panel-form-actions" style={{ justifyContent: "flex-start", marginTop: 18 }}>
          <button type="button" className="btn btn-primary btn-lg" disabled={!front || !back} onClick={runVerify}>
            {ICON.shield} {t.panel_kyc.verify}
          </button>
        </div>
      )}
    </>
  );
}

function PanelSupport({ t, lang, user }) {
  const [activeId, setActiveId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const { data: tickets } = useAsyncData(() => listTickets(user.id), [user.id], []);
  const { data: active } = useAsyncData(
    () => (activeId ? getTicket(activeId) : Promise.resolve(null)),
    [activeId],
    null
  );

  useEffect(() => {
    if (!activeId && tickets.length > 0) setActiveId(tickets[0].id);
  }, [tickets.length, activeId]);

  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.panel_support.title}</h1>
          <p className="panel-head-sub">{t.panel_support.sub}</p>
        </div>
        <div className="panel-head-actions">
          <button type="button" className="btn btn-primary" onClick={() => setNewOpen(true)}>
            + {t.panel_support.new_ticket}
          </button>
        </div>
      </div>

      {newOpen && (
        <NewTicketModal
          t={t}
          onClose={() => setNewOpen(false)}
          onCreated={(id) => {
            setActiveId(id);
            setNewOpen(false);
          }}
          userId={user.id}
        />
      )}

      {tickets.length === 0 ? (
        <div className="panel-card">
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— No Tickets —</div>
            <div>{t.panel_support.empty}</div>
          </div>
        </div>
      ) : (
        <div className="panel-tickets-layout">
          <div className="panel-ticket-list">
            <div className="panel-ticket-list-head">
              <span className="panel-ticket-list-head-title">{t.panel_support.title} · {tickets.length}</span>
            </div>
            {tickets.map((tk) => (
              <button
                key={tk.id}
                type="button"
                className={`panel-ticket-item ${activeId === tk.id ? "active" : ""}`}
                onClick={() => setActiveId(tk.id)}
              >
                <div className="panel-ticket-item-subj">
                  <span className="panel-ticket-item-subj-text">{tk.subject}</span>
                  <span className={`panel-badge ${tk.status}`}>{t.panel_support[`status_${tk.status}`]}</span>
                </div>
                <div className="panel-ticket-item-meta">
                  <span>{t.panel_support[`cat_${tk.category}`] || tk.category}</span>
                  <span>·</span>
                  <span>{fmtDate(tk.updatedAt, lang)}</span>
                </div>
              </button>
            ))}
          </div>
          {active ? (
            <TicketView t={t} lang={lang} ticket={active} user={user} role="customer" />
          ) : (
            <div className="panel-ticket-view">
              <div className="panel-empty">—</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function NewTicketModal({ t, onClose, onCreated, userId }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");

  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!subject || !message || busy) return;
    setBusy(true);
    try {
      const tk = await createTicket({
        userId,
        subject,
        category,
        initialMessage: message,
      });
      onCreated(tk.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-drawer-overlay" onClick={onClose}>
      <div className="panel-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="panel-drawer-head">
          <div className="panel-drawer-title">{t.panel_support.new_ticket}</div>
          <button type="button" className="panel-drawer-close" onClick={onClose}>✕</button>
        </div>
        <form className="panel-form" onSubmit={submit}>
          <div className="field-group">
            <label className="field-l">{t.panel_support.subject}</label>
            <div className="field-wrap">
              {FIELD_ICO.subject}
              <input className="field-i" required value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </div>
          <div className="field-group">
            <label className="field-l">{t.panel_support.category}</label>
            <div className="field-wrap">
              {FIELD_ICO.tag}
              <select className="field-i" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="general">{t.panel_support.cat_general}</option>
                <option value="deposit_notify">{t.panel_support.cat_deposit_notify}</option>
                <option value="withdrawal_request">{t.panel_support.cat_withdrawal_request}</option>
              </select>
            </div>
          </div>
          <div className="field-group">
            <label className="field-l">{t.panel_support.message}</label>
            <textarea
              className="field-i"
              style={{ minHeight: 120, padding: "12px 14px" }}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="panel-form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t.admin_users.close}</button>
            <button type="submit" className="btn btn-primary">{t.panel_support.send}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TicketView({ t, lang, ticket, user, role }) {
  const [draft, setDraft] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ticket.messages.length, ticket.id]);

  const canReply = role === "customer" ? canCustomerReply(ticket) : ticket.status !== "closed";
  const isCustomerLocked = role === "customer" && !canReply && ticket.status !== "closed";

  const submitReply = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !canReply) return;
    const body = draft.trim();
    setDraft("");
    try {
      await postMessage(ticket.id, { author: role, body });
    } catch (e2) {
      setDraft(body);
    }
  };

  const closeTicket = () => updateTicket(ticket.id, { status: "closed" });
  const reopenTicket = () => updateTicket(ticket.id, { status: "awaiting_admin" });

  return (
    <div className="panel-ticket-view">
      <div className="panel-ticket-view-head">
        <div>
          <div className="panel-ticket-view-title">{ticket.subject}</div>
          <div className="panel-ticket-view-sub">
            <span>{t.panel_support[`cat_${ticket.category}`] || ticket.category}</span>
            <span>·</span>
            <span>{fmtDateTime(ticket.createdAt, lang)}</span>
          </div>
        </div>
        <div className="panel-head-actions">
          <span className={`panel-badge ${ticket.status}`}>{t.panel_support[`status_${ticket.status}`]}</span>
          {role === "admin" && (
            ticket.status === "closed" ? (
              <button type="button" className="panel-row-action" onClick={reopenTicket}>{t.admin_tickets.reopen}</button>
            ) : (
              <button type="button" className="panel-row-action" onClick={closeTicket}>{t.admin_tickets.close_ticket}</button>
            )
          )}
        </div>
      </div>

      <div className="panel-chat">
        {ticket.messages.map((m) => (
          <div key={m.id} className={`panel-msg ${m.author}`}>
            <div>{m.body}</div>
            <div className="panel-msg-meta">
              {m.author === "customer" ? user.name : m.author === "admin" ? "Lmax Capital Support" : "System"}
              {" · "}{fmtDateTime(m.createdAt, lang)}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {ticket.status !== "closed" && (
        <div className="panel-chat-input">
          <textarea
            placeholder={role === "admin" ? t.admin_tickets.reply_placeholder : t.panel_support.input_placeholder}
            value={draft}
            disabled={!canReply}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="panel-chat-input-row">
            {isCustomerLocked ? (
              <span className="panel-chat-locked">{t.panel_support.awaiting_admin_note}</span>
            ) : <span />}
            <button type="button" className="btn btn-primary" disabled={!canReply || !draft.trim()} onClick={submitReply}>
              {role === "admin" ? t.admin_tickets.send : t.panel_support.send}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Mt5AccountCard({ t, lang, prov, index, onApprove, approving }) {
  const STATUS = {
    pending: { cls: "pending", label: t.panel_mt5.state_pending_eyebrow },
    assigned: { cls: "assigned", label: t.panel_mt5.state_assigned_eyebrow },
    active: { cls: "active", label: t.panel_mt5.state_active_eyebrow },
  }[prov.status] || { cls: "pending", label: prov.status };

  return (
    <div className="panel-card mt5-acct">
      <div className="mt5-acct-head">
        <span className="mt5-acct-name">{ICON.mt5}{t.panel_mt5.account} #{index}</span>
        <span className={`panel-badge ${STATUS.cls}`}>{STATUS.label}</span>
      </div>

      {prov.status === "pending" ? (
        <div className="panel-mt5-state">
          <div className="panel-mt5-state-title">{t.panel_mt5.state_pending_title}</div>
          <p className="panel-mt5-state-sub">{t.panel_mt5.state_pending_sub}</p>
        </div>
      ) : (
        <>
          <p className="panel-mt5-state-sub" style={{ marginTop: 4 }}>
            {prov.status === "assigned" ? t.panel_mt5.state_assigned_sub : t.panel_mt5.state_active_sub}
          </p>
          <dl className="panel-mt5-creds">
            <dt>{t.panel_mt5.mt5_login}</dt>
            <dd className="mono">{prov.login || "—"}</dd>
            {prov.server && (<><dt>{t.panel_mt5.mt5_server}</dt><dd className="mono">{prov.server}</dd></>)}
            {prov.password && (<><dt>{t.panel_mt5.mt5_password}</dt><dd className="mono">{prov.password}</dd></>)}
            {prov.investor && (<><dt>{t.panel_mt5.mt5_investor}</dt><dd className="mono">{prov.investor}</dd></>)}
            <dt>{prov.status === "assigned" ? t.panel_mt5.assigned_at : t.panel_mt5.activated_at}</dt>
            <dd>{fmtDateTime(prov.status === "assigned" ? prov.assignedAt : prov.activatedAt, lang)}</dd>
          </dl>
          {prov.status === "assigned" && (
            <div className="panel-form-actions">
              <button type="button" className="btn btn-primary" disabled={approving} onClick={() => onApprove(prov)}>
                ✓ {t.panel_mt5.approve}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PanelMT5({ t, lang, user, setView }) {
  const { data: me } = useAsyncData(() => getUser(user.id), [user.id], user);
  const { data: accounts, refresh } = useAsyncData(
    () => listProvisioning({ userId: user.id }),
    [user.id],
    []
  );
  const [approving, setApproving] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const kycVerified = (me?.kycStatus || user.kycStatus) === "verified";
  const list = (accounts || []).slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const hasPending = list.some((p) => p.status === "pending");
  const hasAny = list.length > 0;
  const canRequest = kycVerified && !hasPending && !requesting;

  const onApprove = async (prov) => {
    setApproving(true);
    try {
      await activateProvisioning(prov.id);
      refresh();
    } finally {
      setApproving(false);
    }
  };

  const onRequest = async () => {
    if (!kycVerified) return;
    setRequesting(true);
    try {
      await requestAdditionalMt5(user.id);
      refresh();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.panel_mt5.title}</h1>
          <p className="panel-head-sub">{t.panel_mt5.sub}</p>
        </div>
        {kycVerified && hasAny && (
          <div className="panel-head-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!canRequest}
              onClick={onRequest}
              title={hasPending ? t.panel_mt5.request_pending : t.panel_mt5.request_more}
            >
              {ICON.plus} {t.panel_mt5.request_more}
            </button>
          </div>
        )}
      </div>

      {!kycVerified ? (
        <div className="panel-card kyc-gate">
          <span className="kyc-gate-ico">{ICON.shield}</span>
          <div className="kyc-gate-title">{t.panel_mt5.kyc_required_title}</div>
          <p className="kyc-gate-sub">{t.panel_mt5.kyc_required_sub}</p>
          <button type="button" className="btn btn-primary" onClick={() => setView && setView("kyc")}>
            {ICON.kyc} {t.panel_mt5.kyc_required_cta}
          </button>
        </div>
      ) : (
        <>
          {hasPending && <div className="panel-notice info">{t.panel_mt5.request_pending}</div>}

          {!hasAny ? (
            <div className="panel-card kyc-gate">
              <span className="kyc-gate-ico ok">{ICON.mt5}</span>
              <div className="kyc-gate-title">{t.panel_mt5.empty_title}</div>
              <p className="kyc-gate-sub">{t.panel_mt5.empty_sub}</p>
              <button type="button" className="btn btn-primary" disabled={!canRequest} onClick={onRequest}>
                {ICON.plus} {t.panel_mt5.request_first}
              </button>
            </div>
          ) : (
            <div className="mt5-acct-grid">
              {list.map((prov, i) => (
                <Mt5AccountCard
                  key={prov.id}
                  t={t}
                  lang={lang}
                  prov={prov}
                  index={i + 1}
                  onApprove={onApprove}
                  approving={approving}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function PanelAccount({ t, lang, user }) {
  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.panel_account.title}</h1>
          <p className="panel-head-sub">{t.panel_account.sub}</p>
        </div>
      </div>

      <div className="panel-profile-card">
        <div className="panel-profile-head">
          <div className="panel-profile-avatar">{initials(user.name)}</div>
          <div>
            <div className="panel-profile-name">{user.name}</div>
            <div className="panel-profile-email">{user.email}</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <span className={`panel-badge ${user.kycStatus === "verified" ? "approved" : user.kycStatus === "reviewing" ? "assigned" : "pending"}`}>
              {user.kycStatus === "verified" ? t.panel_overview.kyc_verified : user.kycStatus === "reviewing" ? t.panel_overview.kyc_reviewing : t.panel_overview.kyc_pending}
            </span>
          </div>
        </div>

        <dl className="panel-kv">
          <dt>{t.panel_account.phone}</dt>
          <dd className="mono">{user.phone || "—"}</dd>
          <dt>{t.panel_account.account_type}</dt>
          <dd className="mono" style={{ letterSpacing: "0.08em" }}>{(user.accountType || "real").toUpperCase()}</dd>
          <dt>{t.panel_account.mt5_account}</dt>
          <dd className="mono">
            {user.mt5Account || <span style={{ color: "var(--warn)" }}>{t.panel_account.mt5_none}</span>}
          </dd>
          <dt>{t.panel_account.kyc_status}</dt>
          <dd>
            <span className={`panel-badge ${user.kycStatus === "verified" ? "approved" : user.kycStatus === "reviewing" ? "assigned" : "pending"}`}>
              {user.kycStatus === "verified" ? t.panel_overview.kyc_verified : user.kycStatus === "reviewing" ? t.panel_overview.kyc_reviewing : t.panel_overview.kyc_pending}
            </span>
          </dd>
          <dt>{t.panel_account.member_since}</dt>
          <dd>{fmtDate(user.createdAt, lang)}</dd>
        </dl>
      </div>
    </>
  );
}
