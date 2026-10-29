// Panel ve admin için mobil alt navigasyon barı + "Menü" alt sayfası (≤900px).
// panel.html ve admin.html bunu yükler. Bar düğmeleri yan menüdeki [data-nav] bağlantılarını
// tetikler; "Menü", tüm bölümleri listeleyen alt sayfayı açar (yan çekmece mobilde kullanılmaz).
import { PANEL_ICON, ADMIN_ICON } from "./icons.js";

const kind = document.body.dataset.panel || "customer";
const ICONS = kind === "admin" ? ADMIN_ICON : PANEL_ICON;
const SLOTS = kind === "admin"
  ? [
      { id: "dashboard", label: "Özet" }, { id: "prospects", label: "Potansiyel" },
      { id: "investors", label: "Yatırımcı" }, { id: "transactions", label: "Finans" },
    ]
  : [
      { id: "overview", label: "Özet" }, { id: "deposit", label: "Yatır" },
      { id: "transfer", label: "Transfer" }, { id: "withdraw", label: "Çek" },
      { id: "support", label: "Destek" },
    ];
const MENU_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="8" cy="8" r="1.75"/><circle cx="16" cy="8" r="1.75"/><circle cx="8" cy="16" r="1.75"/><circle cx="16" cy="16" r="1.75"/></svg>`;
const $ = (s, r = document) => r.querySelector(s);

// ---- alt bar ----
const nav = document.createElement("nav");
nav.className = "pbn";
nav.setAttribute("aria-label", "Panel gezinme");
nav.innerHTML = SLOTS.map((s) => `<button type="button" class="pbn__item" data-slot="${s.id}"><span class="pbn__ic">${ICONS[s.id] || ""}</span><span class="pbn__label">${s.label}</span></button>`).join("") +
  `<button type="button" class="pbn__item pbn__item--more" data-slot="__menu" aria-haspopup="dialog" aria-expanded="false" aria-controls="pbnSheet"><span class="pbn__ic">${MENU_ICON}</span><span class="pbn__label">Menü</span></button>`;
document.body.appendChild(nav);
document.body.classList.add("has-pbn");

// ---- menü alt sayfası ----
const scrim = document.createElement("div"); scrim.className = "pbnsheet__scrim";
const sheet = document.createElement("div"); sheet.className = "pbnsheet"; sheet.id = "pbnSheet";
sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-label", "Menü"); sheet.setAttribute("aria-hidden", "true");
sheet.innerHTML = `<div class="pbnsheet__panel" tabindex="-1">
  <button type="button" class="pbnsheet__handle" data-close aria-label="Kapat"><span class="pbnsheet__handle-bar"></span></button>
  <div class="pbnsheet__user"><div class="pbnsheet__avatar" id="pbnAvatar">—</div><div class="pbnsheet__meta"><div class="pbnsheet__name" id="pbnName">—</div><div class="pbnsheet__email" id="pbnEmail"></div></div></div>
  <div class="pbnsheet__grid" id="pbnGrid"></div>
  <div class="pbnsheet__foot">
    ${kind === "admin" ? `<a class="pbnsheet__foot-link" href="panel.html">${PANEL_ICON.overview || ""}<span>Müşteri Paneli</span></a>` : ""}
    <button type="button" class="pbnsheet__foot-link danger" id="pbnLogout">${ICONS.logout || ""}<span>Çıkış</span></button>
  </div>
</div>`;
document.body.appendChild(scrim); document.body.appendChild(sheet);
const panel = $(".pbnsheet__panel", sheet);
let open = false;

function setOpen(next) {
  open = next;
  sheet.classList.toggle("is-open", open); scrim.classList.toggle("is-open", open);
  sheet.setAttribute("aria-hidden", open ? "false" : "true");
  const more = nav.querySelector("[data-slot='__menu']"); if (more) more.setAttribute("aria-expanded", open ? "true" : "false");
  document.body.style.overflow = open ? "hidden" : "";
  if (open) { buildGrid(); requestAnimationFrame(() => panel.focus()); }
}
function sideLinks() { return [...document.querySelectorAll("#sideNav .panel-side-link[data-nav]")]; }
function buildGrid() {
  const grid = $("#pbnGrid", sheet);
  grid.innerHTML = sideLinks().map((b) => {
    const id = b.dataset.nav, label = b.querySelector("span")?.textContent || id;
    return `<button type="button" class="pbnsheet__item ${b.classList.contains("active") ? "is-active" : ""}" data-go="${id}"><span class="pbnsheet__item-ic">${ICONS[id] || ""}</span><span>${label}</span></button>`;
  }).join("");
  $("#pbnName", sheet).textContent = $("#userName")?.textContent || "—";
  $("#pbnEmail", sheet).textContent = $("#userEmail")?.textContent || "";
  $("#pbnAvatar", sheet).textContent = $("#userAvatar")?.textContent || "—";
}
function go(id) {
  const link = document.querySelector(`#sideNav [data-nav="${id}"]`);
  if (link) link.click();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function sync() {
  const activeId = document.querySelector("#sideNav .panel-side-link.active")?.dataset.nav;
  nav.querySelectorAll("[data-slot]").forEach((b) => b.classList.toggle("is-active", b.dataset.slot === activeId));
  const more = nav.querySelector("[data-slot='__menu']");
  if (more) more.classList.toggle("is-tint", open || !activeId || !SLOTS.some((s) => s.id === activeId));
}

nav.addEventListener("click", (e) => {
  const b = e.target.closest("[data-slot]"); if (!b) return;
  if (b.dataset.slot === "__menu") { setOpen(!open); sync(); return; }
  setOpen(false); go(b.dataset.slot);
});
sheet.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) return setOpen(false);
  const item = e.target.closest("[data-go]"); if (item) { setOpen(false); go(item.dataset.go); }
});
$("#pbnLogout", sheet).onclick = () => { setOpen(false); const lb = $("#logoutBtn"); if (lb) lb.click(); };
scrim.addEventListener("click", () => setOpen(false));
document.addEventListener("keydown", (e) => { if (open && e.key === "Escape") setOpen(false); });

const sideNav = document.getElementById("sideNav");
if (sideNav) new MutationObserver(sync).observe(sideNav, { subtree: true, attributes: true, attributeFilter: ["class"], childList: true });
sync();
