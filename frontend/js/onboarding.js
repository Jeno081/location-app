// ============================================
// onboarding.js — Tutoriel première connexion
// ============================================

const ONBOARDING_API = "/api";
const onboardingToken = localStorage.getItem("token");
const onboardingUser = JSON.parse(localStorage.getItem("user") || "null");

const STEPS = {
  bailleur: [
    {
      icon: "🏠",
      title: "Bienvenue sur Location App",
      text: "Votre outil tout-en-un pour gérer vos logements, vos locataires et vos loyers en toute simplicité."
    },
    {
      icon: "📄",
      title: "Créez des contrats en ligne",
      text: "Ajoutez un logement, puis créez un contrat. Votre locataire reçoit un mot de passe temporaire pour se connecter et signer."
    },
    {
      icon: "📊",
      title: "Suivez vos paiements",
      text: "Visualisez vos revenus, suivez les retards, envoyez des rappels et téléchargez les quittances en un clic."
    }
  ],
  locataire: [
    {
      icon: "👋",
      title: "Bienvenue sur Location App",
      text: "Accédez à votre logement, vos contrats, vos paiements et signalez tout problème en quelques clics."
    },
    {
      icon: "💳",
      title: "Payez votre loyer",
      text: "Réglez votre loyer par Mobile Money ou carte. Votre quittance est générée automatiquement."
    },
    {
      icon: "🔧",
      title: "Signalez un problème",
      text: "Une fuite, une panne ? Envoyez un signalement avec photo. Le bailleur est prévenu immédiatement."
    }
  ]
};

// ============================================
// INITIALISATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  if (!onboardingUser || !onboardingToken) return;

  // Ne pas afficher si déjà vu
  if (onboardingUser.onboarding_vu === 1) return;

  // Ne pas afficher sur la page de changement de mot de passe
  if (window.location.pathname.includes("changer-mot-de-passe")) return;

  setTimeout(() => showOnboarding(), 800);
});

let currentStep = 0;
let steps = [];

function showOnboarding() {
  steps = STEPS[onboardingUser.role] || STEPS.locataire;
  currentStep = 0;

  // Créer l'overlay
  const overlay = document.createElement("div");
  overlay.id = "onboardingOverlay";
  overlay.className = "onboarding-overlay";
  overlay.innerHTML = `
    <div class="onboarding-modal">
      <button class="onboarding-skip" onclick="skipOnboarding()">Passer</button>
      <div class="onboarding-content" id="onboardingContent"></div>
      <div class="onboarding-footer">
        <div class="onboarding-dots" id="onboardingDots"></div>
        <button class="onboarding-next" id="onboardingNext" onclick="nextStep()">Suivant</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Animation d'entrée
  setTimeout(() => overlay.classList.add("show"), 10);

  renderStep();
}

function renderStep() {
  const content = document.getElementById("onboardingContent");
  const dots = document.getElementById("onboardingDots");
  const nextBtn = document.getElementById("onboardingNext");

  const step = steps[currentStep];

  content.innerHTML = `
    <div class="onboarding-icon">${step.icon}</div>
    <h2 class="onboarding-title">${step.title}</h2>
    <p class="onboarding-text">${step.text}</p>
  `;

  // Dots
  dots.innerHTML = steps.map((_, i) =>
    `<span class="onboarding-dot ${i === currentStep ? "active" : ""}"></span>`
  ).join("");

  // Bouton
  if (currentStep === steps.length - 1) {
    nextBtn.textContent = "Commencer 🚀";
  } else {
    nextBtn.textContent = "Suivant";
  }

  // Animation
  content.style.animation = "none";
  setTimeout(() => {
    content.style.animation = "onboardingFadeIn 0.4s ease";
  }, 10);
}

function nextStep() {
  if (currentStep < steps.length - 1) {
    currentStep++;
    renderStep();
  } else {
    closeOnboarding();
  }
}

function skipOnboarding() {
  closeOnboarding();
}

async function closeOnboarding() {
  const overlay = document.getElementById("onboardingOverlay");
  if (overlay) {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 400);
  }

  // Marquer comme vu en base
  try {
    await fetch(ONBOARDING_API + "/users/onboarding-vu", {
      method: "PUT",
      headers: { "Authorization": "Bearer " + onboardingToken }
    });
    // Mettre à jour localement
    onboardingUser.onboarding_vu = 1;
    localStorage.setItem("user", JSON.stringify(onboardingUser));
  } catch (err) {
    console.error("Erreur:", err);
  }
}

// Exposer globalement
window.showOnboarding = showOnboarding;
window.nextStep = nextStep;
window.skipOnboarding = skipOnboarding;
window.closeOnboarding = closeOnboarding;
