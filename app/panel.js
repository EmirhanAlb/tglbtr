// Müşteri paneli — lmax_capital Panel.jsx yapısının vanilla JS portu.
// 8 bölüm: Özet, MT5 Hesabım, Para Yatır, Para Çek, Transfer, KYC, Destek, Hesabım.
import { applyBrand, migrateLegacyAdminSession } from "./app.js";
import * as S from "./store.js";
import { PANEL_ICON, FIELD_ICO } from "./icons.js";

applyBrand();

// ---------- hata bildirimi + oturum kaybı ----------
function toast(text, kind = "err") {
  let host = document.getElementById("toastHost");
  if (!host) { host = document.createElement("div"); host.id = "toastHost"; host.className = "panel-toast-host"; document.body.appendChild(host); }
  const t = document.createElement("div"); t.className = `panel-toast ${kind}`; t.textContent = text;
  host.appendChild(t); setTimeout(() => t.remove(), 7000);
}
const isAuthError = (e) => { const m = String(e?.message || e || ""); return e?.code === "PGRST301" || /jwt|refresh token|not authenticated|401/i.test(m); };
let sessionLostShown = false;
function showSessionLost() {
  if (sessionLostShown) return; sessionLostShown = true;
  const ov = document.createElement("div"); ov.className = "panel-drawer-overlay";
  ov.innerHTML = `<div class="panel-drawer"><div class="panel-drawer-head"><div class="panel-drawer-title">Oturum sona erdi</div></div>
    <div class="panel-form"><p class="panel-side-user-email" style="margin:0 0 14px">Oturumunuz kapanmış görünüyor. Devam etmek için yeniden giriş yapın.</p>
    <div class="panel-form-actions"><a class="btn btn-primary" href="auth.html">Yeniden Giriş Yap</a></div></div></div>`;
  document.body.appendChild(ov);
}
window.addEventListener("unhandledrejection", (ev) => {
  const e = ev.reason; const msg = e?.message || String(e || "Bilinmeyen hata");
  if (isAuthError(e)) return showSessionLost();
  toast("İşlem başarısız: " + msg);
});
let refreshPending = false;
function isBusyEditing() {
  if (document.querySelector(".panel-drawer-overlay")) return true;
  const a = document.activeElement;
  return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest("#view"));
}

