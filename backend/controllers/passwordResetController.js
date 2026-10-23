// ============================================
// passwordResetController.js — Mot de passe oublié
// ============================================

const db = require("../database/db");
const bcrypt = require("bcryptjs");
const { genererMotDePasse } = require("../utils/password");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function reinitialiserUtilisateur(user) {
  const temporaire = genererMotDePasse();
  const hashed = bcrypt.hashSync(temporaire, 12);
  await db.run(`
    UPDATE users
    SET mot_de_passe = ?, doit_changer_mot_de_passe = 1, token_version = COALESCE(token_version, 0) + 1
    WHERE id = ?
  `, [hashed, user.id]);
  return temporaire;
}

// Route publique : demande de réinitialisation.
exports.demanderReinitialisation = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "Adresse email invalide." });
  }

  const user = await db.get("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  if (!user) {
    return res.status(404).json({ message: "Aucun compte ne correspond à cet email." });
  }

  // Bailleur unique : génération immédiate d'un mot de passe temporaire.
  if (user.role === "bailleur") {
    const temporaire = await reinitialiserUtilisateur(user);
    return res.json({
      type: "bailleur",
      nom: user.nom,
      email: user.email,
      temporaryPassword: temporaire,
      message: "Mot de passe temporaire généré. Conservez-le puis changez-le après connexion."
    });
  }

  // Locataire : enregistrement d'une demande pour le bailleur.
  const dejaEnAttente = await db.get(`
    SELECT id FROM password_reset_requests
    WHERE locataire_id = ? AND statut = 'en_attente'
    LIMIT 1
  `, [user.id]);

  if (dejaEnAttente) {
    return res.json({
      type: "locataire",
      dejaEnAttente: true,
      message: "Votre demande est déjà en attente. Votre bailleur va générer un mot de passe temporaire."
    });
  }

  await db.run("INSERT INTO password_reset_requests (locataire_id) VALUES (?)", [user.id]);
  res.status(201).json({
    type: "locataire",
    message: "Votre demande a été transmise à votre bailleur. Il vous communiquera un mot de passe temporaire."
  });
};

// Bailleur : liste des demandes de ses locataires.
exports.getDemandes = async (req, res) => {
  const demandes = await db.all(`
    SELECT r.*, u.nom AS locataire_nom, u.email AS locataire_email
    FROM password_reset_requests r
    JOIN users u ON u.id = r.locataire_id
    WHERE EXISTS (
      SELECT 1 FROM contracts c
      JOIN properties p ON c.property_id = p.id
      WHERE c.locataire_id = u.id AND p.bailleur_id = ?
    )
    ORDER BY (r.statut = 'en_attente') DESC, r.date_demande DESC
  `, [req.user.id]);

  res.json({ demandes });
};

// Bailleur : génère un mot de passe temporaire pour la demande.
exports.genererPourDemande = async (req, res) => {
  const demande = await db.get(`
    SELECT r.*, u.id AS user_id, u.nom, u.email
    FROM password_reset_requests r
    JOIN users u ON u.id = r.locataire_id
    WHERE r.id = ? AND EXISTS (
      SELECT 1 FROM contracts c
      JOIN properties p ON c.property_id = p.id
      WHERE c.locataire_id = u.id AND p.bailleur_id = ?
    )
  `, [req.params.id, req.user.id]);

  if (!demande) return res.status(404).json({ message: "Demande introuvable." });

  const temporaire = await reinitialiserUtilisateur({
    id: demande.user_id,
    role: "locataire"
  });

  await db.run(`
    UPDATE password_reset_requests
    SET statut = 'traite', date_traitement = ?
    WHERE id = ?
  `, [new Date().toISOString(), demande.id]);

  res.json({
    message: "Mot de passe temporaire généré.",
    temporaryPassword: temporaire,
    locataire_nom: demande.nom,
    locataire_email: demande.email
  });
};
