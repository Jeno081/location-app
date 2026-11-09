// ============================================
// app-config.js — Application du branding de l'instance
// ============================================

(function () {
  const cfg = window.APP_CONFIG || {};
  const racine = document.documentElement;

  if (!localStorage.getItem("lang") && cfg.defaultLanguage) {
    localStorage.setItem("lang", cfg.defaultLanguage);
  }

  function hexVersRgb(hex) {
    const valeur = String(hex || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(valeur)) return null;
    return `${parseInt(valeur.slice(0, 2), 16)}, ${parseInt(valeur.slice(2, 4), 16)}, ${parseInt(valeur.slice(4, 6), 16)}`;
  }

  if (cfg.primaryColor) {
    racine.style.setProperty("--primary", cfg.primaryColor);
    racine.style.setProperty("--primary-strong", cfg.primaryColor);
    const rgb = hexVersRgb(cfg.primaryColor);
    if (rgb) racine.style.setProperty("--primary-rgb", rgb);
  }
  if (cfg.accentColor) racine.style.setProperty("--accent", cfg.accentColor);
  if (cfg.logoUrl) {
    document.querySelectorAll(".brand-mark img, .auth-logo img, img.logo").forEach((img) => {
      img.src = cfg.logoUrl;
      if (cfg.appName) img.alt = cfg.appName;
    });
  }

  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    if (cfg.themeColor) meta.setAttribute("content", cfg.themeColor);
  });
  if (cfg.appleIconUrl) {
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach((link) => {
      link.setAttribute("href", cfg.appleIconUrl);
    });
  }
  if (cfg.faviconUrl) {
    document.querySelectorAll('link[rel="icon"][type="image/png"]').forEach((link) => {
      link.setAttribute("href", cfg.faviconUrl);
    });
  }
  if (cfg.appName) {
    document.title = document.title.replace(/Location App/g, cfg.appName);
  }

  function remplacerMarque() {
    if (cfg.appName) {
      document.querySelectorAll(".brand-text strong").forEach((element) => {
        element.textContent = cfg.appName;
        const point = document.createElement("span");
        point.textContent = ".";
        element.appendChild(point);
      });
      document.querySelectorAll(".entry-brand-text").forEach((element) => {
        element.textContent = cfg.appName;
        const point = document.createElement("span");
        point.textContent = ".";
        element.appendChild(point);
      });
      document.querySelectorAll(".topbar-title").forEach((element) => {
        element.textContent = cfg.appName;
      });
      document.querySelectorAll('meta[name="apple-mobile-web-app-title"]').forEach((meta) => {
        meta.setAttribute("content", cfg.appName);
      });
      document.querySelectorAll('meta[name="description"]').forEach((meta) => {
        if (meta.content) meta.content = meta.content.replace(/Location App/g, cfg.appName);
      });
      document.querySelectorAll("[aria-label*='Location App'], [alt='Location App']").forEach((element) => {
        if (element.hasAttribute("aria-label")) {
          element.setAttribute("aria-label", element.getAttribute("aria-label").replace(/Location App/g, cfg.appName));
        }
        if (element.getAttribute("alt") === "Location App") element.setAttribute("alt", cfg.appName);
      });
    }

    if (cfg.tagline) {
      document.querySelectorAll(".brand-text small").forEach((element) => {
        element.textContent = cfg.tagline;
      });
    }

    // Remplace les mentions de marque restantes, sans toucher aux contenus
    // saisis par les utilisateurs (messages, descriptions, etc.).
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textes = [];
    while (walker.nextNode()) textes.push(walker.currentNode);
    for (const node of textes) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style, textarea, [data-no-i18n], .chat-bubble")) continue;
      let valeur = node.nodeValue;
      if (cfg.appName && valeur.includes("Location App")) {
        valeur = valeur.replace(/Location App/g, cfg.appName);
      }
      if (cfg.currencySymbol && cfg.currencySymbol !== "$" && valeur.includes("($)")) {
        valeur = valeur.replace(/\(\$\)/g, `(${cfg.currencySymbol})`);
      }
      if (cfg.currencySymbol && cfg.currencySymbol !== "$" && valeur.trim() === "0 $") {
        valeur = valeur.replace("0 $", `0 ${cfg.currencySymbol}`);
      }
      if (valeur !== node.nodeValue) node.nodeValue = valeur;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", remplacerMarque, { once: true });
  } else {
    remplacerMarque();
  }
})();
