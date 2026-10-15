// ============================================
// login.js — Connexion + redirection selon état
// ============================================

const API_URL = "/api";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const mot_de_passe = document.getElementById("mot_de_passe").value;
  const messageDiv = document.getElementById("message");

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mot_de_passe })
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = "✅ Connexion réussie ! Redirection...";
      messageDiv.className = "message success";

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setTimeout(() => {
        // 🎯 Si le locataire doit changer son mot de passe → page dédiée
        if (data.user.doit_changer_mot_de_passe === 1) {
          window.location.href = "changer-mot-de-passe.html";
        }
        // Sinon redirection normale
        else if (data.user.role === "bailleur") {
          window.location.href = "bailleur.html";
        } else {
          window.location.href = "locataire.html";
        }
      }, 1200);

    } else {
      messageDiv.textContent = "❌ " + (data.message || "Erreur inconnue");
      messageDiv.className = "message error";
    }
  } catch (err) {
    messageDiv.textContent = "❌ Impossible de contacter le serveur.";
    messageDiv.className = "message error";
  }
});