// Admin paneli — lmax_capital Admin.jsx yapısının vanilla JS portu.
// 8 bölüm: Dashboard, Potansiyel, Yatırımcılar, Destek, Finans, Transferler, MT5, Banka & Kripto.
import { supabase, applyBrand } from "./app.js";
import * as S from "./store.js";
import { ADMIN_ICON, FIELD_ICO } from "./icons.js";

applyBrand();

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const initials = (name) => (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const STATUS_TR = {
  open: "Açık", awaiting_admin: "Admin yanıtı bekleniyor", awaiting_user: "Sizden yanıt bekleniyor", closed: "Kapalı",
  pending: "Bekliyor", approved: "Onaylandı", rejected: "Reddedildi", completed: "Tamamlandı",
  assigned: "Atandı", active: "Aktif",
};
const KYC_TR = { pending: "Beklemede", reviewing: "İnceleniyor", verified: "Doğrulandı", rejected: "Reddedildi" };
const badge = (s) => `<span class="panel-badge ${s}">${esc(STATUS_TR[s] || s)}</span>`;
const CRM_PER_PAGE = 12, TICKETS_PER_PAGE = 15;

let me = null, session = null, view = "dashboard", editUserId = null;
// admin.html#investors gibi bağlantılarla doğrudan bölüm açılabilir.
{ const h = location.hash.replace("#", ""); if (["dashboard","prospects","investors","tickets","transactions","transfers","mt5","payments"].includes(h)) view = h; }

async function boot() {
  session = await S.getCurrentSession();
  if (!session) { location.replace("auth.html"); return; }
  if (session.role !== "admin") { location.replace("panel.html"); return; }
  me = await S.getUser(session.userId);
  if (!me || me.role !== "admin") { await S.signOut(); location.replace("auth.html"); return; }
  renderShell();
  S.subscribe(() => render());
  render();
}

const NAV = [
  { id: "dashboard", label: "Dashboard" }, { id: "prospects", label: "Potansiyel" },
  { id: "investors", label: "Yatırımcılar" }, { id: "tickets", label: "Destek Talepleri" },
  { id: "transactions", label: "Finans" }, { id: "transfers", label: "Transferler" },
  { id: "mt5", label: "MT5 Hesapları" }, { id: "payments", label: "Banka & Kripto" },
];

function renderShell() {
  $("#userName").textContent = me.name || "Admin";
  $("#userEmail").textContent = me.email || "";
  $("#userAvatar").textContent = initials(me.name || "Admin");
  const nav = $("#sideNav"); nav.innerHTML = "";
  NAV.forEach((it) => {
    const b = el("button", `panel-side-link ${view === it.id ? "active" : ""}`, `${ADMIN_ICON[it.id] || ""}<span>${it.label}</span>`);
    b.type = "button";
    b.dataset.nav = it.id;
    b.onclick = () => { editUserId = null; view = it.id; closeMobile(); render(); };
    nav.appendChild(b);
  });
  $("#logoutBtn").innerHTML = `${ADMIN_ICON.logout}<span>Çıkış</span>`;
  $("#logoutBtn").onclick = async () => { await S.signOut(); location.replace("auth.html"); };
  $("#mobileToggle").onclick = () => { $(".panel-side").classList.toggle("open"); $("#sideScrim").classList.toggle("hidden"); };
  $("#sideScrim").onclick = closeMobile;
}
function closeMobile() { $(".panel-side").classList.remove("open"); $("#sideScrim").classList.add("hidden"); }
function setActive() { document.querySelectorAll("#sideNav .panel-side-link").forEach((b, i) => b.classList.toggle("active", NAV[i].id === view && !editUserId)); }

async function render() {
  setActive();
  const root = $("#view");
  root.innerHTML = `<div class="panel-empty">— … —</div>`;
  try {
    if (editUserId) return renderUserEdit(root, editUserId);
    if (view === "dashboard") return renderDashboard(root);
    if (view === "prospects") return renderProspects(root);
    if (view === "investors") return renderInvestors(root);
    if (view === "tickets") return renderTickets(root);
    if (view === "transactions") return renderTransactions(root);
    if (view === "transfers") return renderTransfers(root);
    if (view === "mt5") return renderMt5(root);
    if (view === "payments") return renderPayments(root);
  } catch (e) { root.innerHTML = `<div class="panel-empty">Hata: ${esc(e.message)}</div>`; }
}

function headHtml(title, sub, actions) {
  return `<div class="panel-head"><div><h1 class="panel-head-title">${esc(title)}</h1><p class="panel-head-sub">${esc(sub || "")}</p></div>${actions ? `<div class="panel-head-actions panel-filters">${actions}</div>` : ""}</div>`;
}
const searchBox = (id, ph) => `<div class="panel-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input id="${id}" placeholder="${esc(ph)}" /></div>`;
const emptyBox = (txt) => `<div class="panel-empty"><div class="panel-empty-eyebrow">— Boş —</div><div>${esc(txt)}</div></div>`;

// ====================== DASHBOARD ======================
async function renderDashboard(root) {
  const s = await S.adminStats();
  root.innerHTML = `
    <div class="panel-welcome"><div class="panel-welcome-grid">
      <div><h1 class="panel-welcome-title">Genel Bakış <em>— operasyon özeti</em></h1>
        <p class="panel-welcome-sub">Operasyon sağlığı · bekleyen kuyruklar · son kayıtlar.</p></div>
      <div class="panel-welcome-aside"><div class="panel-welcome-balance-l">Net</div>
        <div class="panel-welcome-balance"><span class="currency">$</span>${money(s.net)}</div>
        <div class="panel-welcome-mini">
          <div><div class="v gain">+$${money(s.totalDeposited)}</div><div class="l">Toplam Yatırım</div></div>
          <div><div class="v loss">−$${money(s.totalWithdrawn)}</div><div class="l">Toplam Çekim</div></div>
        </div></div>
    </div></div>
    <div class="panel-grid cols-4">
      <div class="panel-card clickable" data-go="prospects"><div class="panel-stat-label">Potansiyel</div><div class="panel-stat-value ${s.totalProspects > 0 ? "warn" : ""}">${s.totalProspects}</div><div class="panel-stat-sub">CRM · Pipeline</div></div>
      <div class="panel-card clickable" data-go="investors"><div class="panel-stat-label">Yatırımcı</div><div class="panel-stat-value gain">${s.totalInvestors}</div><div class="panel-stat-sub">Aktif · MT5</div></div>
      <div class="panel-card clickable" data-go="tickets"><div class="panel-stat-label">Bekleyen Talep</div><div class="panel-stat-value ${s.pendingTickets > 0 ? "warn" : ""}">${s.pendingTickets}</div><div class="panel-stat-sub">Destek · Kuyruk</div></div>
      <div class="panel-card clickable" data-go="transfers"><div class="panel-stat-label">Bekleyen Transfer</div><div class="panel-stat-value ${s.pendingTransfers > 0 ? "warn" : ""}">${s.pendingTransfers}</div><div class="panel-stat-sub">MT5 · $${money(s.pendingTransfersAmount)}</div></div>
    </div>
    <div class="panel-grid cols-3" style="margin-top:4px">
      <div class="panel-card"><div class="panel-stat-label">Bekleyen Yatırım</div><div class="panel-stat-value small ${s.pendingDeposits > 0 ? "warn" : ""}">${s.pendingDeposits}</div><div class="panel-stat-sub">Finans · Onay</div></div>
      <div class="panel-card"><div class="panel-stat-label">Bekleyen Çekim</div><div class="panel-stat-value small ${s.pendingWithdrawals > 0 ? "warn" : ""}">${s.pendingWithdrawals}</div><div class="panel-stat-sub">Finans · Onay</div></div>
      <div class="panel-card"><div class="panel-stat-label">Toplam Müşteri</div><div class="panel-stat-value small">${s.totalUsers}</div><div class="panel-stat-sub">CRM</div></div>
    </div>
    <div class="panel-section-head"><h2>Son Kayıtlar</h2><span class="panel-section-meta">Son 5</span></div>
    <div class="panel-table-wrap">${s.recentUsers.length ? `<table class="panel-table"><thead><tr><th>Ad</th><th>Email</th><th>MT5</th><th>Kayıt</th></tr></thead><tbody>${
      s.recentUsers.map((u) => `<tr><td>${esc(u.name)}</td><td class="mono">${esc(u.email)}</td><td class="mono">${u.mt5Account ? esc(u.mt5Account) : '<span class="warn">—</span>'}</td><td>${fmtDate(u.createdAt)}</td></tr>`).join("")
    }</tbody></table>` : emptyBox("Henüz kayıt yok.")}</div>`;
  root.querySelectorAll("[data-go]").forEach((c) => c.onclick = () => { view = c.dataset.go; render(); });
}

// ====================== POTANSİYEL (MT5'siz) ======================
const crmState = { q: "", page: 1 };
async function renderProspects(root) {
  const [all, provs] = await Promise.all([S.listUsers(), S.listProvisioning()]);
  const provMap = {}; provs.forEach((p) => { provMap[p.userId] = p; });
  let users = all.filter((u) => !u.mt5Account).map((u) => ({ ...u, _prov: provMap[u.id] || null }));
  const needle = crmState.q.trim().toLowerCase();
  const filtered = users.filter((u) => !needle || `${u.name} ${u.email} ${u.phone || ""}`.toLowerCase().includes(needle));
  const pageCount = Math.max(1, Math.ceil(filtered.length / CRM_PER_PAGE));
  if (crmState.page > pageCount) crmState.page = 1;
  const paged = filtered.slice((crmState.page - 1) * CRM_PER_PAGE, crmState.page * CRM_PER_PAGE);
  root.innerHTML = headHtml("Potansiyel Müşteriler", `${filtered.length} / ${users.length} · MT5 hesabı henüz açılmamış kayıtlar.`, searchBox("q", "İsim veya email ara...")) +
    `<div class="panel-table-wrap">${filtered.length ? `<table class="panel-table"><thead><tr><th>Ad</th><th>Email</th><th>Telefon</th><th>Durum</th><th>Kayıt</th><th></th></tr></thead><tbody>${
      paged.map((u) => {
        const st = u._prov?.status || "pending";
        return `<tr><td class="mono">${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone || "—")}</td>
          <td><span class="panel-badge ${st === "assigned" ? "awaiting_user" : "open"}">${st === "assigned" ? "Onay Bekliyor" : "MT5 Bekliyor"}</span></td>
          <td>${fmtDate(u.createdAt)}</td>
          <td style="text-align:right"><div class="panel-row-actions">
            <button class="panel-row-action success" data-prov="${u.id}">${st === "pending" ? "MT5 Bilgisi Gönder" : "Düzenle"}</button>
            <button class="panel-row-action" data-edit="${u.id}">Aç</button>
            <button class="panel-row-action danger" data-del="${u.id}" title="Müşteriyi sil">Sil</button></div></td></tr>`;
      }).join("")
    }</tbody></table>${pagerHtml(crmState, pageCount, filtered.length)}` : emptyBox("Bekleyen kayıt yok.")}</div>`;
  wireSearch(root, crmState, renderProspects);
  wirePager(root, crmState, renderProspects);
  root.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => { editUserId = b.dataset.edit; render(); });
  root.querySelectorAll("[data-prov]").forEach((b) => b.onclick = () => openProvisionModal(b.dataset.prov));
  wireDelete(root, users);
}

