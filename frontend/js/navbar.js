// ============================================
// navbar.js — Coquille applicative et navigation
// ============================================

function readUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch (err) { return null; }
}

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

function rendrePhotoCliquable(container, url, nom) {
  if (!url) return;
  container.querySelectorAll("img.avatar").forEach((img) => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof openImageLightbox === "function") {
        openImageLightbox([url], 0, nom || "Photo de profil");
      }
    });
  });
}

function renderSidebarUser() {
  const container = document.getElementById("sidebarUser");
  if (!container) return;

  const user = readUser();
  if (!user) return;

  const photo = user.photo_profil
    ? `<img class="avatar avatar-lg" src="${escapeHtml(user.photo_profil)}" alt="">`
    : `<span class="avatar avatar-lg avatar-initials">${escapeHtml(initials(user.nom))}</span>`;
  const role = user.role === "bailleur" ? "Bailleur" : "Locataire";

  container.innerHTML = `
    <a class="sidebar-user" href="profil.html" title="Mon profil">
      ${photo}
      <span class="sidebar-user-info">
        <strong>${escapeHtml(user.nom || "Utilisateur")}</strong>
        <small>${escapeHtml(role)}</small>
      </span>
    </a>
    <button class="sidebar-logout" type="button" onclick="logout()">
      <i data-lucide="log-out"></i><span>Déconnexion</span>
    </button>
  `;
  if (typeof lucide !== "undefined") lucide.createIcons();
  rendrePhotoCliquable(container, user.photo_profil, user.nom);
}

function renderSimpleNavbar() {
  const container = document.getElementById("navbar");
  if (!container) return;

  const user = readUser();
  if (!user) return;

  const photo = user.photo_profil
    ? `<img class="avatar" src="${escapeHtml(user.photo_profil)}" alt="">`
    : `<span class="avatar avatar-initials">${escapeHtml(initials(user.nom))}</span>`;
  const back = user.role === "bailleur" ? "bailleur.html" : "locataire.html";

  container.innerHTML = `
    <header class="simple-nav">
      <a class="simple-brand" href="${back}">
        <span class="brand-mark"><img src="/icons/logo.png" alt="Location App"></span>
        <span class="brand-text"><strong>Location<span>.</span></strong><small>Gestion locative</small></span>
      </a>
      <div class="simple-nav-actions">
        <a class="btn-ghost btn-sm" href="${back}"><i data-lucide="arrow-left"></i> Retour</a>
        <div class="user-menu">
          <button class="user-menu-btn" type="button" onclick="toggleUserMenu(event)" aria-haspopup="true">
            ${photo}<span>${escapeHtml(user.nom || "Mon compte")}</span><i data-lucide="chevron-down" class="chevron-icon"></i>
          </button>
          <div class="user-menu-dropdown" id="userMenuDropdown">
            <div class="user-menu-header">
              ${photo}
              <div class="user-menu-info">
                <strong>${escapeHtml(user.nom || "")}</strong>
                <span class="user-email">${escapeHtml(user.email || "")}</span>
              </div>
            </div>
            <a href="profil.html" class="user-menu-item"><i data-lucide="user"></i> Mon profil</a>
            <button type="button" class="user-menu-item user-menu-logout" onclick="logout()"><i data-lucide="log-out"></i> Déconnexion</button>
          </div>
        </div>
      </div>
    </header>
  `;
  if (typeof lucide !== "undefined") lucide.createIcons();
  rendrePhotoCliquable(container, user.photo_profil, user.nom);
}

function renderNavbar() {
  if (document.body.classList.contains("app-page")) {
    renderSidebarUser();
    fillUserIdentity();
  } else {
    renderSimpleNavbar();
  }
}

function toggleUserMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById("userMenuDropdown");
  if (menu) menu.classList.toggle("show");
}

function toggleSidebar() {
  document.body.classList.toggle("sidebar-open");
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
}

function logout() {
  if (typeof window.confirmAction === "function") {
    window.confirmAction({
      title: "Se déconnecter ?",
      message: "Vous allez quitter votre espace. Vous devrez vous reconnecter pour y accéder.",
      confirmLabel: "Se déconnecter",
      cancelLabel: "Rester connecté",
      danger: true,
      onConfirm: performLogout
    });
    return;
  }
  performLogout();
}

async function performLogout() {
  const token = localStorage.getItem("token");
  const fcmToken = localStorage.getItem("fcm_token");
  try {
    if (token && fcmToken) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: fcmToken })
      });
    }
    if (token) {
      await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    }
  } catch (err) {
    // La déconnexion locale reste valable même si le serveur est indisponible.
  } finally {
    if (typeof navigator.clearAppBadge === "function") {
      navigator.clearAppBadge().catch(() => {});
    }
    localStorage.removeItem("fcm_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }
}

async function checkSession() {
  const token = localStorage.getItem("token");
  if (!token) return;
  if (document.body.classList.contains("app-page") || document.body.classList.contains("auth-required")) {
    try {
      const response = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) {
        localStorage.clear();
        window.location.href = "login.html";
        return;
      }
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data.code === "PASSWORD_CHANGE_REQUIRED") window.location.href = "changer-mot-de-passe.html";
      }
    } catch (err) {
      // Hors ligne : on laisse la page se charger.
    }
  }
}

document.addEventListener("click", (event) => {
  const menu = document.getElementById("userMenuDropdown");
  if (menu && menu.classList.contains("show") && !event.target.closest(".user-menu")) {
    menu.classList.remove("show");
  }
  if (document.body.classList.contains("sidebar-open") && !event.target.closest(".sidebar") && !event.target.closest(".menu-toggle")) {
    closeSidebar();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSidebar();
    const menu = document.getElementById("userMenuDropdown");
    if (menu) menu.classList.remove("show");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();
  checkSession();
});

window.renderNavbar = renderNavbar;
window.toggleUserMenu = toggleUserMenu;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.logout = logout;
