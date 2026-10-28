// Supabase veri katmanı — lmax_capital/web/src/data/store.js'in vanilla JS portu.
// Aynı fonksiyonlar, aynı sorgular, aynı camelCase çıktı şekilleri.
// Supabase istemcisi app.js'ten gelir (config.js'teki URL + anon key).

import { supabase } from "./app.js";

// ---------- Satır -> UI şekli dönüştürücüleri ----------
export function mapUser(r) {
  if (!r) return null;
  return {
    id: r.id, role: r.role, name: r.name, email: r.email, phone: r.phone || "",
    accountType: r.account_type || "real", mt5Account: r.mt5_account || null,
    loginPassword: r.login_password || "", kycStatus: r.kyc_status || "pending",
    kycSubmittedAt: r.kyc_submitted_at || null, kycFrontPath: r.kyc_front_path || null,
    kycBackPath: r.kyc_back_path || null,
    kycScore: r.kyc_score != null ? Number(r.kyc_score) : null, createdAt: r.created_at,
  };
}
function mapTx(r) {
  if (!r) return null;
  return {
    id: r.id, userId: r.user_id, type: r.type, method: r.method, methodId: r.method_id,
    amount: Number(r.amount) || 0, currency: r.currency || "USD", status: r.status, note: r.note,
    receiptPath: r.receipt_path || null, receipt: r.receipt_path ? r.receipt_path.split("/").pop() : null,
    createdAt: r.created_at, resolvedAt: r.resolved_at,
  };
}
function mapMessage(r) {
  if (!r) return null;
  return { id: r.id, author: r.author, body: r.body, meta: r.meta || null, createdAt: r.created_at };
}
function mapTicket(r) {
  if (!r) return null;
  const messages = (r.ticket_messages || []).map(mapMessage).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  return {
    id: r.id, userId: r.user_id, subject: r.subject, category: r.category, status: r.status,
    createdAt: r.created_at, updatedAt: r.updated_at, messages,
  };
}
function mapProv(r) {
  if (!r) return null;
  return {
    id: r.id, userId: r.user_id, status: r.status, login: r.login || "", server: r.server || "",
    password: r.password || "", investor: r.investor || "",
    createdAt: r.created_at, assignedAt: r.assigned_at, activatedAt: r.activated_at,
  };
}
function mapBank(r) { return { id: r.id, bankName: r.bank_name, holder: r.holder, iban: r.iban, note: r.note, createdAt: r.created_at }; }
function mapCrypto(r) { return { id: r.id, network: r.network, token: r.token, address: r.address, note: r.note, createdAt: r.created_at }; }
function mapNotification(r) {
  if (!r) return null;
  return {
    id: r.id, userId: r.user_id, kind: r.kind || "info", category: r.category || null,
    amount: r.amount != null ? Number(r.amount) : null, currency: r.currency || "USD",
    body: r.body || "", read: !!r.read, createdAt: r.created_at,
  };
}
function mapTransfer(r) {
  if (!r) return null;
  return {
    id: r.id, userId: r.user_id, amount: Number(r.amount) || 0, currency: r.currency || "USD",
    mt5Account: r.mt5_account || null, direction: r.direction === "in" ? "in" : "out",
    status: r.status || "pending", note: r.note || "", adminNote: r.admin_note || "",
    createdAt: r.created_at, resolvedAt: r.resolved_at,
  };
}
const nowIso = () => new Date().toISOString();
function throwIf(error) { if (error) throw new Error(error.message || String(error)); }

// ---------- Auth / Session ----------
function sessionFromUser(user) {
  if (!user) return null;
  const role = user.app_metadata?.role === "admin" ? "admin" : "customer";
  const meta = user.user_metadata || {};
  return { userId: user.id, role, name: meta.name || (user.email ? user.email.split("@")[0] : ""), email: user.email };
}
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return sessionFromUser(data.session?.user || null);
}
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(sessionFromUser(session?.user || null)));
  return () => data.subscription.unsubscribe();
}
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return sessionFromUser(data.user);
}
export async function signUp({ name, email, phone, password, accountType }) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name: name || email.split("@")[0], phone: phone || "", account_type: accountType || "real", login_password: password || "" } },
  });
  if (error) throw new Error(error.message);
  return sessionFromUser(data.user);
}
export async function signOut() { await supabase.auth.signOut(); }