// Listelerdeki "Sil" düğmeleri: onay ister, müşteriyi ve tüm kayıtlarını siler.
function wireDelete(root, users) {
  root.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
    const u = users.find((x) => x.id === b.dataset.del);
    const who = u ? `${u.name} (${u.email})` : "Bu müşteri";
    if (!confirm(`${who} ve tüm ilgili kayıtları (işlemler, talepler, MT5, belgeler) kalıcı olarak silinecek. Devam edilsin mi?`)) return;
    b.disabled = true;
    try { if (await S.deleteUser(b.dataset.del)) render(); else alert("Bu hesap silinemez."); }
    catch (e) { alert("Silinemedi: " + e.message); b.disabled = false; }
  });
}

// ====================== YATIRIMCILAR (MT5'li) ======================
const invState = { q: "", page: 1 };
async function renderInvestors(root) {
  const [all, txs] = await Promise.all([S.listUsers(), S.listTransactions()]);
  const tot = {};
  txs.forEach((tx) => { if (tx.status !== "approved") return; const r = tot[tx.userId] || (tot[tx.userId] = { deposited: 0, withdrawn: 0, balance: 0 }); if (tx.type === "deposit") r.deposited += tx.amount; else r.withdrawn += tx.amount; });
  Object.values(tot).forEach((r) => { r.balance = r.deposited - r.withdrawn; });
  let users = all.filter((u) => !!u.mt5Account).map((u) => ({ ...u, _tot: tot[u.id] || { deposited: 0, withdrawn: 0, balance: 0 } }));
  const needle = invState.q.trim().toLowerCase();
  const filtered = users.filter((u) => !needle || `${u.name} ${u.email} ${u.phone || ""} ${u.mt5Account || ""}`.toLowerCase().includes(needle))
    .sort((a, b) => b._tot.balance - a._tot.balance);
  const pageCount = Math.max(1, Math.ceil(filtered.length / CRM_PER_PAGE));
  if (invState.page > pageCount) invState.page = 1;
  const paged = filtered.slice((invState.page - 1) * CRM_PER_PAGE, invState.page * CRM_PER_PAGE);
  root.innerHTML = headHtml("Yatırımcılar", `${filtered.length} / ${users.length} · MT5 hesabı aktif müşteriler.`, searchBox("q", "İsim veya email ara...")) +
    `<div class="panel-table-wrap">${filtered.length ? `<table class="panel-table"><thead><tr><th>Ad</th><th>Email</th><th>MT5</th><th>Yatırılan</th><th>Çekilen</th><th>Bakiye</th><th>Kayıt</th><th></th></tr></thead><tbody>${
      paged.map((u) => `<tr><td class="mono">${esc(u.name)}</td><td>${esc(u.email)}</td><td class="mono">${esc(u.mt5Account)}</td>
        <td class="mono gain">$${money(u._tot.deposited)}</td><td class="mono loss">$${money(u._tot.withdrawn)}</td>
        <td class="mono">$${money(u._tot.balance)}</td><td>${fmtDate(u.createdAt)}</td>
        <td style="text-align:right"><div class="panel-row-actions"><button class="panel-row-action" data-edit="${u.id}">Aç</button>
          <button class="panel-row-action danger" data-del="${u.id}" title="Yatırımcıyı sil">Sil</button></div></td></tr>`).join("")
    }</tbody></table>${pagerHtml(invState, pageCount, filtered.length)}` : emptyBox("Aktif yatırımcı yok.")}</div>`;
  wireSearch(root, invState, renderInvestors);
  wirePager(root, invState, renderInvestors);
  root.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => { editUserId = b.dataset.edit; render(); });
  wireDelete(root, users);
}

