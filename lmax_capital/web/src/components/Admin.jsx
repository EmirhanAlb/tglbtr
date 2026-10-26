import { useState, useEffect, useMemo } from "react";
import { useAsyncData } from "../hooks/useAsyncData.js";
import {
  listUsers,
  getUser,
  listTransactions,
  updateTransaction,
  listTransfers,
  resolveTransfer,
  listTickets,
  getTicket,
  purgeOldClosedTickets,
  listBankAccounts,
  addBankAccount,
  removeBankAccount,
  listCryptoAccounts,
  addCryptoAccount,
  removeCryptoAccount,
  adminStats,
  userTotals,
  adminAdjustBalance,
  postMessage,
  listProvisioning,
  getProvisioningByUser,
  assignProvisioning,
  updateProvisioning,
  updateUser,
  deleteUser,
  getSettings,
  updateSettings,
  kycUrl,
} from "../data/store.js";
import { TicketView, FIELD_ICO, ConfirmDialog } from "./Panel.jsx";

const ICON = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13h8V3H3v10Z"/><path d="M13 21h8V11h-8v10Z"/><path d="M3 21h8v-6H3v6Z"/><path d="M13 3v6h8V3h-8Z"/></svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  prospects: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>
  ),
  investors: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 4 8-9"/><path d="M14 7h7v7"/></svg>
  ),
  tickets: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
  ),
  transactions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M7 12h13"/><path d="M3 18h13"/><path d="m18 3 3 3-3 3"/><path d="m6 15-3 3 3 3"/></svg>
  ),
  transfers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h15"/><path d="m15 3 4 4-4 4"/><path d="M20 17H5"/><path d="m9 21-4-4 4-4"/></svg>
  ),
  mt5: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 8h2l2 4 2-4h2v8"/><path d="M7 20h10"/></svg>
  ),
  payments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01"/><path d="M18 12h.01"/></svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
};

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
    return new Date(iso).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { year: "numeric", month: "short", day: "2-digit" });
  } catch (e) { return "—"; }
}

