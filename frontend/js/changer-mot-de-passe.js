// ============================================
// changer-mot-de-passe.js
// ============================================

const API_URL = "/api";
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
  window.location.href = "login.html";
}

document.getElementById("changeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const messageDiv = document.getElementById("message");

  const ancien = document.getElementById("ancien").value;
  const nouveau = document.getElementById("nouveau").value;
  const confirm = document.getElementById("confirm").value;

  // Vérifications locales
  if (nouveau !== confirm) {
    messageDiv.textContent = "❌ Les deux nouveaux mots de passe ne correspondent pas";
    messageDiv.className = "message error";
    return;
  }

  if (nouveau.length < 6) {
    messageDiv.textContent = "❌ Le mot de passe doit faire au moins 6 caractères";
    messageDiv.className = "message error";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/users/changer-mot-de-passe`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        ancien_mot_de_passe: ancien,
        nouveau_mot_de_passe: nouveau
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Mettre à jour les infos locales
      user.doit_changer_mot_de_passe = 0;
      localStorage.setItem("user", JSON.stringify(user));

      messageDiv.textContent = "✅ Mot de passe changé ! Redirection...";
      messageDiv.className = "message success";

      setTimeout(() => {
        if (user.role === "bailleur") {
          window.location.href = "bailleur.html";
        } else {
          window.location.href = "locataire.html";
        }
      }, 1500);
    } else {
      messageDiv.textContent = "❌ " + data.message;
      messageDiv.className = "message error";
    }
  } catch (err) {
    messageDiv.textContent = "❌ Erreur serveur";
    messageDiv.className = "message error";
  }
});

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}