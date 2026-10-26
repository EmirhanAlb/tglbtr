// Free, client-side KYC document analysis.
//
// Uses Tesseract.js (OCR, runs entirely in the browser — no API key, no cost) to
// read the uploaded ID photos, then scores them with a heuristic algorithm that
// looks for the hallmarks of a real identity document:
//   - front: issuer / "identity" wording, field labels, a document or national id number
//   - back : a machine-readable zone (MRZ) or address block
// Returns a confidence score (0-100) and a pass/fail the UI can act on.

import Tesseract from "tesseract.js";

// --- pattern banks (matched against UPPER-CASED OCR text) ---------------------

const FRONT_STRONG = [
  /REPUBL/, /T[UÜ]RK[İI]?YE/, /TURKEY/, /IDENTITY/, /K[İI]ML[İI]K/, /PASSPORT/,
  /DRIVER/, /LICEN[CS]E/,
];
const FRONT_LABELS = [
  /SURNAME/, /SOYAD/, /\bNAME\b/, /\bADI\b/, /BIRTH/, /DO[GĞ]UM/, /DOCUMENT/, /BELGE/,
  /SER[İI]AL/, /SER[İI]\b/, /VALID/, /GE[CÇ]ERL/, /\bSEX\b/, /C[İI]NS[İI]YET/,
  /NATIONAL/, /UYRUK/, /\bTC\b/, /T\.C/,
];
const BACK_ADDRESS = [/ADRES/, /ADDRESS/, /\bMAH\b/, /\bSOK\b/, /\bCAD\b/, /\bNO\b/];

// MRZ: passport/ID machine-readable zone — long runs of A-Z0-9< with chevrons.
const MRZ_CHEVRON = /<{3,}/;
const MRZ_LINE = /[A-Z0-9<]{24,}/;
const MRZ_ID_HEAD = /\bI[A-Z<]?TUR/; // ID cards begin IDTUR / I<TUR ...
const ID_NUMBER = /\b\d{9,11}\b/;    // national id / document number

function countMatches(text, patterns) {
  return patterns.reduce((n, re) => (re.test(text) ? n + 1 : n), 0);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

async function ocr(file, onProgress) {
  const { data } = await Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress || 0);
    },
  });
  return (data.text || "").toUpperCase();
}

function scoreFront(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.replace(/[^A-Z0-9]/g, "").length < 12) {
    return { ok: false, hits: 0, reason: "no_text" };
  }
  const strong = countMatches(clean, FRONT_STRONG);
  const labels = countMatches(clean, FRONT_LABELS);
  const hasNumber = ID_NUMBER.test(clean) ? 1 : 0;
  const hits = strong * 2 + labels + hasNumber * 2;
  const ok = hits >= 3 && (strong >= 1 || labels >= 2);
  return { ok, hits, strong, labels, hasNumber: !!hasNumber };
}

function scoreBack(text) {
  const clean = text.replace(/[ \t]+/g, " ").trim();
  if (clean.replace(/[^A-Z0-9]/g, "").length < 12) {
    return { ok: false, hits: 0, reason: "no_text" };
  }
  const mrz = (MRZ_CHEVRON.test(clean) || MRZ_LINE.test(clean) || MRZ_ID_HEAD.test(clean)) ? 1 : 0;
  const address = countMatches(clean, BACK_ADDRESS);
  const hits = mrz * 3 + address;
  const ok = mrz === 1 || address >= 2;
  return { ok, hits, mrz: !!mrz, address };
}

// Analyze both sides. onProgress(fraction 0..1) reports overall progress.
export async function analyzeKyc(frontFile, backFile, onProgress) {
  const report = (base, frac) => onProgress && onProgress(clamp(base + frac * 0.5, 0, 1));

  const frontText = await ocr(frontFile, (p) => report(0, p));
  const backText = await ocr(backFile, (p) => report(0.5, p));

  const front = scoreFront(frontText);
  const back = scoreBack(backText);

  // Lenient policy (per product): a recognizable issuer phrase (e.g. "Türkiye
  // Cumhuriyeti" / "Republic" / "Identity") is an immediate pass; otherwise accept
  // anything scoring 30%+ and reject only below 30%. Truly blank/unreadable uploads
  // still fail.
  const combined = `${frontText} ${backText}`;
  const strong = FRONT_STRONG.some((re) => re.test(combined));

  const frontPct = clamp(Math.min(front.hits, 5) / 5, 0, 1) * 60;
  const backPct = clamp(Math.min(back.hits, 3) / 3, 0, 1) * 40;
  let score = Math.round(frontPct + backPct);
  if (strong) score = Math.max(score, 80);

  const readable = combined.replace(/[^A-Z0-9]/g, "").length;
  const blank = readable < 10;

  const ok = !blank && (strong || score >= 30);

  let reason = null;
  if (!ok) reason = blank ? "blurry" : "low_score";

  return { ok, score, strong, front, back, reason };
}
