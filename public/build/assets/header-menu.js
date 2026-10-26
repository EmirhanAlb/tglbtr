/* Üst menü davranışı: masaüstünde mega menüler (Piyasalar, Hesaplar, Araçlar,
   Eğitim, Hakkımızda, Ortaklık), mobilde hamburger menüsü.

   Neden gerekli: orijinal sitede bu davranış iki ayrı pakette duruyor —
   ana sayfada home-48a5a3ec.js, diğer tüm sayfalarda innerpages-886314ef.js.
   Bu kopyaya yalnızca home-48a5a3ec.js alınmış. Alt sayfalarda mega menüyü
   açacak kod olmadığı için menüye tıklanınca onun yerine <li> içindeki küçük
   ul.dropdown-menu açılıyordu; o liste CSS'te width:100% aldığı için üst
   menü maddesi kadar (~47px) dar kalıyor ve linkler kutunun dışına taşıyordu.

   Bu dosya innerpages paketindeki davranışın aynısını yapar ve base.njk
   tarafından YALNIZCA home-48a5a3ec.js yüklemeyen sayfalara eklenir; aksi halde
   ana sayfada iki ayrı dinleyici birbirini iptal eder ve menü hiç açılmaz.

   Eşleştirme sabit id'lerle değil, header.njk'nin <li data-section> olarak
   bastığı değerle yapılır; kaynağı src/_data/nav.json. */

(function () {
    "use strict";

    megaMenus();
    mobileMenu();
    loginDropdowns();

function megaMenus() {
    // Mega menüler yalnızca masaüstü başlıkta var. Mobilde (#mainMenu) menü
    // maddesi tam genişlikte olduğu için küçük açılır liste zaten doğru görünür;
    // orijinalde de mobilde o liste kullanılır.
    const desktopNav = document.querySelector("header .container .header-area");
    if (!desktopNav) return;

    const entries = [];
    desktopNav.querySelectorAll(":scope > ul > li[data-section]").forEach(li => {
        const section = document.getElementById(li.dataset.section);
        const toggle = li.querySelector(":scope > a.dropdown-toggle");
        // Aynı <li> içindeki küçük açılır liste: mega menü açılırken kapatılır.
        const inlineMenu = li.querySelector(":scope > ul.dropdown-menu");
        if (section && toggle) entries.push({ section, toggle, inlineMenu });
    });
    if (!entries.length) return;

    function hide(el) {
        if (!el) return;
        el.classList.add("hidden");
        el.style.display = "none";
    }

    function show(el) {
        el.classList.remove("hidden");
        el.style.display = "block";
    }

    entries.forEach(entry => hide(entry.section));

    entries.forEach(entry => {
        entry.toggle.addEventListener("click", event => {
            event.preventDefault();
            // utils-939e6257.js'teki .tab-click dinleyicisi aynı tıklamada küçük
            // listeyi açmasın diye yayılım burada durdurulur.
            event.stopPropagation();

            const wasOpen = !entry.section.classList.contains("hidden");
            entries.forEach(other => {
                hide(other.inlineMenu);
                hide(other.section);
            });
            if (!wasOpen) show(entry.section);
        });
    });

    // Menünün ve tetikleyicisinin dışına tıklanınca kapat.
    document.addEventListener("click", event => {
        entries.forEach(entry => {
            if (entry.section.contains(event.target)) return;
            if (entry.toggle.contains(event.target)) return;
            hide(entry.section);
        });
    });
}

/* Mobil hamburger menüsü.
   utils-939e6257.js içindeki hamburgerMenu() "mobileMenuButton" id'sini arıyor,
   oysa başlıkta "mobileMenuButtons" (sonda s) var — orijinal sitede de öyle.
   Bu yüzden menüyü açan gerçek kod orada değil, sayfa paketlerinde duruyor.
   Aşağısı home-48a5a3ec.js'teki davranışın aynısıdır: hamburger ikonu
   animasyonla çarpıya döner, #mainMenu açılır, dışarı tıklanınca kapanır. */
function mobileMenu() {
    const button = document.getElementById("mobileMenuButtons");
    const panel = document.getElementById("mainMenu");
    const iconOpen = document.getElementById("icon-open");
    const iconClose = document.getElementById("icon-close");
    const lineTop = document.getElementById("line-top");
    const lineMid = document.getElementById("line-mid");
    const lineBot = document.getElementById("line-bot");
    if (!button || !panel || !iconOpen || !iconClose) return;

    let open = false;

    function setOpen(next) {
        open = next;
        lineTop.classList.toggle("animate-rotate-open-top", open);
        lineBot.classList.toggle("animate-rotate-open-bot", open);
        lineTop.classList.toggle("animate-rotate-close-top", !open);
        lineBot.classList.toggle("animate-rotate-close-bot", !open);
        lineMid.classList.toggle("fade-out", open);
        lineMid.classList.toggle("fade-in", !open);

        if (open) {
            // Orijinalde ikon değişimi çizgi animasyonu bitince yapılıyor.
            setTimeout(() => {
                iconOpen.classList.add("hidden");
                iconClose.classList.remove("hidden");
                panel.classList.remove("hidden");
            }, 400);
        } else {
            iconClose.classList.add("hidden");
            iconOpen.classList.remove("hidden");
            panel.classList.add("hidden");
        }
    }

    button.addEventListener("click", event => {
        event.stopPropagation();
        setOpen(!open);
    });

    // Panelin içine tıklamak menüyü kapatmasın (alt menüler açılabilsin).
    panel.addEventListener("click", event => event.stopPropagation());

    document.addEventListener("click", event => {
        if (open && !button.contains(event.target)) setOpen(false);
    });
}

/* "Giriş" butonundaki Müşteri / Ortak açılır listesi.
   Bu davranış da orijinalde yalnızca ana sayfanın home-48a5a3ec.js paketinde;
   alt sayfalarda butona tıklayınca liste açılmıyordu. Aynı mantık burada:
   butona tıklayınca liste açılır/kapanır, dışarı tıklanınca kapanır.
   Masaüstü ve mobil başlıkta ayrı .login-dropdown bloğu var; ikisi de bağlanır. */
function loginDropdowns() {
    document.querySelectorAll(".login-dropdown").forEach(wrap => {
        const button = wrap.querySelector(".loginButton");
        const menu = wrap.querySelector(".loginDropdown");
        if (!button || !menu) return;

        button.addEventListener("click", event => {
            event.stopPropagation();
            menu.classList.toggle("hidden");
        });
        document.addEventListener("click", event => {
            if (!wrap.contains(event.target)) menu.classList.add("hidden");
        });
    });
}
})();
