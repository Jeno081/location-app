// ============================================
// userController.js
// ============================================

const db = require("../database/db");
const bcrypt = require("bcryptjs");
const { signToken } = require("../middleware/authMiddleware");
const { deleteTenantAccount } = require("../services/tenantService");

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  }
  return null;
}

exports.changerMotDePasse = async (req, res) => {
  const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
  const userId = req.user.id;

  if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }
  const passwordError = validatePassword(nouveau_mot_de_passe);
  if (passwordError) return res.status(400).json({ message: passwordError });
  if (ancien_mot_de_passe === nouveau_mot_de_passe) {
    return res.status(400).json({ message: "Le nouveau mot de passe doit être différent." });
  }

  const user = await db.get("SELECT * FROM users WHERE id = ?", [userId]);
  if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

  if (!bcrypt.compareSync(ancien_mot_de_passe, user.mot_de_passe)) {
    return res.status(401).json({ message: "Ancien mot de passe incorrect" });
  }

  const hashed = bcrypt.hashSync(nouveau_mot_de_passe, 12);
  await db.run(`
    UPDATE users
    SET mot_de_passe = ?, doit_changer_mot_de_passe = 0, token_version = COALESCE(token_version, 0) + 1
    WHERE id = ?
  `, [hashed, userId]);

  const updated = await db.get("SELECT * FROM users WHERE id = ?", [userId]);
  res.json({
    message: "Mot de passe changé avec succès",
    token: signToken(updated),
    user: {
      id: updated.id,
      nom: updated.nom,
      email: updated.email,
      role: updated.role,
      telephone: updated.telephone,
      photo_profil: updated.photo_profil,
      doit_changer_mot_de_passe: 0,
      onboarding_vu: updated.onboarding_vu
    }
  });
};

exports.getMesLocataires = async (req, res) => {
  const bailleur_id = req.user.id;
  const locataires = await db.all(`
    SELECT u.id, u.nom, u.email, u.telephone, u.date_creation, u.doit_changer_mot_de_passe, u.photo_profil,
           c.id AS contract_id, c.statut AS contract_statut,
           c.date_debut, c.date_fin, c.montant_loyer,
           p.id AS property_id, p.titre AS property_titre, p.adresse AS property_adresse
    FROM users u
    JOIN contracts c ON c.locataire_id = u.id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND c.statut IN ('actif', 'en_attente')
    ORDER BY u.nom
  `, [bailleur_id]);
  res.json({ locataires });
};

exports.deleteLocataire = async (req, res) => {
  const { id } = req.params;
  const bailleur_id = req.user.id;

  const contratsActifs = await db.all(`
    SELECT c.id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ? AND p.bailleur_id = ? AND c.statut IN ('actif', 'en_attente')
  `, [id, bailleur_id]);

  if (contratsActifs.length > 0) {
    return res.status(409).json({ message: "Ce locataire a encore des contrats en cours." });
  }

  const lien = await db.get(`
    SELECT c.id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ? AND p.bailleur_id = ?
    LIMIT 1
  `, [id, bailleur_id]);

  const locataire = await db.get("SELECT id FROM users WHERE id = ? AND role = 'locataire'", [id]);
  if (!lien && !locataire) return res.status(404).json({ message: "Locataire introuvable" });

  try {
    const changes = await deleteTenantAccount(Number(id));
    if (changes === 0) return res.status(404).json({ message: "Locataire introuvable" });
    res.json({ message: "Locataire supprimé avec succès" });
  } catch (err) {
    console.error("[deleteLocataire]", err);
    res.status(500).json({ message: "Impossible de supprimer ce locataire." });
  }
};

exports.getProfil = async (req, res) => {
  const u = await db.get(`
    SELECT id, nom, email, telephone, role, photo_profil, date_creation
    FROM users WHERE id = ?
  `, [req.user.id]);
  if (!u) return res.status(404).json({ message: "Utilisateur introuvable" });
  res.json({ user: u });
};

exports.updateProfil = async (req, res) => {
  const nom = String(req.body.nom || "").trim();
  const telephone = req.body.telephone ? String(req.body.telephone).trim() : null;
  if (!nom) return res.status(400).json({ message: "Nom obligatoire" });
  if (nom.length > 100) return res.status(400).json({ message: "Nom trop long." });
  if (telephone && telephone.length > 30) return res.status(400).json({ message: "Téléphone invalide." });

  await db.run("UPDATE users SET nom = ?, telephone = ? WHERE id = ?", [nom, telephone || null, req.user.id]);

  const u = await db.get("SELECT id, nom, email, telephone, role, photo_profil FROM users WHERE id = ?", [req.user.id]);
  res.json({ message: "Profil mis à jour", user: u });
};

exports.uploadPhotoProfil = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Aucune photo envoyée" });
  const chemin = `/uploads/avatars/${req.file.filename}`;
  await db.run("UPDATE users SET photo_profil = ? WHERE id = ?", [chemin, req.user.id]);
  res.json({ message: "Photo mise à jour", photo_profil: chemin });
};

exports.marquerOnboardingVu = async (req, res) => {
  await db.run("UPDATE users SET onboarding_vu = 1 WHERE id = ?", [req.user.id]);
  res.json({ message: "Onboarding marqué comme vu" });
};
