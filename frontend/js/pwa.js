// ============================================
// pwa.js — Installation, Service Worker et bannière
// ============================================

const PWA_DISMISS_KEY = "pwa-install-dismissed-at";
const PWA_DISMISS_DELAY = 14 * 24 * 60 * 60 * 1000; // 14 jours

let deferredInstallPrompt = null;

function estInstallee() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: fullscreen)").matches
    || window.navigator.standalone === true;
}

function estIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

function banniereDejaRejetee() {
  const rejet = Number(localStorage.getItem(PWA_DISMISS_KEY) || 0);
  return rejet && Date.now() - rejet < PWA_DISMISS_DELAY;
}

function retirerBanniereInstallation() {
  const banniere = document.getElementById("pwaInstallBanner");
  if (banniere) banniere.remove();
}

function afficherBanniereInstallation(mode = "prompt") {
  if (estInstallee() || banniereDejaRejetee() || document.getElementById("pwaInstallBanner")) return;

  const ios = mode === "ios";
  const banniere = document.createElement("aside");
  banniere.id = "pwaInstallBanner";
  banniere.className = "pwa-banner";
  banniere.setAttribute("role", "dialog");
  banniere.setAttribute("aria-label", "Installer Location App");
  banniere.innerHTML = `
    <img class="pwa-banner-icon" src="/icons/icon-192.png" alt="">
    <div class="pwa-banner-text">
      <strong>Installer Location App</strong>
      <span>${ios
        ? "Appuyez sur Partager puis « Sur l'écran d'accueil »."
        : "Accès rapide depuis votre écran d'accueil, comme une application."}</span>
    </div>
    ${ios
      ? '<span class="pwa-banner-ios" aria-hidden="true">⬆</span>'
      : '<button type="button" class="btn-primary btn-sm" id="pwaInstallBtn">Installer</button>'}
    <button type="button" class="pwa-banner-close" id="pwaDismissBtn" aria-label="Fermer">&times;</button>
  `;

  document.body.appendChild(banniere);
  requestAnimationFrame(() => banniere.classList.add("show"));

  const fermer = () => {
    localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
    banniere.classList.remove("show");
    setTimeout(retirerBanniereInstallation, 180);
  };

  const boutonFermer = document.getElementById("pwaDismissBtn");
  if (boutonFermer) boutonFermer.addEventListener("click", fermer);

  const boutonInstaller = document.getElementById("pwaInstallBtn");
  if (boutonInstaller) {
    boutonInstaller.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      boutonInstaller.disabled = true;
      deferredInstallPrompt.prompt();
      try {
        const choix = await deferredInstallPrompt.userChoice;
        if (choix.outcome === "accepted") {
          localStorage.removeItem(PWA_DISMISS_KEY);
          if (typeof showToast === "function") showToast("Application installée", "success");
        } else {
          fermer();
        }
      } catch (err) { /* ignoré */ }
      deferredInstallPrompt = null;
      retirerBanniereInstallation();
    });
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch((err) => {
        console.warn("Service Worker non enregistré :", err);
      });
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (!estInstallee() && !banniereDejaRejetee()) afficherBanniereInstallation("prompt");
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  localStorage.removeItem(PWA_DISMISS_KEY);
  retirerBanniereInstallation();
  if (typeof showToast === "function") showToast("Application installée", "success");
});

window.addEventListener("DOMContentLoaded", () => {
  if (estInstallee()) return;

  // iOS ne déclenche pas beforeinstallprompt : on affiche les instructions.
  if (estIOS() && !banniereDejaRejetee()) {
    setTimeout(() => afficherBanniereInstallation("ios"), 2500);
  }
});
