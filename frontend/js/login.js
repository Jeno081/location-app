// ============================================
// login.js — Envoi du formulaire de connexion
// ============================================

const API_URL = "/api"; // plus besoin d'écrire localhost, on est déjà sur le serveur

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

      // --- Sauvegarder le token et les infos utilisateur ---
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // --- Rediriger selon le rôle ---
      setTimeout(() => {
        if (data.user.role === "bailleur") {
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
    console.error(err);
  }
});