function pagerHtml(state, pageCount, total) {
  if (pageCount <= 1) return "";
  return `<div class="panel-pager"><button class="panel-pager-btn" data-pg="prev" ${state.page <= 1 ? "disabled" : ""}>Önceki</button>
    <span class="panel-pager-info">${state.page} / ${pageCount} · ${total} kayıt</span>
    <button class="panel-pager-btn" data-pg="next" ${state.page >= pageCount ? "disabled" : ""}>Sonraki</button></div>`;
}
function wirePager(root, state, rerender) {
  root.querySelectorAll("[data-pg]").forEach((b) => b.onclick = () => { state.page += b.dataset.pg === "next" ? 1 : -1; rerender($("#view")); });
}
function wireSearch(root, state, rerender) {
  const q = $("#q", root); if (!q) return;
  q.oninput = () => { state.q = q.value; state.page = 1; rerender($("#view")).then(() => { const n = $("#q"); if (n) { n.focus(); n.selectionStart = n.value.length; } }); };
}

// ====================== FİNANS (yatırma/çekme) ======================
async function renderTransactions(root) {
  const [txs, users] = await Promise.all([S.listTransactions(), S.listUsers()]);
  const um = {}; users.forEach((u) => (um[u.id] = u));
  root.innerHTML = headHtml("Finans", `${txs.length} kayıt`) +
    `<div class="panel-table-wrap">${txs.length ? `<table class="panel-table"><thead><tr><th>Tarih</th><th>Müşteri</th><th>Tip</th><th>Yöntem</th><th>Tutar</th><th>Durum</th><th></th></tr></thead><tbody>${
      txs.map((tx) => `<tr><td>${fmtDate(tx.createdAt)}</td><td>${esc(um[tx.userId]?.name || "—")}</td>
        <td>${tx.type === "deposit" ? "Yatırım" : "Çekim"}</td><td>${esc(tx.method || "")}</td>
        <td class="mono ${tx.type === "deposit" ? "gain" : "loss"}">${tx.type === "deposit" ? "+" : "−"}$${money(tx.amount)}</td>
        <td>${badge(tx.status)}</td>
        <td style="text-align:right">${tx.status === "pending" ? `<div style="display:flex;gap:6px;justify-content:flex-end"><button class="panel-row-action success" data-ok="${tx.id}">Onayla</button><button class="panel-row-action danger" data-no="${tx.id}">Reddet</button></div>` : ""}</td></tr>`).join("")
    }</tbody></table>` : emptyBox("Hareket yok.")}</div>`;
  const act = async (id, status) => { await S.updateTransaction(id, { status }); render(); };
  root.querySelectorAll("[data-ok]").forEach((b) => b.onclick = () => act(b.dataset.ok, "approved"));
  root.querySelectorAll("[data-no]").forEach((b) => b.onclick = () => act(b.dataset.no, "rejected"));
}

// ====================== TRANSFERLER ======================
async function renderTransfers(root) {
  const [transfers, users] = await Promise.all([S.listTransfers(), S.listUsers()]);
  const um = {}; users.forEach((u) => (um[u.id] = u));
  let pendingCount = 0, pendingVol = 0, completedVol = 0;
  transfers.forEach((tr) => { if (tr.status === "pending") { pendingCount++; pendingVol += tr.amount; } else if (tr.status === "completed") completedVol += tr.amount; });
  root.innerHTML = headHtml("Transfer Talepleri", "İç bakiyeden MT5 hesaplarına aktarım talepleri.") + `
    <div class="panel-grid cols-3">
      <div class="panel-card"><div class="panel-stat-label">Bekleyen Talep</div><div class="panel-stat-value ${pendingCount > 0 ? "warn" : ""}">${pendingCount}</div><div class="panel-stat-sub">MT5 · Kuyruk</div></div>
      <div class="panel-card"><div class="panel-stat-label">Bekleyen Tutar</div><div class="panel-stat-value small warn">$${money(pendingVol)}</div><div class="panel-stat-sub">Awaiting</div></div>
      <div class="panel-card"><div class="panel-stat-label">Tamamlanan Toplam</div><div class="panel-stat-value small gain">$${money(completedVol)}</div><div class="panel-stat-sub">Settled</div></div>
    </div>
    <div class="panel-table-wrap">${transfers.length ? `<table class="panel-table"><thead><tr><th>Tarih</th><th>Müşteri</th><th>Yön</th><th>MT5</th><th>Tutar</th><th>Not</th><th>Durum</th><th></th></tr></thead><tbody>${
      transfers.map((tr) => { const out = tr.direction !== "in"; return `<tr><td>${fmtDateTime(tr.createdAt)}</td><td>${esc(um[tr.userId]?.name || "—")}</td>
        <td><span class="transfer-dir-tag ${out ? "out" : "in"}">${out ? "Trust → MT5" : "MT5 → Trust"}</span></td>
        <td class="mono">${esc(tr.mt5Account || "—")}</td><td class="mono ${out ? "loss" : "gain"}">${out ? "−" : "+"}$${money(tr.amount)}</td>
        <td class="panel-cell-note">${esc(tr.note || "—")}</td><td>${badge(tr.status)}</td>
        <td style="text-align:right">${tr.status === "pending" ? `<div style="display:flex;gap:6px;justify-content:flex-end"><button class="panel-row-action success" data-ok="${tr.id}">Tamamla</button><button class="panel-row-action danger" data-no="${tr.id}">Reddet</button></div>` : ""}</td></tr>`; }).join("")
    }</tbody></table>` : emptyBox("Transfer talebi yok.")}</div>`;
  const act = async (id, status) => {
    const msg = status === "completed" ? "Bu tutarın MT5 hesabına aktarıldığını onaylıyor musunuz?" : "Bu transfer talebini reddetmek istediğinize emin misiniz? Tutar müşterinin bakiyesine iade edilecek.";
    if (!confirm(msg)) return;
    await S.resolveTransfer(id, status); render();
  };
  root.querySelectorAll("[data-ok]").forEach((b) => b.onclick = () => act(b.dataset.ok, "completed"));
  root.querySelectorAll("[data-no]").forEach((b) => b.onclick = () => act(b.dataset.no, "rejected"));
}

