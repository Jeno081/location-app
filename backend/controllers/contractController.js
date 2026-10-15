// ============================================
// contractController.js — Gestion des contrats
// ============================================

const db = require("../database/db");
const bcrypt = require("bcryptjs");

function genererMotDePasse() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let mdp = "";
  for (let i = 0; i < 8; i++) mdp += chars.charAt(Math.floor(Math.random() * chars.length));
  return mdp;
}

// ============================================
// CRÉER un contrat
// ============================================
exports.createContract = (req, res) => {
  const {
    property_id, locataire_email, locataire_nom, locataire_telephone,
    date_debut, date_fin, montant_loyer, clauses_personnalisees
  } = req.body;
  const bailleur_id = req.user.id;

  if (!property_id || !locataire_email || !date_debut || !montant_loyer) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }

  const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(property_id);
  if (!property) return res.status(404).json({ message: "Logement introuvable" });
  if (property.bailleur_id !== bailleur_id) return res.status(403).json({ message: "Ce logement ne vous appartient pas" });
  if (property.statut !== "disponible") return res.status(400).json({ message: "Ce logement n'est plus disponible" });

  let locataire = db.prepare("SELECT * FROM users WHERE email = ?").get(locataire_email);
  let motDePasseTemporaire = null;

  if (!locataire) {
    if (!locataire_nom) {
      return res.status(400).json({ message: "Nom du locataire obligatoire pour creer un compte" });
    }
    motDePasseTemporaire = genererMotDePasse();
    const hashedPassword = bcrypt.hashSync(motDePasseTemporaire, 10);
    const result = db.prepare(`
      INSERT INTO users (nom, email, mot_de_passe, telephone, role, doit_changer_mot_de_passe, cree_par_bailleur)
      VALUES (?, ?, ?, ?, 'locataire', 1, 1)
    `).run(locataire_nom, locataire_email, hashedPassword, locataire_telephone || null);
    locataire = { id: result.lastInsertRowid };
  }

  if (locataire.role === "bailleur") {
    return res.status(400).json({ message: "Impossible de creer un contrat avec un compte bailleur" });
  }

  const result = db.prepare(`
    INSERT INTO contracts (property_id, locataire_id, date_debut, date_fin, montant_loyer, clauses_personnalisees, statut)
    VALUES (?, ?, ?, ?, ?, ?, 'en_attente')
  `).run(
    property_id,
    locataire.id,
    date_debut,
    date_fin || null,
    montant_loyer,
    clauses_personnalisees || null
  );

  res.status(201).json({
    message: "Contrat cree avec succes",
    contractId: result.lastInsertRowid,
    locataire_email,
    mot_de_passe_temporaire: motDePasseTemporaire
  });
};

// ============================================
// LISTER contrats du bailleur
// ============================================
exports.getMyContractsAsBailleur = (req, res) => {
  const bailleur_id = req.user.id;
  const contracts = db.prepare(`
    SELECT c.*, p.titre AS property_titre, p.adresse AS property_adresse,
           u.nom AS locataire_nom, u.email AS locataire_email, u.telephone AS locataire_telephone
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY c.date_creation DESC
  `).all(bailleur_id);
  res.json({ contracts });
};

// ============================================
// LISTER contrats du locataire
// ============================================
exports.getMyContractsAsLocataire = (req, res) => {
  const locataire_id = req.user.id;
  const contracts = db.prepare(`
    SELECT c.*, p.titre AS property_titre, p.adresse AS property_adresse, p.ville AS property_ville,
           u.nom AS bailleur_nom, u.email AS bailleur_email, u.telephone AS bailleur_telephone
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON p.bailleur_id = u.id
    WHERE c.locataire_id = ?
    ORDER BY c.date_creation DESC
  `).all(locataire_id);
  res.json({ contracts });
};

// ============================================
// SIGNER un contrat
// ============================================
exports.signContract = (req, res) => {
  const { id } = req.params;
  const { role } = req.user;
  const userId = req.user.id;

  const contract = db.prepare(`
    SELECT c.*, p.bailleur_id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.id = ?
  `).get(id);

  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });

  const now = new Date().toISOString();

  if (role === "bailleur") {
    if (contract.bailleur_id !== userId) return res.status(403).json({ message: "Non autorise" });
    db.prepare("UPDATE contracts SET signature_bailleur = ? WHERE id = ?").run(now, id);
  } else if (role === "locataire") {
    if (contract.locataire_id !== userId) return res.status(403).json({ message: "Non autorise" });
    db.prepare("UPDATE contracts SET signature_locataire = ? WHERE id = ?").run(now, id);
  }

  const updated = db.prepare("SELECT * FROM contracts WHERE id = ?").get(id);
  if (updated.signature_bailleur && updated.signature_locataire) {
    db.prepare("UPDATE contracts SET statut = 'actif' WHERE id = ?").run(id);
    db.prepare("UPDATE properties SET statut = 'loue' WHERE id = ?").run(updated.property_id);
  }

  res.json({ message: "Contrat signe avec succes" });
};

// ============================================
// TERMINER un contrat
// ============================================
exports.terminerContrat = (req, res) => {
  const { id } = req.params;
  const { motif } = req.body;
  const bailleur_id = req.user.id;

  const contract = db.prepare(`
    SELECT c.*, p.bailleur_id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.id = ?
  `).get(id);

  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (contract.bailleur_id !== bailleur_id) return res.status(403).json({ message: "Non autorise" });

  if (contract.statut === "termine") {
    return res.status(400).json({ message: "Ce contrat est deja termine" });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE contracts SET statut = 'termine', date_terminaison = ?, motif_terminaison = ? WHERE id = ?
  `).run(now, motif || "Non precise", id);

  db.prepare("UPDATE properties SET statut = 'disponible' WHERE id = ?").run(contract.property_id);

  res.json({ message: "Contrat termine avec succes" });
};

// ============================================
// MODIFIER les clauses d'un contrat
// PUT /api/contracts/:id/clauses
// (bailleur uniquement, avant signature du locataire)
// ============================================
exports.updateClauses = (req, res) => {
  const { id } = req.params;
  const { clauses_personnalisees } = req.body;
  const bailleur_id = req.user.id;

  const contract = db.prepare(`
    SELECT c.*, p.bailleur_id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.id = ?
  `).get(id);

  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (contract.bailleur_id !== bailleur_id) return res.status(403).json({ message: "Non autorise" });

  if (contract.statut === "termine") {
    return res.status(400).json({ message: "Impossible de modifier un contrat termine" });
  }

  db.prepare("UPDATE contracts SET clauses_personnalisees = ? WHERE id = ?")
    .run(clauses_personnalisees || null, id);

  res.json({ message: "Clauses mises a jour" });
};
