// ============================================
// register.js — Envoi du formulaire d'inscription
// ============================================

const API_URL = "http://localhost:3000/api";

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault(); // Empêche le rechargement de la page

  // 1. Récupérer les valeurs du formulaire
  const nom = document.getElementById("nom").value;
  const email = document.getElementById("email").value;
  const telephone = document.getElementById("telephone").value;
  const mot_de_passe = document.getElementById("mot_de_passe").value;
  const role = document.querySelector('input[name="role"]:checked').value;

  const messageDiv = document.getElementById("message");

  try {
    // 2. Envoyer la requête au backend
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, email, telephone, mot_de_passe, role })
    });

    const data = await response.json();

    // 3. Traiter la réponse
    if (response.ok) {
      messageDiv.textContent = "✅ Compte créé avec succès ! Redirection...";
      messageDiv.className = "message success";

      // Rediriger après 1.5 seconde
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      messageDiv.textContent = "❌ " + (data.message || "Erreur inconnue");
      messageDiv.className = "message error";
    }
  } catch (err) {
    messageDiv.textContent = "❌ Impossible de contacter le serveur. Vérifiez qu'il est bien lancé.";
    messageDiv.className = "message error";
    console.error(err);
  }
});