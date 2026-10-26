// Run a .sql file against the Supabase Management API.
// Usage: node run-sql.mjs <file.sql>
import { readFileSync } from "node:fs";

const REF = "euuvicvejbbzpsxeuawn";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("Set SUPABASE_ACCESS_TOKEN env var");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node run-sql.mjs <file.sql>");
  process.exit(1);
}

const query = readFileSync(file, "utf8");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  }
);

const text = await res.text();
console.log(`[${res.status}] ${file}`);
console.log(text);
if (!res.ok) process.exit(1);
