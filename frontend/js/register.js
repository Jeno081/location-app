// ============================================
// register.js — Inscription du bailleur unique
// ============================================

const API_URL = "/api";

// ============================================
// DÉTECTION : un bailleur existe-t-il déjà ?
// ============================================
async function verifierBailleur() {
  try {
    const response = await fetch(API_URL + "/auth/bailleur-existe");
    const data = await response.json();

    if (data.existe) {
      // Un bailleur existe → afficher l'écran "désactivé"
      document.getElementById("formRegister").style.display = "none";
      document.getElementById("registerDesactive").style.display = "block";
      if (typeof lucide !== "undefined") {
        setTimeout(() => lucide.createIcons(), 50);
      }
    }
  } catch (err) {
    console.error("Erreur verification bailleur:", err);
  }
}

// ============================================
// SOUMISSION DU FORMULAIRE
// ============================================
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const messageDiv = document.getElementById("message");

  const nom = document.getElementById("nom").value;
  const email = document.getElementById("email").value;
  const telephone = document.getElementById("telephone").value;
  const mot_de_passe = document.getElementById("mot_de_passe").value;

  try {
    const response = await fetch(API_URL + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nom,
        email: email,
        telephone: telephone,
        mot_de_passe: mot_de_passe,
        role: "bailleur"
      })
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = "✅ Compte créé avec succès ! Redirection...";
      messageDiv.className = "message success";

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
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

// ============================================
// LANCEMENT
// ============================================
verifierBailleur();