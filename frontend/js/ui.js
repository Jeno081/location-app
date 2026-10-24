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

function localeCourante() {
  return localStorage.getItem("lang") === "en" ? "en-GB" : "fr-FR";
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString(localeCourante(), { maximumFractionDigits: 2 })} $`;
}

function formatDate(value, options = {}) {
  if (!value) return "—";
  const locale = localeCourante();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [annee, mois, jour] = value.split("-");
    return new Date(Number(annee), Number(mois) - 1, Number(jour))
      .toLocaleDateString(locale, options.day || options.month || options.year ? options : { day: "2-digit", month: "short", year: "numeric" });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(locale, options.day || options.month || options.year ? options : { day: "2-digit", month: "short", year: "numeric" });
}

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const MOIS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatMonth(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value || "—";
  const [annee, mois] = value.split("-").map(Number);
  const noms = localeCourante() === "en-GB" ? MOIS_EN : MOIS_FR;
  return `${noms[mois - 1]} ${annee}`;
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
  text.textContent = typeof traduireTexte === "function" ? traduireTexte(String(message || "")) : String(message || "");

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

function openPdfBlob(objectUrl, title = "Document", filename = "document.pdf") {
  return openPdfViewer(objectUrl, title, filename, { revoke: true });
}

let pdfJsPromise = null;

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfJsPromise) return pdfJsPromise;
  pdfJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/pdf.min.js?v=18";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "/vendor/pdf.worker.min.js?v=18";
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Visionneuse PDF indisponible"));
    document.head.appendChild(script);
  });
  return pdfJsPromise;
}

function closePdfViewer() {
  const viewer = document.getElementById("pdfViewer");
  if (!viewer) return;
  const revoke = viewer.dataset.revokeUrl;
  viewer.classList.remove("show");
  document.body.style.overflow = "";
  setTimeout(() => viewer.remove(), 180);
  if (revoke) setTimeout(() => URL.revokeObjectURL(revoke), 500);
}

async function openPdfViewer(objectUrl, title = "Document", filename = "document.pdf", options = {}) {
  closePdfViewer();
  document.body.style.overflow = "hidden";

  const overlay = document.createElement("div");
  overlay.id = "pdfViewer";
  overlay.className = "pdf-viewer";
  if (options.revoke) overlay.dataset.revokeUrl = objectUrl;
  overlay.innerHTML = `
    <header class="pdf-viewer-head">
      <button type="button" class="pdf-viewer-btn" data-pdf-close aria-label="Fermer le document">
        <i data-lucide="arrow-left"></i><span>Retour</span>
      </button>
      <span class="pdf-viewer-title">${escapeHtml(title)}</span>
      <a class="pdf-viewer-btn" href="${objectUrl}" download="${escapeHtml(filename)}" aria-label="Télécharger le PDF">
        <i data-lucide="download"></i><span>Télécharger</span>
      </a>
      <button type="button" class="pdf-viewer-btn" data-pdf-close aria-label="Fermer">
        <i data-lucide="x"></i>
      </button>
    </header>
    <div class="pdf-viewer-body"><p class="pdf-viewer-loading">Chargement du document…</p></div>
  `;
  document.body.appendChild(overlay);
  if (typeof lucide !== "undefined") lucide.createIcons();
  requestAnimationFrame(() => overlay.classList.add("show"));

  overlay.querySelectorAll("[data-pdf-close]").forEach((btn) => btn.addEventListener("click", closePdfViewer));
  document.addEventListener("keydown", function onKey(event) {
    if (event.key === "Escape") { closePdfViewer(); document.removeEventListener("keydown", onKey); }
  });

  const body = overlay.querySelector(".pdf-viewer-body");

  try {
    const pdfjsLib = await loadPdfJs();
    const pdf = await pdfjsLib.getDocument(objectUrl).promise;
    body.innerHTML = "";

    const largeur = Math.min(body.clientWidth - 24, 900);
    for (let numero = 1; numero <= pdf.numPages; numero++) {
      const page = await pdf.getPage(numero);
      const base = page.getViewport({ scale: 1 });
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale: (largeur / base.width) * ratio });

      const wrapper = document.createElement("div");
      wrapper.className = "pdf-viewer-page";
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      wrapper.appendChild(canvas);
      body.appendChild(wrapper);

      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    }
  } catch (err) {
    body.innerHTML = `
      <p class="pdf-viewer-error">
        Impossible d'afficher l'aperçu sur cet appareil.<br>
        <a href="${objectUrl}" download="${escapeHtml(filename)}" style="color:#93c5fd;text-decoration:underline;">Télécharger le PDF</a>
      </p>`;
  }
}

async function openProtectedMedia(url, type = "image", title = "Signalement") {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showToast(data.message || "Média indisponible", "error");
      return;
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const revoke = () => URL.revokeObjectURL(objectUrl);

    if (type === "video" || (blob.type || "").startsWith("video/")) {
      openVideoViewer(objectUrl, title, revoke);
    } else {
      openImageLightbox([objectUrl], 0, title, revoke);
    }
  } catch (err) {
    showToast("Impossible d'ouvrir le média", "error");
  }
}

function openVideoViewer(objectUrl, title = "Vidéo", onClose = null) {
  closeVideoViewer();
  const overlay = document.createElement("div");
  overlay.id = "videoViewer";
  overlay.className = "video-viewer";
  overlay.innerHTML = `
    <header class="pdf-viewer-head">
      <button type="button" class="pdf-viewer-btn" data-video-close aria-label="Fermer">
        <i data-lucide="arrow-left"></i><span>Retour</span>
      </button>
      <span class="pdf-viewer-title">${escapeHtml(title)}</span>
      <button type="button" class="pdf-viewer-btn" data-video-close aria-label="Fermer"><i data-lucide="x"></i></button>
    </header>
    <div class="video-viewer-body">
      <video src="${objectUrl}" controls autoplay playsinline preload="metadata"></video>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  if (typeof lucide !== "undefined") lucide.createIcons();
  requestAnimationFrame(() => overlay.classList.add("show"));

  const video = overlay.querySelector("video");
  if (video) {
    video.addEventListener("error", () => {
      const body = overlay.querySelector(".video-viewer-body");
      if (!body) return;
      body.innerHTML = `<div class="video-error">
        <p>Impossible de lire cette vidéo sur cet appareil.</p>
        <a href="${objectUrl}" download="video-signalement.mp4">Télécharger la vidéo</a>
      </div>`;
      body.querySelector("a")?.addEventListener("click", () => { if (typeof onClose === "function") onClose(); });
    });
  }

  const close = () => { closeVideoViewer(); if (typeof onClose === "function") onClose(); };
  overlay.querySelectorAll("[data-video-close]").forEach((btn) => btn.addEventListener("click", close));
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  document.addEventListener("keydown", function onKey(event) {
    if (event.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
  });
}

