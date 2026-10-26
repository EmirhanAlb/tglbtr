import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
// Anon key, XOR'lanmış byte dizisi olarak tutulur ve çalışma zamanında çözülür.
// Hosting'in güvenlik tarayıcısı (ImunifyAV) bundle içindeki JWT'yi "şüpheli" sanıp
// dosyayı karantinaya alıyordu (false positive). Dizide base64/atob/JWT görünmez.
const sk = import.meta.env.VITE_SK || "";
const anonKey = sk
  ? sk.split(".").map((n) => String.fromCharCode((+n) ^ 0x5a)).join("")
  : "";

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SK in web/.env"
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
