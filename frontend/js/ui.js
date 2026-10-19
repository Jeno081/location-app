// ============================================
// ui.js — Helpers d'interface partagés
// ============================================

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} $`;
}

function formatDate(value, options = {}) {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [annee, mois, jour] = value.split("-");
    return new Date(Number(annee), Number(mois) - 1, Number(jour))
      .toLocaleDateString("fr-FR", options.day || options.month || options.year ? options : { day: "2-digit", month: "short", year: "numeric" });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("fr-FR", options.day || options.month || options.year ? options : { day: "2-digit", month: "short", year: "numeric" });
}

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function formatMonth(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value || "—";
  const [annee, mois] = value.split("-").map(Number);
  return `${MOIS_FR[mois - 1]} ${annee}`;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.textContent = type === "success" ? "✓" : type === "info" ? "i" : "!";

  const text = document.createElement("span");
  text.textContent = String(message || "");

  toast.append(icon, text);
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 3800);
}

let lightboxState = null;

function closeImageLightbox() {
  if (!lightboxState) return;
  const { overlay, onClose } = lightboxState;
  lightboxState = null;
  document.body.classList.remove("lightbox-open");
  document.removeEventListener("keydown", lightboxStateKeydown);
  overlay.classList.remove("show");
  setTimeout(() => overlay.remove(), 180);
  if (typeof onClose === "function") onClose();
}

function lightboxStateKeydown(event) {
  if (!lightboxState) return;
  if (event.key === "Escape") { closeImageLightbox(); return; }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    lightboxState.index = (lightboxState.index + 1) % lightboxState.urls.length;
    updateLightbox();
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    lightboxState.index = (lightboxState.index - 1 + lightboxState.urls.length) % lightboxState.urls.length;
    updateLightbox();
  }
}

function updateLightbox() {
  if (!lightboxState) return;
  const { urls, index, title, image, caption, counter, prev, next } = lightboxState;
  image.classList.add("loading");
  image.src = urls[index];
  image.alt = title || "Photo";
  caption.textContent = title || "Aperçu";
  counter.textContent = urls.length > 1 ? `${index + 1} / ${urls.length}` : "";
  if (prev) prev.style.visibility = urls.length > 1 ? "visible" : "hidden";
  if (next) next.style.visibility = urls.length > 1 ? "visible" : "hidden";
}

function openImageLightbox(urls, startIndex = 0, title = "", onClose = null) {
  if (!urls || urls.length === 0) return;
  closeImageLightbox();

  const index = Math.max(0, Math.min(startIndex, urls.length - 1));
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.id = "imageLightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", title || "Aperçu de l'image");
  overlay.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Fermer l'aperçu">&times;</button>
    <button class="lightbox-nav lightbox-prev" type="button" aria-label="Image précédente">‹</button>
    <figure class="lightbox-figure">
      <div class="lightbox-media"><img alt=""></div>
      <figcaption class="lightbox-caption"><span class="lightbox-title"></span><span class="lightbox-counter"></span></figcaption>
    </figure>
    <button class="lightbox-nav lightbox-next" type="button" aria-label="Image suivante">›</button>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add("lightbox-open");

  const image = overlay.querySelector("img");
  const caption = overlay.querySelector(".lightbox-title");
  const counter = overlay.querySelector(".lightbox-counter");
  const prev = overlay.querySelector(".lightbox-prev");
  const next = overlay.querySelector(".lightbox-next");

  lightboxState = { overlay, urls, index, title, image, caption, counter, prev, next, onClose };
  updateLightbox();

  image.addEventListener("load", () => image.classList.remove("loading"));
  image.addEventListener("error", () => {
    image.classList.remove("loading");
    showToast("Impossible de charger cette image", "error");
  });

  overlay.querySelector(".lightbox-close").addEventListener("click", closeImageLightbox);
  prev.addEventListener("click", (event) => {
    event.stopPropagation();
    lightboxState.index = (lightboxState.index - 1 + urls.length) % urls.length;
    updateLightbox();
  });
  next.addEventListener("click", (event) => {
    event.stopPropagation();
    lightboxState.index = (lightboxState.index + 1) % urls.length;
    updateLightbox();
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeImageLightbox();
  });
  document.addEventListener("keydown", lightboxStateKeydown);

  requestAnimationFrame(() => overlay.classList.add("show"));
}

function openPdfBlob(objectUrl) {
  const link = document.createElement("a");
  link.href = objectUrl;
  link.target = "_blank";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function openProtectedFile(url, title = "Aperçu") {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showToast(data.message || "Fichier indisponible", "error");
      return;
    }
    const type = response.headers.get("content-type") || "";
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    if (type.startsWith("image/")) {
      openImageLightbox([objectUrl], 0, title, () => URL.revokeObjectURL(objectUrl));
      return;
    }
    if (type.startsWith("application/pdf")) {
      openPdfBlob(objectUrl);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return;
    }
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = title;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  } catch (err) {
    showToast("Impossible d'ouvrir le fichier", "error");
  }
}

async function downloadProtectedFile(url, filename) {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showToast(data.message || "Téléchargement impossible", "error");
      return;
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename || "document";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(objectUrl);
    }, 1500);
  } catch (err) {
    showToast("Erreur de téléchargement", "error");
  }
}

function setPageHeading(title, subtitle) {
  const heading = document.getElementById("pageTitle");
  const sub = document.getElementById("pageSubtitle");
  if (heading && title) heading.textContent = title;
  if (sub && subtitle) sub.textContent = subtitle;
}

function fillUserIdentity() {
  let user = null;
  try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch (err) { user = null; }
  const firstName = user && user.nom ? String(user.nom).trim().split(/\s+/)[0] : "";
  const target = document.getElementById("userFirstName");
  if (target) target.textContent = firstName ? `${firstName} !` : "!";
  const date = document.getElementById("pageDate");
  if (date) {
    date.textContent = new Date().toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  }
}

window.escapeHtml = escapeHtml;
window.formatMoney = formatMoney;
window.formatDate = formatDate;
window.formatMonth = formatMonth;
window.showToast = showToast;
window.openProtectedFile = openProtectedFile;
window.openImageLightbox = openImageLightbox;
window.closeImageLightbox = closeImageLightbox;
window.downloadProtectedFile = downloadProtectedFile;
window.setPageHeading = setPageHeading;
