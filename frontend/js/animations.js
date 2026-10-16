// ============================================
// animations.js — Animations globales
// ============================================

// ============================================
// 1. BARRE DE PROGRESSION (au chargement d'une requête)
// ============================================
function startProgress() {
  let bar = document.getElementById("progressBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "progressBar";
    bar.className = "progress-bar";
    document.body.appendChild(bar);
  }
  bar.classList.remove("done");
  bar.classList.add("active");
  setTimeout(() => bar.style.width = "15%", 10);
}

function stopProgress() {
  const bar = document.getElementById("progressBar");
  if (!bar) return;
  bar.classList.remove("active");
  bar.classList.add("done");
  setTimeout(() => {
    bar.style.width = "0%";
    setTimeout(() => bar.remove(), 300);
  }, 400);
}

// Intercepter tous les fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
  startProgress();
  return originalFetch.apply(this, args).finally(() => stopProgress());
};

// ============================================
// 2. EFFET RIPPLE sur les boutons
// ============================================
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button, .btn-primary, .btn-secondary, .btn-home-primary, .btn-home-secondary, a.btn-primary, a.btn-secondary");
  if (!btn) return;

  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = size + "px";
  ripple.style.left = x + "px";
  ripple.style.top = y + "px";

  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

// ============================================
// 3. TRANSITION ENTRE PAGES
// ============================================
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[href]");
  if (!link) return;
  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("javascript") || href.startsWith("mailto")) return;
  if (link.target === "_blank") return;

  e.preventDefault();
  document.body.classList.add("page-transition");
  setTimeout(() => {
    window.location.href = href;
  }, 250);
});

// ============================================
// 4. COMPTEURS ANIMÉS sur les statistiques
// ============================================
function animateCounters() {
  document.querySelectorAll(".stat-value").forEach(el => {
    const text = el.textContent.trim();
    const match = text.match(/^(\d+(?:[.,]\d+)?)/);
    if (!match) return;
    const finalValue = parseFloat(match[1].replace(",", "."));
    if (isNaN(finalValue) || finalValue === 0) return;
    if (el.dataset.animated === "true") return;

    el.dataset.animated = "true";
    el.classList.add("counting");

    const duration = 900;
    const start = performance.now();
    const suffix = text.replace(match[1], "").trim();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(finalValue * eased);
      el.textContent = current + (suffix ? " " + suffix : "");
      if (progress < 1) requestAnimationFrame(update);
      else {
        el.textContent = text;
        el.classList.remove("counting");
      }
    }
    requestAnimationFrame(update);
  });
}

// Observer les changements dans le DOM
const observer = new MutationObserver(() => {
  setTimeout(animateCounters, 100);
});

// ============================================
// 5. INITIALISATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(animateCounters, 500);
});

// ============================================
// 6. UTILITAIRE : SKELETON LOADING
// ============================================
function showSkeletonCards(containerId, count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array(count).fill('<div class="skeleton-card"></div>').join("");
}

function showSkeletonStats(containerId, count = 5) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array(count).fill('<div class="skeleton-stat"></div>').join("");
}
