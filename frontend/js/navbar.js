// ============================================
// navbar.js — Navbar universelle avec menu déroulant
// ============================================

function renderNavbar() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) return;

  const photoUrl = user.photo_profil || null;
  const initiale = (user.nom || "?").charAt(0).toUpperCase();

  const avatarSmall = photoUrl
    ? '<img src="' + photoUrl + '" class="avatar-small" alt="profil">'
    : '<div class="avatar-small avatar-initials">' + initiale + '</div>';

  const avatarBig = photoUrl
    ? '<img src="' + photoUrl + '" class="avatar-big" alt="profil">'
    : '<div class="avatar-big avatar-initials">' + initiale + '</div>';

  const navbar = document.getElementById("navbar");
  if (!navbar) return;

    navbar.innerHTML =
    '<header class="navbar-modern">' +
      '<div class="nav-side"></div>' +
      '<div class="logo-center"><i data-lucide="home" style="width:22px;height:22px;vertical-align:middle;margin-right:6px;"></i>Location App</div>' +
      '<div class="nav-side nav-right">' +
        '<button class="user-menu-btn" onclick="toggleUserMenu(event)">' +
          avatarSmall +
          '<span class="user-name-btn">' + user.nom + '</span>' +
          '<i data-lucide="chevron-down" class="chevron-icon" style="width:16px;height:16px;"></i>' +
        '</button>' +
        '<div class="user-menu-dropdown" id="userMenuDropdown">' +
          '<div class="user-menu-header">' +
            avatarBig +
            '<div class="user-menu-info">' +
              '<strong>' + user.nom + '</strong>' +
              '<span class="user-email">' + user.email + '</span>' +
              '<span class="user-role-badge">' + user.role + '</span>' +
            '</div>' +
          '</div>' +
          '<a href="profil.html" class="user-menu-item"><i data-lucide="user" style="width:18px;height:18px;"></i> Mon profil</a>' +
          '<button onclick="logout()" class="user-menu-item user-menu-logout"><i data-lucide="log-out" style="width:18px;height:18px;"></i> Déconnexion</button>' +
        '</div>' +
      '</div>' +
    '</header>';

  // Créer les icônes après l'injection HTML
  if (typeof lucide !== "undefined") {
    setTimeout(() => lucide.createIcons(), 10);
  }
}

function toggleUserMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById("userMenuDropdown");
  if (menu) menu.classList.toggle("show");
}

document.addEventListener("click", (e) => {
  const menu = document.getElementById("userMenuDropdown");
  if (menu && menu.classList.contains("show")) {
    const btn = document.querySelector(".user-menu-btn");
    if (btn && !btn.contains(e.target)) {
      menu.classList.remove("show");
    }
  }
});

document.addEventListener("DOMContentLoaded", renderNavbar);