function closeVideoViewer() {
  const viewer = document.getElementById("videoViewer");
  if (!viewer) return;
  viewer.classList.remove("show");
  document.body.style.overflow = "";
  setTimeout(() => viewer.remove(), 180);
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
      openPdfViewer(objectUrl, title, `${title}.pdf`, { revoke: true });
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

function confirmAction({ title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler", danger = false, onConfirm }) {
  document.getElementById("confirmActionDialog")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "confirmActionDialog";
  overlay.className = "modal";
  overlay.style.display = "flex";
  overlay.innerHTML = `
    <div class="modal-content confirm-dialog" role="dialog" aria-modal="true">
      <div class="confirm-icon"><i data-lucide="${danger ? "log-out" : "help-circle"}"></i></div>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message || "")}</p>
      <div class="modal-actions">
        <button type="button" class="btn-secondary btn-block" data-confirm-cancel>${escapeHtml(cancelLabel)}</button>
        <button type="button" class="btn-primary btn-block" data-confirm-ok ${danger ? 'style="background:var(--danger)"' : ""}>${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  if (typeof lucide !== "undefined") lucide.createIcons();

  const close = () => overlay.remove();
  overlay.querySelector("[data-confirm-cancel]").addEventListener("click", close);
  overlay.querySelector("[data-confirm-ok]").addEventListener("click", () => {
    close();
    if (typeof onConfirm === "function") onConfirm();
  });
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  document.addEventListener("keydown", function onKey(event) {
    if (event.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
  });
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
    date.textContent = new Date().toLocaleDateString(localeCourante(), {
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
window.openProtectedMedia = openProtectedMedia;
window.openImageLightbox = openImageLightbox;
window.closeImageLightbox = closeImageLightbox;
window.downloadProtectedFile = downloadProtectedFile;
window.setPageHeading = setPageHeading;
window.confirmAction = confirmAction;
window.openPdfViewer = openPdfViewer;
window.closePdfViewer = closePdfViewer;
