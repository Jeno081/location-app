// ============================================
// profil.js
// ============================================

const API_URL = "/api";
const token = localStorage.getItem("token");
let user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) window.location.href = "login.html";

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  const icon = type === "success" ? "✅" : "❌";
  toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + message + '</span>';
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================
// BOUTON RETOUR
// ============================================
function retour() {
  const u = JSON.parse(localStorage.getItem("user") || "null");
  if (!u) { window.location.href = "index.html"; return; }
  if (u.role === "bailleur") window.location.href = "bailleur.html";
  else window.location.href = "locataire.html";
}

// ============================================
// AFFICHER LA PHOTO DE PROFIL
// ============================================
function afficherPhoto() {
  const preview = document.getElementById("photoPreview");
  if (!preview) return;
  if (user.photo_profil) {
    preview.innerHTML = '<img src="' + user.photo_profil + '" alt="profil">';
  } else {
    const initiale = (user.nom || "?").charAt(0).toUpperCase();
    preview.innerHTML = '<div class="avatar-initials-big">' + initiale + '</div>';
  }
}

// ============================================
// UPLOAD PHOTO
// ============================================
async function uploadPhoto(file) {
  if (!file) return;

  const formData = new FormData();
  formData.append("photo", file);

  try {
    const r = await fetch(API_URL + "/users/photo-profil", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });
    const data = await r.json();

    if (r.ok) {
      user.photo_profil = data.photo_profil;
      localStorage.setItem("user", JSON.stringify(user));
      showToast("Photo mise à jour !", "success");
      afficherPhoto();
      if (typeof renderNavbar === "function") renderNavbar();
    } else {
      showToast(data.message || "Erreur upload", "error");
    }
  } catch (err) {
    showToast("Erreur upload", "error");
  }
}

// ============================================
// CHARGER LE PROFIL
// ============================================
async function loadProfil() {
  try {
    const r = await fetch(API_URL + "/users/profil", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await r.json();
    if (r.ok) {
      document.getElementById("nom").value = data.user.nom;
      document.getElementById("email").value = data.user.email;
      document.getElementById("telephone").value = data.user.telephone || "";
      user.photo_profil = data.user.photo_profil;
      localStorage.setItem("user", JSON.stringify(user));
      afficherPhoto();
      if (typeof renderNavbar === "function") renderNavbar();
    }
  } catch (err) { console.error(err); }
}

// ============================================
// MODIFIER LE PROFIL
// ============================================
document.getElementById("profilForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    nom: document.getElementById("nom").value,
    telephone: document.getElementById("telephone").value
  };

  try {
    const r = await fetch(API_URL + "/users/profil", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();

    if (r.ok) {
      showToast("Profil mis à jour !", "success");
      user.nom = data.user.nom;
      user.telephone = data.user.telephone;
      localStorage.setItem("user", JSON.stringify(user));
      if (typeof renderNavbar === "function") renderNavbar();
    } else {
      showToast(data.message, "error");
    }
  } catch (err) { showToast("Erreur serveur", "error"); }
});

// ============================================
// CHANGER LE MOT DE PASSE
// ============================================
document.getElementById("mdpForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const ancien = document.getElementById("ancien").value;
  const nouveau = document.getElementById("nouveau").value;
  const confirm = document.getElementById("confirm").value;

  if (nouveau !== confirm) {
    showToast("Les mots de passe ne correspondent pas", "error");
    return;
  }

  try {
    const r = await fetch(API_URL + "/users/changer-mot-de-passe", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ ancien_mot_de_passe: ancien, nouveau_mot_de_passe: nouveau })
    });
    const data = await r.json();

    if (r.ok) {
      showToast("Mot de passe changé !", "success");
      document.getElementById("mdpForm").reset();
    } else {
      showToast(data.message, "error");
    }
  } catch (err) { showToast("Erreur serveur", "error"); }
});

// ============================================
// DÉCONNEXION
// ============================================
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// ============================================
// INITIALISATION
// ============================================
window.addEventListener("load", () => {
  setTimeout(() => { afficherPhoto(); }, 100);
});

loadProfil();