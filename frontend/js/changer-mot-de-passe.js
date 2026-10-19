// ============================================
// changer-mot-de-passe.js
// ============================================

const API_URL = "/api";
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
  window.location.href = "login.html";
}

function afficherMessage(texte, type) {
  const messageDiv = document.getElementById("message");
  messageDiv.textContent = texte;
  messageDiv.className = "message " + type;
}

document.getElementById("changeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const ancien = document.getElementById("ancien").value;
  const nouveau = document.getElementById("nouveau").value;
  const confirm = document.getElementById("confirm").value;

  if (nouveau !== confirm) {
    afficherMessage("Les deux nouveaux mots de passe ne correspondent pas.", "error");
    return;
  }
  if (nouveau.length < 8) {
    afficherMessage("Le mot de passe doit contenir au moins 8 caractères.", "error");
    return;
  }
  if (!/[A-Za-z]/.test(nouveau) || !/\d/.test(nouveau)) {
    afficherMessage("Le mot de passe doit contenir au moins une lettre et un chiffre.", "error");
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/users/changer-mot-de-passe`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ ancien_mot_de_passe: ancien, nouveau_mot_de_passe: nouveau })
    });

    const data = await response.json();

    if (response.ok) {
      if (data.token) localStorage.setItem("token", data.token);
      user.doit_changer_mot_de_passe = 0;
      if (data.user) {
        user.nom = data.user.nom;
        user.email = data.user.email;
        user.role = data.user.role;
        user.telephone = data.user.telephone;
        user.photo_profil = data.user.photo_profil;
      }
      localStorage.setItem("user", JSON.stringify(user));

      afficherMessage("Mot de passe changé ! Redirection…", "success");
      setTimeout(() => {
        window.location.href = user.role === "bailleur" ? "bailleur.html" : "locataire.html";
      }, 1200);
    } else {
      afficherMessage(data.message || "Impossible de changer le mot de passe.", "error");
    }
  } catch (err) {
    afficherMessage("Impossible de contacter le serveur.", "error");
  } finally {
    if (btn) btn.disabled = false;
  }
});