function fmtDateTime(iso, lang) {
  try {
    return new Date(iso).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch (e) { return "—"; }
}

export function PageAdmin({ t, lang, session, setRoute, onLogout }) {
  const [view, setView] = useState("dashboard");
  const [editUserId, setEditUserId] = useState(null);
  const { data: me, loading } = useAsyncData(() => getUser(session.userId), [session.userId]);

  useEffect(() => {
    if (!loading && (!me || me.role !== "admin")) onLogout();
  }, [loading, me, onLogout]);

  if (loading) {
    return (
      <div className="panel-shell">
        <main className="panel-main"><div className="panel-empty">— … —</div></main>
      </div>
    );
  }
  if (!me || me.role !== "admin") return null;

  const nav = [
    { id: "dashboard", label: t.admin.nav_dashboard, icon: ICON.dashboard },
    { id: "prospects", label: t.admin.nav_prospects, icon: ICON.prospects },
    { id: "investors", label: t.admin.nav_investors, icon: ICON.investors },
    { id: "tickets", label: t.admin.nav_tickets, icon: ICON.tickets },
    { id: "transactions", label: t.admin.nav_transactions, icon: ICON.transactions },
    { id: "transfers", label: t.admin.nav_transfers, icon: ICON.transfers },
    { id: "mt5", label: t.admin.nav_mt5, icon: ICON.mt5 },
    { id: "payments", label: t.admin.nav_payments, icon: ICON.payments },
  ];

  return (
    <div className="panel-shell">
      <aside className="panel-side">
        <button type="button" className="panel-side-brand" onClick={() => setRoute("home")}>
          <img src="/assets/logo.png" alt="Lmax Capital" />
          <span className="panel-side-brand-tag" style={{ color: "var(--warn)", borderColor: "var(--warn)" }}>{t.admin.brand}</span>
        </button>
        <nav className="panel-side-nav">
          {nav.map((it) => (
            <button
              key={it.id}
              type="button"
              className={`panel-side-link ${!editUserId && view === it.id ? "active" : ""}`}
              onClick={() => { setEditUserId(null); setView(it.id); }}
            >
              {it.icon}
              <span>{it.label}</span>
            </button>
          ))}
        </nav>
        <div className="panel-side-foot">
          <div className="panel-side-user">
            <div className="panel-side-avatar" style={{ background: "linear-gradient(135deg, var(--warn), oklch(0.62 0.13 78))" }}>{initials(me.name)}</div>
            <div className="panel-side-user-meta">
              <div className="panel-side-user-name">{me.name}</div>
              <div className="panel-side-user-email">{me.email}</div>
            </div>
          </div>
          <button type="button" className="panel-side-link" onClick={onLogout}>
            {ICON.logout}
            <span>{t.admin.logout}</span>
          </button>
        </div>
      </aside>
      <main className="panel-main">
        {editUserId ? (
          <AdminUserEdit t={t} lang={lang} userId={editUserId} onDone={() => setEditUserId(null)} />
        ) : (
          <>
            {view === "dashboard" && <AdminDashboard t={t} lang={lang} setView={setView} />}
            {view === "prospects" && <AdminProspects t={t} lang={lang} onEdit={setEditUserId} />}
            {view === "investors" && <AdminInvestors t={t} lang={lang} onEdit={setEditUserId} />}
            {view === "tickets" && <AdminTickets t={t} lang={lang} />}
            {view === "transactions" && <AdminTransactions t={t} lang={lang} />}
            {view === "transfers" && <AdminTransfers t={t} lang={lang} />}
            {view === "mt5" && <AdminMt5 t={t} lang={lang} />}
            {view === "payments" && <AdminPayments t={t} lang={lang} />}
          </>
        )}
      </main>
    </div>
  );
}

const EMPTY_STATS = {
  totalUsers: 0, totalProspects: 0, totalInvestors: 0, pendingTickets: 0,
  pendingProvisioning: 0, pendingDeposits: 0, pendingWithdrawals: 0,
  totalDeposited: 0, totalWithdrawn: 0, net: 0, recentUsers: [],
};

function AdminDashboard({ t, lang, setView }) {
  const { data: stats } = useAsyncData(() => adminStats(), [], EMPTY_STATS);
  return (
    <>
      <div className="panel-welcome">
        <div className="panel-welcome-grid">
          <div>
            <h1 className="panel-welcome-title">
              {t.admin_dashboard.title} <em>— {t.admin_dashboard.subtitle}</em>
            </h1>
            <p className="panel-welcome-sub">{t.admin_dashboard.sub}</p>
          </div>
          <div className="panel-welcome-aside">
            <div className="panel-welcome-balance-l">{t.admin_dashboard.net}</div>
            <div className="panel-welcome-balance">
              <span className="currency">$</span>{fmtMoney(stats.net)}
            </div>
            <div className="panel-welcome-mini">
              <div>
                <div className="v gain">+${fmtMoney(stats.totalDeposited)}</div>
                <div className="l">{t.admin_dashboard.total_deposits}</div>
              </div>
              <div>
                <div className="v loss">−${fmtMoney(stats.totalWithdrawn)}</div>
                <div className="l">{t.admin_dashboard.total_withdrawals}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-grid cols-4">
        <div className="panel-card clickable" onClick={() => setView("prospects")}>
          <div className="panel-stat-label">{t.admin_dashboard.prospects}</div>
          <div className={`panel-stat-value ${stats.totalProspects > 0 ? "warn" : ""}`}>{stats.totalProspects}</div>
          <div className="panel-stat-sub">CRM · Pipeline</div>
        </div>
        <div className="panel-card clickable" onClick={() => setView("investors")}>
          <div className="panel-stat-label">{t.admin_dashboard.investors}</div>
          <div className="panel-stat-value gain">{stats.totalInvestors}</div>
          <div className="panel-stat-sub">Active · MT5</div>
        </div>
        <div className="panel-card clickable" onClick={() => setView("tickets")}>
          <div className="panel-stat-label">{t.admin_dashboard.pending_tickets}</div>
          <div className={`panel-stat-value ${stats.pendingTickets > 0 ? "warn" : ""}`}>{stats.pendingTickets}</div>
          <div className="panel-stat-sub">Support · Queue</div>
        </div>
        <div className="panel-card clickable" onClick={() => setView("transfers")}>
          <div className="panel-stat-label">{t.admin_dashboard.pending_transfers}</div>
          <div className={`panel-stat-value ${stats.pendingTransfers > 0 ? "warn" : ""}`}>{stats.pendingTransfers}</div>
          <div className="panel-stat-sub">MT5 · ${fmtMoney(stats.pendingTransfersAmount)}</div>
        </div>
      </div>

      <div className="panel-section-head">
        <h2>{t.admin_dashboard.recent_users}</h2>
        <span className="panel-section-meta">Last 5</span>
      </div>
      <div className="panel-table-wrap">
        {stats.recentUsers.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— Empty —</div>
            <div>{t.admin_dashboard.no_recent}</div>
          </div>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>{t.admin_users.col_name}</th>
                <th>{t.admin_users.col_email}</th>
                <th>{t.admin_users.col_mt5}</th>
                <th>{t.admin_users.col_joined}</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="mono">{u.email}</td>
                  <td className="mono">{u.mt5Account || <span style={{ color: "var(--warn)" }}>—</span>}</td>
                  <td>{fmtDate(u.createdAt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

const CRM_PER_PAGE = 12;

function AdminProspects({ t, lang, onEdit }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("joined_desc");
  const [page, setPage] = useState(1);
  const [provisionUserId, setProvisionUserId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const { data: decorated } = useAsyncData(
    async () => {
      const [all, provs] = await Promise.all([listUsers(), listProvisioning()]);
      const provMap = {};
      provs.forEach((p) => { provMap[p.userId] = p; });
      return all
        .filter((u) => !u.mt5Account)
        .map((u) => ({ ...u, _prov: provMap[u.id] || null }));
    },
    [],
    []
  );
  const users = decorated;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const arr = decorated.filter((u) => {
      if (needle) {
        const hay = `${u.name} ${u.email} ${u.phone || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (statusFilter === "pending" && u._prov?.status !== "pending") return false;
      if (statusFilter === "assigned" && u._prov?.status !== "assigned") return false;
      if (kycFilter !== "all" && u.kycStatus !== kycFilter) return false;
      if ((dateFrom || dateTo) && !inRange(u.createdAt, dateFrom, dateTo)) return false;
      return true;
    });
    arr.sort((a, b) => {
      if (sortBy === "joined_asc") return a.createdAt < b.createdAt ? -1 : 1;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      return a.createdAt < b.createdAt ? 1 : -1;
    });
    return arr;
  }, [decorated, q, statusFilter, kycFilter, dateFrom, dateTo, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / CRM_PER_PAGE));
  useEffect(() => { if (page > pageCount) setPage(1); }, [pageCount, page]);
  const pageStart = (page - 1) * CRM_PER_PAGE;
  const paged = filtered.slice(pageStart, pageStart + CRM_PER_PAGE);
  const resetPage = () => setPage(1);

  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.admin_prospects.title}</h1>
          <p className="panel-head-sub">{filtered.length} / {users.length} · {t.admin_prospects.sub}</p>
        </div>
        <div className="panel-head-actions panel-filters">
          <div className="panel-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input placeholder={t.admin_users.search} value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} />
          </div>
          <select className="panel-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}>
            <option value="all">{t.admin_prospects.filter_all}</option>
            <option value="pending">{t.admin_prospects.status_pending}</option>
            <option value="assigned">{t.admin_prospects.status_assigned}</option>
          </select>
          <select className="panel-filter-select" value={kycFilter} onChange={(e) => { setKycFilter(e.target.value); resetPage(); }}>
            <option value="all">{t.admin_crm.filter_kyc}: {t.admin_prospects.filter_all}</option>
            <option value="pending">{t.admin_users.kyc_pending}</option>
            <option value="verified">{t.admin_users.kyc_verified}</option>
          </select>
          <div className="panel-date-range">
            <input type="date" className="panel-filter-date" value={dateFrom} max={dateTo || undefined} onChange={(e) => { setDateFrom(e.target.value); resetPage(); }} aria-label={t.admin_crm.date_from} title={t.admin_crm.date_from} />
            <span className="panel-date-sep">→</span>
            <input type="date" className="panel-filter-date" value={dateTo} min={dateFrom || undefined} onChange={(e) => { setDateTo(e.target.value); resetPage(); }} aria-label={t.admin_crm.date_to} title={t.admin_crm.date_to} />
            {(dateFrom || dateTo) && (
              <button type="button" className="panel-date-clear" onClick={() => { setDateFrom(""); setDateTo(""); resetPage(); }} aria-label={t.admin_crm.date_clear} title={t.admin_crm.date_clear}>×</button>
            )}
          </div>
          <select className="panel-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="joined_desc">{t.admin_crm.sort_joined_desc}</option>
            <option value="joined_asc">{t.admin_crm.sort_joined_asc}</option>
            <option value="name_asc">{t.admin_crm.sort_name_asc}</option>
            <option value="name_desc">{t.admin_crm.sort_name_desc}</option>
          </select>
        </div>
      </div>

      <div className="panel-table-wrap">
        {filtered.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— Empty —</div>
            <div>{t.admin_prospects.empty}</div>
          </div>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>{t.admin_users.col_name}</th>
                <th>{t.admin_users.col_email}</th>
                <th>{t.admin_users.col_phone}</th>
                <th>{t.admin_prospects.col_status}</th>
                <th>{t.admin_users.col_joined}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((u) => {
                const status = u._prov?.status || "pending";
                return (
                  <tr key={u.id}>
                    <td className="mono">{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || "—"}</td>
                    <td>
                      <span className={`panel-badge ${status === "assigned" ? "awaiting_user" : "open"}`}>
                        {status === "assigned" ? t.admin_prospects.status_assigned : t.admin_prospects.status_pending}
                      </span>
                    </td>
                    <td>{fmtDate(u.createdAt, lang)}</td>
                    <td style={{ textAlign: "right" }}>
                      <div className="panel-row-actions">
                        {status === "pending" ? (
                          <button type="button" className="panel-row-action success" onClick={() => setProvisionUserId(u.id)}>
                            {t.admin_prospects.assign_mt5}
                          </button>
                        ) : (
                          <>
                            <span className="panel-side-user-email">{t.admin_prospects.awaiting_customer}</span>
                            <button type="button" className="panel-row-action" onClick={() => setProvisionUserId(u.id)}>
                              {t.admin_users.edit}
                            </button>
                          </>
                        )}
                        <button type="button" className="panel-row-action icon" title={t.admin_users.detail_title} aria-label={t.admin_users.detail_title} onClick={() => setSelectedId(u.id)}>
                          {ICON.eye}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {pageCount > 1 && (
          <div className="panel-pager">
            <button type="button" className="panel-pager-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t.admin_users.prev}</button>
            <span className="panel-pager-info">{page} / {pageCount} · {filtered.length} {t.admin_users.records}</span>
            <button type="button" className="panel-pager-btn" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>{t.admin_users.next}</button>
          </div>
        )}
      </div>

      {selectedId && (
        <UserDrawer t={t} lang={lang} userId={selectedId} onClose={() => setSelectedId(null)} onEdit={(id) => { setSelectedId(null); onEdit(id); }} />
      )}
      {provisionUserId && (
        <ProvisionModal
          t={t}
          userId={provisionUserId}
          onClose={() => setProvisionUserId(null)}
        />
      )}
    </>
  );
}

function AdminInvestors({ t, lang, onEdit }) {
  const [q, setQ] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("balance_desc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const { data: decorated } = useAsyncData(
    async () => {
      const [all, txs] = await Promise.all([listUsers(), listTransactions()]);
      const tot = {};
      txs.forEach((tx) => {
        if (tx.status !== "approved") return;
        const r = tot[tx.userId] || (tot[tx.userId] = { deposited: 0, withdrawn: 0, balance: 0 });
        if (tx.type === "deposit") r.deposited += tx.amount;
        else if (tx.type === "withdrawal") r.withdrawn += tx.amount;
      });
      Object.values(tot).forEach((r) => { r.balance = r.deposited - r.withdrawn; });
      return all
        .filter((u) => !!u.mt5Account)
        .map((u) => ({ ...u, _tot: tot[u.id] || { deposited: 0, withdrawn: 0, balance: 0 } }));
    },
    [],
    []
  );
  const users = decorated;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const arr = decorated.filter((u) => {
      if (needle) {
        const hay = `${u.name} ${u.email} ${u.phone || ""} ${u.mt5Account || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (kycFilter !== "all" && u.kycStatus !== kycFilter) return false;
      if ((dateFrom || dateTo) && !inRange(u.createdAt, dateFrom, dateTo)) return false;
      const b = u._tot.balance;
      if (balanceFilter === "zero" && b > 0) return false;
      if (balanceFilter === "lt1k" && !(b > 0 && b < 1000)) return false;
      if (balanceFilter === "1k_10k" && !(b >= 1000 && b < 10000)) return false;
      if (balanceFilter === "10k_50k" && !(b >= 10000 && b < 50000)) return false;
      if (balanceFilter === "gte50k" && !(b >= 50000)) return false;
      return true;
    });
    arr.sort((a, b) => {
      if (sortBy === "balance_asc") return a._tot.balance - b._tot.balance;
      if (sortBy === "deposited_desc") return b._tot.deposited - a._tot.deposited;
      if (sortBy === "joined_desc") return a.createdAt < b.createdAt ? 1 : -1;
      if (sortBy === "joined_asc") return a.createdAt < b.createdAt ? -1 : 1;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return b._tot.balance - a._tot.balance;
    });
    return arr;
  }, [decorated, q, kycFilter, balanceFilter, dateFrom, dateTo, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / CRM_PER_PAGE));
  useEffect(() => { if (page > pageCount) setPage(1); }, [pageCount, page]);
  const pageStart = (page - 1) * CRM_PER_PAGE;
  const paged = filtered.slice(pageStart, pageStart + CRM_PER_PAGE);
  const resetPage = () => setPage(1);

  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.admin_investors.title}</h1>
          <p className="panel-head-sub">{filtered.length} / {users.length} · {t.admin_investors.sub}</p>
        </div>
        <div className="panel-head-actions panel-filters">
          <div className="panel-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input placeholder={t.admin_users.search} value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} />
          </div>
          <select className="panel-filter-select" value={kycFilter} onChange={(e) => { setKycFilter(e.target.value); resetPage(); }}>
            <option value="all">{t.admin_crm.filter_kyc}: {t.admin_prospects.filter_all}</option>
            <option value="pending">{t.admin_users.kyc_pending}</option>
            <option value="verified">{t.admin_users.kyc_verified}</option>
          </select>
          <select className="panel-filter-select" value={balanceFilter} onChange={(e) => { setBalanceFilter(e.target.value); resetPage(); }}>
            <option value="all">{t.admin_crm.balance_all}</option>
            <option value="zero">{t.admin_crm.balance_zero}</option>
            <option value="lt1k">{t.admin_crm.balance_lt1k}</option>
            <option value="1k_10k">{t.admin_crm.balance_1k_10k}</option>
            <option value="10k_50k">{t.admin_crm.balance_10k_50k}</option>
            <option value="gte50k">{t.admin_crm.balance_gte50k}</option>
          </select>
          <div className="panel-date-range">
            <input type="date" className="panel-filter-date" value={dateFrom} max={dateTo || undefined} onChange={(e) => { setDateFrom(e.target.value); resetPage(); }} aria-label={t.admin_crm.date_from} title={t.admin_crm.date_from} />
            <span className="panel-date-sep">→</span>
            <input type="date" className="panel-filter-date" value={dateTo} min={dateFrom || undefined} onChange={(e) => { setDateTo(e.target.value); resetPage(); }} aria-label={t.admin_crm.date_to} title={t.admin_crm.date_to} />
            {(dateFrom || dateTo) && (
              <button type="button" className="panel-date-clear" onClick={() => { setDateFrom(""); setDateTo(""); resetPage(); }} aria-label={t.admin_crm.date_clear} title={t.admin_crm.date_clear}>×</button>
            )}
          </div>
          <select className="panel-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="balance_desc">{t.admin_crm.sort_balance_desc}</option>
            <option value="balance_asc">{t.admin_crm.sort_balance_asc}</option>
            <option value="deposited_desc">{t.admin_crm.sort_deposited_desc}</option>
            <option value="joined_desc">{t.admin_crm.sort_joined_desc}</option>
            <option value="joined_asc">{t.admin_crm.sort_joined_asc}</option>
            <option value="name_asc">{t.admin_crm.sort_name_asc}</option>
          </select>
        </div>
      </div>

      <div className="panel-table-wrap">
        {filtered.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— Empty —</div>
            <div>{t.admin_investors.empty}</div>
          </div>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>{t.admin_users.col_name}</th>
                <th>{t.admin_users.col_email}</th>
                <th>{t.admin_users.col_phone}</th>
                <th>{t.admin_users.col_mt5}</th>
                <th>{t.admin_users.col_deposited}</th>
                <th>{t.admin_users.col_withdrawn}</th>
                <th>{t.admin_users.col_balance}</th>
                <th>{t.admin_users.col_joined}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((u) => {
                const tot = u._tot;
                return (
                  <tr key={u.id}>
                    <td className="mono">{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || "—"}</td>
                    <td className="mono">{u.mt5Account}</td>
                    <td className="mono gain">${fmtMoney(tot.deposited)}</td>
                    <td className="mono loss">${fmtMoney(tot.withdrawn)}</td>
                    <td className="mono">${fmtMoney(tot.balance)}</td>
                    <td>{fmtDate(u.createdAt, lang)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button type="button" className="panel-row-action icon" title={t.admin_users.detail_title} aria-label={t.admin_users.detail_title} onClick={() => setSelectedId(u.id)}>
                        {ICON.eye}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {pageCount > 1 && (
          <div className="panel-pager">
            <button type="button" className="panel-pager-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t.admin_users.prev}</button>
            <span className="panel-pager-info">{page} / {pageCount} · {filtered.length} {t.admin_users.records}</span>
            <button type="button" className="panel-pager-btn" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>{t.admin_users.next}</button>
          </div>
        )}
      </div>

      {selectedId && (
        <UserDrawer t={t} lang={lang} userId={selectedId} onClose={() => setSelectedId(null)} onEdit={(id) => { setSelectedId(null); onEdit(id); }} />
      )}
    </>
  );
}

function ProvisionModal({ t, userId, onClose }) {
  const { data } = useAsyncData(
    async () => {
      const [user, prov] = await Promise.all([getUser(userId), getProvisioningByUser(userId)]);
      return { user, prov };
    },
    [userId],
    { user: null, prov: null }
  );
  const user = data.user;
  const prov = data.prov;
  const isEdit = !!prov && prov.status !== "pending";
  const [form, setForm] = useState({ login: "", server: "Lmax-Live", password: "", investor: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prov) {
      setForm({
        login: prov.login || "",
        server: prov.server || "Lmax-Live",
        password: prov.password || "",
        investor: prov.investor || "",
      });
    }
  }, [prov?.id]);

  if (!user || !prov) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.login || !form.server || !form.password || !form.investor || busy) return;
    setBusy(true);
    try {
      if (isEdit) {
        await updateProvisioning(prov.id, form);
      } else {
        await assignProvisioning(prov.id, form);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-drawer-overlay" onClick={onClose}>
      <div className="panel-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="panel-drawer-head">
          <div>
            <div className="panel-drawer-title">{isEdit ? t.admin_prospects.edit_title : t.admin_prospects.assign_title}</div>
            <div className="panel-side-user-email">{user.name} · {user.email}</div>
          </div>
          <button type="button" className="panel-drawer-close" onClick={onClose}>✕</button>
        </div>
        <form className="panel-form" onSubmit={submit}>
          <div className="panel-form-row">
            <div className="field-group">
              <label className="field-l">{t.admin_tickets.f_login}</label>
              <div className="field-wrap">
                {FIELD_ICO.key}
                <input className="field-i" required value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-l">{t.admin_tickets.f_server}</label>
              <div className="field-wrap">
                {FIELD_ICO.server}
                <input className="field-i" required value={form.server} onChange={(e) => setForm({ ...form, server: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="panel-form-row">
            <div className="field-group">
              <label className="field-l">{t.admin_tickets.f_password}</label>
              <div className="field-wrap">
                {FIELD_ICO.lock}
                <input className="field-i" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-l">{t.admin_tickets.f_investor}</label>
              <div className="field-wrap">
                {FIELD_ICO.eye}
                <input className="field-i" required value={form.investor} onChange={(e) => setForm({ ...form, investor: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="panel-form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t.admin_users.close}</button>
            <button type="submit" className="btn btn-primary">{isEdit ? t.admin_users.save : t.admin_tickets.send_credentials}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TxPager({ t, lang, userId, perPage = 10, scrollOnPage = false }) {
  const { data: txs } = useAsyncData(() => listTransactions(userId), [userId], []);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(txs.length / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const slice = txs.slice(start, start + perPage);

  if (txs.length === 0) {
    return <div className="panel-empty" style={{ padding: 16 }}>{t.panel_overview.empty_tx}</div>;
  }

  const goto = (p) => {
    setPage(p);
    if (scrollOnPage) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
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
          {slice.map((tx) => (
            <tr key={tx.id}>
              <td>{fmtDate(tx.createdAt, lang)}</td>
              <td>{tx.type === "deposit" ? t.admin_transactions.type_deposit : t.admin_transactions.type_withdrawal}</td>
              <td className="mono" style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: "0.06em" }}>{tx.method || "—"}</td>
              <td className={`mono ${tx.type === "deposit" ? "gain" : "loss"}`}>
                {tx.type === "deposit" ? "+" : "−"}${fmtMoney(tx.amount)}
              </td>
              <td><span className={`panel-badge ${tx.status}`}>{t.admin_transactions[`status_${tx.status}`]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="panel-pager">
          <button type="button" className="panel-pager-btn" disabled={safePage === 1} onClick={() => goto(safePage - 1)}>← {t.admin_users.prev}</button>
          <span className="panel-pager-info">{safePage} / {totalPages} · {txs.length} {t.admin_users.records}</span>
          <button type="button" className="panel-pager-btn" disabled={safePage === totalPages} onClick={() => goto(safePage + 1)}>{t.admin_users.next} →</button>
        </div>
      )}
    </>
  );
}

function KycDocsCard({ t, lang, user, status, onSetStatus, busy }) {
  const { data: urls } = useAsyncData(
    async () => {
      const [front, back] = await Promise.all([kycUrl(user.kycFrontPath), kycUrl(user.kycBackPath)]);
      return { front, back };
    },
    [user.kycFrontPath, user.kycBackPath],
    { front: null, back: null }
  );

  const cur = status || user.kycStatus || "pending";
  const verified = cur === "verified";
  const hasDocs = !!(user.kycFrontPath || user.kycBackPath);

  return (
    <div className="panel-form-card" style={{ marginTop: 4 }}>
      <div className="panel-card-head">
        <div className="panel-card-title">{t.admin_users.kyc_docs_section}</div>
        <span className="panel-section-meta">
          <span className={`panel-badge ${verified ? "approved" : cur === "rejected" ? "rejected" : cur === "reviewing" ? "assigned" : "pending"}`}>
            {t.admin_users[`kyc_${cur}`] || cur}
          </span>
          {user.kycScore != null ? ` · ${t.admin_users.kyc_score}: ${Math.round(user.kycScore)}%` : ""}
        </span>
      </div>

      {hasDocs ? (
        <>
          <div className="kyc-admin-grid">
            <a className="kyc-admin-doc" href={urls.front || undefined} target="_blank" rel="noreferrer">
              {urls.front ? <img src={urls.front} alt={t.admin_users.kyc_front} /> : <div className="kyc-admin-empty">—</div>}
              <span className="kyc-admin-label">{t.admin_users.kyc_front}</span>
            </a>
            <a className="kyc-admin-doc" href={urls.back || undefined} target="_blank" rel="noreferrer">
              {urls.back ? <img src={urls.back} alt={t.admin_users.kyc_back} /> : <div className="kyc-admin-empty">—</div>}
              <span className="kyc-admin-label">{t.admin_users.kyc_back}</span>
            </a>
          </div>
          {user.kycSubmittedAt && (
            <div className="panel-detail-reset-sub" style={{ marginTop: 10 }}>
              {t.admin_users.kyc_submitted}: {fmtDateTime(user.kycSubmittedAt, lang)}
            </div>
          )}
        </>
      ) : (
        <div className="panel-empty" style={{ padding: 20 }}>{t.admin_users.kyc_no_docs}</div>
      )}

      <div className="kyc-admin-actions">
        {!verified ? (
          <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onSetStatus("verified")}>
              ✓ {t.admin_users.kyc_approve}
            </button>
            {cur !== "rejected" && (
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => onSetStatus("rejected")}>
                {t.admin_users.kyc_reject}
              </button>
            )}
            {!hasDocs && <span className="kyc-admin-note">{t.admin_users.kyc_manual_note}</span>}
          </>
        ) : (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => onSetStatus("pending")}>
            {t.admin_users.kyc_revoke}
          </button>
        )}
      </div>
    </div>
  );
}

function AdminUserEdit({ t, lang, userId, onDone }) {
  const { data, loading, refresh } = useAsyncData(
    async () => {
      const [u, prov, totals] = await Promise.all([
        getUser(userId),
        getProvisioningByUser(userId),
        userTotals(userId),
      ]);
      return { u, prov, totals };
    },
    [userId],
    { u: null, prov: null, totals: { deposited: 0, withdrawn: 0, balance: 0 } }
  );
  const u = data.u;
  const prov = data.prov;
  const totals = data.totals;
  const [form, setForm] = useState({ name: "", email: "", phone: "", kycStatus: "pending", mt5Account: "" });
  const [confirmDel, setConfirmDel] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [provModal, setProvModal] = useState(false);
  const [kycBusy, setKycBusy] = useState(false);

  useEffect(() => {
    if (u) {
      setForm({
        name: u.name || "",
        email: u.email || "",
        phone: u.phone || "",
        kycStatus: u.kycStatus || "pending",
        mt5Account: u.mt5Account || "",
      });
    }
  }, [u?.id]);

  if (loading) {
    return <div className="panel-card"><div className="panel-empty">— … —</div></div>;
  }
  if (!u) {
    return (
      <div className="panel-card">
        <div className="panel-empty">{t.admin_users.empty}</div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    await updateUser(u.id, {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      kycStatus: form.kycStatus,
      mt5Account: form.mt5Account.trim() || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const doDelete = async () => {
    if (await deleteUser(u.id)) onDone();
  };

  const sendResetEmail = () => {
    setResetSent(true);
    setTimeout(() => setResetSent(false), 3000);
  };

  // Quick KYC action — set status directly (e.g. manual approve without documents).
  const setKyc = async (status) => {
    if (kycBusy) return;
    setKycBusy(true);
    try {
      await updateUser(u.id, { kycStatus: status });
      setForm((f) => ({ ...f, kycStatus: status }));
      refresh();
    } finally {
      setKycBusy(false);
    }
  };

  return (
    <>
      <div className="panel-head">
        <div>
          <button type="button" className="panel-back-link" onClick={onDone}>
            ← {t.admin_users.back_to_list}
          </button>
          <h1 className="panel-head-title">{u.name}</h1>
          <p className="panel-head-sub">{t.admin_users.edit_title}</p>
        </div>
        <div className="panel-head-actions">
          <button type="button" className="panel-row-action danger" onClick={() => setConfirmDel(true)}>
            {t.admin_users.delete}
          </button>
        </div>
      </div>

      {saved && <div className="panel-notice">{t.admin_users.saved}</div>}

      <form className="panel-form-card panel-form" onSubmit={submit}>
        <div className="panel-card-head">
          <div className="panel-card-title">{t.admin_users.detail_title}</div>
          <span className="panel-section-meta">{u.email}</span>
        </div>

        <div className="panel-form-row">
          <div className="field-group">
            <label className="field-l">{t.admin_users.f_name}</label>
            <div className="field-wrap">
              {FIELD_ICO.user}
              <input className="field-i" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div className="field-group">
            <label className="field-l">{t.admin_users.f_email}</label>
            <div className="field-wrap">
              {FIELD_ICO.subject}
              <input className="field-i" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="panel-form-row">
          <div className="field-group">
            <label className="field-l">{t.admin_users.f_phone}</label>
            <div className="field-wrap">
              {FIELD_ICO.note}
              <input className="field-i" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="field-group">
            <label className="field-l">{t.admin_users.f_mt5}</label>
            <div className="field-wrap">
              {FIELD_ICO.key}
              <input className="field-i" value={form.mt5Account} onChange={(e) => setForm({ ...form, mt5Account: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="field-group">
          <label className="field-l">{t.admin_users.f_kyc}</label>
          <div className="field-wrap">
            {FIELD_ICO.tag}
            <select className="field-i" value={form.kycStatus} onChange={(e) => setForm({ ...form, kycStatus: e.target.value })}>
              <option value="pending">{t.admin_users.kyc_pending}</option>
              <option value="reviewing">{t.admin_users.kyc_reviewing}</option>
              <option value="verified">{t.admin_users.kyc_verified}</option>
              <option value="rejected">{t.admin_users.kyc_rejected}</option>
            </select>
          </div>
        </div>

        <KycDocsCard t={t} lang={lang} user={u} status={form.kycStatus} onSetStatus={setKyc} busy={kycBusy} />

        <div className="field-group">
          <label className="field-l">{t.admin_users.login_pwd_section}</label>
          <div className="field-wrap">
            {FIELD_ICO.lock}
            <input
              className="field-i mono"
              readOnly
              value={u.loginPassword || ""}
              placeholder={t.admin_users.login_pwd_empty}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="panel-detail-reset-sub" style={{ marginTop: 6 }}>{t.admin_users.login_pwd_desc}</div>
        </div>

        <div className="panel-detail-reset">
          <div className="panel-detail-reset-meta">
            <div className="panel-detail-reset-title">{t.admin_users.reset_section}</div>
            <div className="panel-detail-reset-sub">{t.admin_users.reset_desc}</div>
          </div>
          <button type="button" className="panel-row-action" onClick={sendResetEmail}>
            {t.admin_users.reset_action}
          </button>
        </div>
        {resetSent && <div className="panel-notice" style={{ marginTop: 14 }}>{t.admin_users.reset_sent}</div>}

        <div className="panel-form-actions">
          <button type="button" className="btn btn-ghost" onClick={onDone}>{t.admin_users.cancel_edit}</button>
          <button type="submit" className="btn btn-primary">{t.admin_users.save}</button>
        </div>
      </form>

      <AdminBalanceCard t={t} userId={u.id} totals={totals} />

      <div className="panel-form-card" style={{ marginTop: 20 }}>
        <div className="panel-card-head">
          <div className="panel-card-title">{t.admin_users.mt5_section}</div>
          <span className="panel-section-meta">
            {prov ? t.admin_users[`prov_${prov.status}`] : "—"}
          </span>
        </div>
        {prov && prov.status !== "pending" ? (
          <>
            <dl className="panel-mt5-creds" style={{ padding: "8px 0 16px" }}>
              <dt>{t.panel_mt5.mt5_login}</dt>
              <dd className="mono">{prov.login || "—"}</dd>
              <dt>{t.panel_mt5.mt5_server}</dt>
              <dd className="mono">{prov.server || "—"}</dd>
              <dt>{t.panel_mt5.mt5_password}</dt>
              <dd className="mono">{prov.password || "—"}</dd>
              {prov.investor && (
                <>
                  <dt>{t.panel_mt5.mt5_investor}</dt>
                  <dd className="mono">{prov.investor}</dd>
                </>
              )}
            </dl>
            <div className="panel-form-actions">
              <button type="button" className="btn btn-primary" onClick={() => setProvModal(true)}>
                {t.admin_users.mt5_update}
              </button>
            </div>
          </>
        ) : (
          <p className="panel-side-user-email" style={{ padding: "8px 0" }}>{t.admin_users.mt5_none_yet}</p>
        )}
      </div>

      <div className="panel-form-card" style={{ marginTop: 20 }}>
        <div className="panel-card-head">
          <div className="panel-card-title">{t.admin_users.tx_history}</div>
          <span className="panel-section-meta">{t.admin_users.records}</span>
        </div>
        <TxPager t={t} lang={lang} userId={u.id} perPage={10} scrollOnPage />
      </div>

      {provModal && (
        <ProvisionModal t={t} userId={u.id} onClose={() => setProvModal(false)} />
      )}

      {confirmDel && (
        <div className="panel-confirm-overlay" onClick={() => setConfirmDel(false)}>
          <div className="panel-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="panel-confirm-dialog-title">{t.admin_users.confirm_delete_title}</div>
            <p className="panel-confirm-dialog-body">{t.admin_users.confirm_delete_body}</p>
            <div className="panel-confirm-dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(false)}>{t.admin_users.cancel_edit}</button>
              <button type="button" className="btn btn-danger" onClick={doDelete}>{t.admin_users.confirm_delete_yes}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AdminBalanceCard({ t, userId, totals }) {
  const [direction, setDirection] = useState("credit");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("deposit");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const amt = Number(amount) || 0;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!(amt > 0)) {
      setErr(t.admin_users.bal_err_amount);
      return;
    }
    setBusy(true);
    try {
      await adminAdjustBalance({
        userId,
        amount: amt,
        direction,
        category,
        note: note.trim() || null,
      });
      setAmount("");
      setNote("");
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch (e2) {
      setErr(t.admin_users.bal_err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-form-card panel-balance-card" style={{ marginTop: 20 }}>
      <div className="panel-card-head">
        <div className="panel-card-title">{t.admin_users.bal_section}</div>
      </div>

      <div className="panel-balance-stats">
        <div className="panel-balance-stat primary">
          <div className="l">{t.admin_users.bal_current}</div>
          <div className="v"><span className="cur">$</span>{fmtMoney(totals.balance)}</div>
        </div>
        <div className="panel-balance-stat">
          <div className="l">{t.admin_users.bal_deposited}</div>
          <div className="v gain">+${fmtMoney(totals.deposited)}</div>
        </div>
        <div className="panel-balance-stat">
          <div className="l">{t.admin_users.bal_withdrawn}</div>
          <div className="v loss">−${fmtMoney(totals.withdrawn)}</div>
        </div>
      </div>

      {done && <div className="panel-notice">{t.admin_users.bal_done}</div>}
      {err && <div className="panel-notice error">{err}</div>}

      <form className="panel-balance-form" onSubmit={submit}>
        <div className="field-group">
          <label className="field-l">{t.admin_users.bal_direction}</label>
          <div className="panel-balance-toggle">
            <button
              type="button"
              className={`panel-balance-toggle-btn ${direction === "credit" ? "active credit" : ""}`}
              onClick={() => { setDirection("credit"); setCategory("deposit"); }}
            >
              + {t.admin_users.bal_credit}
            </button>
            <button
              type="button"
              className={`panel-balance-toggle-btn ${direction === "debit" ? "active debit" : ""}`}
              onClick={() => { setDirection("debit"); setCategory("adjustment"); }}
            >
              − {t.admin_users.bal_debit}
            </button>
          </div>
        </div>

        <div className="panel-form-row">
          <div className="field-group">
            <label className="field-l">{t.admin_users.bal_amount}</label>
            <div className="field-wrap">
              {FIELD_ICO.dollar}
              <input
                className="field-i"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="field-group">
            <label className="field-l">{t.admin_users.bal_category}</label>
            <div className="field-wrap">
              {FIELD_ICO.tag}
              <select className="field-i" value={category} onChange={(e) => setCategory(e.target.value)}>
                {direction === "credit" ? (
                  <>
                    <option value="deposit">{t.admin_users.bal_cat_deposit}</option>
                    <option value="bonus">{t.admin_users.bal_cat_bonus}</option>
                    <option value="adjustment">{t.admin_users.bal_cat_adjustment}</option>
                  </>
                ) : (
                  <>
                    <option value="adjustment">{t.admin_users.bal_cat_adjustment}</option>
                    <option value="correction">{t.admin_users.bal_cat_correction}</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="field-group">
          <label className="field-l">{t.admin_users.bal_note}</label>
          <div className="field-wrap">
            {FIELD_ICO.note}
            <input
              className="field-i"
              maxLength={160}
              placeholder={t.admin_users.bal_note_ph}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {amt > 0 && (
          <div className={`panel-balance-preview ${direction}`}>
            <span>{direction === "credit" ? t.admin_users.bal_preview_credit : t.admin_users.bal_preview_debit}</span>
            <strong>{direction === "credit" ? "+" : "−"}${fmtMoney(amt)}</strong>
          </div>
        )}

        <div className="panel-form-actions">
          <button type="submit" className={`btn ${direction === "debit" ? "btn-danger" : "btn-primary"}`} disabled={busy || !(amt > 0)}>
            {busy ? t.admin_users.bal_submitting : t.admin_users.bal_submit}
          </button>
        </div>
      </form>
    </div>
  );
}

function UserDrawer({ t, lang, userId, onClose, onEdit }) {
  const { data } = useAsyncData(
    async () => {
      const [u, txs, tickets, tot] = await Promise.all([
        getUser(userId),
        listTransactions(userId),
        listTickets(userId),
        userTotals(userId),
      ]);
      return { u, txs, tickets, tot };
    },
    [userId],
    { u: null, txs: [], tickets: [], tot: { deposited: 0, withdrawn: 0, balance: 0 } }
  );
  const u = data.u;
  const txs = data.txs;
  const tickets = data.tickets;
  const tot = data.tot;
  const [confirmDel, setConfirmDel] = useState(false);

  if (!u) return null;

  const doDelete = async () => {
    const ok = await deleteUser(u.id);
    if (ok) onClose();
  };

  return (
    <div className="panel-drawer-overlay" onClick={onClose}>
      <div className="panel-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="panel-drawer-head">
          <div>
            <div className="panel-drawer-title">{u.name}</div>
            <div className="panel-side-user-email">{u.email}</div>
          </div>
          <button type="button" className="panel-drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="panel-drawer-section">
          <div className="panel-drawer-section-head">
            <div className="panel-drawer-section-title">{t.admin_users.detail_title}</div>
            <div className="panel-drawer-section-actions">
              {onEdit && (
                <button type="button" className="panel-row-action" onClick={() => onEdit(u.id)}>{t.admin_users.edit}</button>
              )}
              <button type="button" className="panel-row-action danger" onClick={() => setConfirmDel(true)}>{t.admin_users.delete}</button>
            </div>
          </div>

          <dl className="panel-kv">
            <dt>{t.panel_account.name}</dt><dd>{u.name}</dd>
            <dt>{t.panel_account.email}</dt><dd>{u.email}</dd>
            <dt>{t.panel_account.phone}</dt><dd>{u.phone || "—"}</dd>
            <dt>{t.panel_account.mt5_account}</dt>
            <dd className="mono">{u.mt5Account || <span style={{ color: "var(--warn)" }}>—</span>}</dd>
            <dt>{t.panel_account.kyc_status}</dt><dd>{u.kycStatus}</dd>
            <dt>{t.admin_users.col_joined}</dt><dd>{fmtDateTime(u.createdAt, lang)}</dd>
            <dt>{t.panel_overview.balance}</dt><dd className="mono">${fmtMoney(tot.balance)}</dd>
            <dt>{t.panel_overview.deposited}</dt><dd className="mono gain">+${fmtMoney(tot.deposited)}</dd>
            <dt>{t.panel_overview.withdrawn}</dt><dd className="mono loss">−${fmtMoney(tot.withdrawn)}</dd>
          </dl>
        </div>

        <div className="panel-drawer-section">
          <div className="panel-drawer-section-head">
            <div className="panel-drawer-section-title">{t.admin_users.detail_tx}</div>
            {txs.length > 0 && onEdit && (
              <div className="panel-drawer-section-actions">
                <button type="button" className="panel-row-action" onClick={() => onEdit(u.id)}>
                  {t.admin_users.view_all}
                </button>
              </div>
            )}
          </div>
          <TxPager t={t} lang={lang} userId={u.id} perPage={5} />
        </div>

        <div className="panel-drawer-section">
          <div className="panel-drawer-section-title">{t.admin_users.detail_tickets}</div>
          {tickets.length === 0 ? (
            <div className="panel-empty" style={{ padding: 16 }}>{t.panel_support.empty}</div>
          ) : (
            <table className="panel-table">
              <thead>
                <tr>
                  <th>{t.admin_tickets.col_subject}</th>
                  <th>{t.admin_tickets.col_status}</th>
                  <th>{t.admin_tickets.col_updated}</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((tk) => (
                  <tr key={tk.id}>
                    <td>{tk.subject}</td>
                    <td><span className={`panel-badge ${tk.status}`}>{t.panel_support[`status_${tk.status}`]}</span></td>
                    <td>{fmtDate(tk.updatedAt, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {confirmDel && (
          <div className="panel-confirm-overlay" onClick={() => setConfirmDel(false)}>
            <div className="panel-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="panel-confirm-dialog-title">{t.admin_users.confirm_delete_title}</div>
              <p className="panel-confirm-dialog-body">{t.admin_users.confirm_delete_body}</p>
              <div className="panel-confirm-dialog-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(false)}>{t.admin_users.cancel_edit}</button>
                <button type="button" className="btn btn-danger" onClick={doDelete}>{t.admin_users.confirm_delete_yes}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TICKETS_PER_PAGE = 15;
const TICKET_PURGE_DAYS = 30;

function inRange(iso, from, to) {
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (!ts) return false;
  if (from) {
    const f = new Date(from).getTime();
    if (Number.isFinite(f) && ts < f) return false;
  }
  if (to) {
    const tt = new Date(to).getTime();
    if (Number.isFinite(tt) && ts > tt + 24 * 60 * 60 * 1000 - 1) return false;
  }
  return true;
}

function AdminTickets({ t, lang }) {
  const [activeId, setActiveId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("updated_desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    purgeOldClosedTickets(TICKET_PURGE_DAYS).catch(() => {});
  }, []);

  const { data } = useAsyncData(
    async () => {
      const [allTickets, allUsers] = await Promise.all([listTickets(), listUsers()]);
      const userMap = {};
      allUsers.forEach((u) => { userMap[u.id] = u; });
      return { allTickets, userMap };
    },
    [],
    { allTickets: [], userMap: {} }
  );
  const allTickets = data.allTickets;
  const userMap = data.userMap;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const arr = allTickets.filter((tk) => {
      if (statusFilter === "active" && tk.status === "closed") return false;
      if (statusFilter !== "all" && statusFilter !== "active" && tk.status !== statusFilter) return false;
      if (categoryFilter !== "all" && tk.category !== categoryFilter) return false;
      if (needle) {
        const u = userMap[tk.userId];
        const hay = `${tk.subject || ""} ${u?.name || ""} ${u?.email || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if ((dateFrom || dateTo) && !inRange(tk.updatedAt, dateFrom, dateTo)) return false;
      return true;
    });
    arr.sort((a, b) => {
      if (sortBy === "updated_asc") return a.updatedAt < b.updatedAt ? -1 : 1;
      if (sortBy === "created_desc") return a.createdAt < b.createdAt ? 1 : -1;
      if (sortBy === "created_asc") return a.createdAt < b.createdAt ? -1 : 1;
      return a.updatedAt < b.updatedAt ? 1 : -1;
    });
    return arr;
  }, [allTickets, userMap, statusFilter, categoryFilter, q, sortBy, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / TICKETS_PER_PAGE));
  useEffect(() => { if (page > pageCount) setPage(1); }, [pageCount, page]);
  const pageStart = (page - 1) * TICKETS_PER_PAGE;
  const paged = filtered.slice(pageStart, pageStart + TICKETS_PER_PAGE);

  useEffect(() => {
    if (paged.length === 0) { if (activeId) setActiveId(null); return; }
    if (!activeId || !paged.find((p) => p.id === activeId)) setActiveId(paged[0].id);
  }, [paged.map((p) => p.id).join(","), activeId]);

  const { data: active } = useAsyncData(
    () => (activeId ? getTicket(activeId) : Promise.resolve(null)),
    [activeId],
    null
  );
  const activeUser = active ? userMap[active.userId] || null : null;

  const resetPage = () => setPage(1);

  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.admin_tickets.title}</h1>
          <p className="panel-head-sub">{filtered.length} / {allTickets.length} · {t.admin_tickets.purge_hint?.replace("{n}", TICKET_PURGE_DAYS) || ""}</p>
        </div>
        <div className="panel-head-actions panel-filters">
          <div className="panel-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input placeholder={t.admin_tickets.search_ph} value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} />
          </div>
          <select className="panel-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}>
            <option value="active">{t.admin_tickets.filter_active}</option>
            <option value="awaiting_admin">{t.panel_support.status_awaiting_admin}</option>
            <option value="awaiting_user">{t.panel_support.status_awaiting_user}</option>
            <option value="open">{t.panel_support.status_open}</option>
            <option value="closed">{t.panel_support.status_closed}</option>
            <option value="all">{t.admin_tickets.filter_status}: {t.admin_tickets.filter_all}</option>
          </select>
          <select className="panel-filter-select" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); resetPage(); }}>
            <option value="all">{t.admin_tickets.filter_category}: {t.admin_tickets.filter_all}</option>
            <option value="deposit_notify">{t.panel_support.cat_deposit_notify}</option>
            <option value="withdrawal_request">{t.panel_support.cat_withdrawal_request}</option>
            <option value="general">{t.panel_support.cat_general}</option>
          </select>
          <select className="panel-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="updated_desc">{t.admin_tickets.sort_updated_desc}</option>
            <option value="updated_asc">{t.admin_tickets.sort_updated_asc}</option>
            <option value="created_desc">{t.admin_tickets.sort_created_desc}</option>
            <option value="created_asc">{t.admin_tickets.sort_created_asc}</option>
          </select>
          <div className="panel-date-range">
            <input type="date" className="panel-filter-date" value={dateFrom} max={dateTo || undefined} onChange={(e) => { setDateFrom(e.target.value); resetPage(); }} aria-label={t.admin_crm.date_from} title={t.admin_crm.date_from} />
            <span className="panel-date-sep">→</span>
            <input type="date" className="panel-filter-date" value={dateTo} min={dateFrom || undefined} onChange={(e) => { setDateTo(e.target.value); resetPage(); }} aria-label={t.admin_crm.date_to} title={t.admin_crm.date_to} />
            {(dateFrom || dateTo) && (
              <button type="button" className="panel-date-clear" onClick={() => { setDateFrom(""); setDateTo(""); resetPage(); }} aria-label={t.admin_crm.date_clear} title={t.admin_crm.date_clear}>×</button>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel-card">
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— Empty Queue —</div>
            <div>{t.admin_tickets.empty}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="panel-tickets-layout">
            <div className="panel-ticket-list">
              <div className="panel-ticket-list-head">
                <span className="panel-ticket-list-head-title">{t.admin_tickets.title} · {filtered.length}</span>
              </div>
              {paged.map((tk) => {
                const u = userMap[tk.userId];
                const unread = tk.status === "awaiting_admin";
                return (
                  <button
                    key={tk.id}
                    type="button"
                    className={`panel-ticket-item ${activeId === tk.id ? "active" : ""} ${unread ? "unread" : ""}`}
                    onClick={() => setActiveId(tk.id)}
                  >
                    <div className="panel-ticket-item-subj">
                      <span className="panel-ticket-item-subj-text">{tk.subject}</span>
                      <span className={`panel-badge ${tk.status}`}>{t.panel_support[`status_${tk.status}`]}</span>
                    </div>
                    <div className="panel-ticket-item-meta">
                      <span>{u?.name || "—"}</span>
                      <span>·</span>
                      <span>{fmtDate(tk.updatedAt, lang)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {active && activeUser ? (
              <TicketView t={t} lang={lang} ticket={active} user={activeUser} role="admin" />
            ) : (
              <div className="panel-ticket-view"><div className="panel-empty">—</div></div>
            )}
          </div>
          {pageCount > 1 && (
            <div className="panel-pager">
              <button type="button" className="panel-pager-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t.admin_users.prev}</button>
              <span className="panel-pager-info">{page} / {pageCount} · {filtered.length} {t.admin_users.records}</span>
              <button type="button" className="panel-pager-btn" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>{t.admin_users.next}</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function AdminTransactions({ t, lang }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data } = useAsyncData(
    async () => {
      const [txs, allUsers] = await Promise.all([listTransactions(), listUsers()]);
      const userMap = {};
      allUsers.forEach((u) => { userMap[u.id] = u; });
      return { txs, userMap };
    },
    [],
    { txs: [], userMap: {} }
  );
  const txs = data.txs;
  const userMap = data.userMap;

  const filtered = useMemo(() => {
    return txs.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      return true;
    });
  }, [txs, typeFilter, statusFilter]);

  const onAction = async (tx, newStatus) => {
    await updateTransaction(tx.id, { status: newStatus });
    // Find related ticket by user+subject heuristic — fallback: post system message to a matching open ticket
    const tickets = await listTickets(tx.userId);
    const related = tickets.find((tk) =>
      (tx.type === "deposit" && tk.category === "deposit_notify") ||
      (tx.type === "withdrawal" && tk.category === "withdrawal_request")
    );
    if (related && related.status !== "closed") {
      const tpl = t.admin_transactions[`notify_${tx.type}_${newStatus}`];
      const body = tpl
        ? tpl.replace("{amount}", `$${fmtMoney(tx.amount)}`)
        : `${tx.type === "deposit" ? t.admin_transactions.type_deposit : t.admin_transactions.type_withdrawal} · $${fmtMoney(tx.amount)}`;
      await postMessage(related.id, { author: "system", body });
    }
  };

  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.admin_transactions.title}</h1>
          <p className="panel-head-sub">{filtered.length} / {txs.length}</p>
        </div>
        <div className="panel-head-actions panel-filters">
          <select className="panel-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">{t.admin_transactions.filter_type}: {t.admin_transactions.type_all}</option>
            <option value="deposit">{t.admin_transactions.type_deposit}</option>
            <option value="withdrawal">{t.admin_transactions.type_withdrawal}</option>
          </select>
          <select className="panel-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{t.admin_transactions.filter_status}: {t.admin_transactions.type_all}</option>
            <option value="pending">{t.admin_transactions.status_pending}</option>
            <option value="approved">{t.admin_transactions.status_approved}</option>
            <option value="rejected">{t.admin_transactions.status_rejected}</option>
          </select>
        </div>
      </div>

      <div className="panel-table-wrap">
        {filtered.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— No Records —</div>
            <div>{t.admin_transactions.empty}</div>
          </div>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>{t.admin_transactions.col_date}</th>
                <th>{t.admin_transactions.col_user}</th>
                <th>{t.admin_transactions.col_type}</th>
                <th>{t.admin_transactions.col_method}</th>
                <th>{t.admin_transactions.col_amount}</th>
                <th>{t.admin_transactions.col_status}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const u = userMap[tx.userId];
                return (
                  <tr key={tx.id}>
                    <td>{fmtDate(tx.createdAt, lang)}</td>
                    <td>{u?.name || "—"}</td>
                    <td>{tx.type === "deposit" ? t.admin_transactions.type_deposit : t.admin_transactions.type_withdrawal}</td>
                    <td>{tx.method}</td>
                    <td className={`mono ${tx.type === "deposit" ? "gain" : "loss"}`}>
                      {tx.type === "deposit" ? "+" : "−"}${fmtMoney(tx.amount)}
                    </td>
                    <td><span className={`panel-badge ${tx.status}`}>{t.admin_transactions[`status_${tx.status}`]}</span></td>
                    <td>
                      {tx.status === "pending" && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button type="button" className="panel-row-action success" onClick={() => onAction(tx, "approved")}>{t.admin_transactions.approve}</button>
                          <button type="button" className="panel-row-action danger" onClick={() => onAction(tx, "rejected")}>{t.admin_transactions.reject}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function AdminTransfers({ t, lang }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { tr, status }
  const { data, refresh } = useAsyncData(
    async () => {
      const [transfers, allUsers] = await Promise.all([listTransfers(), listUsers()]);
      const userMap = {};
      allUsers.forEach((u) => { userMap[u.id] = u; });
      return { transfers, userMap };
    },
    [],
    { transfers: [], userMap: {} }
  );
  const transfers = data.transfers;
  const userMap = data.userMap;

  const filtered = useMemo(
    () => transfers.filter((tr) => statusFilter === "all" || tr.status === statusFilter),
    [transfers, statusFilter]
  );

  const summary = useMemo(() => {
    let pendingCount = 0, pendingVol = 0, completedVol = 0;
    transfers.forEach((tr) => {
      if (tr.status === "pending") { pendingCount += 1; pendingVol += tr.amount; }
      else if (tr.status === "completed") completedVol += tr.amount;
    });
    return { pendingCount, pendingVol, completedVol };
  }, [transfers]);

  const onConfirm = async () => {
    if (!confirm) return;
    const { tr, status } = confirm;
    setBusyId(tr.id);
    try {
      await resolveTransfer(tr.id, status);
      setConfirm(null);
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.admin_transfers.title}</h1>
          <p className="panel-head-sub">{t.admin_transfers.sub}</p>
        </div>
        <div className="panel-head-actions panel-filters">
          <select className="panel-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{t.admin_transfers.filter_status}: {t.admin_transfers.status_all}</option>
            <option value="pending">{t.admin_transfers.status_pending}</option>
            <option value="completed">{t.admin_transfers.status_completed}</option>
            <option value="rejected">{t.admin_transfers.status_rejected}</option>
          </select>
        </div>
      </div>

      <div className="panel-grid cols-3">
        <div className="panel-card">
          <div className="panel-stat-label">{t.admin_transfers.card_pending}</div>
          <div className={`panel-stat-value ${summary.pendingCount > 0 ? "warn" : ""}`}>{summary.pendingCount}</div>
          <div className="panel-stat-sub">MT5 · Queue</div>
        </div>
        <div className="panel-card">
          <div className="panel-stat-label">{t.admin_transfers.card_pending_vol}</div>
          <div className="panel-stat-value small warn">${fmtMoney(summary.pendingVol)}</div>
          <div className="panel-stat-sub">Awaiting · Transfer</div>
        </div>
        <div className="panel-card">
          <div className="panel-stat-label">{t.admin_transfers.card_completed_vol}</div>
          <div className="panel-stat-value small gain">${fmtMoney(summary.completedVol)}</div>
          <div className="panel-stat-sub">Settled · MT5</div>
        </div>
      </div>

      <div className="panel-table-wrap">
        {filtered.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— No Records —</div>
            <div>{t.admin_transfers.empty}</div>
          </div>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>{t.admin_transfers.col_date}</th>
                <th>{t.admin_transfers.col_user}</th>
                <th>{t.admin_transfers.col_dir}</th>
                <th>{t.admin_transfers.col_mt5}</th>
                <th>{t.admin_transfers.col_amount}</th>
                <th>{t.admin_transfers.col_note}</th>
                <th>{t.admin_transfers.col_status}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tr) => {
                const u = userMap[tr.userId];
                const out = tr.direction !== "in";
                return (
                  <tr key={tr.id}>
                    <td>{fmtDateTime(tr.createdAt, lang)}</td>
                    <td>{u?.name || "—"}</td>
                    <td><span className={`transfer-dir-tag ${out ? "out" : "in"}`}>{out ? t.admin_transfers.dir_out : t.admin_transfers.dir_in}</span></td>
                    <td className="mono">{tr.mt5Account || "—"}</td>
                    <td className={`mono ${out ? "loss" : "gain"}`}>{out ? "−" : "+"}${fmtMoney(tr.amount)}</td>
                    <td className="panel-cell-note">{tr.note || "—"}</td>
                    <td><span className={`panel-badge ${tr.status}`}>{t.admin_transfers[`status_${tr.status}`]}</span></td>
                    <td>
                      {tr.status === "pending" && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button type="button" className="panel-row-action success" disabled={busyId === tr.id} onClick={() => setConfirm({ tr, status: "completed" })}>{t.admin_transfers.complete}</button>
                          <button type="button" className="panel-row-action danger" disabled={busyId === tr.id} onClick={() => setConfirm({ tr, status: "rejected" })}>{t.admin_transfers.reject}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        tone={confirm?.status === "rejected" ? "danger" : "primary"}
        title={confirm?.status === "rejected" ? t.admin_transfers.confirm_reject_title : t.admin_transfers.confirm_complete_title}
        body={
          confirm
            ? `${confirm.status === "rejected" ? t.admin_transfers.confirm_reject : t.admin_transfers.confirm_complete} · ${userMap[confirm.tr.userId]?.name || ""} · $${fmtMoney(confirm.tr.amount)} · ${confirm.tr.direction === "in" ? `${confirm.tr.mt5Account || "—"} → Lmax` : `Lmax → ${confirm.tr.mt5Account || "—"}`}`
            : ""
        }
        confirmLabel={confirm?.status === "rejected" ? t.admin_transfers.reject : t.admin_transfers.complete}
        cancelLabel={t.admin_users.close}
        busy={!!busyId}
        onConfirm={onConfirm}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}

function Mt5AssignModal({ t, prov, userName, onClose, onDone }) {
  const isEdit = prov.status !== "pending";
  const [form, setForm] = useState({
    login: prov.login || "",
    server: prov.server || "Lmax-Live",
    password: prov.password || "",
    investor: prov.investor || "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.login || !form.server || !form.password || !form.investor || busy) return;
    setBusy(true);
    try {
      if (isEdit) await updateProvisioning(prov.id, form);
      else await assignProvisioning(prov.id, form);
      onDone?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-drawer-overlay" onClick={onClose}>
      <div className="panel-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="panel-drawer-head">
          <div>
            <div className="panel-drawer-title">{isEdit ? t.admin_mt5.edit_title : t.admin_mt5.assign_title}</div>
            <div className="panel-side-user-email">{userName}</div>
          </div>
          <button type="button" className="panel-drawer-close" onClick={onClose}>✕</button>
        </div>
        <form className="panel-form" onSubmit={submit}>
          <div className="panel-form-row">
            <div className="field-group">
              <label className="field-l">{t.admin_tickets.f_login}</label>
              <div className="field-wrap">{FIELD_ICO.key}
                <input className="field-i" required value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-l">{t.admin_tickets.f_server}</label>
              <div className="field-wrap">{FIELD_ICO.server}
                <input className="field-i" required value={form.server} onChange={(e) => setForm({ ...form, server: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="panel-form-row">
            <div className="field-group">
              <label className="field-l">{t.admin_tickets.f_password}</label>
              <div className="field-wrap">{FIELD_ICO.lock}
                <input className="field-i" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-l">{t.admin_tickets.f_investor}</label>
              <div className="field-wrap">{FIELD_ICO.eye}
                <input className="field-i" required value={form.investor} onChange={(e) => setForm({ ...form, investor: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="panel-form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t.admin_users.close}</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{isEdit ? t.admin_users.save : t.admin_tickets.send_credentials}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminMt5({ t, lang }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [assign, setAssign] = useState(null); // { prov, userName }
  const { data, refresh } = useAsyncData(
    async () => {
      const [provs, users] = await Promise.all([listProvisioning(), listUsers()]);
      const userMap = {};
      users.forEach((u) => { userMap[u.id] = u; });
      return { provs, userMap };
    },
    [],
    { provs: [], userMap: {} }
  );
  const provs = data.provs;
  const userMap = data.userMap;

  const filtered = useMemo(
    () => provs.filter((p) => statusFilter === "all" || p.status === statusFilter),
    [provs, statusFilter]
  );
  const summary = useMemo(() => ({
    pending: provs.filter((p) => p.status === "pending").length,
    assigned: provs.filter((p) => p.status === "assigned").length,
    active: provs.filter((p) => p.status === "active").length,
  }), [provs]);

  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.admin_mt5.title}</h1>
          <p className="panel-head-sub">{t.admin_mt5.sub}</p>
        </div>
        <div className="panel-head-actions panel-filters">
          <select className="panel-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{t.admin_mt5.filter_status}: {t.admin_mt5.status_all}</option>
            <option value="pending">{t.admin_mt5.status_pending}</option>
            <option value="assigned">{t.admin_mt5.status_assigned}</option>
            <option value="active">{t.admin_mt5.status_active}</option>
          </select>
        </div>
      </div>

      <div className="panel-grid cols-3">
        <div className="panel-card">
          <div className="panel-stat-label">{t.admin_mt5.card_pending}</div>
          <div className={`panel-stat-value ${summary.pending > 0 ? "warn" : ""}`}>{summary.pending}</div>
          <div className="panel-stat-sub">Awaiting · Assign</div>
        </div>
        <div className="panel-card">
          <div className="panel-stat-label">{t.admin_mt5.card_assigned}</div>
          <div className="panel-stat-value small">{summary.assigned}</div>
          <div className="panel-stat-sub">Awaiting · Approval</div>
        </div>
        <div className="panel-card">
          <div className="panel-stat-label">{t.admin_mt5.card_active}</div>
          <div className="panel-stat-value small gain">{summary.active}</div>
          <div className="panel-stat-sub">Live · MT5</div>
        </div>
      </div>

      <div className="panel-table-wrap">
        {filtered.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— No Records —</div>
            <div>{t.admin_mt5.empty}</div>
          </div>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>{t.admin_mt5.col_date}</th>
                <th>{t.admin_mt5.col_user}</th>
                <th>{t.admin_mt5.col_login}</th>
                <th>{t.admin_mt5.col_server}</th>
                <th>{t.admin_mt5.col_status}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const u = userMap[p.userId];
                return (
                  <tr key={p.id}>
                    <td>{fmtDate(p.createdAt, lang)}</td>
                    <td>{u?.name || "—"}</td>
                    <td className="mono">{p.login || <span style={{ color: "var(--warn)" }}>—</span>}</td>
                    <td className="mono">{p.server || "—"}</td>
                    <td><span className={`panel-badge ${p.status}`}>{t.admin_mt5[`status_${p.status}`]}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className={`panel-row-action ${p.status === "pending" ? "success" : ""}`}
                        onClick={() => setAssign({ prov: p, userName: u ? `${u.name} · ${u.email}` : "" })}
                      >
                        {p.status === "pending" ? t.admin_mt5.assign : t.admin_mt5.edit}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {assign && (
        <Mt5AssignModal
          t={t}
          prov={assign.prov}
          userName={assign.userName}
          onClose={() => setAssign(null)}
          onDone={refresh}
        />
      )}
    </>
  );
}

function AdminPayments({ t, lang }) {
  const [tab, setTab] = useState("bank");
  const { data } = useAsyncData(
    async () => {
      const [banks, cryptos] = await Promise.all([listBankAccounts(), listCryptoAccounts()]);
      return { banks, cryptos };
    },
    [],
    { banks: [], cryptos: [] }
  );
  const banks = data.banks;
  const cryptos = data.cryptos;

  return (
    <>
      <div className="panel-head">
        <div>
          <h1 className="panel-head-title">{t.admin_payments.title}</h1>
          <p className="panel-head-sub">{t.admin_payments.sub}</p>
        </div>
      </div>

      <PaymentSettings t={t} />

      <div className="panel-tabs">
        <button type="button" className={`panel-tab ${tab === "bank" ? "active" : ""}`} onClick={() => setTab("bank")}>
          {t.admin_payments.tab_bank}
        </button>
        <button type="button" className={`panel-tab ${tab === "crypto" ? "active" : ""}`} onClick={() => setTab("crypto")}>
          {t.admin_payments.tab_crypto}
        </button>
      </div>

      {tab === "bank" ? (
        <BankAccountsView t={t} lang={lang} banks={banks} />
      ) : (
        <CryptoAccountsView t={t} lang={lang} cryptos={cryptos} />
      )}
    </>
  );
}

function PaymentSettings({ t }) {
  const { data: initial } = useAsyncData(
    () => getSettings(),
    [],
    { minDeposit: 0, depositReceiptRequired: false }
  );
  const [editing, setEditing] = useState(false);
  const [minDeposit, setMinDeposit] = useState("0");
  const [receiptRequired, setReceiptRequired] = useState(false);

  const startEdit = () => {
    setMinDeposit(String(initial.minDeposit || 0));
    setReceiptRequired(!!initial.depositReceiptRequired);
    setEditing(true);
  };

  const save = async () => {
    const n = parseFloat(minDeposit);
    await updateSettings({
      minDeposit: Number.isFinite(n) && n > 0 ? n : 0,
      depositReceiptRequired: receiptRequired,
    });
    setEditing(false);
  };

  const minVal = Number(initial.minDeposit) || 0;

  return (
    <div className="panel-settings-card">
      <div className="panel-settings-card-head">
        <span className="panel-settings-card-title">{t.admin_payments.settings_title}</span>
        {!editing ? (
          <button type="button" className="panel-row-action" onClick={startEdit}>{t.admin_users.edit}</button>
        ) : (
          <div className="panel-row-actions">
            <button type="button" className="panel-row-action" onClick={() => setEditing(false)}>{t.admin_users.cancel_edit}</button>
            <button type="button" className="panel-row-action success" onClick={save}>{t.admin_users.save}</button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="panel-settings-summary">
          <div className="panel-settings-summary-item">
            <span className="panel-settings-summary-l">{t.admin_payments.min_deposit}</span>
            <span className="panel-settings-summary-v mono">{minVal > 0 ? `$${fmtMoney(minVal)}` : "—"}</span>
          </div>
          <div className="panel-settings-summary-item">
            <span className="panel-settings-summary-l">{t.admin_payments.receipt_required}</span>
            <span className={`panel-settings-summary-v ${initial.depositReceiptRequired ? "gain" : ""}`}>
              {initial.depositReceiptRequired ? t.admin_payments.on : t.admin_payments.off}
            </span>
          </div>
        </div>
      ) : (
        <div className="panel-settings-edit">
          <div className="panel-settings-edit-item">
            <span className="panel-settings-summary-l">{t.admin_payments.min_deposit}</span>
            <div className="field-wrap compact" style={{ flex: "0 0 160px" }}>
              {FIELD_ICO.dollar}
              <input className="field-i" type="number" min="0" step="any" value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="panel-settings-edit-item">
            <span className="panel-settings-summary-l">{t.admin_payments.receipt_required}</span>
            <label className="panel-toggle">
              <input type="checkbox" checked={receiptRequired} onChange={(e) => setReceiptRequired(e.target.checked)} />
              <span className="panel-toggle-track"><span className="panel-toggle-thumb" /></span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function BankAccountsView({ t, lang, banks }) {
  const [form, setForm] = useState({ bankName: "", holder: "", iban: "", note: "" });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.bankName || !form.iban) return;
    await addBankAccount(form);
    setForm({ bankName: "", holder: "", iban: "", note: "" });
  };

  return (
    <>
      <form className="panel-minimal-form" onSubmit={submit}>
        <div className="panel-minimal-form-title">{t.admin_payments.add_bank}</div>
        <div className="panel-minimal-form-row">
          <div className="field-wrap compact" style={{ flex: 1.2 }}>
            {FIELD_ICO.bank}
            <input className="field-i" required value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder={t.admin_payments.f_bank_name} />
          </div>
          <div className="field-wrap compact" style={{ flex: 1 }}>
            {FIELD_ICO.user}
            <input className="field-i" value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} placeholder={t.admin_payments.f_holder} />
          </div>
          <div className="field-wrap compact" style={{ flex: 1.5 }}>
            {FIELD_ICO.hash}
            <input className="field-i" required value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder={t.admin_payments.f_iban} />
          </div>
          <div className="field-wrap compact" style={{ flex: 1 }}>
            {FIELD_ICO.note}
            <input className="field-i" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t.admin_payments.f_note} />
          </div>
          <button type="submit" className="btn btn-primary panel-minimal-form-btn">+ {t.admin_payments.add}</button>
        </div>
      </form>

      <div className="panel-table-wrap">
        {banks.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— Empty —</div>
            <div>{t.admin_payments.empty_bank}</div>
          </div>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>{t.admin_payments.f_bank_name}</th>
                <th>{t.admin_payments.f_holder}</th>
                <th>{t.admin_payments.f_iban}</th>
                <th>{t.admin_payments.f_note}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {banks.map((b) => (
                <tr key={b.id}>
                  <td>{b.bankName}</td>
                  <td>{b.holder}</td>
                  <td className="mono">{b.iban}</td>
                  <td>{b.note || "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="panel-row-action danger" onClick={() => { removeBankAccount(b.id); }}>{t.admin_payments.remove}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function CryptoAccountsView({ t, lang, cryptos }) {
  const [form, setForm] = useState({ network: "TRC20", token: "USDT", address: "", note: "" });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.address) return;
    await addCryptoAccount(form);
    setForm({ network: "TRC20", token: "USDT", address: "", note: "" });
  };

  return (
    <>
      <form className="panel-minimal-form" onSubmit={submit}>
        <div className="panel-minimal-form-title">{t.admin_payments.add_crypto}</div>
        <div className="panel-minimal-form-row">
          <div className="field-wrap compact" style={{ flex: "0 0 110px" }}>
            {FIELD_ICO.network}
            <select className="field-i" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })}>
              <option value="TRC20">TRC20</option>
              <option value="ERC20">ERC20</option>
              <option value="BEP20">BEP20</option>
            </select>
          </div>
          <div className="field-wrap compact" style={{ flex: "0 0 110px" }}>
            {FIELD_ICO.coin}
            <select className="field-i" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })}>
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>
          <div className="field-wrap compact" style={{ flex: 2 }}>
            {FIELD_ICO.wallet}
            <input className="field-i" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t.admin_payments.f_address} />
          </div>
          <div className="field-wrap compact" style={{ flex: 1 }}>
            {FIELD_ICO.note}
            <input className="field-i" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t.admin_payments.f_note} />
          </div>
          <button type="submit" className="btn btn-primary panel-minimal-form-btn">+ {t.admin_payments.add}</button>
        </div>
      </form>

      <div className="panel-table-wrap">
        {cryptos.length === 0 ? (
          <div className="panel-empty">
            <div className="panel-empty-eyebrow">— Empty —</div>
            <div>{t.admin_payments.empty_crypto}</div>
          </div>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>{t.admin_payments.f_network}</th>
                <th>{t.admin_payments.f_token}</th>
                <th>{t.admin_payments.f_address}</th>
                <th>{t.admin_payments.f_note}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cryptos.map((c) => (
                <tr key={c.id}>
                  <td>{c.network}</td>
                  <td>{c.token}</td>
                  <td className="mono">{c.address}</td>
                  <td>{c.note || "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="panel-row-action danger" onClick={() => { removeCryptoAccount(c.id); }}>{t.admin_payments.remove}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
