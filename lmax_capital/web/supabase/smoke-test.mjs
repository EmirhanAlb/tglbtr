// End-to-end smoke test: customer signup -> RLS -> admin visibility.
import { createClient } from "@supabase/supabase-js";

const URL = "https://euuvicvejbbzpsxeuawn.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1dXZpY3ZlamJienBzeGV1YXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTUzNTMsImV4cCI6MjA5NjIzMTM1M30.9U_4ImjBsiMY0xUMzJ5gGGf1x2D2KIw2xaY5rcUDYGQ";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE;
const ADMIN_EMAIL = "support@lmaxcapital.com";
const ADMIN_PW = process.env.ADMIN_PW;

const log = (...a) => console.log(...a);
const fail = (m) => { console.error("FAIL:", m); process.exit(1); };

const email = `smoke_${Date.now()}@example.com`;
const cust = createClient(URL, ANON);

// 1. signup
let { data: su, error: suErr } = await cust.auth.signUp({
  email, password: "Test1234!pw",
  options: { data: { name: "Smoke Test", phone: "+90 555 000 00 00", account_type: "real" } },
});
if (suErr) fail("signup: " + suErr.message);
const uid = su.user.id;
log("✓ signup", email, uid);

// 2. profile created by trigger?
let { data: prof, error: pErr } = await cust.from("profiles").select("*").eq("id", uid).maybeSingle();
if (pErr) fail("profile read: " + pErr.message);
if (!prof) fail("profile trigger did not create row");
if (prof.role !== "customer") fail("role not customer: " + prof.role);
log("✓ profile via trigger, role =", prof.role, "name =", prof.name);

// 3. provisioning insert (own)
let { error: provErr } = await cust.from("provisioning").insert({ user_id: uid, status: "pending" });
if (provErr) fail("provisioning insert: " + provErr.message);
log("✓ provisioning insert");

// 4. transaction insert (own)
let { data: tx, error: txErr } = await cust.from("transactions")
  .insert({ user_id: uid, type: "deposit", method: "bank", amount: 1234, status: "pending" })
  .select().single();
if (txErr) fail("tx insert: " + txErr.message);
log("✓ transaction insert", tx.id);

// 5. ticket + message
let { data: tk, error: tkErr } = await cust.from("tickets")
  .insert({ user_id: uid, subject: "Smoke", category: "deposit_notify", status: "awaiting_admin" })
  .select().single();
if (tkErr) fail("ticket insert: " + tkErr.message);
let { error: mErr } = await cust.from("ticket_messages").insert({ ticket_id: tk.id, author: "customer", body: "hi" });
if (mErr) fail("message insert: " + mErr.message);
log("✓ ticket + message insert");

// 6. RLS isolation: a second customer must NOT see first's tx
const email2 = `smoke2_${Date.now()}@example.com`;
const cust2 = createClient(URL, ANON);
await cust2.auth.signUp({ email: email2, password: "Test1234!pw" });
let { data: leak } = await cust2.from("transactions").select("*").eq("id", tx.id);
if (leak && leak.length > 0) fail("RLS LEAK: customer2 saw customer1 transaction");
log("✓ RLS isolation (customer2 cannot see customer1 tx)");

// 7. admin visibility
if (ADMIN_PW) {
  const admin = createClient(URL, ANON);
  let { error: aErr } = await admin.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PW });
  if (aErr) fail("admin signin: " + aErr.message);
  let { data: allTx, error: atErr } = await admin.from("transactions").select("*");
  if (atErr) fail("admin tx read: " + atErr.message);
  const sawIt = allTx.some((r) => r.id === tx.id);
  if (!sawIt) fail("admin did not see the customer transaction");
  log("✓ admin sees all transactions (" + allTx.length + " rows incl. test)");
  // admin can update status
  let { error: upErr } = await admin.from("transactions").update({ status: "approved" }).eq("id", tx.id);
  if (upErr) fail("admin update tx: " + upErr.message);
  log("✓ admin updated tx status");
} else {
  log("(skip admin checks — set ADMIN_PW)");
}

// 8. cleanup via service role (delete both test auth users + cascade)
if (SERVICE) {
  const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const { data: list } = await svc.auth.admin.listUsers();
  const victims = list.users.filter((u) => u.email === email || u.email === email2);
  for (const v of victims) await svc.auth.admin.deleteUser(v.id);
  log("✓ cleanup: deleted", victims.length, "test users");
} else {
  log("(skip cleanup — set SUPABASE_SERVICE_ROLE)");
}

log("\nALL SMOKE TESTS PASSED");
