// ============================================
// onboarding.js — Tutoriel première connexion
// ============================================

const ONBOARDING_API = "/api";
const onboardingToken = localStorage.getItem("token");
const onboardingUser = JSON.parse(localStorage.getItem("user") || "null");

const STEPS = {
  bailleur: [
    {
      icon: "👋",
      title: "Bienvenue sur Location App",
      text: "Votre espace bailleur centralise vos biens, vos locataires, vos contrats et vos loyers. Voici comment utiliser chaque onglet.",
      points: ["Tout se gère depuis la barre latérale", "Les notifications apparaissent sur les onglets concernés"]
    },
    {
      icon: "📊",
      title: "Tableau de bord",
      text: "Votre vue d'ensemble : nombre de logements, disponibles et loués, revenu du mois, total encaissé, retards, graphiques et répartition du portefeuille."
    },
    {
      icon: "🏠",
      title: "Mes biens",
      text: "Ajoutez un logement avec son loyer et ses photos, puis modifiez-le, archivez-le ou supprimez-le. Un logement avec un historique de contrats doit être archivé plutôt que supprimé."
    },
    {
      icon: "👥",
      title: "Locataires",
      text: "Retrouvez les locataires liés à vos contrats en cours, consultez leurs documents (pièce d'identité, fiche de paie) et supprimez un compte si nécessaire."
    },
    {
      icon: "📄",
      title: "Contrats",
      text: "Créez un contrat pour un logement disponible : un mot de passe temporaire est généré pour le locataire. Suivez les signatures, téléchargez le PDF, renouvelez avant l'échéance ou mettez fin au contrat."
    },
    {
      icon: "💳",
      title: "Paiements",
      text: "Validez ou refusez les preuves de paiement (avec un motif en cas de refus). Les paiements de plusieurs mois sont regroupés en un lot que vous pouvez valider en une fois, avec quittances PDF."
    },
    {
      icon: "🔧",
      title: "Incidents",
      text: "Recevez les signalements de vos locataires avec leurs photos, puis faites évoluer leur statut : ouvert, en cours, résolu."
    },
    {
      icon: "📅",
      title: "Calendrier",
      text: "Visualisez les loyers attendus, les fins de contrat, les incidents et les rappels du mois. Envoyez aussi une relance directement depuis le tableau de bord."
    },
    {
      icon: "✅",
      title: "Tout est prêt",
      text: "Cliquez sur votre photo de profil pour l'agrandir, complétez votre profil et déconnectez-vous en toute sécurité à la fin de votre session."
    }
  ],
  locataire: [
    {
      icon: "👋",
      title: "Bienvenue sur Location App",
      text: "Votre espace locataire regroupe votre logement, vos contrats, vos paiements et vos démarches. Voici comment utiliser chaque onglet.",
      points: ["Vos informations restent privées", "Chaque action importante vous est notifiée"]
    },
    {
      icon: "🏠",
      title: "Mon logement",
      text: "Consultez les photos et les informations de votre location, les coordonnées de votre bailleur, et déclarez rapidement un paiement de loyer."
    },
    {
      icon: "📄",
      title: "Mes contrats",
      text: "Lisez et signez vos contrats en ligne, ouvrez ou téléchargez le PDF, et suivez la date de fin (un renouvellement effectué par le bailleur y apparaît)."
    },
    {
      icon: "💳",
      title: "Paiements",
      text: "Sélectionnez un ou plusieurs mois à régler : le total est calculé automatiquement. Joignez votre preuve, suivez la validation, consultez le motif d'un refus et corrigez le paiement si besoin."
    },
    {
      icon: "🔔",
      title: "Rappels",
      text: "Retrouvez les messages de votre bailleur. Cliquez sur « Confirmer la réception » pour l'informer que vous avez bien lu la relance."
    },
    {
      icon: "🪪",
      title: "Documents",
      text: "Ajoutez vos pièces justificatives (CNI, passeport, fiche de paie) et suivez leur statut de validation par le bailleur."
    },
    {
      icon: "🔧",
      title: "Signalements",
      text: "Décrivez un problème (une ligne par problème) et ajoutez des photos. Votre bailleur est prévenu et vous suivez la résolution depuis cet onglet."
    },
    {
      icon: "🕓",
      title: "Historique",
      text: "Retrouvez tous vos contrats, paiements et documents passés, avec leurs PDF, pour garder une trace complète de votre location."
    },
    {
      icon: "✅",
      title: "Tout est prêt",
      text: "Cliquez sur votre photo de profil pour l'agrandir, mettez-la à jour depuis votre profil et déconnectez-vous en toute sécurité."
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
    <div class="onboarding-icon" id="onboardingIcon">${step.icon}</div>
    <h2 class="onboarding-title">${step.title}</h2>
    <p class="onboarding-text">${step.text}</p>
    ${Array.isArray(step.points) && step.points.length
      ? `<ul class="onboarding-points">${step.points.map((point) => `<li>${point}</li>`).join("")}</ul>`
      : ""}
  `;

  // Traduire l'icône en SVG après l'injection
  setTimeout(() => {
    const iconContainer = document.getElementById("onboardingIcon");
    if (iconContainer && typeof window.replaceEmojisWithIcons === "function") {
      window.replaceEmojisWithIcons(iconContainer);
    }
  }, 50);

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

  // Traduire l'emoji en icône Lucide
  setTimeout(() => {
    if (typeof window.replaceEmojisWithIcons === "function") {
      window.replaceEmojisWithIcons(document.getElementById("onboardingOverlay"));
    }
  }, 50);

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
