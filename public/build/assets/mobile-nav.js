/* Mobil alt navigasyon + Menü alt sayfası (partials/mobile-nav.njk). */
(function () {
  "use strict";
  var sheet = document.getElementById("tcSheet");
  var scrim = document.getElementById("tcSheetScrim");
  var more = document.getElementById("tcbnMore");
  var bar = document.querySelector(".tcbn");
  if (!sheet || !scrim || !bar) return;
  var panel = sheet.querySelector(".tcsheet__panel");
  var lastTrigger = null;
  var open = false;

  document.body.classList.add("has-tcbn");

  function setOpen(next, trigger) {
    open = next;
    sheet.classList.toggle("is-open", open);
    scrim.classList.toggle("is-open", open);
    sheet.setAttribute("aria-hidden", open ? "false" : "true");
    if (more) more.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("tcsheet-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (open) { lastTrigger = trigger || document.activeElement; requestAnimationFrame(function () { panel.focus(); }); }
    else if (lastTrigger && document.body.contains(lastTrigger) && typeof lastTrigger.focus === "function") lastTrigger.focus();
  }

  if (more) more.addEventListener("click", function () { setOpen(!open, more); });
  var toggle = document.getElementById("tcNavToggle");
  if (toggle) toggle.addEventListener("click", function (e) { e.stopPropagation(); setOpen(!open, toggle); });
  scrim.addEventListener("click", function () { setOpen(false); });
  sheet.querySelectorAll("[data-sheet-close], .tcsheet__link, .tcsheet__cta, .tcsheet__util").forEach(function (el) {
    el.addEventListener("click", function () { setOpen(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (!open) return;
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key !== "Tab") return;
    var f = panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], inside = panel.contains(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Aktif bölme: bulunulan sayfaya göre
  var p = location.pathname.replace(/\/+$/, "") || "/";
  var slot = "more";
  if (p === "/") slot = "home";
  else if (/^\/(instruments|instrumentdetails|all-instruments)/.test(p)) slot = "markets";
  else if (/^\/(live-account|forex-demo-account|account-types)/.test(p)) slot = "open";
  else if (/^\/app\//.test(p)) slot = "login";
  var active = bar.querySelector('[data-slot="' + slot + '"]');
  if (active) {
    active.classList.add("is-active");
    active.setAttribute("aria-current", "page");
    var barEl = document.createElement("span"); barEl.className = "tcbn__bar"; barEl.setAttribute("aria-hidden", "true");
    var cone = document.createElement("span"); cone.className = "tcbn__cone"; cone.setAttribute("aria-hidden", "true");
    active.insertBefore(cone, active.firstChild); active.insertBefore(barEl, active.firstChild);
  } else if (more) more.classList.add("is-tint");
})();
