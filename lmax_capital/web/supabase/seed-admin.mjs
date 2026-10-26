// Create admin auth user via Auth Admin API (service_role).
// Prints the generated password ONCE.
import { randomBytes } from "node:crypto";

const REF = "euuvicvejbbzpsxeuawn";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
if (!SERVICE_ROLE) {
  console.error("Set SUPABASE_SERVICE_ROLE env var");
  process.exit(1);
}

const EMAIL = "support@lmaxcapital.com";

// strong password: 18 url-safe chars + guaranteed symbol/upper/digit
const raw = randomBytes(18).toString("base64").replace(/[+/=]/g, "");
const password = `Lx!${raw}9A`;

const res = await fetch(`https://${REF}.supabase.co/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: EMAIL,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { name: "Lmax Capital Admin" },
  }),
});

const data = await res.json();
if (!res.ok) {
  console.error(`[${res.status}] admin create failed:`, JSON.stringify(data));
  process.exit(1);
}

console.log("ADMIN_CREATED");
console.log("id:", data.id);
console.log("email:", EMAIL);
console.log("password:", password);
