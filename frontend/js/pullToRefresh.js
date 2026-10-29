// ============================================
// pullToRefresh.js — Actualisation par glissement vers le bas
// ============================================

(function () {
  if (!("ontouchstart" in window) || !document.body.classList.contains("app-page")) return;

  const SEUIL = 70;
  const MAX = 110;
  let departY = 0;
  let distance = 0;
  let actif = false;
  let enCours = false;

  const indicateur = document.createElement("div");
  indicateur.id = "pullRefresh";
  indicateur.className = "pull-refresh";
  indicateur.innerHTML = '<i data-lucide="arrow-down"></i>';
  document.body.appendChild(indicateur);
  if (typeof lucide !== "undefined") lucide.createIcons();

  const icone = indicateur.querySelector("svg");
  if (icone) icone.style.transition = "transform .15s ease";

  function reinitialiser() {
    distance = 0;
    actif = false;
    indicateur.classList.remove("visible", "ready", "refreshing");
    indicateur.style.opacity = "";
    if (icone) icone.style.transform = "";
  }

  document.addEventListener("touchstart", (event) => {
    if (enCours || window.scrollY > 0 || event.touches.length !== 1) return;
    departY = event.touches[0].clientY;
    distance = 0;
    actif = true;
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (!actif || enCours) return;
    const delta = event.touches[0].clientY - departY;

    if (delta <= 0 || window.scrollY > 0) {
      if (delta < -8) reinitialiser();
      return;
    }

    if (event.cancelable) event.preventDefault();
    distance = Math.min(delta * 0.55, MAX);
    const visible = distance > 8;
    indicateur.classList.toggle("visible", visible);
    indicateur.classList.toggle("ready", distance >= SEUIL);
    indicateur.style.opacity = visible ? "1" : "0";
    if (icone) icone.style.transform = `rotate(${Math.min(distance / SEUIL, 1) * 180}deg)`;
  }, { passive: false });

  document.addEventListener("touchend", async () => {
    if (!actif || enCours) return;
    actif = false;

    if (distance < SEUIL) {
      reinitialiser();
      return;
    }

    enCours = true;
    indicateur.classList.add("refreshing");
    indicateur.classList.remove("ready");

    try {
      if (typeof window.rafraichirApplication === "function") {
        await window.rafraichirApplication();
      } else {
        window.location.reload();
        return;
      }
    } catch (err) {
      console.warn("Actualisation impossible :", err);
    }

    setTimeout(() => {
      enCours = false;
      reinitialiser();
    }, 450);
  }, { passive: true });
})();