// ====================== MT5 HESAPLARI ======================
async function renderMt5(root) {
  const [provs, users] = await Promise.all([S.listProvisioning(), S.listUsers()]);
  const um = {}; users.forEach((u) => (um[u.id] = u));
  const sum = { pending: 0, assigned: 0, active: 0 };
  provs.forEach((p) => sum[p.status]++);
  root.innerHTML = headHtml("MT5 Hesapları", "Tüm MT5 hesap talepleri ve atamaları.") + `
    <div class="panel-grid cols-3">
      <div class="panel-card"><div class="panel-stat-label">Bekleyen Talep</div><div class="panel-stat-value ${sum.pending > 0 ? "warn" : ""}">${sum.pending}</div><div class="panel-stat-sub">Atama bekliyor</div></div>
      <div class="panel-card"><div class="panel-stat-label">Onay Bekliyor</div><div class="panel-stat-value small">${sum.assigned}</div><div class="panel-stat-sub">Müşteri onayı</div></div>
      <div class="panel-card"><div class="panel-stat-label">Aktif Hesap</div><div class="panel-stat-value small gain">${sum.active}</div><div class="panel-stat-sub">Canlı · MT5</div></div>
    </div>
    <div class="panel-table-wrap">${provs.length ? `<table class="panel-table"><thead><tr><th>Tarih</th><th>Müşteri</th><th>Login</th><th>Sunucu</th><th>Durum</th><th></th></tr></thead><tbody>${
      provs.map((p) => `<tr><td>${fmtDate(p.createdAt)}</td><td>${esc(um[p.userId]?.name || "—")}</td>
        <td class="mono">${p.login ? esc(p.login) : '<span class="warn">—</span>'}</td><td class="mono">${esc(p.server || "—")}</td>
        <td>${badge(p.status)}</td>
        <td style="text-align:right"><button class="panel-row-action ${p.status === "pending" ? "success" : ""}" data-assign="${p.userId}">${p.status === "pending" ? "Bilgileri Ata" : "Düzenle"}</button></td></tr>`).join("")
    }</tbody></table>` : emptyBox("MT5 hesabı yok.")}</div>`;
  root.querySelectorAll("[data-assign]").forEach((b) => b.onclick = () => openProvisionModal(b.dataset.assign));
}

// ====================== BANKA & KRİPTO ======================
let payTab = "bank";
async function renderPayments(root) {
  const [banks, cryptos, settings] = await Promise.all([S.listBankAccounts(), S.listCryptoAccounts(), S.getSettings()]);
  root.innerHTML = headHtml("Yatırım Yöntemleri", "Müşterilerin para yatırırken göreceği banka hesapları ve kripto cüzdanları.") + `
    <div class="panel-settings-card">
      <div class="panel-settings-card-head"><span class="panel-settings-card-title">Yatırım Ayarları</span><button class="panel-row-action" id="editSettings">Düzenle</button></div>
      <div class="panel-settings-summary">
        <div class="panel-settings-summary-item"><span class="panel-settings-summary-l">Minimum Yatırım</span><span class="panel-settings-summary-v mono">${settings.minDeposit > 0 ? "$" + money(settings.minDeposit) : "—"}</span></div>
        <div class="panel-settings-summary-item"><span class="panel-settings-summary-l">Banka Dekontu Zorunlu</span><span class="panel-settings-summary-v ${settings.depositReceiptRequired ? "gain" : ""}">${settings.depositReceiptRequired ? "Açık" : "Kapalı"}</span></div>
      </div>
    </div>
    <div class="panel-tabs"><button class="panel-tab ${payTab === "bank" ? "active" : ""}" data-tab="bank">Banka Hesapları</button><button class="panel-tab ${payTab === "crypto" ? "active" : ""}" data-tab="crypto">Kripto Cüzdanları</button></div>
    <div id="payBody"></div>`;
  root.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { payTab = b.dataset.tab; render(); });
  $("#editSettings").onclick = () => editSettings(settings);
  const body = $("#payBody");
  if (payTab === "bank") {
    body.innerHTML = `<form class="panel-minimal-form" id="bankForm"><div class="panel-minimal-form-title">Banka Hesabı Ekle</div>
      <div class="panel-minimal-form-row">
        <div class="field-wrap compact" style="flex:1.2"><input class="field-i" id="b_name" required placeholder="Banka Adı" /></div>
        <div class="field-wrap compact" style="flex:1"><input class="field-i" id="b_holder" placeholder="Hesap Sahibi" /></div>
        <div class="field-wrap compact" style="flex:1.5"><input class="field-i" id="b_iban" required placeholder="IBAN" /></div>
        <div class="field-wrap compact" style="flex:1"><input class="field-i" id="b_note" placeholder="Açıklama" /></div>
        <button class="btn btn-primary panel-minimal-form-btn">+ Ekle</button></div></form>
      <div class="panel-table-wrap">${banks.length ? `<table class="panel-table"><thead><tr><th>Banka</th><th>Hesap Sahibi</th><th>IBAN</th><th>Açıklama</th><th></th></tr></thead><tbody>${
        banks.map((b) => `<tr><td>${esc(b.bankName)}</td><td>${esc(b.holder || "—")}</td><td class="mono">${esc(b.iban)}</td><td>${esc(b.note || "—")}</td><td style="text-align:right"><button class="panel-row-action danger" data-del="${b.id}">Sil</button></td></tr>`).join("")
      }</tbody></table>` : emptyBox("Henüz banka hesabı yok.")}</div>`;
    $("#bankForm").onsubmit = async (e) => { e.preventDefault(); if (!$("#b_name").value || !$("#b_iban").value) return; await S.addBankAccount({ bankName: $("#b_name").value, holder: $("#b_holder").value, iban: $("#b_iban").value, note: $("#b_note").value }); render(); };
    body.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { await S.removeBankAccount(b.dataset.del); render(); });
  } else {
    body.innerHTML = `<form class="panel-minimal-form" id="cryForm"><div class="panel-minimal-form-title">Kripto Cüzdanı Ekle</div>
      <div class="panel-minimal-form-row">
        <div class="field-wrap compact" style="flex:0 0 110px"><select class="field-i" id="c_net"><option>TRC20</option><option>ERC20</option><option>BEP20</option></select></div>
        <div class="field-wrap compact" style="flex:0 0 110px"><select class="field-i" id="c_tok"><option>USDT</option><option>USDC</option><option>BTC</option><option>ETH</option></select></div>
        <div class="field-wrap compact" style="flex:2"><input class="field-i" id="c_addr" required placeholder="Cüzdan Adresi" /></div>
        <div class="field-wrap compact" style="flex:1"><input class="field-i" id="c_note" placeholder="Açıklama" /></div>
        <button class="btn btn-primary panel-minimal-form-btn">+ Ekle</button></div></form>
      <div class="panel-table-wrap">${cryptos.length ? `<table class="panel-table"><thead><tr><th>Ağ</th><th>Token</th><th>Adres</th><th>Açıklama</th><th></th></tr></thead><tbody>${
        cryptos.map((c) => `<tr><td>${esc(c.network)}</td><td>${esc(c.token)}</td><td class="mono">${esc(c.address)}</td><td>${esc(c.note || "—")}</td><td style="text-align:right"><button class="panel-row-action danger" data-del="${c.id}">Sil</button></td></tr>`).join("")
      }</tbody></table>` : emptyBox("Henüz kripto cüzdanı yok.")}</div>`;
    $("#cryForm").onsubmit = async (e) => { e.preventDefault(); if (!$("#c_addr").value) return; await S.addCryptoAccount({ network: $("#c_net").value, token: $("#c_tok").value, address: $("#c_addr").value, note: $("#c_note").value }); render(); };
    body.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { await S.removeCryptoAccount(b.dataset.del); render(); });
  }
}
function editSettings(cur) {
  const ov = modal("Yatırım Ayarları", `
    <div class="field-group"><label class="field-l">Minimum Yatırım (USD)</label><div class="field-wrap">${FIELD_ICO.dollar}<input class="field-i" id="st_min" type="number" min="0" step="any" value="${cur.minDeposit || 0}" /></div></div>
    <label class="checkbox" style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><input type="checkbox" id="st_rcpt" ${cur.depositReceiptRequired ? "checked" : ""} /><span>Banka havalesinde dekont zorunlu</span></label>`,
    "Kaydet");
  $("#modalOk", ov).onclick = async () => { const n = parseFloat($("#st_min", ov).value); await S.updateSettings({ minDeposit: Number.isFinite(n) && n > 0 ? n : 0, depositReceiptRequired: $("#st_rcpt", ov).checked }); ov.remove(); render(); };
}

