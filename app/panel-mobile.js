// Panel ve admin için mobil alt navigasyon barı (≤900px). panel.html ve admin.html bunu yükler.
// Düğmeler yan menüdeki [data-nav] bağlantılarını tetikler; "Menü" yan çekmeceyi açar.
import { PANEL_ICON, ADMIN_ICON } from "./icons.js";

const kind = document.body.dataset.panel || "customer";
const SLOTS = kind === "admin"
  ? [
      { id: "dashboard", label: "Özet", icon: ADMIN_ICON.dashboard },
      { id: "prospects", label: "Potansiyel", icon: ADMIN_ICON.prospects },
      { id: "investors", label: "Yatırımcı", icon: ADMIN_ICON.investors },
      { id: "transactions", label: "Finans", icon: ADMIN_ICON.transactions },
    ]
  : [
      { id: "overview", label: "Özet", icon: PANEL_ICON.overview },
      { id: "deposit", label: "Yatır", icon: PANEL_ICON.deposit },
      { id: "withdraw", label: "Çek", icon: PANEL_ICON.withdraw },
      { id: "support", label: "Destek", icon: PANEL_ICON.support },
    ];

const MENU_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="8" cy="8" r="1.75"/><circle cx="16" cy="8" r="1.75"/><circle cx="8" cy="16" r="1.75"/><circle cx="16" cy="16" r="1.75"/></svg>`;

const nav = document.createElement("nav");
nav.className = "pbn";
nav.setAttribute("aria-label", "Panel gezinme");
nav.innerHTML = SLOTS.map((s) => `<button type="button" class="pbn__item" data-slot="${s.id}"><span class="pbn__ic">${s.icon || ""}</span><span class="pbn__label">${s.label}</span></button>`).join("") +
  `<button type="button" class="pbn__item pbn__item--more" data-slot="__menu"><span class="pbn__ic">${MENU_ICON}</span><span class="pbn__label">Menü</span></button>`;
document.body.appendChild(nav);
document.body.classList.add("has-pbn");

function sideLink(id) { return document.querySelector(`#sideNav [data-nav="${id}"]`); }
function openDrawer() {
  const side = document.querySelector(".panel-side"), scrim = document.getElementById("sideScrim");
  if (side) side.classList.add("open");
  if (scrim) scrim.classList.remove("hidden");
}
function sync() {
  const activeId = document.querySelector("#sideNav .panel-side-link.active")?.dataset.nav;
  nav.querySelectorAll("[data-slot]").forEach((b) => b.classList.toggle("is-active", b.dataset.slot === activeId));
  const more = nav.querySelector("[data-slot='__menu']");
  if (more) more.classList.toggle("is-tint", !activeId || !SLOTS.some((s) => s.id === activeId));
}
nav.addEventListener("click", (e) => {
  const b = e.target.closest("[data-slot]"); if (!b) return;
  if (b.dataset.slot === "__menu") return openDrawer();
  const link = sideLink(b.dataset.slot);
  if (link) link.click();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
// Yan menü sonradan çizildiği ve aktif sınıfı değiştiği için gözlemle
const sideNav = document.getElementById("sideNav");
if (sideNav) new MutationObserver(sync).observe(sideNav, { subtree: true, attributes: true, attributeFilter: ["class"], childList: true });
sync();
