// ============================================
// i18n.js — Interface bilingue français / anglais
// ============================================

const I18N_STORAGE_KEY = "lang";
const currentLang = localStorage.getItem(I18N_STORAGE_KEY) === "en" ? "en" : "fr";

const EN = {
  // Navigation
  "Tableau de bord": "Dashboard",
  "Mes biens": "My properties",
  "Locataires": "Tenants",
  "Demandes": "Requests",
  "Contrats": "Contracts",
  "Paiements": "Payments",
  "Incidents": "Incidents",
  "Calendrier": "Calendar",
  "Annonces": "Announcements",
  "Messages": "Messages",
  "Mon logement": "My home",
  "Mes contrats": "My contracts",
  "Rappels": "Reminders",
  "Documents": "Documents",
  "Signalements": "Reports",
  "Historique": "History",
  "Mon profil": "My profile",
  "Déconnexion": "Log out",
  "Pilotage": "Overview",
  "Bailleur": "Landlord",
  "Locataire": "Tenant",
  "Gestion locative": "Rental management",
  "Espace bailleur": "Landlord area",
  "Espace locataire": "Tenant area",
  "Espace privé": "Private area",
  "Vue d'ensemble": "Overview",
  "Bonjour": "Hello",
  "Chargement…": "Loading…",
  "Aucune conversation": "No conversation",
  "Aucune conversation": "No conversation",
  "Sélectionnez une demande pour répondre.": "Select a request to reply.",
  "Créez une demande pour contacter votre bailleur.": "Create a request to contact your landlord.",

  // Page headings / subtitles
  "Suivez vos loyers, vos biens et vos locataires en un coup d'œil.": "Track your rent, properties and tenants at a glance.",
  "Gérez vos logements et leur disponibilité.": "Manage your properties and their availability.",
  "Tous les locataires liés à vos contrats en cours.": "All tenants linked to your current contracts.",
  "Demandes de mot de passe de vos locataires.": "Your tenants' password requests.",
  "Suivez les signatures et l'état de vos contrats.": "Track signatures and contract status.",
  "Validez les preuves et suivez les encaissements.": "Validate proofs and track payments.",
  "Traitez les signalements de vos locataires.": "Handle your tenants' reports.",
  "Loyers, échéances et incidents du mois.": "Rent, due dates and incidents for the month.",
  "Informez vos locataires en une seule fois.": "Inform all your tenants at once.",
  "Demandes et échanges avec vos locataires.": "Requests and conversations with your tenants.",
  "Les informations de votre location actuelle.": "Information about your current rental.",
  "Consultez et signez vos contrats.": "View and sign your contracts.",
  "Déclarez vos loyers et suivez leur validation.": "Declare your rent and track validation.",
  "Les messages de votre bailleur.": "Messages from your landlord.",
  "Vos pièces justificatives, en sécurité.": "Your supporting documents, kept safe.",
  "Signalez et suivez les problèmes de votre logement.": "Report and track issues in your home.",
  "Tout votre parcours locatif en un coup d'œil.": "Your entire rental history at a glance.",
  "Les informations de votre bailleur.": "Information from your landlord.",
  "Vos demandes et échanges avec le bailleur.": "Your requests and conversations with your landlord.",

  // Dashboard
  "Indicateurs clés": "Key indicators",
  "Logements": "Properties",
  "Disponibles": "Available",
  "Loués": "Rented",
  "Revenu mensuel": "Monthly income",
  "Total encaissé": "Total collected",
  "En retard": "Late",
  "Revenus encaissés": "Collected income",
  "12 derniers mois, paiements validés": "Last 12 months, validated payments",
  "Annuel": "Annual",
  "Répartition du portefeuille": "Portfolio breakdown",
  "Statut de vos logements": "Status of your properties",
  "Graphiques": "Charts",

  // Actions
  "Créer un contrat": "Create a contract",
  "Ajouter un logement": "Add a property",
  "Déclarer un paiement": "Declare a payment",
  "Ajouter un document": "Add a document",
  "Enregistrer": "Save",
  "Enregistrer les modifications": "Save changes",
  "Annuler": "Cancel",
  "Confirmer": "Confirm",
  "Fermer": "Close",
  "Copier": "Copy",
  "Voir": "View",
  "Valider": "Approve",
  "Refuser": "Reject",
  "Modifier": "Edit",
  "Supprimer": "Delete",
  "Télécharger": "Download",
  "Voir le PDF": "View PDF",
  "Voir la quittance": "View receipt",
  "Corriger et repayer": "Fix and pay again",
  "Envoyer": "Send",
  "Envoyer un rappel": "Send a reminder",
  "Envoyer le rappel": "Send reminder",
  "Envoyer l'annonce": "Send announcement",
  "Envoyer la demande": "Send request",
  "Envoyer le document": "Send document",
  "Envoyer le paiement": "Send payment",
  "Envoyer le signalement": "Send report",
  "Ajouter des photos": "Add photos",
  "Changer la photo": "Change photo",
  "Changer le mot de passe": "Change password",
  "Changer mon mot de passe": "Change my password",
  "Créer le contrat": "Create contract",
  "Créer le logement": "Create property",
  "Créer mon compte": "Create my account",
  "Créer mon espace": "Create my space",
  "Créer l'espace bailleur": "Create landlord account",
  "Exporter en CSV": "Export as CSV",
  "Continuer": "Continue",
  "Retour": "Back",
  "Retour à l'accueil": "Back to home",
  "Filtrer les biens": "Filter properties",
  "J'ai noté": "Got it",
  "Rouvrir": "Reopen",
  "Traitée": "Handled",
  "Refusée": "Rejected",
  "Ouverte": "Open",

  // Auth
  "Connexion": "Sign in",
  "Se connecter": "Sign in",
  "Déjà un compte ?": "Already have an account?",
  "Pas encore de compte ? Contactez votre bailleur pour obtenir vos identifiants.": "No account yet? Contact your landlord to get your credentials.",
  "Adresse email": "Email address",
  "Mot de passe": "Password",
  "Mot de passe actuel": "Current password",
  "Nouveau mot de passe": "New password",
  "Confirmer le nouveau mot de passe": "Confirm new password",
  "Mot de passe oublié": "Forgot password",
  "Mot de passe oublié ?": "Forgot password?",
  "Mot de passe temporaire": "Temporary password",
  "Conservez ce mot de passe en lieu sûr. Vous devrez le changer juste après votre connexion.": "Keep this password safe. You will need to change it right after signing in.",
  "Conservez ce mot de passe en lieu sûr. Vous devrez le changer juste après votre connexion.": "Keep this password safe. You will need to change it right after signing in.",
  "Entrez l'email de votre compte. Le bailleur reçoit un mot de passe temporaire immédiatement ;": "Enter your account email. The landlord receives a temporary password immediately;",
  "un locataire envoie une demande à son bailleur.": "a tenant sends a request to their landlord.",
  "Bon retour parmi nous": "Welcome back",
  "Connectez-vous à votre espace personnel.": "Sign in to your personal space.",
  "Changez votre mot de passe": "Change your password",
  "Pour votre sécurité, définissez un mot de passe personnel avant de continuer.": "For your security, set a personal password before continuing.",
  "Le mot de passe reçu du bailleur": "The password received from your landlord",
  "Au moins 8 caractères, avec une lettre et un chiffre.": "At least 8 characters, with one letter and one digit.",
  "8 caractères minimum, avec une lettre et un chiffre. Les sessions ouvertes seront déconnectées.": "At least 8 characters, with one letter and one digit. Open sessions will be signed out.",
  "Notez ce mot de passe et communiquez-le au locataire. Il devra le changer à la première connexion.": "Write down this password and give it to the tenant. They must change it on first sign-in.",

  // Profile
  "Informations personnelles": "Personal information",
  "Nom complet": "Full name",
  "Email (non modifiable)": "Email (not editable)",
  "Téléphone": "Phone",
  "Photo de profil": "Profile photo",
  "Gérez vos informations personnelles et votre sécurité.": "Manage your personal information and security.",
  "JPG, PNG ou WEBP — max 5 Mo.": "JPG, PNG or WEBP — max 5 MB.",
  "Tutoriel de prise en main": "Getting started tutorial",
  "Revoir la visite guidée de votre espace.": "Replay the guided tour of your space.",
  "Revoir le tutoriel": "Replay tutorial",

  // Properties
  "Disponible": "Available",
  "Loué": "Rented",
  "Archivé": "Archived",
  "Archivés": "Archived",
  "Loyer ($)": "Rent ($)",
  "Charges ($)": "Charges ($)",
  "Description": "Description",
  "Titre": "Title",
  "Adresse": "Address",
  "Ville": "City",
  "Statut": "Status",
  "Modifier le logement": "Edit property",
  "Points forts, équipements, conditions…": "Highlights, amenities, conditions…",
  "Aucun logement": "No property",
  "Ajoutez votre premier bien pour commencer.": "Add your first property to get started.",

  // Contracts / payments / documents / incidents
  "Actif": "Active",
  "En attente": "Pending",
  "Terminé": "Ended",
  "À jour": "Up to date",
  "Validé": "Approved",
  "Refusé": "Rejected",
  "En cours": "In progress",
  "Ouvert": "Open",
  "Résolu": "Resolved",
  "Payé": "Paid",
  "Nouveau": "New",
  "Lu": "Read",
  "Réception confirmée": "Receipt confirmed",
  "Signé": "Signed",
  "En attente de signature": "Awaiting signature",
  "Signé par vous": "Signed by you",
  "Signé par le bailleur": "Signed by the landlord",
  "Signé par le locataire": "Signed by the tenant",
  "En attente de votre signature": "Awaiting your signature",
  "En attente du bailleur": "Awaiting the landlord",
  "En attente du locataire": "Awaiting the tenant",
  "Renouveler": "Renew",
  "Mettre fin": "End contract",
  "Mettre fin au contrat": "End the contract",
  "Contrat PDF": "Contract PDF",
  "Quittance": "Receipt",
  "Reçu de refus": "Rejection receipt",
  "Montant": "Amount",
  "Méthode": "Method",
  "Déclaré le": "Declared on",
  "Loyer": "Rent",
  "Charges": "Charges",
  "Mois concernés": "Months",
  "Total à payer": "Total to pay",
  "Preuve": "Proof",
  "Preuve de paiement": "Payment proof",
  "Motif du refus": "Rejection reason",
  "Motif / commentaire": "Reason / comment",
  "Aucun motif précisé.": "No reason provided.",
  "Aucun rappel": "No reminder",
  "Aucune annonce": "No announcement",
  "Aucune demande": "No request",
  "Aucune conversation": "No conversation",
  "Aucun incident": "No incident",
  "Aucun paiement": "No payment",
  "Aucun contrat": "No contract",
  "Aucun document": "No document",
  "Aucun logement attribué": "No property assigned",
  "Aucun signalement": "No report",
  "Tout va bien dans votre logement.": "Everything is fine in your home.",
  "Vos locataires n'ont signalé aucun problème.": "Your tenants have not reported any issue.",

  // Announcements / chat
  "Nouvelle annonce": "New announcement",
  "Annonces envoyées": "Sent announcements",
  "Annonces de votre bailleur": "Announcements from your landlord",
  "Informations, nouvelles et mises à jour.": "Information, news and updates.",
  "Historique de vos informations.": "History of your announcements.",
  "Informez tous vos locataires ou seulement certains d'entre eux.": "Inform all your tenants or only some of them.",
  "Titre et message obligatoires.": "Title and message are required.",
  "Destinataires": "Recipients",
  "Tous les locataires": "All tenants",
  "Sélection de locataires": "Selected tenants",
  "Nouvelle demande": "New request",
  "Mes demandes": "My requests",
  "Sujet": "Subject",
  "Message": "Message",
  "Expliquez votre demande…": "Explain your request…",
  "Envoyez une demande à votre bailleur": "Send a request to your landlord",
  "Échangez directement avec votre bailleur.": "Chat directly with your landlord.",
  "Écrire un message…": "Write a message…",
  "Aucune demande reçue pour l'instant.": "No request received yet.",
  "Aucune demande. Utilisez « Nouvelle demande ».": "No request. Use “New request”.",
  "Demandes de mot de passe": "Password requests",
  "Générez un mot de passe temporaire et transmettez-le au locataire.": "Generate a temporary password and give it to the tenant.",
  "Générer un mot de passe": "Generate a password",
  "Regénérer un mot de passe": "Regenerate a password",
  "Transmettez-le au locataire (WhatsApp, SMS…). Il devra le changer à la première connexion.": "Send it to the tenant (WhatsApp, SMS…). They must change it on first sign-in.",

  // Misc
  "Navigation bailleur": "Landlord navigation",
  "Navigation locataire": "Tenant navigation",
  "Ouvrir le menu": "Open menu",
  "Afficher le mot de passe": "Show password",
  "Masquer le mot de passe": "Hide password",
  "Bailleur & locataires": "Landlord & tenants",
  "Location App. Compte bailleur unique et sécurisé.": "Location App. A single, secure landlord account.",
  "Centralisez vos biens, contrats et loyers. Vos locataires disposent de leur propre espace, synchronisé en temps réel.": "Manage your properties, contracts and rent in one place. Your tenants get their own real-time space.",
  "Créez une demande pour contacter votre bailleur.": "Create a request to contact your landlord.",
  "Sélectionnez une demande pour répondre.": "Select a request to reply.",

  // Landing / accueil
  "Accueil": "Home",
  "Accéder à mon espace": "Open my space",
  "Accès sécurisé": "Secure access",
  "Contrats signés en ligne et archivés": "Contracts signed online and archived",
  "Paiements validés avec preuve": "Payments validated with proof",
  "Documents personnels protégés": "Personal documents protected",
  "La gestion locative,": "Rental management,",
  "enfin simple.": "finally simple.",
  "La location,": "Renting,",
  "sans le bruit.": "without the noise.",
  "Un espace confidentiel pour le bailleur et ses locataires. Contrats, loyers et documents, au même endroit.": "A private space for the landlord and tenants. Contracts, rent and documents in one place.",
  "Bailleur & locataires": "Landlord & tenants",

  // Forms and remaining common labels
  "Date début": "Start date",
  "Date fin": "End date",
  "Clauses personnalisées (optionnel)": "Custom clauses (optional)",
  "Logement (uniquement disponibles)": "Property (available only)",
  "Email du locataire": "Tenant email",
  "Nom du locataire": "Tenant name",
  "Méthode utilisée": "Payment method",
  "Fichier (JPG, PNG, PDF — max 10 Mo)": "File (JPG, PNG, PDF — max 10 MB)",
  "Type de document": "Document type",
  "Carte d'identité (CNI)": "ID card",
  "Passeport": "Passport",
  "Fiche de paie": "Payslip",
  "Autre": "Other",
  "Mobile Money (M-Pesa, Orange…)": "Mobile Money (M-Pesa, Orange…)",
  "Carte bancaire": "Bank card",
  "Espèces": "Cash",
  "Votre espace": "Your space",
  "Retrouvez votre logement, vos contrats et vos paiements.": "Find your home, contracts and payments.",
  "Mon espace": "My space",
  "Loyers": "Rent",
  "Voir les paiements": "View payments",
  "Relancer": "Remind again",
  "Payer le loyer": "Pay rent",
  "Signaler un problème": "Report an issue",
  "Voir la preuve": "View proof",
  "Télécharger le contrat": "Download contract",
  "Voir les photos": "View photos",
  "Aucune photo": "No photo",
  "Logement attribué": "Property assigned",
  "Votre bailleur doit créer et activer un contrat.": "Your landlord must create and activate a contract.",
  "Consultez l'onglet": "Check the",
  "pour signer un contrat en attente.": "tab to sign a pending contract.",
  "Déclarez votre premier loyer depuis votre logement.": "Declare your first rent payment from your home.",
  "Vos pièces justificatives": "Your supporting documents",
  "Aucun document": "No document",
  "Aucun signalement": "No report",
  "Aucun logement": "No property",
  "Aucun locataire": "No tenant",
  "Aucun contrat": "No contract",
  "Aucune annonce": "No announcement",
  "Aucune demande": "No request",
  "Aucun paiement": "No payment",
  "Aucun incident": "No incident",
  "Tout va bien dans votre logement.": "Everything is fine in your home.",
  "Vos locataires n'ont signalé aucun problème.": "Your tenants have not reported any issue.",
  "Votre bailleur n'a rien publié pour l'instant.": "Your landlord has not published anything yet.",
  "Envoyez votre première information.": "Send your first announcement.",
  "Créez une demande pour contacter votre bailleur.": "Create a request to contact your landlord.",
  "Aucune demande reçue pour l'instant.": "No request received yet.",
  "Aucune demande. Utilisez « Nouvelle demande ».": "No request. Use “New request”.",
  "Sélectionnez une demande pour répondre.": "Select a request to reply.",
  "Sélectionnez au moins un mois à régler.": "Select at least one month to pay.",
  "En attente de validation par votre bailleur.": "Awaiting validation by your landlord.",
  "Ce mois a depuis été régularisé par un nouveau paiement.": "This month has since been settled by a new payment.",
  "Aucun motif précisé.": "No reason provided.",
  "Paiement refusé": "Payment rejected",
  "Votre paiement a été refusé": "Your payment was rejected",
  "Télécharger le PDF": "Download PDF",
  "Ouvrir dans un nouvel onglet": "Open in a new tab",
  "Impossible d'afficher l'aperçu sur cet appareil.": "This device cannot display the preview.",
  "Chargement du document…": "Loading document…",
  "Visionneuse PDF indisponible": "PDF viewer unavailable",

  // Titres de pages
  "Connexion — Location App": "Sign in — Location App",
  "Créer le compte bailleur — Location App": "Create landlord account — Location App",
  "Espace bailleur — Location App": "Landlord area — Location App",
  "Espace locataire — Location App": "Tenant area — Location App",
  "Mon profil — Location App": "My profile — Location App",
  "Changer le mot de passe — Location App": "Change password — Location App",
  "Location App — Espace privé": "Location App — Private area",
  "Location App, accueil": "Location App, home",

  // Messages fréquents
  "Logement créé !": "Property created!",
  "Logement modifié !": "Property updated!",
  "Logement supprimé": "Property deleted",
  "Contrat créé !": "Contract created!",
  "Contrat renouvelé": "Contract renewed",
  "Contrat terminé": "Contract ended",
  "Rappel envoyé": "Reminder sent",
  "Annonce envoyée": "Announcement sent",
  "Demande envoyée": "Request sent",
  "Message envoyé": "Message sent",
  "Mot de passe copié": "Password copied",
  "Document validé": "Document approved",
  "Document refusé": "Document rejected",
  "Paiement validé": "Payment approved",
  "Paiement refusé": "Payment rejected",
  "Statut mis à jour": "Status updated",
  "Enregistré": "Saved",
  "Erreur serveur": "Server error",
  "Erreur serveur. Réessayez dans un instant.": "Server error. Please try again.",
  "Impossible de charger les annonces.": "Unable to load announcements.",
  "Impossible de charger les conversations.": "Unable to load conversations.",
  "Impossible de charger les demandes.": "Unable to load requests.",
  "5 fichiers maximum par signalement.": "5 files maximum per report."
};