// ====================== DESTEK TALEPLERİ ======================
const tkState = { q: "", statusFilter: "active", page: 1, activeId: null };
async function renderTickets(root) {
  S.purgeOldClosedTickets(30).catch(() => {});
  const [all, users] = await Promise.all([S.listTickets(), S.listUsers()]);
  const um = {}; users.forEach((u) => (um[u.id] = u));
  const needle = tkState.q.trim().toLowerCase();
  const filtered = all.filter((tk) => {
    if (tkState.statusFilter === "active" && tk.status === "closed") return false;
    if (tkState.statusFilter !== "all" && tkState.statusFilter !== "active" && tk.status !== tkState.statusFilter) return false;
    if (needle) { const u = um[tk.userId]; if (!`${tk.subject} ${u?.name || ""} ${u?.email || ""}`.toLowerCase().includes(needle)) return false; }
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / TICKETS_PER_PAGE));
  if (tkState.page > pageCount) tkState.page = 1;
  const paged = filtered.slice((tkState.page - 1) * TICKETS_PER_PAGE, tkState.page * TICKETS_PER_PAGE);
  if (!paged.find((p) => p.id === tkState.activeId)) tkState.activeId = paged[0]?.id || null;
  const filters = searchBox("q", "Konu, müşteri ya da e-posta ara...") +
    `<select class="panel-filter-select" id="stf"><option value="active">Aktif Talepler</option><option value="awaiting_admin">Admin yanıtı bekleniyor</option><option value="awaiting_user">Sizden yanıt bekleniyor</option><option value="open">Açık</option><option value="closed">Kapalı</option><option value="all">Durum: Hepsi</option></select>`;
  root.innerHTML = headHtml("Destek Talepleri", `${filtered.length} / ${all.length}`, filters) +
    (filtered.length ? `<div class="panel-tickets-layout"><div class="panel-ticket-list" id="tkList"></div><div class="panel-ticket-view" id="tkView"></div></div>${pagerHtml(tkState, pageCount, filtered.length)}` : `<div class="panel-card">${emptyBox("Talep yok.")}</div>`);
  const stf = $("#stf"); if (stf) { stf.value = tkState.statusFilter; stf.onchange = () => { tkState.statusFilter = stf.value; tkState.page = 1; render(); }; }
  wireSearch(root, tkState, renderTickets);
  wirePager(root, tkState, renderTickets);
  const listEl = $("#tkList");
  if (listEl) {
    listEl.innerHTML = paged.map((tk) => `<button class="panel-ticket-item ${tkState.activeId === tk.id ? "active" : ""} ${tk.status === "awaiting_admin" ? "unread" : ""}" data-tk="${tk.id}">
      <div class="panel-ticket-item-subj"><span class="panel-ticket-item-subj-text">${esc(tk.subject)}</span>${badge(tk.status)}</div>
      <div class="panel-ticket-item-meta"><span>${esc(um[tk.userId]?.name || "—")}</span><span>·</span><span>${fmtDate(tk.updatedAt)}</span></div></button>`).join("");
    listEl.querySelectorAll("[data-tk]").forEach((b) => b.onclick = () => { tkState.activeId = b.dataset.tk; render(); });
    if (tkState.activeId) await renderAdminTicketView($("#tkView"), tkState.activeId, um);
  }
}

