// ============================================
// contractController.js — Gestion des contrats
// ============================================

const db = require("../database/db");

// ============================================
// CRÉER un contrat — POST /api/contracts
// (bailleur uniquement)
// ============================================
exports.createContract = (req, res) => {
  const { property_id, locataire_email, date_debut, date_fin, montant_loyer } = req.body;
  const bailleur_id = req.user.id;

  // Vérifier les champs
  if (!property_id || !locataire_email || !date_debut || !montant_loyer) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }

  // Vérifier que le logement appartient bien au bailleur
  const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(property_id);
  if (!property) {
    return res.status(404).json({ message: "Logement introuvable" });
  }
  if (property.bailleur_id !== bailleur_id) {
    return res.status(403).json({ message: "Ce logement ne vous appartient pas" });
  }

  // Retrouver le locataire par email
  const locataire = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'locataire'").get(locataire_email);
  if (!locataire) {
    return res.status(404).json({ message: "Aucun locataire trouve avec cet email" });
  }

  // Créer le contrat
  const result = db.prepare(`
    INSERT INTO contracts (property_id, locataire_id, date_debut, date_fin, montant_loyer, statut)
    VALUES (?, ?, ?, ?, ?, 'en_attente')
  `).run(property_id, locataire.id, date_debut, date_fin || null, montant_loyer);

  res.status(201).json({
    message: "Contrat cree avec succes",
    contractId: result.lastInsertRowid
  });
};

// ============================================
// LISTER les contrats d'un bailleur — GET /api/contracts/mes-contrats
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
// LISTER les contrats d'un locataire — GET /api/contracts/mes-locations
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
// SIGNER un contrat — PUT /api/contracts/:id/signer
// (bailleur ET locataire peuvent signer)
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

  if (!contract) {
    return res.status(404).json({ message: "Contrat introuvable" });
  }

  const now = new Date().toISOString();

  // --- Le bailleur signe ---
  if (role === "bailleur") {
    if (contract.bailleur_id !== userId) {
      return res.status(403).json({ message: "Non autorise" });
    }
    db.prepare("UPDATE contracts SET signature_bailleur = ? WHERE id = ?").run(now, id);
  }

  // --- Le locataire signe ---
  else if (role === "locataire") {
    if (contract.locataire_id !== userId) {
      return res.status(403).json({ message: "Non autorise" });
    }
    db.prepare("UPDATE contracts SET signature_locataire = ? WHERE id = ?").run(now, id);
  }

  // Recharger le contrat pour voir si les deux ont signé
  const updated = db.prepare("SELECT * FROM contracts WHERE id = ?").get(id);

  // Si les deux ont signé → statut "actif"
  if (updated.signature_bailleur && updated.signature_locataire) {
    db.prepare("UPDATE contracts SET statut = 'actif' WHERE id = ?").run(id);
  }

  res.json({ message: "Contrat signe avec succes" });
};