const ATTRS = ["placeholder", "title", "aria-label", "alt"];

function traduireTexte(texte) {
  const brut = String(texte || "");
  const cle = brut.trim();
  if (!cle || !EN[cle]) return texte;
  return brut.replace(cle, EN[cle]);
}

function doitIgnorer(node) {
  const element = node.nodeType === 1 ? node : node.parentElement;
  if (!element) return true;
  return Boolean(element.closest("[data-no-i18n], script, style"));
}

function traduireElement(root) {
  if (currentLang !== "en" || !root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textes = [];
  while (walker.nextNode()) textes.push(walker.currentNode);
  for (const node of textes) {
    if (doitIgnorer(node)) continue;
    const traduit = traduireTexte(node.nodeValue);
    if (traduit !== node.nodeValue) node.nodeValue = traduit;
  }

  const elements = root.querySelectorAll ? [root, ...root.querySelectorAll("*")] : [root];
  for (const element of elements) {
    if (element.nodeType !== 1) continue;
    for (const attr of ATTRS) {
      if (element.hasAttribute(attr)) {
        const valeur = element.getAttribute(attr);
        const traduit = traduireTexte(valeur);
        if (traduit !== valeur) element.setAttribute(attr, traduit);
      }
    }
  }
}

function injecterSelecteurLangue() {
  if (document.getElementById("langSwitch")) return;

  const bouton = document.createElement("button");
  bouton.id = "langSwitch";
  bouton.type = "button";
  bouton.className = "lang-switch";
  bouton.innerHTML = `<i data-lucide="languages"></i><span>${currentLang === "fr" ? "English" : "Français"}</span>`;
  bouton.addEventListener("click", () => {
    localStorage.setItem(I18N_STORAGE_KEY, currentLang === "fr" ? "en" : "fr");
    window.location.reload();
  });

  const footer = document.querySelector(".sidebar-footer");
  if (footer) footer.prepend(bouton);
  else {
    bouton.classList.add("lang-switch-floating");
    document.body.appendChild(bouton);
  }

  if (typeof lucide !== "undefined") lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.lang = currentLang;
  injecterSelecteurLangue();
  traduireElement(document.body);
  if (document.title) document.title = traduireTexte(document.title);

  if (currentLang === "en") {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") traduireElement(mutation.target.parentElement || document.body);
        else for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) traduireElement(node);
          else if (node.nodeType === 3) {
            const traduit = traduireTexte(node.nodeValue);
            if (traduit !== node.nodeValue) node.nodeValue = traduit;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
});
