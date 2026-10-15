// ============================================
// index.js — Page d'accueil : détection bailleur
// ============================================

fetch("/api/auth/bailleur-existe")
  .then(r => r.json())
  .then(data => {
    const btnInscription = document.getElementById("btnInscription");
    const textBienvenue = document.getElementById("textBienvenue");

    if (data.existe) {
      // Un bailleur existe déjà → on cache le bouton inscription
      if (btnInscription) btnInscription.style.display = "none";
      if (textBienvenue) textBienvenue.textContent = "Connectez-vous pour accéder à votre espace";
    } else {
      // Aucun bailleur → on affiche le bouton de création
      if (btnInscription) btnInscription.style.display = "inline-block";
      if (textBienvenue) textBienvenue.textContent = "Créez le compte bailleur pour démarrer";
    }
  })
  .catch(err => console.error(err));