async function renderAdminTicketView(wrap, ticketId, um) {
  const tk = await S.getTicket(ticketId);
  if (!tk) { wrap.innerHTML = `<div class="panel-empty">—</div>`; return; }
  const u = um[tk.userId];
  const msgs = tk.messages.map((m) => {
    if (m.author === "system") return `<div class="ticket-msg system">${esc(m.body)}</div>`;
    if (m.meta && m.meta.type === "mt5_creds") { const c = m.meta; return `<div class="ticket-msg admin"><div class="ticket-mt5"><div class="ticket-mt5-title">MT5 Hesap Bilgileri</div><dl class="panel-mt5-creds"><dt>Login</dt><dd class="mono">${esc(c.login || "")}</dd><dt>Sunucu</dt><dd class="mono">${esc(c.server || "")}</dd><dt>Ana Şifre</dt><dd class="mono">${esc(c.password || "")}</dd>${c.investor ? `<dt>Yatırımcı</dt><dd class="mono">${esc(c.investor)}</dd>` : ""}</dl></div></div>`; }
    return `<div class="ticket-msg ${m.author === "customer" ? "admin" : "customer"}">${esc(m.body)}<div class="ticket-msg-time">${fmtDateTime(m.createdAt)}</div></div>`;
  }).join("");
  wrap.innerHTML = `<div class="panel-ticket-view-head"><div><div class="panel-ticket-view-subj">${esc(tk.subject)}</div><div class="panel-side-user-email">${esc(u?.name || "")} · ${esc(u?.email || "")}</div></div>
      <div class="panel-row-actions">${tk.status !== "closed" ? `<button class="panel-row-action" id="sendMt5">MT5 Bilgisi Gönder</button><button class="panel-row-action danger" id="closeTk">Talebi Kapat</button>` : `<button class="panel-row-action" id="reopenTk">Yeniden Aç</button>`}</div></div>
    <div class="panel-ticket-thread">${msgs || '<div class="panel-empty">—</div>'}</div>
    ${tk.status !== "closed" ? `<div class="panel-ticket-reply"><input class="field-i" id="tk_reply" placeholder="Yanıtınızı yazın..." /><button class="btn btn-primary" id="tk_send">Gönder</button></div>` : ""}`;
  const send = $("#tk_send"); if (send) send.onclick = async () => { const body = $("#tk_reply").value.trim(); if (!body) return; send.disabled = true; await S.postMessage(tk.id, { author: "admin", body }); render(); };
  const close = $("#closeTk"); if (close) close.onclick = async () => { await S.updateTicket(tk.id, { status: "closed" }); render(); };
  const reopen = $("#reopenTk"); if (reopen) reopen.onclick = async () => { await S.updateTicket(tk.id, { status: "awaiting_admin" }); render(); };
  const sm = $("#sendMt5"); if (sm) sm.onclick = () => sendMt5Creds(tk.id);
}

function sendMt5Creds(ticketId) {
  const ov = modal("MT5 Bilgilerini Gönder", `
    <div class="panel-form-row"><div class="field-group"><label class="field-l">MT5 Login</label><div class="field-wrap">${FIELD_ICO.key}<input class="field-i" id="m_login" required /></div></div>
      <div class="field-group"><label class="field-l">Sunucu</label><div class="field-wrap">${FIELD_ICO.server}<input class="field-i" id="m_server" value="TrustCapital-Live" required /></div></div></div>
    <div class="panel-form-row"><div class="field-group"><label class="field-l">Ana Şifre</label><div class="field-wrap">${FIELD_ICO.lock}<input class="field-i" id="m_pass" required /></div></div>
      <div class="field-group"><label class="field-l">Yatırımcı Şifresi</label><div class="field-wrap">${FIELD_ICO.eye}<input class="field-i" id="m_inv" /></div></div></div>`, "MT5 Bilgilerini İlet");
  $("#modalOk", ov).onclick = async () => {
    const meta = { type: "mt5_creds", login: $("#m_login", ov).value, server: $("#m_server", ov).value, password: $("#m_pass", ov).value, investor: $("#m_inv", ov).value };
    if (!meta.login || !meta.server || !meta.password) return;
    await S.postMessage(ticketId, { author: "admin", body: "MT5 hesap bilgileriniz gönderildi.", meta });
    ov.remove(); render();
  };
}