// ---------- Realtime — tek ortak kanal ----------
const listeners = new Set();
let channel = null;
function notify() { listeners.forEach((fn) => { try { fn(); } catch (e) {} }); }
function ensureChannel() {
  if (channel) return;
  channel = supabase.channel("trustglobal-db-changes");
  ["profiles", "transactions", "tickets", "ticket_messages", "provisioning", "bank_accounts",
   "crypto_accounts", "settings", "notifications", "transfers"].forEach((table) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, notify);
  });
  channel.subscribe();
}
export function subscribe(fn) {
  listeners.add(fn);
  ensureChannel();
  return () => { listeners.delete(fn); if (listeners.size === 0 && channel) { supabase.removeChannel(channel); channel = null; } };
}

// ---------- Users (profiles) ----------
export async function listUsers() {
  const { data, error } = await supabase.from("profiles").select("*").eq("role", "customer").order("created_at", { ascending: false });
  throwIf(error);
  return data.map(mapUser);
}
export async function getUser(id) {
  if (!id) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  throwIf(error);
  return mapUser(data);
}
export async function updateUser(id, patch) {
  const row = {};
  if ("name" in patch) row.name = patch.name;
  if ("email" in patch) row.email = patch.email;
  if ("phone" in patch) row.phone = patch.phone;
  if ("accountType" in patch) row.account_type = patch.accountType;
  if ("mt5Account" in patch) row.mt5_account = patch.mt5Account;
  if ("kycStatus" in patch) row.kyc_status = patch.kycStatus;
  if ("role" in patch) row.role = patch.role;
  const { data, error } = await supabase.from("profiles").update(row).eq("id", id).select().maybeSingle();
  throwIf(error);
  return mapUser(data);
}
export async function deleteUser(id) {
  const u = await getUser(id);
  if (!u || u.role === "admin") return false;
  // Tercih edilen yol: auth kullanıcısını, profili, bağlı kayıtları ve belgeleri birlikte silen
  // admin_delete_customer RPC'si (supabase/schema.sql). Kurulu değilse yalnızca profil silinir;
  // bağlı kayıtlar cascade ile gider, auth kaydı kalır.
  const { error } = await supabase.rpc("admin_delete_customer", { p_id: id });
  if (!error) return true;
  const missing = error.code === "PGRST202" || /could not find the function|admin_delete_customer/i.test(error.message || "");
  if (!missing) throwIf(error);
  const res = await supabase.from("profiles").delete().eq("id", id);
  throwIf(res.error);
  return true;
}

// ---------- Transactions ----------
export async function listTransactions(userId) {
  let q = supabase.from("transactions").select("*").order("created_at", { ascending: false });
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  throwIf(error);
  return data.map(mapTx);
}
export async function createTransaction(t) {
  const note = t.note || [t.network, t.destination].filter(Boolean).join(" · ") || null;
  const row = {
    user_id: t.userId, type: t.type, method: t.method || null, method_id: t.methodId || null,
    amount: Number(t.amount) || 0, currency: t.currency || "USD", status: "pending",
    note, receipt_path: t.receiptPath || null,
  };
  const { data, error } = await supabase.from("transactions").insert(row).select().single();
  throwIf(error);
  return mapTx(data);
}
export async function updateTransaction(id, patch) {
  const row = {};
  if ("status" in patch) { row.status = patch.status; row.resolved_at = patch.status !== "pending" ? nowIso() : null; }
  if ("note" in patch) row.note = patch.note;
  const { data, error } = await supabase.from("transactions").update(row).eq("id", id).select().maybeSingle();
  throwIf(error);
  return mapTx(data);
}
export async function userTotals(userId) {
  if (!userId) return { deposited: 0, withdrawn: 0, transferred: 0, balance: 0 };
  const { data, error } = await supabase.rpc("user_totals", { p_user_id: userId });
  throwIf(error);
  const r = Array.isArray(data) ? data[0] : data;
  return { deposited: Number(r?.deposited) || 0, withdrawn: Number(r?.withdrawn) || 0, transferred: Number(r?.transferred) || 0, balance: Number(r?.balance) || 0 };
}
export async function adminAdjustBalance({ userId, amount, direction, category, note, currency }) {
  const { data, error } = await supabase.rpc("admin_adjust_balance", {
    p_user_id: userId, p_amount: Number(amount) || 0, p_direction: direction === "debit" ? "debit" : "credit",
    p_category: category || (direction === "debit" ? "adjustment" : "deposit"),
    p_note: note ? String(note).trim() : null, p_currency: currency || "USD",
  });
  throwIf(error);
  const r = Array.isArray(data) ? data[0] : data;
  return { deposited: Number(r?.deposited) || 0, withdrawn: Number(r?.withdrawn) || 0, balance: Number(r?.balance) || 0 };
}

