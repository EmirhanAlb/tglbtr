/* Canlı fiyat akışı — tüm sayfalarda çalışır.
 *
 * /api/market-prices adresinden 10 saniyede bir fiyat çeker ve sayfadaki
 * .SEMBOL_bid / _ask / _change / _change_percentage / _scroller_change_percentage_new /
 * _position / _rate_img / _dirimg öğelerini günceller. Ana sayfadaki ticker, enstrüman
 * tablosu, /instruments/* kayan kartları ve /instrumentdetails/* sayfaları bu sınıfları kullanır.
 * Renkler live-prices.css içindeki .lp-up / .lp-down sınıflarıyla verilir.
 */
(function () {
  "use strict";
  var URL = window.__LIVE_MARKETDATA_URL__ || "/api/market-prices";
  var FALLBACK_URL = "/api/market-prices.json"; // derleme anındaki statik kopya (yerel geliştirme)
  var INTERVAL = 10000;
  var FLASH_MS = 900;
  var prev = {};
  var timer = null;

  function esc(sym) { return window.CSS && CSS.escape ? CSS.escape(sym) : sym.replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
  function num(v) { var n = parseFloat(String(v).replace("%", "")); return isFinite(n) ? n : NaN; }

  function setText(nodes, text) {
    for (var i = 0; i < nodes.length; i++) if (nodes[i].textContent !== text) nodes[i].textContent = text;
  }
  function setDir(nodes, up, down) {
    for (var i = 0; i < nodes.length; i++) {
      var c = nodes[i].classList;
      c.remove("text-green-600", "text-red-600", "text-red-green", "lp-up", "lp-down", "lp-flat");
      c.add(up ? "lp-up" : down ? "lp-down" : "lp-flat");
    }
  }
  function flash(nodes, dir) {
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      el.classList.remove("lp-flash-up", "lp-flash-down");
      void el.offsetWidth; // animasyonu yeniden başlat
      el.classList.add(dir > 0 ? "lp-flash-up" : "lp-flash-down");
      (function (e) { setTimeout(function () { e.classList.remove("lp-flash-up", "lp-flash-down"); }, FLASH_MS); })(el);
    }
  }
  function q(sel) { return document.querySelectorAll(sel); }

  function apply(quotes) {
    var touched = 0;
    for (var sym in quotes) {
      if (!Object.prototype.hasOwnProperty.call(quotes, sym)) continue;
      var d = quotes[sym];
      var s = esc(sym);
      var bidEls = q("." + s + "_bid"), askEls = q("." + s + "_ask");
      var chgEls = q("." + s + "_change"), pctEls = q("." + s + "_change_percentage");
      var tickPct = q("." + s + "_scroller_change_percentage_new"), pos = q("." + s + "_position");
      var rateImg = q("." + s + "_rate_img"), dirImg = q("." + s + "_dirimg");
      if (!bidEls.length && !askEls.length && !chgEls.length && !pctEls.length && !tickPct.length) continue;
      touched++;

      var pct = num(d.change_percentage), chg = num(d.change);
      var up = pct > 0 || (pct === 0 && chg > 0), down = pct < 0 || (pct === 0 && chg < 0);
      var pctText = isNaN(pct) ? "-" : (pct > 0 ? "+" : "") + pct.toFixed(2) + "%";

      setText(bidEls, d.bid); setText(askEls, d.ask);
      setText(chgEls, d.change); setText(pctEls, pctText); setText(tickPct, pctText);
      setDir(chgEls, up, down); setDir(pctEls, up, down); setDir(tickPct, up, down);

      for (var i = 0; i < pos.length; i++) {
        pos[i].classList.remove("arrow-green", "arrow-red");
        pos[i].classList.add(down ? "arrow-red" : "arrow-green");
      }
      for (i = 0; i < rateImg.length; i++) {
        var src = down ? "/images/down.png" : "/images/up.png";
        if (rateImg[i].getAttribute("src") !== src) rateImg[i].setAttribute("src", src);
      }
      for (i = 0; i < dirImg.length; i++) {
        var dsrc = down ? "/images/live_red.svg" : "/images/live_green.svg";
        if (dirImg[i].getAttribute("src") !== dsrc) dirImg[i].setAttribute("src", dsrc);
      }
      // Kayan kartlar: kartın kendisine yön sınıfı
      for (i = 0; i < bidEls.length; i++) {
        var card = bidEls[i].closest(".data, .lp-card");
        if (card) { card.classList.remove("lp-up", "lp-down", "lp-flat"); card.classList.add(up ? "lp-up" : down ? "lp-down" : "lp-flat"); }
      }
      // Fiyat tik yönüne göre kısa vurgu
      var nb = num(d.bid), pb = prev[sym];
      if (pb !== undefined && !isNaN(nb) && nb !== pb) { flash(bidEls, nb - pb); flash(askEls, nb - pb); }
      if (!isNaN(nb)) prev[sym] = nb;
    }
    // Ana sayfa tablosu (DataTables) sıralamayı korusun
    var dt = window.homeMarketDataTable;
    if (touched && dt && typeof dt.rows === "function") {
      try { dt.rows().invalidate("dom").draw(false); } catch (e) {}
    }
  }

  function getJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  function tick() {
    getJSON(URL)
      .catch(function () { return getJSON(FALLBACK_URL); })
      .then(function (data) { if (data && data.live_quote) apply(data.live_quote); })
      .catch(function () {});
  }
  function start() { if (!timer) { tick(); timer = setInterval(tick, INTERVAL); } }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