// ====================== MÜŞTERİ DÜZENLE ======================
async function renderUserEdit(root, userId) {
  const [u, prov, totals] = await Promise.all([S.getUser(userId), S.getProvisioningByUser(userId), S.userTotals(userId)]);
  if (!u) { root.innerHTML = `<div class="panel-card">${emptyBox("Müşteri bulunamadı.")}</div>`; return; }
  const kycUrls = { front: null, back: null };
  if (u.kycFrontPath) kycUrls.front = await S.kycUrl(u.kycFrontPath);
  if (u.kycBackPath) kycUrls.back = await S.kycUrl(u.kycBackPath);

  root.innerHTML = `
    <div class="panel-head"><div><button class="panel-back-link" id="back">← Müşteri listesine dön</button>
      <h1 class="panel-head-title">${esc(u.name)}</h1><p class="panel-head-sub">Müşteri bilgilerini düzenle</p></div>
      <div class="panel-head-actions"><button class="panel-row-action danger" id="delUser">Müşteriyi Sil</button></div></div>

    <form class="panel-form-card panel-form" id="editForm">
      <div class="panel-card-head"><div class="panel-card-title">Müşteri Detay</div><span class="panel-section-meta">${esc(u.email)}</span></div>
      <div class="panel-form-row">
        <div class="field-group"><label class="field-l">Ad Soyad</label><div class="field-wrap">${FIELD_ICO.user}<input class="field-i" id="f_name" value="${esc(u.name)}" required /></div></div>
        <div class="field-group"><label class="field-l">E-posta</label><div class="field-wrap">${FIELD_ICO.subject}<input class="field-i" id="f_email" type="email" value="${esc(u.email)}" required /></div></div>
      </div>
      <div class="panel-form-row">
        <div class="field-group"><label class="field-l">Telefon</label><div class="field-wrap">${FIELD_ICO.note}<input class="field-i" id="f_phone" value="${esc(u.phone || "")}" /></div></div>
        <div class="field-group"><label class="field-l">MT5 Hesap No</label><div class="field-wrap">${FIELD_ICO.key}<input class="field-i" id="f_mt5" value="${esc(u.mt5Account || "")}" /></div></div>
      </div>
      <div class="field-group"><label class="field-l">KYC Durumu</label><div class="field-wrap">${FIELD_ICO.tag}<select class="field-i" id="f_kyc">
        ${["pending", "reviewing", "verified", "rejected"].map((k) => `<option value="${k}" ${u.kycStatus === k ? "selected" : ""}>${KYC_TR[k]}</option>`).join("")}</select></div></div>

      <div class="panel-form-card" style="margin-top:4px">
        <div class="panel-card-head"><div class="panel-card-title">Kimlik Belgeleri</div><span class="panel-section-meta">${badge(u.kycStatus === "verified" ? "approved" : u.kycStatus === "rejected" ? "rejected" : u.kycStatus === "reviewing" ? "assigned" : "pending")}${u.kycScore != null ? " · AI skoru: " + Math.round(u.kycScore) + "%" : ""}</span></div>
        ${(u.kycFrontPath || u.kycBackPath) ? `<div class="kyc-admin-grid">
          <a class="kyc-admin-doc" href="${kycUrls.front || "#"}" target="_blank">${kycUrls.front ? `<img src="${kycUrls.front}" alt="Ön Yüz" />` : `<div class="kyc-admin-empty">—</div>`}<span class="kyc-admin-label">Ön Yüz</span></a>
          <a class="kyc-admin-doc" href="${kycUrls.back || "#"}" target="_blank">${kycUrls.back ? `<img src="${kycUrls.back}" alt="Arka Yüz" />` : `<div class="kyc-admin-empty">—</div>`}<span class="kyc-admin-label">Arka Yüz</span></a>
        </div>` : `<div class="panel-empty" style="padding:20px">Henüz kimlik belgesi yüklenmedi.</div>`}
        <div class="kyc-admin-actions">
          ${u.kycStatus !== "verified" ? `<button type="button" class="btn btn-primary" data-kyc="verified">✓ KYC'yi Onayla</button>${u.kycStatus !== "rejected" ? `<button type="button" class="btn btn-ghost" data-kyc="rejected">Reddet</button>` : ""}` : `<button type="button" class="btn btn-ghost" data-kyc="pending">Doğrulamayı Kaldır</button>`}
        </div>
      </div>

      <div class="field-group"><label class="field-l">Panel Giriş Şifresi</label><div class="field-wrap">${FIELD_ICO.lock}<input class="field-i mono" readonly value="${esc(u.loginPassword || "")}" placeholder="Kayıt sırasında yakalanmadı" /></div>
        <div class="panel-detail-reset-sub" style="margin-top:6px">Müşterinin kayıt sırasında belirlediği panel giriş şifresi.</div></div>

      <div class="panel-form-actions"><button type="button" class="btn btn-ghost" id="cancelEdit">Vazgeç</button><button type="submit" class="btn btn-primary">Kaydet</button></div>
      <div class="msg" id="editMsg"></div>
    </form>`;

  renderBalanceCard(root, userId, totals);
  renderMt5Section(root, u, prov);
  renderTxHistory(root, userId);

  $("#back", root).onclick = () => { editUserId = null; render(); };
  $("#cancelEdit", root).onclick = () => { editUserId = null; render(); };
  $("#editForm", root).onsubmit = async (e) => {
    e.preventDefault();
    await S.updateUser(u.id, { name: $("#f_name").value.trim(), email: $("#f_email").value.trim(), phone: $("#f_phone").value.trim(), kycStatus: $("#f_kyc").value, mt5Account: $("#f_mt5").value.trim() || null });
    const m = $("#editMsg"); m.className = "msg ok"; m.textContent = "Değişiklikler kaydedildi."; setTimeout(() => (m.textContent = ""), 1500);
  };
  root.querySelectorAll("[data-kyc]").forEach((b) => b.onclick = async () => { await S.updateUser(u.id, { kycStatus: b.dataset.kyc }); render(); });
  $("#delUser", root).onclick = async () => {
    if (!confirm(`${u.name} (${u.email}) ve tüm ilgili kayıtları (işlemler, talepler, MT5, belgeler) kalıcı olarak silinecek. Devam edilsin mi?`)) return;
    try { if (await S.deleteUser(u.id)) { editUserId = null; view = u.mt5Account ? "investors" : "prospects"; render(); } else alert("Bu hesap silinemez."); }
    catch (e) { alert("Silinemedi: " + e.message); }
  };
}

function renderBalanceCard(root, userId, totals) {
  const card = el("div", "panel-form-card panel-balance-card");
  card.style.marginTop = "20px";
  card.innerHTML = `<div class="panel-card-head"><div class="panel-card-title">Bakiye Yönetimi</div></div>
    <div class="panel-balance-stats">
      <div class="panel-balance-stat primary"><div class="l">Güncel Bakiye</div><div class="v"><span class="cur">$</span>${money(totals.balance)}</div></div>
      <div class="panel-balance-stat"><div class="l">Toplam Yatırım</div><div class="v gain">+$${money(totals.deposited)}</div></div>
      <div class="panel-balance-stat"><div class="l">Toplam Çekim</div><div class="v loss">−$${money(totals.withdrawn)}</div></div>
    </div>
    <div class="msg" id="balMsg"></div>
    <form class="panel-balance-form" id="balForm">
      <div class="field-group"><label class="field-l">İşlem Türü</label>
        <div class="panel-balance-toggle"><button type="button" class="panel-balance-toggle-btn active credit" data-dir="credit">+ Bakiye Ekle</button><button type="button" class="panel-balance-toggle-btn" data-dir="debit">− Bakiyeden Düş</button></div></div>
      <div class="panel-form-row">
        <div class="field-group"><label class="field-l">Tutar</label><div class="field-wrap">${FIELD_ICO.dollar}<input class="field-i" id="bal_amount" type="number" min="0" step="0.01" placeholder="0.00" /></div></div>
        <div class="field-group"><label class="field-l">Kategori</label><div class="field-wrap">${FIELD_ICO.tag}<select class="field-i" id="bal_cat"><option value="deposit">Para Yatırma</option><option value="bonus">Bonus</option><option value="adjustment">Düzeltme</option></select></div></div>
      </div>
      <div class="field-group"><label class="field-l">Açıklama (müşteriye gösterilir)</label><div class="field-wrap">${FIELD_ICO.note}<input class="field-i" id="bal_note" maxlength="160" placeholder="Örn. Hoş geldin bonusu" /></div></div>
      <div class="panel-form-actions"><button type="submit" class="btn btn-primary" id="balSubmit">Uygula</button></div>
    </form>`;
  root.appendChild(card);
  let dir = "credit";
  card.querySelectorAll("[data-dir]").forEach((b) => b.onclick = () => {
    dir = b.dataset.dir;
    card.querySelectorAll("[data-dir]").forEach((x) => x.classList.remove("active", "credit", "debit"));
    b.classList.add("active", dir);
    $("#bal_cat", card).innerHTML = dir === "credit"
      ? `<option value="deposit">Para Yatırma</option><option value="bonus">Bonus</option><option value="adjustment">Düzeltme</option>`
      : `<option value="adjustment">Düzeltme</option><option value="correction">Düzeltme (Eksiltme)</option>`;
    $("#balSubmit", card).className = `btn ${dir === "debit" ? "btn-danger" : "btn-primary"}`;
  });
  $("#balForm", card).onsubmit = async (e) => {
    e.preventDefault();
    const amount = Number($("#bal_amount", card).value) || 0;
    const m = $("#balMsg", card);
    if (!(amount > 0)) { m.className = "msg err"; m.textContent = "Lütfen geçerli bir tutar girin."; return; }
    $("#balSubmit", card).disabled = true;
    try {
      await S.adminAdjustBalance({ userId, amount, direction: dir, category: $("#bal_cat", card).value, note: $("#bal_note", card).value.trim() || null });
      m.className = "msg ok"; m.textContent = "Bakiye güncellendi ve müşteriye bildirim gönderildi.";
      render();
    } catch (e2) { m.className = "msg err"; m.textContent = "İşlem başarısız: " + e2.message; $("#balSubmit", card).disabled = false; }
  };
}

function renderMt5Section(root, u, prov) {
  const card = el("div", "panel-form-card");
  card.style.marginTop = "20px";
  const active = prov && prov.status === "active";
  card.innerHTML = `<div class="panel-card-head"><div class="panel-card-title">MT5 Hesap Bilgileri</div><span class="panel-section-meta">${prov ? (prov.status === "active" ? "Aktif" : prov.status === "assigned" ? "Müşteri Onayı Bekleniyor" : "Atama Bekliyor") : "—"}</span></div>
    ${prov && prov.status !== "pending" ? `<dl class="panel-mt5-creds" style="padding:8px 0 16px"><dt>Login</dt><dd class="mono">${esc(prov.login || "—")}</dd><dt>Sunucu</dt><dd class="mono">${esc(prov.server || "—")}</dd><dt>Ana Şifre</dt><dd class="mono">${esc(prov.password || "—")}</dd>${prov.investor ? `<dt>Yatırımcı Şifresi</dt><dd class="mono">${esc(prov.investor)}</dd>` : ""}</dl>
      <div class="panel-form-actions"><button class="btn btn-primary" id="mt5Update">MT5 Bilgilerini Güncelle</button></div>`
    : `<p class="panel-side-user-email" style="padding:8px 0">Bu müşteri için henüz MT5 bilgisi gönderilmedi.</p><div class="panel-form-actions"><button class="btn btn-primary" id="mt5Assign">MT5 Bilgisi Ata</button></div>`}`;
  root.appendChild(card);
  const up = $("#mt5Update", card); if (up) up.onclick = () => openProvisionModal(u.id);
  const as = $("#mt5Assign", card); if (as) as.onclick = () => openProvisionModal(u.id);
}

async function renderTxHistory(root, userId) {
  const card = el("div", "panel-form-card"); card.style.marginTop = "20px";
  card.innerHTML = `<div class="panel-card-head"><div class="panel-card-title">Para Hareketleri Geçmişi</div></div><div id="txh"></div>`;
  root.appendChild(card);
  const txs = await S.listTransactions(userId);
  $("#txh", card).innerHTML = txs.length ? `<table class="panel-table"><thead><tr><th>Tarih</th><th>Tip</th><th>Yöntem</th><th>Tutar</th><th>Durum</th></tr></thead><tbody>${
    txs.slice(0, 20).map((tx) => `<tr><td>${fmtDate(tx.createdAt)}</td><td>${tx.type === "deposit" ? "Yatırım" : "Çekim"}</td><td class="mono" style="text-transform:uppercase;font-size:12px">${esc(tx.method || "—")}</td><td class="mono ${tx.type === "deposit" ? "gain" : "loss"}">${tx.type === "deposit" ? "+" : "−"}$${money(tx.amount)}</td><td>${badge(tx.status)}</td></tr>`).join("")
  }</tbody></table>` : `<div class="panel-empty" style="padding:16px">Henüz işlem yok.</div>`;
}

// ---------- MT5 atama / düzenleme modalı ----------
async function openProvisionModal(userId) {
  const [u, prov0] = await Promise.all([S.getUser(userId), S.getProvisioningByUser(userId)]);
  // bekleyen satır yoksa oluştur (admin ataması)
  let prov = prov0;
  if (!prov) { await S.requestAdditionalMt5(userId); prov = await S.getProvisioningByUser(userId); }
  const isEdit = prov && prov.status !== "pending";
  const ov = modal(isEdit ? "MT5 Bilgilerini Güncelle" : "MT5 Bilgilerini Ata", `
    <div class="panel-side-user-email" style="margin-bottom:12px">${esc(u.name)} · ${esc(u.email)}</div>
    <div class="panel-form-row"><div class="field-group"><label class="field-l">MT5 Login</label><div class="field-wrap">${FIELD_ICO.key}<input class="field-i" id="p_login" value="${esc(prov.login || "")}" required /></div></div>
      <div class="field-group"><label class="field-l">Sunucu</label><div class="field-wrap">${FIELD_ICO.server}<input class="field-i" id="p_server" value="${esc(prov.server || "TrustCapital-Live")}" required /></div></div></div>
    <div class="panel-form-row"><div class="field-group"><label class="field-l">Ana Şifre</label><div class="field-wrap">${FIELD_ICO.lock}<input class="field-i" id="p_pass" value="${esc(prov.password || "")}" required /></div></div>
      <div class="field-group"><label class="field-l">Yatırımcı Şifresi</label><div class="field-wrap">${FIELD_ICO.eye}<input class="field-i" id="p_inv" value="${esc(prov.investor || "")}" required /></div></div></div>`,
    isEdit ? "Kaydet" : "MT5 Bilgilerini İlet");
  $("#modalOk", ov).onclick = async () => {
    const creds = { login: $("#p_login", ov).value, server: $("#p_server", ov).value, password: $("#p_pass", ov).value, investor: $("#p_inv", ov).value };
    if (!creds.login || !creds.server || !creds.password || !creds.investor) return;
    if (isEdit) await S.updateProvisioning(prov.id, creds); else await S.assignProvisioning(prov.id, creds);
    ov.remove(); render();
  };
}

// ---------- ortak modal ----------
function modal(title, bodyHtml, okLabel) {
  const ov = el("div", "panel-drawer-overlay");
  ov.innerHTML = `<div class="panel-drawer"><div class="panel-drawer-head"><div class="panel-drawer-title">${esc(title)}</div><button class="panel-drawer-close">✕</button></div>
    <div class="panel-form">${bodyHtml}<div class="panel-form-actions"><button class="btn btn-ghost" id="modalCancel">Vazgeç</button><button class="btn btn-primary" id="modalOk">${esc(okLabel)}</button></div></div></div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelector(".panel-drawer-close").onclick = close;
  $("#modalCancel", ov).onclick = close;
  return ov;
}

boot();
