// ============================================
// paymentController.js — Gestion des paiements
// ============================================

const db = require("../database/db");

// ============================================
// CRÉER un paiement — POST /api/payments
// (locataire uniquement)
// ============================================
exports.createPayment = (req, res) => {
  const { contract_id, montant, mois, methode } = req.body;
  const locataire_id = req.user.id;

  if (!contract_id || !montant || !mois) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }

  // Vérifier que le contrat appartient bien à ce locataire
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contract_id);
  if (!contract) {
    return res.status(404).json({ message: "Contrat introuvable" });
  }
  if (contract.locataire_id !== locataire_id) {
    return res.status(403).json({ message: "Non autorise" });
  }

  // Enregistrer le paiement (statut "paye" simulé)
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO payments (contract_id, montant, mois, methode, statut, date_paiement)
    VALUES (?, ?, ?, ?, 'paye', ?)
  `).run(contract_id, montant, mois, methode || "simulation", now);

  res.status(201).json({
    message: "Paiement enregistre avec succes",
    paymentId: result.lastInsertRowid
  });
};

// ============================================
// LISTER mes paiements — GET /api/payments/mes-paiements
// (locataire)
// ============================================
exports.getMyPayments = (req, res) => {
  const locataire_id = req.user.id;

  const payments = db.prepare(`
    SELECT pay.*,
           c.montant_loyer,
           p.titre AS property_titre,
           p.adresse AS property_adresse
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ?
    ORDER BY pay.date_paiement DESC
  `).all(locataire_id);

  res.json({ payments });
};

// ============================================
// LISTER les paiements reçus — GET /api/payments/recus
// (bailleur)
// ============================================
exports.getPaymentsForBailleur = (req, res) => {
  const bailleur_id = req.user.id;

  const payments = db.prepare(`
    SELECT pay.*,
           c.montant_loyer,
           p.titre AS property_titre,
           p.adresse AS property_adresse,
           u.nom AS locataire_nom,
           u.email AS locataire_email
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY pay.date_paiement DESC
  `).all(bailleur_id);

  res.json({ payments });
};

// ============================================
// DÉTAIL d'un paiement — GET /api/payments/:id
// (bailleur OU locataire concerné)
// ============================================
exports.getPaymentById = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  const payment = db.prepare(`
    SELECT pay.*,
           c.locataire_id,
           c.montant_loyer,
           c.date_debut,
           p.titre AS property_titre,
           p.adresse AS property_adresse,
           p.ville AS property_ville,
           p.bailleur_id,
           b.nom AS bailleur_nom,
           b.email AS bailleur_email,
           l.nom AS locataire_nom,
           l.email AS locataire_email
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    JOIN users l ON c.locataire_id = l.id
    WHERE pay.id = ?
  `).get(id);

  if (!payment) {
    return res.status(404).json({ message: "Paiement introuvable" });
  }

  const autorise = (role === "bailleur" && payment.bailleur_id === userId)
                || (role === "locataire" && payment.locataire_id === userId);

  if (!autorise) {
    return res.status(403).json({ message: "Non autorise" });
  }

  res.json({ payment });
};