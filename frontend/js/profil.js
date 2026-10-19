// ============================================
// profil.js
// ============================================

const API_URL = "/api";
let token = localStorage.getItem("token");
let user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) window.location.href = "login.html";

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
    preview.innerHTML = '<img src="' + escapeHtml(user.photo_profil) + '" alt="Profil">';
  } else {
    const initiale = (user.nom || "?").charAt(0).toUpperCase();
    preview.innerHTML = '<div class="avatar-initials-big">' + escapeHtml(initiale) + '</div>';
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
      const profileName = document.getElementById("profileName");
      if (profileName) profileName.textContent = data.user.nom;
      const profileMeta = document.getElementById("profileMeta");
      if (profileMeta) profileMeta.textContent = data.user.email + " · " + (data.user.role === "bailleur" ? "Bailleur" : "Locataire");
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
      if (data.token) {
        token = data.token;
        localStorage.setItem("token", data.token);
      }
      const updatedUser = data.user || {};
      user.nom = updatedUser.nom || user.nom;
      user.email = updatedUser.email || user.email;
      user.telephone = updatedUser.telephone;
      user.photo_profil = updatedUser.photo_profil;
      user.doit_changer_mot_de_passe = 0;
      localStorage.setItem("user", JSON.stringify(user));
      showToast("Mot de passe changé !", "success");
      document.getElementById("mdpForm").reset();
      if (typeof renderNavbar === "function") renderNavbar();
    } else {
      showToast(data.message, "error");
    }
  } catch (err) { showToast("Erreur serveur", "error"); }
});

// ============================================
// INITIALISATION
// ============================================
window.addEventListener("load", () => {
  setTimeout(() => { afficherPhoto(); }, 100);
});

// ============================================
// REVOIR LE TUTORIEL
// ============================================
function revoirTutoriel() {
  // Réinitialiser localement
  user.onboarding_vu = 0;
  localStorage.setItem("user", JSON.stringify(user));

  // Si la fonction d'onboarding est disponible, la lancer
  if (typeof window.showOnboarding === "function") {
    window.showOnboarding();
  }
}

window.revoirTutoriel = revoirTutoriel;

loadProfil();