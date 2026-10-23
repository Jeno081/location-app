// ============================================
// login.js — Connexion + redirection selon état
// ============================================

const API_URL = "/api";

let forgotPasswordValue = "";

function afficherErreurForgot(message) {
  const box = document.getElementById("forgotError");
  box.textContent = message || "";
  box.style.display = message ? "block" : "none";
}

function openForgotModal() {
  document.getElementById("forgotForm").reset();
  document.getElementById("forgotForm").style.display = "";
  document.getElementById("forgotResult").style.display = "none";
  document.getElementById("forgotPasswordBox").style.display = "none";
  document.getElementById("forgotWarning").style.display = "none";
  document.getElementById("forgotCopyBtn").style.display = "none";
  forgotPasswordValue = "";
  afficherErreurForgot("");
  document.getElementById("forgotModal").style.display = "flex";
  setTimeout(() => document.getElementById("forgotEmail").focus(), 60);
}

function closeForgotModal() {
  document.getElementById("forgotModal").style.display = "none";
}

async function soumettreMotDePasseOublie(event) {
  event.preventDefault();
  afficherErreurForgot("");
  const email = document.getElementById("forgotEmail").value.trim();

  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      afficherErreurForgot(data.message || "Demande impossible.");
      return;
    }

    document.getElementById("forgotForm").style.display = "none";
    document.getElementById("forgotResult").style.display = "block";
    document.getElementById("forgotResultText").textContent = data.message || "";

    if (data.temporaryPassword) {
      forgotPasswordValue = data.temporaryPassword;
      document.getElementById("forgotPasswordDisplay").textContent = data.temporaryPassword;
      document.getElementById("forgotPasswordBox").style.display = "block";
      document.getElementById("forgotWarning").style.display = "block";
      document.getElementById("forgotCopyBtn").style.display = "inline-flex";
    }
  } catch (err) {
    afficherErreurForgot("Impossible de contacter le serveur.");
  }
}

function copyForgotPassword() {
  if (!forgotPasswordValue) return;
  navigator.clipboard.writeText(forgotPasswordValue)
    .then(() => showToast("Mot de passe copié", "success"))
    .catch(() => {
      const area = document.createElement("textarea");
      area.value = forgotPasswordValue;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast("Mot de passe copié", "success");
    });
}

const forgotForm = document.getElementById("forgotForm");
if (forgotForm) forgotForm.addEventListener("submit", soumettreMotDePasseOublie);

const togglePassword = document.getElementById("togglePassword");
if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const input = document.getElementById("mot_de_passe");
    const afficher = input.type === "password";
    input.type = afficher ? "text" : "password";
    togglePassword.innerHTML = `<i data-lucide="${afficher ? "eye-off" : "eye"}"></i>`;
    togglePassword.setAttribute("aria-label", afficher ? "Masquer le mot de passe" : "Afficher le mot de passe");
    togglePassword.setAttribute("aria-pressed", String(afficher));
    if (typeof lucide !== "undefined") lucide.createIcons();
  });
}

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