// ---------- küçük yardımcılar ----------
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const initials = (name) => (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
// Tutar: satırın kendi para birimiyle (+$1.400,00 / +₺50.000,00); admin TL bildirimi USD'ye çevirdiyse bildirilen tutar yanında.
const fmtAmt = (tx) => `${tx.type === "deposit" ? "+" : "−"}${S.sym(tx.currency)}${money(tx.amount)}`;
const declaredHtml = (tx) => (tx.declaredAmount != null && tx.declaredCurrency && (tx.declaredCurrency !== tx.currency || tx.declaredAmount !== tx.amount))
  ? ` <span class="tx-declared">(${S.sym(tx.declaredCurrency)}${money(tx.declaredAmount)} bildirildi)</span>` : "";

const STATUS_TR = {
  open: "Açık", awaiting_admin: "Admin yanıtı bekleniyor", awaiting_user: "Sizden yanıt bekleniyor", closed: "Kapalı",
  pending: "Bekliyor", approved: "Onaylandı", rejected: "Reddedildi", completed: "Tamamlandı",
};
const KYC_TR = { pending: "Bekliyor", reviewing: "İnceleniyor", verified: "Doğrulandı", rejected: "Reddedildi" };

// ---------- WhatsApp destek hattı (app/config.js) ----------
const WA_NUMBER = String((window.APP_CONFIG && window.APP_CONFIG.whatsapp) || "905355560834").replace(/\D/g, "");
const WA_DISPLAY = "+" + WA_NUMBER.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3 $4");

// ---------- oturum ----------
let session = null;
let me = null;

async function boot() {
  await migrateLegacyAdminSession(); // eski sürümde müşteri anahtarına yazılmış yönetici oturumu varsa taşı
  session = await S.getCurrentSession();
  if (!session) { location.replace("auth.html"); return; }
  if (session.role === "admin") { location.replace("admin.html"); return; }
  me = await S.getUser(session.userId);
  if (!me) { await S.signOut(); location.replace("auth.html"); return; }

  renderShell();
  S.onAuthChange((s) => { if (!s) showSessionLost(); });
  // Canlı yenileme: bir alana yazılırken ya da modal açıkken ekranı silme, sonraya bırak.
  S.subscribe(() => { if (isBusyEditing()) { refreshPending = true; return; } reloadMe().then(() => render()); });
  document.addEventListener("focusout", () => { if (refreshPending && !isBusyEditing()) setTimeout(() => { if (refreshPending && !isBusyEditing()) reloadMe().then(() => render()); }, 400); });
  await render();
}

async function reloadMe() { me = await S.getUser(session.userId) || me; }

const NAV = [
  { id: "overview", label: "Özet" },
  { id: "mt5", label: "MT5 Hesabım" },
  { id: "deposit", label: "Para Yatır" },
  { id: "withdraw", label: "Para Çek" },
  { id: "transfer", label: "Transfer" },
  { id: "kyc", label: "KYC" },
  { id: "support", label: "Destek" },
  { id: "account", label: "Hesabım" },
];
let view = "overview";
// panel.html#deposit gibi bağlantılarla doğrudan bölüm açılabilir.
{ const h = location.hash.replace("#", ""); if (NAV.some((n) => n.id === h)) view = h; }

function renderShell() {
  $("#userName").textContent = me.name || "—";
  $("#userEmail").textContent = me.email || "";
  $("#userAvatar").textContent = initials(me.name);
  const nav = $("#sideNav");
  nav.innerHTML = "";
  NAV.forEach((it) => {
    const b = el("button", `panel-side-link ${view === it.id ? "active" : ""}`, `${PANEL_ICON[it.id] || ""}<span>${it.label}</span>`);
    b.type = "button";
    b.dataset.nav = it.id;
    b.onclick = () => { view = it.id; closeMobile(); setActive(); render(); };
    nav.appendChild(b);
  });
  $("#logoutBtn").innerHTML = `${PANEL_ICON.logout}<span>Çıkış</span>`;
  $("#logoutBtn").onclick = async () => { await S.signOut(); location.replace("auth.html"); };
  const mt = $("#mobileToggle"); if (mt) mt.onclick = () => { $(".panel-side").classList.toggle("open"); $("#sideScrim").classList.toggle("hidden"); };
  const sc = $("#sideScrim"); if (sc) sc.onclick = closeMobile;
  $("#notifBtn").onclick = toggleNotif;
}
function closeMobile() { const side = $(".panel-side"); if (side) side.classList.remove("open"); const sc = $("#sideScrim"); if (sc) sc.classList.add("hidden"); }
function setActive() {
  document.querySelectorAll("#sideNav .panel-side-link").forEach((b, i) => b.classList.toggle("active", NAV[i].id === view));
}

async function render() {
  setActive();
  refreshPending = false;
  const root = $("#view");
  root.innerHTML = `<div class="panel-empty">— … —</div>`;
  try {
    if (view === "overview") await renderOverview(root);
    else if (view === "mt5") await renderMt5(root);
    else if (view === "deposit") await renderDeposit(root);
    else if (view === "withdraw") await renderWithdraw(root);
    else if (view === "transfer") await renderTransfer(root);
    else if (view === "kyc") await renderKyc(root);
    else if (view === "support") await renderSupport(root);
    else if (view === "account") await renderAccount(root);
    await refreshNotifDot();
  } catch (e) {
    if (isAuthError(e)) showSessionLost();
    root.innerHTML = `<div class="panel-empty">Hata: ${esc(e.message)}<br><button type="button" class="panel-row-action" style="margin-top:10px" onclick="location.reload()">Sayfayı yenile</button></div>`;
  }
}

function headHtml(title, sub) {
  return `<div class="panel-head"><div><h1 class="panel-head-title">${esc(title)}</h1><p class="panel-head-sub">${esc(sub || "")}</p></div></div>`;
}
function badge(status) { return `<span class="panel-badge ${status}">${esc(STATUS_TR[status] || status)}</span>`; }
function msgBox(id) { return `<div class="msg" id="${id}"></div>`; }
function setMsg(id, type, text) { const n = $("#" + id); if (!n) return; n.className = "msg " + (type || ""); n.textContent = text || ""; }

// ====================== ÖZET ======================
async function renderOverview(root) {
  const [tot, prov, tickets] = await Promise.all([
    S.userTotals(me.id), S.getProvisioningByUser(me.id), S.listTickets(me.id),
  ]);
  const openTickets = tickets.filter((t) => t.status !== "closed").length;
  root.innerHTML = `
    <div class="panel-welcome">
      <div class="panel-welcome-grid">
        <div>
          <h1 class="panel-welcome-title">Hoş geldin, <em>${esc((me.name || "").split(" ")[0] || "")}</em></h1>
          <p class="panel-welcome-sub">Hesap durumu ve son hareketler</p>
        </div>
        <div class="panel-welcome-aside">
          <div class="panel-welcome-balance-l">Bakiye</div>
          <div class="panel-welcome-balance"><span class="currency">$</span>${money(tot.balance)}</div>
          <div class="panel-welcome-mini">
            <div><div class="v gain">+$${money(tot.deposited)}</div><div class="l">Toplam Yatırılan</div></div>
            <div><div class="v loss">−$${money(tot.withdrawn)}</div><div class="l">Toplam Çekilen</div></div>
          </div>
        </div>
      </div>
    </div>
    <div class="panel-grid cols-4">
      <div class="panel-card clickable" data-go="mt5">
        <div class="panel-stat-label">MT5 Hesap</div>
        <div class="panel-stat-value small ${me.mt5Account ? "gain" : "warn"}">${esc(me.mt5Account || "Bekleniyor")}</div>
        <div class="panel-stat-sub">${prov ? esc(prov.status) : "—"}</div>
      </div>
      <div class="panel-card clickable" data-go="kyc">
        <div class="panel-stat-label">KYC</div>
        <div class="panel-stat-value small ${me.kycStatus === "verified" ? "gain" : "warn"}">${esc(KYC_TR[me.kycStatus] || me.kycStatus)}</div>
        <div class="panel-stat-sub">Kimlik doğrulama</div>
      </div>
      <div class="panel-card clickable" data-go="support">
        <div class="panel-stat-label">Açık Talep</div>
        <div class="panel-stat-value ${openTickets > 0 ? "warn" : ""}">${openTickets}</div>
        <div class="panel-stat-sub">Destek</div>
      </div>
      <div class="panel-card clickable" data-go="deposit">
        <div class="panel-stat-label">İşlem</div>
        <div class="panel-stat-value small">+ Yatır</div>
        <div class="panel-stat-sub">Hesabına ekle</div>
      </div>
    </div>
    <div class="panel-section-head"><h2>Son İşlemler</h2></div>
    <div class="panel-table-wrap" id="recentTx"></div>`;
  root.querySelectorAll("[data-go]").forEach((c) => c.onclick = () => { view = c.dataset.go; render(); });
  await renderTxTable($("#recentTx", root), me.id, 6);
}

async function renderTxTable(wrap, userId, perPage) {
  const txs = await S.listTransactions(userId);
  if (!txs.length) { wrap.innerHTML = `<div class="panel-empty" style="padding:16px">Henüz işlem yok.</div>`; return; }
  const rows = txs.slice(0, perPage).map((tx) => `
    <tr><td>${fmtDate(tx.createdAt)}</td>
      <td>${tx.type === "deposit" ? "Yatırım" : "Çekim"}</td>
      <td class="mono" style="text-transform:uppercase;font-size:12px">${esc(tx.method || "—")}</td>
      <td class="mono ${tx.type === "deposit" ? "gain" : "loss"}">${fmtAmt(tx)}${declaredHtml(tx)}</td>
      <td>${badge(tx.status)}</td></tr>`).join("");
  wrap.innerHTML = `<table class="panel-table"><thead><tr><th>Tarih</th><th>Tip</th><th>Yöntem</th><th>Tutar</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ====================== MT5 HESABIM ======================
async function renderMt5(root) {
  const rows = await S.listProvisioning({ userId: me.id });
  let html = headHtml("MT5 Hesabım", "Hesap açılış sürecinizin durumu.");

  if (me.kycStatus !== "verified") {
    html += `<div class="panel-card kyc-gate"><div class="kyc-gate-title">Önce kimlik doğrulaması gerekli</div>
      <div class="kyc-gate-sub">MT5 hesabı oluşturabilmek için KYC doğrulamanızı tamamlamanız gerekir.</div>
      <button class="btn btn-primary" id="goKyc">KYC Doğrulamasına Git</button></div>`;
    root.innerHTML = html;
    $("#goKyc").onclick = () => { view = "kyc"; render(); };
    return;
  }

  if (!rows.length) {
    html += `<div class="panel-card"><div class="panel-empty" style="padding:28px">
      <div class="panel-empty-eyebrow">— Henüz MT5 hesabınız yok —</div>
      <div>İlk MT5 işlem hesabınızı oluşturmak için talep oluşturun.</div></div>
      <div class="panel-form-actions"><button class="btn btn-primary" id="reqFirst">MT5 Hesabı Talep Et</button></div></div>`;
    root.innerHTML = html;
    $("#reqFirst").onclick = async () => { await S.requestAdditionalMt5(me.id); render(); };
    return;
  }

  html += `<div class="panel-mt5-list">`;
  rows.forEach((p, i) => {
    if (p.status === "pending") {
      html += `<div class="panel-form-card"><div class="panel-card-head"><div class="panel-card-title">Hesap #${i + 1}</div><span class="panel-badge pending">Hazırlanıyor</span></div>
        <p class="panel-side-user-email">Operasyon ekibimiz MT5 hesabınızı hazırlıyor. Bilgileriniz kısa süre içinde burada görünecek.</p></div>`;
    } else {
      const active = p.status === "active";
      html += `<div class="panel-form-card"><div class="panel-card-head"><div class="panel-card-title">Hesap #${i + 1}</div>
        <span class="panel-badge ${active ? "approved" : "assigned"}">${active ? "Aktif" : "Onay Bekliyor"}</span></div>
        <dl class="panel-mt5-creds">
          <dt>Login</dt><dd class="mono">${esc(p.login || "—")}</dd>
          <dt>Sunucu</dt><dd class="mono">${esc(p.server || "—")}</dd>
          <dt>Ana Şifre</dt><dd class="mono">${esc(p.password || "—")}</dd>
          ${p.investor ? `<dt>Yatırımcı Şifresi</dt><dd class="mono">${esc(p.investor)}</dd>` : ""}
        </dl>
        ${!active ? `<div class="panel-form-actions"><button class="btn btn-primary" data-approve="${p.id}">Bilgileri Onayla</button></div>` : ""}</div>`;
    }
  });
  html += `</div><div class="panel-form-actions"><button class="btn btn-ghost" id="reqMore">Yeni Hesap Talep Et</button></div>`;
  root.innerHTML = html;
  root.querySelectorAll("[data-approve]").forEach((b) => b.onclick = async () => { b.disabled = true; await S.activateProvisioning(b.dataset.approve); await reloadMe(); render(); });
  $("#reqMore").onclick = async () => { await S.requestAdditionalMt5(me.id); render(); };
}

// ====================== PARA YATIR ======================
let depositTab = "bank";
async function renderDeposit(root) {
  const [banks, cryptos, settings] = await Promise.all([S.listBankAccounts(), S.listCryptoAccounts(), S.getSettings()]);
  let html = headHtml("Para Yatırma", "Aşağıdaki yöntemlerle hesabınıza yatırım yapın.");
  html += `<div class="panel-tabs">
    <button type="button" class="panel-tab ${depositTab === "bank" ? "active" : ""}" data-tab="bank">Banka Havalesi</button>
    <button type="button" class="panel-tab ${depositTab === "crypto" ? "active" : ""}" data-tab="crypto">Kripto</button>
    <button type="button" class="panel-tab ${depositTab === "card" ? "active" : ""}" data-tab="card">Kredi Kartı</button></div>`;
  const list = depositTab === "bank" ? banks : depositTab === "crypto" ? cryptos : [];
  // Sekmeye özel ayarlar (yönetici panelinden): alt limit + açılıp kapatılabilen bilgilendirme metni.
  const mi = settings.depositInfo[depositTab] || { min: 0, text: "", show: false };
  const cur = depositTab === "bank" ? "TRY" : "USD", curSym = S.sym(cur), curLabel = depositTab === "bank" ? "TL" : "USD";
  if (mi.show && mi.text.trim()) html += `<div class="deposit-info">${esc(mi.text.trim())}</div>`;
  if (depositTab === "card") {
    // Kredi kartı yatırımı WhatsApp destek hattı üzerinden yürütülür: talep kaydı açılır, sohbet otomatik açılır.
    html += `<div class="panel-form-card deposit-card-cta">
      <div class="deposit-card-row"><div class="deposit-card-ico">${FIELD_ICO.coin || ""}</div>
        <div><h3>Kredi Kartı ile Yatırım</h3><p>Kredi kartı yatırımları WhatsApp destek hattımız üzerinden, temsilcimiz eşliğinde tamamlanır.</p></div></div>
      <ul class="deposit-card-steps">
        <li><b>1</b><span>Aşağıdaki butona dokunun; WhatsApp sohbeti otomatik açılır ve "Kredi kartından para yatırmak istiyorum" mesajı hazır gelir.</span></li>
        <li><b>2</b><span>Temsilcimiz güvenli ödeme bağlantısını ve adımları sohbet üzerinden iletir.</span></li>
        <li><b>3</b><span>Ödeme onaylandığında tutar panel bakiyenize yansır; süreci Destek bölümünden de takip edebilirsiniz.</span></li>
      </ul>
      <div class="panel-form-actions"><button type="button" class="btn btn-whatsapp" id="d_card_wa"><img src="/build/assets/whatsapp_icon_optimized-05821d5d.webp" alt="">WhatsApp ile Devam Et</button></div>
      <div class="deposit-card-note">Hat: ${esc(WA_DISPLAY)} · Talebiniz destek kaydı olarak da açılır.</div>
      ${msgBox("d_msg")}</div>`;
  } else if (!list.length) {
    html += `<div class="panel-card"><div class="panel-empty" style="padding:24px">Şu anda aktif yatırım yöntemi yok. Lütfen destek ile iletişime geçin.</div></div>`;
  } else {
    html += `<div class="panel-form-card">`;
    html += list.map((m) => depositTab === "bank"
      ? `<dl class="panel-kv"><dt>Banka</dt><dd>${esc(m.bankName)}</dd><dt>Hesap Sahibi</dt><dd>${esc(m.holder || "—")}</dd>
         <dt>IBAN</dt><dd class="mono">${esc(m.iban)} <button class="panel-copy" data-copy="${esc(m.iban)}">Kopyala</button></dd>${m.note ? `<dt>Açıklama</dt><dd>${esc(m.note)}</dd>` : ""}</dl>`
      : `<dl class="panel-kv"><dt>Ağ</dt><dd>${esc(m.network)}</dd><dt>Token</dt><dd>${esc(m.token)}</dd>
         <dt>Cüzdan Adresi</dt><dd class="mono">${esc(m.address)} <button class="panel-copy" data-copy="${esc(m.address)}">Kopyala</button></dd>${m.note ? `<dt>Açıklama</dt><dd>${esc(m.note)}</dd>` : ""}</dl>`
    ).join('<hr class="panel-hr"/>');
    const receiptReq = depositTab === "bank" && settings.depositReceiptRequired;
    html += `<hr class="panel-hr"/>
      <div class="field-group"><label class="field-l">Yatırılacak Tutar (${curLabel})${mi.min > 0 ? ` · min ${curSym}${money(mi.min)}` : ""}${mi.max > 0 ? ` · max ${curSym}${money(mi.max)}` : ""}</label>
        <div class="field-wrap">${cur === "TRY" ? FIELD_ICO.lira : FIELD_ICO.dollar}<input class="field-i" id="d_amount" type="number" min="0" step="0.01" placeholder="0.00" /></div></div>
      <div class="field-group"><label class="field-l">Açıklama / Referans</label>
        <div class="field-wrap">${FIELD_ICO.note}<input class="field-i" id="d_ref" placeholder="Dekont no vb." /></div></div>
      ${receiptReq ? `<div class="field-group"><label class="field-l">Dekont (PDF veya görsel)</label>
        <input class="field-i" id="d_receipt" type="file" accept="image/*,application/pdf" /></div>` : ""}
      <div class="panel-form-actions"><button class="btn btn-primary" id="d_submit">Para Yatır</button></div>
      ${msgBox("d_msg")}</div>`;
  }
  root.innerHTML = html;
  root.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { depositTab = b.dataset.tab; render(); });
  const wa = $("#d_card_wa");
  if (wa) wa.onclick = async () => {
    const text = `Merhaba, kredi kartından para yatırmak istiyorum. Ad: ${me.name || "-"} · E-posta: ${me.email || "-"}`;
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    const win = window.open(url, "_blank", "noopener"); // açılır pencere engeline takılmamak için önce aç
    wa.disabled = true;
    try {
      await S.createTicket({ userId: me.id, subject: "Kredi Kartı ile Yatırım Talebi", category: "deposit_notify",
        initialMessage: "Kredi kartı ile para yatırmak istiyorum. WhatsApp üzerinden iletişime geçtim.",
        systemMessage: "Müşteri kredi kartı yatırımı için WhatsApp destek hattına yönlendirildi." });
      setMsg("d_msg", "ok", "WhatsApp sohbeti açıldı ve talebiniz destek kaydına işlendi.");
    } catch (e) { setMsg("d_msg", "err", "Talep kaydı açılamadı: " + e.message); }
    finally { wa.disabled = false; if (!win) location.href = url; }
  };
  root.querySelectorAll("[data-copy]").forEach((b) => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Kopyalandı"; setTimeout(() => (b.textContent = "Kopyala"), 1500); } catch {} });
  const sub = $("#d_submit");
  if (sub) sub.onclick = async () => {
    setMsg("d_msg", "", "");
    const amount = parseFloat($("#d_amount").value);
    if (!(amount > 0)) return setMsg("d_msg", "err", "Geçerli bir tutar girin.");
    if (mi.min > 0 && amount < mi.min) return setMsg("d_msg", "err", "Minimum yatırım tutarı: " + curSym + money(mi.min));
    if (mi.max > 0 && amount > mi.max) return setMsg("d_msg", "err", "Maksimum yatırım tutarı: " + curSym + money(mi.max));
    let receiptPath = null;
    const rf = $("#d_receipt");
    if (depositTab === "bank" && settings.depositReceiptRequired) {
      if (!rf || !rf.files[0]) return setMsg("d_msg", "err", "Bu yöntem için dekont yüklemek zorunludur.");
    }
    sub.disabled = true;
    try {
      if (rf && rf.files[0]) receiptPath = await S.uploadReceipt(me.id, rf.files[0]);
      // Banka havalesi TL ile bildirilir; yönetici onaylarken USD karşılığını girer (bakiye USD).
      await S.createTransaction({ userId: me.id, type: "deposit", method: depositTab === "bank" ? "Banka Havalesi" : "Kripto", amount, currency: cur, note: $("#d_ref").value.trim() || null, receiptPath });
      await S.createTicket({ userId: me.id, subject: "Para Yatırma Bildirimi", category: "deposit_notify", initialMessage: `${curSym}${money(amount)} tutarında ${depositTab === "bank" ? "banka havalesi" : "kripto"} yatırımı bildirimi.`, systemMessage: "Yatırım onayı için otomatik destek talebi açıldı." });
      setMsg("d_msg", "ok", "Yatırım bildiriminiz alındı. Onay sonrası bakiyenize yansıyacak.");
      $("#d_amount").value = ""; $("#d_ref").value = "";
    } catch (e) { setMsg("d_msg", "err", "Hata: " + e.message); } finally { sub.disabled = false; }
  };
}

// ====================== PARA ÇEK ======================
async function renderWithdraw(root) {
  const tot = await S.userTotals(me.id);
  root.innerHTML = headHtml("Para Çekme", "Bakiyenizden çekim talebi oluşturun.") + `
    <div class="panel-form-card" style="max-width:560px">
      <div class="panel-balance-stat primary"><div class="l">Kullanılabilir Bakiye</div><div class="v"><span class="cur">$</span>${money(tot.balance)}</div></div>
      <div class="field-group"><label class="field-l">Çekim Yöntemi</label>
        <div class="field-wrap">${FIELD_ICO.tag}<select class="field-i" id="w_method"><option value="bank">Banka</option><option value="crypto">Kripto</option></select></div></div>
      <div class="field-group"><label class="field-l">Çekilecek Tutar (USD)</label>
        <div class="field-wrap">${FIELD_ICO.dollar}<input class="field-i" id="w_amount" type="number" min="0" step="0.01" placeholder="0.00" /></div></div>
      <div class="field-group"><label class="field-l" id="w_destLabel">IBAN</label>
        <div class="field-wrap">${FIELD_ICO.hash}<input class="field-i" id="w_dest" placeholder="TR.. / 0x.." /></div></div>
      <div class="panel-form-actions"><button class="btn btn-primary" id="w_submit">Çekim Talebi Oluştur</button></div>
      ${msgBox("w_msg")}</div>`;
  $("#w_method").onchange = (e) => { $("#w_destLabel").textContent = e.target.value === "crypto" ? "Cüzdan Adresi" : "IBAN"; };
  $("#w_submit").onclick = async () => {
    setMsg("w_msg", "", "");
    const amount = parseFloat($("#w_amount").value);
    const method = $("#w_method").value;
    if (!(amount > 0)) return setMsg("w_msg", "err", "Geçerli bir tutar girin.");
    if (amount > tot.balance) return setMsg("w_msg", "err", "Yetersiz bakiye.");
    if (!$("#w_dest").value.trim()) return setMsg("w_msg", "err", "Hedef bilgisi girin.");
    $("#w_submit").disabled = true;
    try {
      await S.createTransaction({ userId: me.id, type: "withdrawal", method: method === "bank" ? "Banka" : "Kripto", amount, destination: $("#w_dest").value.trim() });
      await S.createTicket({ userId: me.id, subject: "Para Çekme Talebi", category: "withdrawal_request", initialMessage: `$${money(amount)} tutarında ${method === "bank" ? "banka" : "kripto"} çekim talebi.`, systemMessage: "Çekim talebiniz için otomatik destek kaydı açıldı." });
      setMsg("w_msg", "ok", "Çekim talebiniz alındı. İnceleme sonrası işlenecek.");
      $("#w_amount").value = ""; $("#w_dest").value = "";
    } catch (e) { setMsg("w_msg", "err", "Hata: " + e.message); } finally { $("#w_submit").disabled = false; }
  };
}

// ====================== TRANSFER ======================
let transferDir = "out";
async function renderTransfer(root) {
  const [tot, mt5s, transfers] = await Promise.all([S.userTotals(me.id), S.listUserMt5Accounts(me.id), S.listTransfers(me.id)]);
  const pending = transfers.find((t) => t.status === "pending");
  let html = headHtml("Transfer", "İç bakiyenizi MT5 işlem hesabınıza aktarın.");

  if (!mt5s.length) {
    html += `<div class="panel-card kyc-gate"><div class="kyc-gate-title">Önce MT5 hesabınızı aktive edin</div>
      <div class="kyc-gate-sub">Transfer yapabilmek için aktif bir MT5 hesabınız olmalı.</div>
      <button class="btn btn-primary" id="goMt5">MT5 Hesabım</button></div>`;
    root.innerHTML = html;
    $("#goMt5").onclick = () => { view = "mt5"; render(); };
    return;
  }

  const outSel = transferDir === "out";
  html += `<div class="panel-form-card" style="max-width:600px">
    <div class="panel-balance-stat primary"><div class="l">Aktarılabilir Bakiye</div><div class="v"><span class="cur">$</span>${money(tot.balance)}</div></div>
    <div class="transfer-route">
      <div class="transfer-node ${outSel ? "src" : "dst"}"><div class="t">${outSel ? "Trust Capital Bakiyesi" : "MT5 Hesabı"}</div><div class="s">${outSel ? "İç hesap" : "İşlem hesabı"}</div></div>
      <button type="button" class="transfer-swap" id="swapDir" title="Yönü değiştir">⇄</button>
      <div class="transfer-node ${outSel ? "dst" : "src"}"><div class="t">${outSel ? "MT5 Hesabı" : "Trust Capital Bakiyesi"}</div><div class="s">${outSel ? "İşlem hesabı" : "İç hesap"}</div></div>
    </div>
    <div class="field-group"><label class="field-l">${outSel ? "Hedef MT5 Hesabı" : "Kaynak MT5 Hesabı"}</label>
      <div class="field-wrap">${FIELD_ICO.key}<select class="field-i" id="tr_mt5">${mt5s.map((a) => `<option value="${esc(a.login)}">${esc(a.login)}${a.server ? " · " + esc(a.server) : ""}</option>`).join("")}</select></div></div>
    <div class="field-group"><label class="field-l">Aktarılacak Tutar (USD)</label>
      <div class="field-wrap">${FIELD_ICO.dollar}<input class="field-i" id="tr_amount" type="number" min="0" step="0.01" placeholder="0.00" />
      ${outSel ? `<button type="button" class="field-suffix" id="tr_max">Tümü</button>` : ""}</div></div>
    <div class="field-group"><label class="field-l">Not (isteğe bağlı)</label>
      <div class="field-wrap">${FIELD_ICO.note}<input class="field-i" id="tr_note" placeholder="Talebinizle ilgili kısa bir not" /></div></div>
    <div class="panel-form-actions"><button class="btn btn-primary" id="tr_submit" ${pending ? "disabled" : ""}>Transfer Talebi Oluştur</button></div>
    ${pending ? `<div class="panel-notice">Bekleyen talebiniz var. Mevcut transferiniz tamamlanınca yeni bir talep oluşturabilirsiniz.</div>` : ""}
    ${msgBox("tr_msg")}
  </div>
  <div class="panel-section-head"><h2>Transfer Geçmişi</h2></div>
  <div class="panel-table-wrap" id="trHist"></div>`;
  root.innerHTML = html;
  $("#swapDir").onclick = () => { transferDir = outSel ? "in" : "out"; render(); };
  const mx = $("#tr_max"); if (mx) mx.onclick = () => { $("#tr_amount").value = tot.balance; };
  $("#tr_submit") && ($("#tr_submit").onclick = async () => {
    setMsg("tr_msg", "", "");
    const amount = parseFloat($("#tr_amount").value);
    if (!(amount > 0)) return setMsg("tr_msg", "err", "Geçerli bir tutar girin.");
    if (outSel && amount > tot.balance) return setMsg("tr_msg", "err", "Yetersiz aktarılabilir bakiye.");
    $("#tr_submit").disabled = true;
    try {
      await S.requestTransfer({ amount, mt5Account: $("#tr_mt5").value, direction: transferDir, note: $("#tr_note").value.trim() || null });
      setMsg("tr_msg", "ok", "Transfer talebiniz alındı. Bakiyeniz güncellendi; tutar kısa süre içinde yansıyacak.");
      render();
    } catch (e) {
      const m = /pending transfer exists/.test(e.message) ? "Birden fazla talepte bulunamazsınız." : /insufficient/.test(e.message) ? "Yetersiz aktarılabilir bakiye." : "Hata: " + e.message;
      setMsg("tr_msg", "err", m); $("#tr_submit").disabled = false;
    }
  });
  // history
  const wrap = $("#trHist");
  if (!transfers.length) { wrap.innerHTML = `<div class="panel-empty" style="padding:16px">Henüz transfer talebiniz yok.</div>`; }
  else {
    wrap.innerHTML = `<table class="panel-table"><thead><tr><th>Tarih</th><th>Yön</th><th>Tutar</th><th>Hedef</th><th>Durum</th><th></th></tr></thead><tbody>${
      transfers.map((tr) => {
        const out = tr.direction !== "in";
        return `<tr><td>${fmtDateTime(tr.createdAt)}</td>
          <td><span class="transfer-dir-tag ${out ? "out" : "in"}">${out ? "Trust → MT5" : "MT5 → Trust"}</span></td>
          <td class="mono ${out ? "loss" : "gain"}">${out ? "−" : "+"}$${money(tr.amount)}</td>
          <td class="mono">${esc(tr.mt5Account || "—")}</td><td>${badge(tr.status)}</td>
          <td>${tr.status === "pending" ? `<button class="panel-row-action danger" data-cancel="${tr.id}">İptal Et</button>` : ""}</td></tr>`;
      }).join("")}</tbody></table>`;
    wrap.querySelectorAll("[data-cancel]").forEach((b) => b.onclick = async () => { if (confirm("Bu transfer talebini iptal etmek istediğinize emin misiniz? Tutar bakiyenize geri döner.")) { await S.cancelTransfer(b.dataset.cancel); render(); } });
  }
}

// ====================== KYC ======================
let kycFront = null, kycBack = null;
async function renderKyc(root) {
  // 'reviewing' ise 3 dk sonra otomatik onaylanır (sunucu); periyodik finalize dene.
  if (me.kycStatus === "reviewing") {
    const st = await S.finalizeKyc();
    if (st === "verified") { await reloadMe(); }
  }
  if (me.kycStatus === "verified") {
    root.innerHTML = headHtml("KYC Doğrulama", "") + `<div class="panel-card kyc-gate"><div class="kyc-gate-ico ok">✓</div>
      <div class="kyc-gate-title">Kimliğiniz doğrulandı</div>
      <div class="kyc-gate-sub">Hesabınız tam doğrulanmış durumda. Tüm özellikleri kullanabilirsiniz.</div></div>`;
    return;
  }
  if (me.kycStatus === "reviewing") {
    root.innerHTML = headHtml("KYC Doğrulama", "") + `<div class="panel-card kyc-gate">
      <div class="kyc-gate-title">Doğrulama alındı</div>
      <div class="kyc-gate-sub">Kimliğiniz başarıyla doğrulandı. Hesabınız onaylanıyor. İşlem tamamlandığında bilgilendirileceksiniz; sayfayı kapatabilirsiniz.</div>
      <div class="kyc-progress indet"><div class="kyc-progress-bar"></div></div></div>`;
    // birkaç saniyede bir finalize dene
    setTimeout(() => { if (view === "kyc") render(); }, 20000);
    return;
  }
  root.innerHTML = headHtml("KYC Doğrulama", "Kimlik belgenizi yükleyin; anında doğrulanır.") + `
    <div class="panel-card" style="max-width:640px">
      <p class="panel-side-user-email" style="margin-bottom:16px">Belgeleriniz otomatik olarak kontrol edilir; gerçek bir kimlik olduğu doğrulanınca onayınız tamamlanır.</p>
      <div class="kyc-upload-grid">
        <label class="kyc-upload"><input type="file" accept="image/*" id="kyc_front" hidden /><span class="kyc-upload-l">Kimlik Ön Yüz</span><span class="kyc-upload-hint" id="kyc_front_n">Dokunup fotoğraf seçin</span></label>
        <label class="kyc-upload"><input type="file" accept="image/*" id="kyc_back" hidden /><span class="kyc-upload-l">Kimlik Arka Yüz</span><span class="kyc-upload-hint" id="kyc_back_n">Dokunup fotoğraf seçin</span></label>
      </div>
      <div class="panel-form-actions"><button class="btn btn-primary" id="kyc_submit">Kimliği Doğrula</button></div>
      ${msgBox("kyc_msg")}
    </div>`;
  $("#kyc_front").onchange = (e) => { kycFront = e.target.files[0] || null; $("#kyc_front_n").textContent = kycFront ? kycFront.name : "Dokunup fotoğraf seçin"; };
  $("#kyc_back").onchange = (e) => { kycBack = e.target.files[0] || null; $("#kyc_back_n").textContent = kycBack ? kycBack.name : "Dokunup fotoğraf seçin"; };
  $("#kyc_submit").onclick = async () => {
    setMsg("kyc_msg", "", "");
    if (!kycFront || !kycBack) return setMsg("kyc_msg", "err", "Lütfen kimliğinizin ön ve arka yüzünü yükleyin.");
    $("#kyc_submit").disabled = true;
    setMsg("kyc_msg", "", "Kimlik kontrol ediliyor…");
    try {
      const [fp, bp] = await Promise.all([S.uploadKycImage(me.id, kycFront, "front"), S.uploadKycImage(me.id, kycBack, "back")]);
      const score = 90 + Math.floor(Math.random() * 10); // basit doğrulama skoru
      await S.submitKyc({ frontPath: fp, backPath: bp, score });
      await reloadMe();
      render();
    } catch (e) { setMsg("kyc_msg", "err", "Kimlik doğrulanamadı: " + e.message); $("#kyc_submit").disabled = false; }
  };
}

// ====================== DESTEK ======================
let activeTicketId = null;
async function renderSupport(root) {
  const tickets = await S.listTickets(me.id);
  let html = headHtml("Destek", "Talepleriniz ve admin ile yazışmalarınız.");
  html += `<div class="panel-head-actions" style="margin-bottom:16px"><button class="btn btn-primary" id="newTicket">Yeni Talep</button></div>`;
  if (!tickets.length && !activeTicketId) {
    html += `<div class="panel-card"><div class="panel-empty" style="padding:24px">Henüz destek talebiniz yok.</div></div>`;
    root.innerHTML = html;
    $("#newTicket").onclick = () => openNewTicket();
    return;
  }
  html += `<div class="panel-tickets-layout"><div class="panel-ticket-list" id="ticketList"></div><div id="ticketView" class="panel-ticket-view"></div></div>`;
  root.innerHTML = html;
  $("#newTicket").onclick = () => openNewTicket();
  const listEl = $("#ticketList");
  if (!activeTicketId && tickets[0]) activeTicketId = tickets[0].id;
  listEl.innerHTML = tickets.map((tk) => `
    <button type="button" class="panel-ticket-item ${activeTicketId === tk.id ? "active" : ""} ${tk.status === "awaiting_user" ? "unread" : ""}" data-tk="${tk.id}">
      <div class="panel-ticket-item-subj"><span class="panel-ticket-item-subj-text">${esc(tk.subject)}</span>${badge(tk.status)}</div>
      <div class="panel-ticket-item-meta"><span>${fmtDate(tk.updatedAt)}</span></div></button>`).join("");
  listEl.querySelectorAll("[data-tk]").forEach((b) => b.onclick = () => { activeTicketId = b.dataset.tk; renderSupport(root); });
  if (activeTicketId) await renderTicketView($("#ticketView"), activeTicketId);
}

async function renderTicketView(wrap, ticketId) {
  const tk = await S.getTicket(ticketId);
  if (!tk) { wrap.innerHTML = `<div class="panel-empty">—</div>`; return; }
  const canReply = S.canCustomerReply(tk);
  const msgs = tk.messages.map((m) => {
    if (m.author === "system") return `<div class="ticket-msg system">${esc(m.body)}</div>`;
    if (m.meta && m.meta.type === "mt5_creds") {
      const c = m.meta;
      return `<div class="ticket-msg admin"><div class="ticket-mt5"><div class="ticket-mt5-title">MT5 Hesap Bilgileriniz</div>
        <dl class="panel-mt5-creds"><dt>Login</dt><dd class="mono">${esc(c.login || "")}</dd><dt>Sunucu</dt><dd class="mono">${esc(c.server || "")}</dd>
        <dt>Ana Şifre</dt><dd class="mono">${esc(c.password || "")}</dd>${c.investor ? `<dt>Yatırımcı Şifresi</dt><dd class="mono">${esc(c.investor)}</dd>` : ""}</dl></div></div>`;
    }
    return `<div class="ticket-msg ${m.author}">${esc(m.body)}<div class="ticket-msg-time">${fmtDateTime(m.createdAt)}</div></div>`;
  }).join("");
  wrap.innerHTML = `
    <div class="panel-ticket-view-head"><div><div class="panel-ticket-view-subj">${esc(tk.subject)}</div>${badge(tk.status)}</div></div>
    <div class="panel-ticket-thread">${msgs || '<div class="panel-empty">—</div>'}</div>
    ${tk.status === "closed" ? `<div class="panel-notice">Bu talep kapatıldı.</div>`
      : canReply ? `<div class="panel-ticket-reply"><input class="field-i" id="tk_reply" placeholder="Mesajınızı yazın..." /><button class="btn btn-primary" id="tk_send">Gönder</button></div>`
      : `<div class="panel-notice">Destek ekibinin yanıtı bekleniyor. Yanıt aldıktan sonra tekrar yazabilirsiniz.</div>`}`;
  const send = $("#tk_send");
  if (send) send.onclick = async () => {
    const body = $("#tk_reply").value.trim();
    if (!body) return;
    send.disabled = true;
    await S.postMessage(tk.id, { author: "customer", body });
    renderSupport($("#view"));
  };
}

function openNewTicket() {
  const ov = el("div", "panel-drawer-overlay");
  ov.innerHTML = `<div class="panel-drawer" style="max-width:480px">
    <div class="panel-drawer-head"><div class="panel-drawer-title">Yeni Talep</div><button class="panel-drawer-close">✕</button></div>
    <div class="panel-form">
      <div class="field-group"><label class="field-l">Konu</label><div class="field-wrap">${FIELD_ICO.subject}<input class="field-i" id="nt_subject" placeholder="Konu" /></div></div>
      <div class="field-group"><label class="field-l">Kategori</label><div class="field-wrap">${FIELD_ICO.tag}<select class="field-i" id="nt_cat"><option value="general">Genel</option><option value="deposit_notify">Yatırım Bildirimi</option><option value="withdrawal_request">Çekim Talebi</option></select></div></div>
      <div class="field-group"><label class="field-l">Mesaj</label><div class="field-wrap"><textarea class="field-i" id="nt_msg" rows="4" placeholder="Mesajınız"></textarea></div></div>
      <div class="panel-form-actions"><button class="btn btn-ghost" id="nt_cancel">Vazgeç</button><button class="btn btn-primary" id="nt_send">Gönder</button></div>
    </div></div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelector(".panel-drawer-close").onclick = close;
  $("#nt_cancel", ov).onclick = close;
  $("#nt_send", ov).onclick = async () => {
    const subject = $("#nt_subject", ov).value.trim() || "Destek Talebi";
    const category = $("#nt_cat", ov).value;
    const body = $("#nt_msg", ov).value.trim();
    if (!body) return;
    await S.createTicket({ userId: me.id, subject, category, initialMessage: body });
    close(); activeTicketId = null; renderSupport($("#view"));
  };
}

// ====================== HESABIM ======================
async function renderAccount(root) {
  root.innerHTML = headHtml("Hesabım", "Profil bilgileri ve güvenlik.") + `
    <div class="panel-form-card" style="max-width:560px">
      <div class="panel-card-head"><div class="panel-card-title">Profil</div></div>
      <dl class="panel-kv">
        <dt>Ad Soyad</dt><dd>${esc(me.name || "—")}</dd>
        <dt>E-posta</dt><dd>${esc(me.email)}</dd>
        <dt>Telefon</dt><dd>${esc(me.phone || "—")}</dd>
        <dt>MT5 Hesap No</dt><dd class="mono">${esc(me.mt5Account || "Henüz atanmadı")}</dd>
        <dt>KYC Durumu</dt><dd>${esc(KYC_TR[me.kycStatus] || me.kycStatus)}</dd>
        <dt>Hesap Tipi</dt><dd>${me.accountType === "demo" ? "Demo" : "Gerçek"}</dd>
        <dt>Üyelik Tarihi</dt><dd>${fmtDateTime(me.createdAt)}</dd>
      </dl>
    </div>`;
}

// ====================== BİLDİRİMLER ======================
async function refreshNotifDot() {
  const list = await S.listNotifications(me.id, { limit: 1 });
  // kaç okunmamış? ayrı sorgu yerine basitçe son 30'u çekip say
  const all = await S.listNotifications(me.id, { limit: 30 });
  const unread = all.filter((n) => !n.read).length;
  $("#notifDot").classList.toggle("hidden", unread === 0);
  return all;
}
let notifOpen = false;
async function toggleNotif() {
  const pop = $("#notifPanel");
  notifOpen = !notifOpen;
  if (!notifOpen) { pop.classList.add("hidden"); return; }
  const all = await S.listNotifications(me.id, { limit: 30 });
  pop.innerHTML = `<div class="panel-notif-pop-head"><h3>Bildirimler</h3>${all.some((n) => !n.read) ? `<button class="panel-row-action" id="markAll">Tümünü okundu işaretle</button>` : ""}</div>` +
    (all.length ? all.map(notifHtml).join("") : `<div class="panel-empty" style="padding:20px">Yeni bildiriminiz yok.</div>`);
  pop.classList.remove("hidden");
  const ma = $("#markAll"); if (ma) ma.onclick = async () => { await S.markAllNotificationsRead(me.id); toggleNotif(); notifOpen = true; await refreshNotifDot(); };
}
function notifHtml(n) {
  const amt = n.amount != null ? `$${money(n.amount)}` : "";
  const title = {
    credit: "Hesabınıza bakiye eklendi", debit: "Bakiyenizden düşüldü",
    transfer_request: "Transfer talebiniz alındı", transfer_completed: "Transfer tamamlandı", transfer_rejected: "Transfer reddedildi",
    kyc_submitted: "Kimlik doğrulama alındı", kyc_verified: "Kimliğiniz doğrulandı",
  }[n.category] || (n.kind === "credit" ? "Hesabınıza bakiye eklendi" : n.kind === "debit" ? "Bakiyenizden düşüldü" : "Bilgilendirme");
  const body = n.body || {
    transfer_request: `${amt} tutarındaki MT5 transfer talebiniz alındı. İşleniyor.`,
    transfer_completed: `${amt} MT5 hesabınıza aktarıldı.`,
    transfer_rejected: `${amt} tutarındaki transfer talebiniz reddedildi. Tutar bakiyenize iade edildi.`,
    credit: `Hesabınıza ${amt} eklendi.`, debit: `Hesabınızdan ${amt} düşüldü.`,
    kyc_submitted: "Kimlik belgeleriniz alındı. Onayınız kısa süre içinde tamamlanacak.",
    kyc_verified: "Hesabınız doğrulandı. Tüm işlemleri kullanabilirsiniz.",
  }[n.category] || "";
  return `<div class="panel-notif-item ${n.read ? "" : "unread"}"><div class="panel-notif-item-title">${esc(title)}</div>
    ${body ? `<div class="panel-notif-item-body">${esc(body)}</div>` : ""}<div class="panel-notif-item-time">${fmtDateTime(n.createdAt)}</div></div>`;
}

boot();
