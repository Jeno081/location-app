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
  "5 fichiers maximum par signalement.": "5 files maximum per report.",

  // Compléments issus de l'audit de l'interface
  "-- Choisir --": "-- Choose --",
  "8 caractères minimum": "At least 8 characters",
  "Aperçu": "Preview",
  "Aucun logement actif pour déclarer un paiement": "No active property to declare a payment",
  "Aucun logement attribué pour le moment": "No property assigned yet",
  "Aucune photo pour ce logement": "No photo for this property",
  "Capture d'écran, reçu ou photo — obligatoire pour la validation.": "Screenshot, receipt or photo — required for validation.",
  "Carte d'identité": "ID card",
  "Ce commentaire sera visible par le locataire.": "This comment will be visible to the tenant.",
  "Ce motif sera visible par le locataire, qui pourra corriger et déclarer un nouveau paiement pour le même mois.": "This reason will be visible to the tenant, who can correct it and declare a new payment for the same month.",
  "Compte locataire créé": "Tenant account created",
  "Confirmer la fin du contrat": "Confirm the end of the contract",
  "Confirmez-vous avoir bien reçu ce paiement ?": "Do you confirm that you received this payment?",
  "Contrat": "Contract",
  "Contrat CTR-": "Contract CTR-",
  "Contrats, signatures et PDF": "Contracts, signatures and PDFs",
  "Créez l'espace bailleur et invitez vos locataires. Tout le reste se passe ici, en privé.": "Create the landlord account and invite your tenants. Everything else happens here, privately.",
  "Demande impossible.": "Request failed.",
  "Demande marquée :": "Request marked:",
  "Demandez vos identifiants au bailleur ou connectez-vous si vous êtes déjà inscrit.": "Ask your landlord for your credentials or sign in if you already have an account.",
  "Document": "Document",
  "Documents de": "Documents of",
  "Documents du locataire": "Tenant documents",
  "Décrivez le problème": "Describe the issue",
  "Détaillez l'information…": "Describe the information…",
  "En confirmant, vous acceptez les termes de ce contrat. Cette action est définitive.": "By confirming, you accept the terms of this contract. This action is final.",
  "Erreur": "Error",
  "Erreur d'export": "Export error",
  "Erreur de téléchargement": "Download error",
  "Erreur inconnue": "Unknown error",
  "Erreur lors de la signature": "Signing error",
  "Erreur serveur. Réessayez.": "Server error. Please try again.",
  "Erreur upload": "Upload error",
  "Fermer l'aperçu": "Close preview",
  "Fermer le document": "Close document",
  "Génération impossible": "Generation failed",
  "Image précédente": "Previous image",
  "Impossible d'ouvrir le fichier": "Unable to open the file",
  "Impossible d'ouvrir le média": "Unable to open the media",
  "Impossible de changer le mot de passe.": "Unable to change the password.",
  "Impossible de changer le statut": "Unable to change the status",
  "Impossible de contacter le serveur.": "Unable to reach the server.",
  "Impossible de créer le contrat.": "Unable to create the contract.",
  "Inscription désactivée": "Registration disabled",
  "JPG, PNG, WEBP, MP4, WEBM ou MOV — 5 fichiers maximum, 25 Mo par fichier.": "JPG, PNG, WEBP, MP4, WEBM or MOV — 5 files maximum, 25 MB per file.",
  "Le compte bailleur est unique : il administre toute la plateforme.": "There is a single landlord account: it manages the entire platform.",
  "Le contrat sera prolongé jusqu'à la nouvelle date de fin. Le locataire verra la mise à jour dans son espace.": "The contract will be extended to the new end date. The tenant will see the update in their space.",
  "Le logement redeviendra disponible. Si le locataire n'a plus d'autre contrat, son compte sera supprimé.": "The property will become available again. If the tenant has no other contract, their account will be deleted.",
  "Le mot de passe doit contenir au moins 8 caractères.": "The password must contain at least 8 characters.",
  "Le mot de passe doit contenir au moins une lettre et un chiffre.": "The password must contain at least one letter and one digit.",
  "Les deux nouveaux mots de passe ne correspondent pas.": "The two new passwords do not match.",
  "Les mots de passe ne correspondent pas": "Passwords do not match",
  "Locataire supprimé": "Tenant deleted",
  "Locataires à jour, en attente ou en retard.": "Tenants up to date, pending or late.",
  "Location App. Conçu pour les bailleurs et leurs locataires.": "Location App. Built for landlords and their tenants.",
  "Location App. Votre compte, vos accès.": "Location App. Your account, your access.",
  "Logement mis à jour": "Property updated",
  "Lot validé.": "Batch approved.",
  "Merci d'indiquer un motif de refus (5 caractères minimum).": "Please give a rejection reason (at least 5 characters).",
  "Mes pièces justificatives": "My supporting documents",
  "Message non envoyé": "Message not sent",
  "Mot de passe changé !": "Password changed!",
  "Mot de passe changé ! Redirection…": "Password changed! Redirecting…",
  "Motif de la fin (optionnel)": "Reason for ending (optional)",
  "Média indisponible": "Media unavailable",
  "Nouvelle date de fin": "New end date",
  "Paiement déclaré ! En attente de validation.": "Payment declared! Awaiting validation.",
  "Paiement refusé — le locataire peut corriger et repayer.": "Payment rejected — the tenant can correct it and pay again.",
  "Paiement validé.": "Payment approved.",
  "Paiements, quittances et relances": "Payments, receipts and reminders",
  "Photo mise à jour !": "Photo updated!",
  "Photos (max 5)": "Photos (max 5)",
  "Photos / vidéos (optionnel, 5 maximum)": "Photos / videos (optional, 5 maximum)",
  "Portefeuille de biens et locataires": "Property and tenant portfolio",
  "Profil mis à jour !": "Profile updated!",
  "Prolongez la durée du contrat.": "Extend the contract duration.",
  "Préavis de départ, demande particulière, question… votre bailleur recevra votre message.": "Notice to leave, special request, question… your landlord will receive your message.",
  "Rechercher un bien…": "Search a property…",
  "Rechercher un contrat (locataire, bien)…": "Search a contract (tenant, property)…",
  "Rechercher un contrat…": "Search a contract…",
  "Rechercher un incident (locataire, description)…": "Search a report (tenant, description)…",
  "Rechercher un locataire (nom, email, logement)…": "Search a tenant (name, email, property)…",
  "Rechercher un paiement (locataire, mois)…": "Search a payment (tenant, month)…",
  "Rechercher un paiement…": "Search a payment…",
  "Rechercher un signalement…": "Search a report…",
  "Refuser le document": "Reject the document",
  "Renouveler le contrat": "Renew the contract",
  "Rester connecté": "Stay signed in",
  "Retapez le nouveau mot de passe": "Re-enter the new password",
  "Se déconnecter": "Sign out",
  "Se déconnecter ?": "Sign out?",
  "Signer le contrat": "Sign the contract",
  "Suivi des paiements": "Payment tracking",
  "Supprimer ce logement ?": "Delete this property?",
  "Sélectionnez un ou plusieurs mois à régler.": "Select one or more months to pay.",
  "Tous": "All",
  "Téléchargement impossible": "Download failed",
  "Un compte bailleur existe déjà sur cette installation.": "A landlord account already exists on this installation.",
  "Un espace bailleur": "A landlord space",
  "Un espace unique pour vos biens, vos contrats, vos loyers et vos locataires — sans cahier ni tableur.": "One space for your properties, contracts, rent and tenants — without notebooks or spreadsheets.",
  "Un mot de passe": "A password",
  "Une lettre et un chiffre": "One letter and one digit",
  "Valider le nouveau mot de passe": "Confirm the new password",
  "Valider le paiement": "Approve the payment",
  "Vidéo": "Video",
  "Voir tous les paiements": "View all payments",
  "Vos anciennes sessions sont déconnectées": "Your previous sessions are signed out",
  "Vos documents sont privés et consultables uniquement par votre bailleur.": "Your documents are private and only visible to your landlord.",
  "Votre bailleur vous a remis un mot de passe temporaire. Définissez maintenant un mot de passe personnel pour sécuriser votre espace.": "Your landlord gave you a temporary password. Set a personal password now to secure your space.",
  "Votre espace est prêt. Connectez-vous pour retrouver vos biens, vos contrats et vos loyers.": "Your space is ready. Sign in to access your properties, contracts and rent.",
  "Votre mot de passe": "Your password",
  "Vous allez quitter votre espace. Vous devrez vous reconnecter pour y accéder.": "You are about to leave your space. You will need to sign in again.",
  "Vous allez supprimer": "You are about to delete",
  "À signer": "To sign",
  "Événements": "Events",
  "← Retour à l'accueil": "← Back to home",
  "✅ Compte créé avec succès ! Redirection...": "✅ Account created successfully! Redirecting…",
  "✅ Connexion réussie ! Redirection...": "✅ Signed in successfully! Redirecting…",
  "Le mot de passe est obligatoire.": "Password is required.",
  "L'email est obligatoire.": "Email is required.",
  "Adresse email invalide.": "Invalid email address.",
  "Aucun compte ne correspond à cet email.": "No account matches this email.",
  "Mot de passe temporaire généré. Conservez-le puis changez-le après connexion.": "Temporary password generated. Keep it and change it after signing in.",
  "Votre demande est déjà en attente. Votre bailleur va générer un mot de passe temporaire.": "Your request is already pending. Your landlord will generate a temporary password.",
  "Votre demande a été transmise à votre bailleur. Il vous communiquera un mot de passe temporaire.": "Your request has been sent to your landlord. They will give you a temporary password.",
  "Demande introuvable.": "Request not found.",
  "5 fichiers maximum par signalement.": "5 files maximum per report.",

  // Messages du serveur
  "Accès refusé : rôle insuffisant": "Access denied: insufficient role",
  "Adresse email du locataire invalide.": "Invalid tenant email address.",
  "Ancien mot de passe incorrect": "Current password is incorrect",
  "Aucun bailleur associé à votre compte.": "No landlord is linked to your account.",
  "Aucun fichier envoyé": "No file sent",
  "Aucun paiement à exporter": "No payment to export",
  "Aucun paiement en attente pour ce lot.": "No pending payment for this batch.",
  "Aucune photo disponible": "No photo available",
  "Aucune photo envoyée": "No photo sent",
  "Aucune preuve disponible": "No proof available",
  "Authentification requise": "Authentication required",
  "Ce contrat est à durée indéterminée : aucune reconduction nécessaire.": "This contract is open-ended: no renewal is needed.",
  "Ce contrat est terminé et ne peut plus être signé.": "This contract has ended and can no longer be signed.",
  "Ce contrat n'est pas actif.": "This contract is not active.",
  "Ce locataire a encore des contrats en cours.": "This tenant still has ongoing contracts.",
  "Ce logement possède des signalements. Archivez-le au lieu de le supprimer.": "This property has reports. Archive it instead of deleting it.",
  "Ce logement possède un historique de contrats. Archivez-le au lieu de le supprimer.": "This property has contract history. Archive it instead of deleting it.",
  "Ce paiement est déjà validé.": "This payment is already approved.",
  "Cet email est déjà utilisé": "This email is already in use",
  "Cette donnée existe déjà.": "This record already exists.",
  "Champ de fichier inattendu": "Unexpected file field",
  "Champs manquants": "Missing fields",
  "Champs obligatoires manquants": "Required fields are missing",
  "Clauses mises à jour": "Clauses updated",
  "Compte créé avec succès": "Account created successfully",
  "Compte introuvable": "Account not found",
  "Connexion réussie": "Signed in successfully",
  "Contrat créé": "Contract created",
  "Contrat introuvable": "Contract not found",
  "Contrat signé": "Contract signed",
  "Corps de requête JSON invalide": "Invalid JSON request body",
  "Date de début invalide.": "Invalid start date.",
  "Date de fin invalide.": "Invalid end date.",
  "Déconnecté": "Signed out",
  "Description trop longue (2000 caractères max).": "Description too long (2000 characters max).",
  "Document introuvable": "Document not found",
  "Document supprimé": "Document deleted",
  "Document uploadé avec succès": "Document uploaded successfully",
  "Email et mot de passe requis": "Email and password are required",
  "Email ou mot de passe incorrect": "Incorrect email or password",
  "Erreur de génération du fichier": "File generation error",
  "Erreur lors de la génération de la quittance": "Error generating the receipt",
  "Erreur lors de la génération du PDF": "Error generating the PDF",
  "Erreur lors de la terminaison du contrat.": "Error while ending the contract.",
  "Fichier introuvable": "File not found",
  "Format de token invalide": "Invalid token format",
  "Impossible de modifier un contrat terminé.": "An ended contract cannot be edited.",
  "Impossible de supprimer ce locataire.": "Unable to delete this tenant.",
  "Incident introuvable ou non autorisé": "Report not found or not authorized",
  "Incident introuvable": "Report not found",
  "Inscription publique désactivée. Contactez le bailleur.": "Public registration is disabled. Contact the landlord.",
  "La date de début ne peut pas être dans le passé.": "The start date cannot be in the past.",
  "La date de fin doit être après la date de début.": "The end date must be after the start date.",
  "La nouvelle date de fin doit être postérieure à l'actuelle.": "The new end date must be later than the current one.",
  "La nouvelle date de fin est trop lointaine (10 ans maximum).": "The new end date is too far away (10 years maximum).",
  "La preuve de paiement est obligatoire.": "Payment proof is required.",
  "Le loyer doit être positif.": "The rent must be positive.",
  "Le loyer doit être un montant positif.": "The rent must be a positive amount.",
  "Le message est vide.": "The message is empty.",
  "Le montant doit être positif.": "The amount must be positive.",
  "Le nom doit contenir entre 2 et 100 caractères.": "The name must contain between 2 and 100 characters.",
  "Le nom du locataire est obligatoire.": "The tenant name is required.",
  "Le nouveau mot de passe doit être différent.": "The new password must be different.",
  "Le sujet et le message sont obligatoires.": "The subject and message are required.",
  "Le titre et le message sont obligatoires.": "The title and message are required.",
  "Locataire introuvable": "Tenant not found",
  "Locataire supprimé avec succès": "Tenant deleted successfully",
  "Logement créé avec succès": "Property created successfully",
  "Logement et description obligatoires": "Property and description are required",
  "Logement introuvable": "Property not found",
  "Logement mis à jour avec succès": "Property updated successfully",
  "Logement supprimé avec succès": "Property deleted successfully",
  "Loyer invalide.": "Invalid rent.",
  "Média introuvable": "Media not found",
  "Merci d'indiquer un motif de refus (3 caractères minimum).": "Please give a rejection reason (at least 3 characters).",
  "Message trop long (500 caractères max).": "Message too long (500 characters max).",
  "Message trop long (5000 caractères max).": "Message too long (5000 characters max).",
  "Mot de passe changé avec succès": "Password changed successfully",
  "Mot de passe temporaire généré.": "Temporary password generated.",
  "Motif trop long (500 caractères max).": "Reason too long (500 characters max).",
  "Nom obligatoire": "Name is required",
  "Nom trop long.": "Name too long.",
  "Non autorisé": "Not authorized",
  "Nouvelle date de fin invalide.": "Invalid new end date.",
  "Opération impossible : des données liées existent encore.": "Operation impossible: related data still exists.",
  "Paiement introuvable": "Payment not found",
  "Photo mise à jour": "Photo updated",
  "Profil mis à jour": "Profile updated",
  "Rappel introuvable": "Reminder not found",
  "Rappel marqué comme lu": "Reminder marked as read",
  "Réception confirmée": "Receipt confirmed",
  "Réception déjà confirmée": "Receipt already confirmed",
  "Ressource introuvable": "Resource not found",
  "Sélectionnez au moins un locataire.": "Select at least one tenant.",
  "Session expirée ou token invalide": "Session expired or invalid token",
  "Session expirée": "Session expired",
  "Seul le bailleur peut changer le statut.": "Only the landlord can change the status.",
  "Seul un contrat actif peut être renouvelé.": "Only an active contract can be renewed.",
  "Seul un locataire peut créer une demande.": "Only a tenant can create a request.",
  "Signalement envoyé avec succès": "Report sent successfully",
  "Statut invalide": "Invalid status",
  "Statut invalide.": "Invalid status.",
  "Sujet trop long (150 caractères max).": "Subject too long (150 characters max).",
  "Téléphone invalide.": "Invalid phone number.",
  "Titre et adresse obligatoires.": "Title and address are required.",
  "Titre ou adresse trop long.": "Title or address too long.",
  "Titre trop long (150 caractères max).": "Title too long (150 characters max).",

  // Installation PWA
  "Installer Location App": "Install Location App",
  "Accès rapide depuis votre écran d'accueil, comme une application.": "Quick access from your home screen, like an app.",
  "Appuyez sur Partager puis « Sur l'écran d'accueil ».": "Tap Share, then “Add to Home Screen”.",
  "Application installée": "App installed",
  "Installer": "Install",
  "Impossible de lire cette vidéo sur cet appareil.": "This video cannot be played on this device.",
  "Télécharger la vidéo": "Download the video"
};

