// ============================================
// userController.js
// ============================================

const db = require("../database/db");
const bcrypt = require("bcryptjs");

exports.changerMotDePasse = (req, res) => {
  const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
  const userId = req.user.id;

  if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }
  if (nouveau_mot_de_passe.length < 6) {
    return res.status(400).json({ message: "Au moins 6 caracteres" });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

  const ok = bcrypt.compareSync(ancien_mot_de_passe, user.mot_de_passe);
  if (!ok) return res.status(401).json({ message: "Ancien mot de passe incorrect" });

  const hashed = bcrypt.hashSync(nouveau_mot_de_passe, 10);
  db.prepare("UPDATE users SET mot_de_passe = ?, doit_changer_mot_de_passe = 0 WHERE id = ?").run(hashed, userId);

  res.json({ message: "Mot de passe change avec succes" });
};

exports.getMesLocataires = (req, res) => {
  const bailleur_id = req.user.id;
  const locataires = db.prepare(`
    SELECT u.id, u.nom, u.email, u.telephone, u.date_creation, u.doit_changer_mot_de_passe, u.photo_profil,
           c.id AS contract_id, c.statut AS contract_statut,
           c.date_debut, c.date_fin, c.montant_loyer,
           p.id AS property_id, p.titre AS property_titre, p.adresse AS property_adresse
    FROM users u
    JOIN contracts c ON c.locataire_id = u.id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND c.statut IN ('actif', 'en_attente')
    ORDER BY u.nom
  `).all(bailleur_id);
  res.json({ locataires });
};

exports.deleteLocataire = (req, res) => {
  const { id } = req.params;
  const bailleur_id = req.user.id;

  const contratsActifs = db.prepare(`
    SELECT c.id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ? AND p.bailleur_id = ? AND c.statut IN ('actif', 'en_attente')
  `).all(id, bailleur_id);

  if (contratsActifs.length > 0) {
    return res.status(400).json({ message: "Ce locataire a encore des contrats en cours" });
  }

  const lien = db.prepare(`
    SELECT c.id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ? AND p.bailleur_id = ?
    LIMIT 1
  `).get(id, bailleur_id);

  if (!lien) return res.status(404).json({ message: "Locataire introuvable" });

  db.prepare("DELETE FROM users WHERE id = ? AND role = 'locataire'").run(id);
  res.json({ message: "Locataire supprime avec succes" });
};

exports.getProfil = (req, res) => {
  const userId = req.user.id;
  const u = db.prepare("SELECT id, nom, email, telephone, role, photo_profil, date_creation FROM users WHERE id = ?").get(userId);
  if (!u) return res.status(404).json({ message: "Utilisateur introuvable" });
  res.json({ user: u });
};

exports.updateProfil = (req, res) => {
  const { nom, telephone } = req.body;
  const userId = req.user.id;
  if (!nom) return res.status(400).json({ message: "Nom obligatoire" });

  db.prepare("UPDATE users SET nom = ?, telephone = ? WHERE id = ?")
    .run(nom, telephone || null, userId);

  const u = db.prepare("SELECT id, nom, email, telephone, role, photo_profil FROM users WHERE id = ?").get(userId);
  res.json({ message: "Profil mis a jour", user: u });
};

// ============================================
// UPLOAD PHOTO DE PROFIL — POST /api/users/photo-profil
// ============================================
exports.uploadPhotoProfil = (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Aucune photo envoyee" });

  const userId = req.user.id;
  const chemin = `/uploads/documents/${req.file.filename}`;

  db.prepare("UPDATE users SET photo_profil = ? WHERE id = ?").run(chemin, userId);

  res.json({ message: "Photo mise a jour", photo_profil: chemin });
};