// ---------- Notifications ----------
export async function listNotifications(userId, { limit = 30 } = {}) {
  if (!userId) return [];
  const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  throwIf(error);
  return data.map(mapNotification);
}
export async function markNotificationRead(id) { const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id); throwIf(error); }
export async function markAllNotificationsRead(userId) {
  if (!userId) return;
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  throwIf(error);
}
export async function deleteNotification(id) { const { error } = await supabase.from("notifications").delete().eq("id", id); throwIf(error); }

// ---------- Transfers ----------
export async function listTransfers(userId) {
  let q = supabase.from("transfers").select("*").order("created_at", { ascending: false });
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  throwIf(error);
  return data.map(mapTransfer);
}
export async function requestTransfer({ amount, mt5Account, direction, note, currency }) {
  const { data, error } = await supabase.rpc("request_transfer", {
    p_amount: Number(amount) || 0, p_mt5_account: mt5Account ? String(mt5Account).trim() : null,
    p_direction: direction === "in" ? "in" : "out", p_note: note ? String(note).trim() : null, p_currency: currency || "USD",
  });
  throwIf(error);
  const r = Array.isArray(data) ? data[0] : data;
  return { deposited: Number(r?.deposited) || 0, withdrawn: Number(r?.withdrawn) || 0, transferred: Number(r?.transferred) || 0, balance: Number(r?.balance) || 0 };
}
export async function resolveTransfer(id, status, adminNote) {
  const { data, error } = await supabase.rpc("admin_resolve_transfer", { p_id: id, p_status: status, p_admin_note: adminNote ? String(adminNote).trim() : null });
  throwIf(error);
  return mapTransfer(Array.isArray(data) ? data[0] : data);
}
export async function cancelTransfer(id) { const { error } = await supabase.from("transfers").delete().eq("id", id); throwIf(error); }

// ---------- Tickets + messages ----------
const TICKET_SELECT = "*, ticket_messages(*)";
export async function listTickets(userId) {
  let q = supabase.from("tickets").select(TICKET_SELECT).order("updated_at", { ascending: false });
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  throwIf(error);
  return data.map(mapTicket);
}
export async function getTicket(id) {
  const { data, error } = await supabase.from("tickets").select(TICKET_SELECT).eq("id", id).maybeSingle();
  throwIf(error);
  return mapTicket(data);
}
export async function createTicket({ userId, subject, category, initialMessage, initialMeta, systemMessage }) {
  const msgs = [];
  if (systemMessage) msgs.push({ author: "system", body: systemMessage });
  if (initialMessage) msgs.push({ author: "customer", body: initialMessage, meta: initialMeta || null });
  const lastAuthor = msgs.length ? msgs[msgs.length - 1].author : null;
  const { data: ticket, error } = await supabase.from("tickets")
    .insert({ user_id: userId, subject: subject || "Destek Talebi", category: category || "general", status: lastAuthor === "customer" ? "awaiting_admin" : "open" })
    .select().single();
  throwIf(error);
  if (msgs.length) {
    const rows = msgs.map((m) => ({ ticket_id: ticket.id, author: m.author, body: m.body, meta: m.meta || null }));
    const { error: mErr } = await supabase.from("ticket_messages").insert(rows);
    throwIf(mErr);
  }
  return getTicket(ticket.id);
}
export async function postMessage(ticketId, { author, body, meta }) {
  const { data, error } = await supabase.from("ticket_messages").insert({ ticket_id: ticketId, author, body, meta: meta || null }).select().single();
  throwIf(error);
  const status = author === "customer" ? "awaiting_admin" : author === "admin" ? "awaiting_user" : undefined;
  const patch = { updated_at: nowIso() };
  if (status) patch.status = status;
  await supabase.from("tickets").update(patch).eq("id", ticketId);
  return mapMessage(data);
}
export async function updateTicket(id, patch) {
  const row = {};
  if ("status" in patch) row.status = patch.status;
  if ("subject" in patch) row.subject = patch.subject;
  if ("category" in patch) row.category = patch.category;
  const { data, error } = await supabase.from("tickets").update(row).eq("id", id).select().maybeSingle();
  throwIf(error);
  return mapTicket({ ...data, ticket_messages: [] });
}
export async function deleteTicket(id) { const { error } = await supabase.from("tickets").delete().eq("id", id); throwIf(error); return true; }
export async function purgeOldClosedTickets(days = 30) {
  const cutoff = new Date(Date.now() - days * 864e5).toISOString();
  const { data, error } = await supabase.from("tickets").delete().eq("status", "closed").lt("updated_at", cutoff).select("id");
  throwIf(error);
  return data?.length || 0;
}
export function canCustomerReply(ticket) {
  if (!ticket || ticket.status === "closed") return false;
  const msgs = ticket.messages.filter((m) => m.author === "customer" || m.author === "admin");
  if (msgs.length === 0) return true;
  return msgs[msgs.length - 1].author !== "customer";
}

