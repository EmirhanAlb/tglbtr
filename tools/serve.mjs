// Yerel önizleme: _site klasörünü ve /api/market-prices uç noktasını birlikte sunar.
//   npm run build && npm run preview   ->  http://localhost:8080
// (Eleventy'nin kendi "dev" sunucusu API fonksiyonunu çalıştıramaz; canlı fiyatları
//  yerelde görmek için bunu kullanın.)

import { createServer } from "node:http";
import { createReadStream, statSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import marketPrices from "../api/market-prices.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "_site");
const port = Number(process.env.PORT) || 8080;
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".mp4": "video/mp4", ".xml": "application/xml", ".txt": "text/plain",
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/market-prices") return marketPrices(req, res);
  let file = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) { res.statusCode = 403; return res.end(); }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) { file = join(root, "404.html"); res.statusCode = 404; }
  res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Önizleme: http://localhost:${port}`));