const ATTRS = ["placeholder", "title", "aria-label", "alt"];

const MOTIFS = [
  [/^Ajouté le (.+)$/, "Added on $1"],
  [/^Signalé le (.+)$/, "Reported on $1"],
  [/^Terminé le (.+)$/, "Ended on $1"],
  [/^Traitée le (.+)$/, "Handled on $1"],
  [/^Confirmé le (.+)$/, "Confirmed on $1"],
  [/^Réception confirmée le (.+)$/, "Receipt confirmed on $1"],
  [/^Événements du (.+)$/, "Events of $1"],
  [/^Documents de (.+)$/, "Documents of $1"],
  [/^Loyer de (.+) reçu$/, "Rent for $1 received"],
  [/^Paiement groupé · (\d+) mois$/, "Grouped payment · $1 months"],
  [/^(\d+) mois déclarés? — en attente de validation\.?$/, "$1 months declared — awaiting validation."],
  [/^(\d+) mois sélectionné\(s\)\.?$/, "$1 month(s) selected."],
  [/^(\d+) mois en retard$/, "$1 months late"],
  [/^Expire dans (\d+) jours?$/, "Expires in $1 day(s)"],
  [/^Supprimer (.+) et toutes ses données \?$/, "Delete $1 and all their data?"],
  [/^(\d+) fichiers? maximum par signalement\.?$/, "$1 files maximum per report."]
];

function traduireTexte(texte) {
  const brut = String(texte || "");
  const cle = brut.trim();
  if (!cle) return texte;
  if (EN[cle]) return brut.replace(cle, EN[cle]);

  for (const [motif, remplacement] of MOTIFS) {
    if (motif.test(cle)) {
      const traduit = cle.replace(motif, remplacement);
      return brut.replace(cle, traduit);
    }
  }
  return texte;
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

  const navActions = document.querySelector(".simple-nav-actions");
  const footer = document.querySelector(".sidebar-footer");

  if (navActions) {
    bouton.classList.add("lang-switch-inline");
    navActions.prepend(bouton);
  } else if (footer) {
    footer.prepend(bouton);
  } else {
    bouton.classList.add("lang-switch-floating");
    document.body.appendChild(bouton);
  }

  if (typeof lucide !== "undefined") lucide.createIcons();
}

if (currentLang === "en" && typeof window.fetch === "function") {
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await fetchOriginal(...args);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return response;

    try {
      const data = await response.clone().json();
      if (data && typeof data.message === "string") {
        data.message = traduireTexte(data.message);
        const headers = new Headers(response.headers);
        headers.delete("content-length");
        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }
    } catch (err) { /* réponse non JSON ou vide */ }
    return response;
  };
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
