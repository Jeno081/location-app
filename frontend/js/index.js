// ============================================
// index.js — Entrée privée
// ============================================

fetch("/api/auth/bailleur-existe")
  .then((r) => r.json())
  .then((data) => {
    const btnInscription = document.getElementById("btnInscription");
    const textBienvenue = document.getElementById("textBienvenue");

    if (data.existe) {
      if (btnInscription) btnInscription.style.display = "none";
      if (textBienvenue) {
        textBienvenue.textContent = "Votre espace est prêt. Connectez-vous pour retrouver vos biens, vos contrats et vos loyers.";
      }
    } else {
      if (btnInscription) btnInscription.style.display = "inline-flex";
      if (textBienvenue) {
        textBienvenue.textContent = "Créez l'espace bailleur et invitez vos locataires. Tout le reste se passe ici, en privé.";
      }
    }
  })
  .catch((err) => console.error(err));