// ---------- MT5 Provisioning ----------
export async function listProvisioning(filter) {
  let q = supabase.from("provisioning").select("*").order("created_at", { ascending: false });
  if (filter?.userId) q = q.eq("user_id", filter.userId);
  if (filter?.status) q = q.eq("status", filter.status);
  const { data, error } = await q;
  throwIf(error);
  return data.map(mapProv);
}
export async function getProvisioningByUser(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.from("provisioning").select("*").eq("user_id", userId).order("created_at", { ascending: true }).limit(1);
  throwIf(error);
  return mapProv(Array.isArray(data) ? data[0] : data);
}
export async function requestAdditionalMt5(userId) {
  if (!userId) return null;
  const rows = await listProvisioning({ userId });
  const pending = rows.find((p) => p.status === "pending");
  if (pending) return pending;
  const { data, error } = await supabase.from("provisioning").insert({ user_id: userId, status: "pending" }).select().single();
  throwIf(error);
  return mapProv(data);
}
export async function listUserMt5Accounts(userId) {
  if (!userId) return [];
  const rows = await listProvisioning({ userId });
  return rows.filter((p) => p.status === "active" && p.login)
    .map((p) => ({ login: p.login, server: p.server || "", createdAt: p.createdAt }))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}
export async function assignProvisioning(id, creds) {
  const { data, error } = await supabase.from("provisioning")
    .update({ login: creds.login, server: creds.server, password: creds.password, investor: creds.investor || "", status: "assigned", assigned_at: nowIso() })
    .eq("id", id).select().single();
  throwIf(error);
  return mapProv(data);
}
async function setPrimaryMt5IfEmpty(userId, login) {
  const { data } = await supabase.from("profiles").select("mt5_account").eq("id", userId).maybeSingle();
  if (!data?.mt5_account) await supabase.from("profiles").update({ mt5_account: login }).eq("id", userId);
}
export async function updateProvisioning(id, patch) {
  const row = {};
  if ("login" in patch) row.login = patch.login;
  if ("server" in patch) row.server = patch.server;
  if ("password" in patch) row.password = patch.password;
  if ("investor" in patch) row.investor = patch.investor;
  const { data, error } = await supabase.from("provisioning").update(row).eq("id", id).select().single();
  throwIf(error);
  const prov = mapProv(data);
  if (prov.status === "active" && patch.login) await setPrimaryMt5IfEmpty(prov.userId, patch.login);
  return prov;
}
export async function activateProvisioning(id) {
  const { data, error } = await supabase.from("provisioning").update({ status: "active", activated_at: nowIso() }).eq("id", id).select().single();
  throwIf(error);
  const prov = mapProv(data);
  if (prov.login) await setPrimaryMt5IfEmpty(prov.userId, prov.login);
  return prov;
}

// ---------- Bank / Crypto ----------
export async function listBankAccounts() { const { data, error } = await supabase.from("bank_accounts").select("*").order("created_at", { ascending: true }); throwIf(error); return data.map(mapBank); }
export async function addBankAccount(b) {
  const { data, error } = await supabase.from("bank_accounts").insert({ bank_name: b.bankName, holder: b.holder, iban: b.iban, note: b.note || null }).select().single();
  throwIf(error);
  return mapBank(data);
}
export async function removeBankAccount(id) { const { error } = await supabase.from("bank_accounts").delete().eq("id", id); throwIf(error); }
export async function listCryptoAccounts() { const { data, error } = await supabase.from("crypto_accounts").select("*").order("created_at", { ascending: true }); throwIf(error); return data.map(mapCrypto); }
export async function addCryptoAccount(c) {
  const { data, error } = await supabase.from("crypto_accounts").insert({ network: c.network, token: c.token, address: c.address, note: c.note || null }).select().single();
  throwIf(error);
  return mapCrypto(data);
}
export async function removeCryptoAccount(id) { const { error } = await supabase.from("crypto_accounts").delete().eq("id", id); throwIf(error); }

// ---------- Settings ----------
export async function getSettings() {
  const { data, error } = await supabase.from("settings").select("*").eq("id", true).maybeSingle();
  throwIf(error);
  return { depositReceiptRequired: !!data?.deposit_receipt_required, minDeposit: Number(data?.min_deposit) || 0 };
}
export async function updateSettings(patch) {
  const row = { id: true };
  if ("depositReceiptRequired" in patch) row.deposit_receipt_required = patch.depositReceiptRequired;
  if ("minDeposit" in patch) row.min_deposit = patch.minDeposit;
  const { data, error } = await supabase.from("settings").upsert(row).select().single();
  throwIf(error);
  return { depositReceiptRequired: !!data.deposit_receipt_required, minDeposit: Number(data.min_deposit) || 0 };
}

// ---------- Storage — dekont ----------
export async function uploadReceipt(userId, file) {
  const safe = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${userId}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, { upsert: false });
  throwIf(error);
  return path;
}
export async function receiptUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

// ---------- KYC ----------
export async function uploadKycImage(userId, file, side) {
  const ext = (file.name.split(".").pop() || "jpg").replace(/[^\w]/g, "").toLowerCase();
  const path = `${userId}/${side}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("kyc").upload(path, file, { upsert: true });
  throwIf(error);
  return path;
}
export async function kycUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("kyc").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}
export async function submitKyc({ frontPath, backPath, score }) {
  const { data, error } = await supabase.rpc("kyc_submit", { p_front: frontPath || null, p_back: backPath || null, p_score: score != null ? Number(score) : null });
  throwIf(error);
  return data;
}
export async function finalizeKyc() {
  const { data, error } = await supabase.rpc("kyc_finalize");
  if (error) return null;
  return data;
}

// ---------- Admin dashboard aggregates ----------
export async function adminStats() {
  const [customersRes, txRes, ticketsRes, provRes, transfersRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "customer"),
    supabase.from("transactions").select("type,amount,status"),
    supabase.from("tickets").select("status"),
    supabase.from("provisioning").select("status"),
    supabase.from("transfers").select("amount,status"),
  ]);
  throwIf(customersRes.error); throwIf(txRes.error); throwIf(ticketsRes.error); throwIf(provRes.error); throwIf(transfersRes.error);
  const customers = customersRes.data.map(mapUser);
  const prospects = customers.filter((u) => !u.mt5Account);
  const investors = customers.filter((u) => !!u.mt5Account);
  let totalDeposited = 0, totalWithdrawn = 0, pendingDeposits = 0, pendingWithdrawals = 0;
  txRes.data.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (t.status === "approved") { if (t.type === "deposit") totalDeposited += amt; else if (t.type === "withdrawal") totalWithdrawn += amt; }
    else if (t.status === "pending") { if (t.type === "deposit") pendingDeposits += 1; else if (t.type === "withdrawal") pendingWithdrawals += 1; }
  });
  const pendingTickets = ticketsRes.data.filter((t) => t.status !== "closed").length;
  const pendingProvisioning = provRes.data.filter((p) => p.status !== "active").length;
  let pendingTransfers = 0, pendingTransfersAmount = 0, completedTransfers = 0;
  transfersRes.data.forEach((tr) => {
    const amt = Number(tr.amount) || 0;
    if (tr.status === "pending") { pendingTransfers += 1; pendingTransfersAmount += amt; }
    else if (tr.status === "completed") completedTransfers += amt;
  });
  return {
    totalUsers: customers.length, totalProspects: prospects.length, totalInvestors: investors.length,
    pendingTickets, pendingProvisioning, pendingDeposits, pendingWithdrawals,
    pendingTransfers, pendingTransfersAmount, completedTransfers,
    totalDeposited, totalWithdrawn, net: totalDeposited - totalWithdrawn,
    recentUsers: [...customers].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5),
  };
}
