// ============================================
// paymentController.js — Paiements + Preuves
// ============================================

const db = require("../database/db");
const { Parser } = require("json2csv");

// CRÉER un paiement (avec preuve)
exports.createPayment = (req, res) => {
  const { contract_id, montant, mois, methode } = req.body;
  const locataire_id = req.user.id;

  if (!contract_id || !montant || !mois) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }

  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contract_id);
  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (contract.locataire_id !== locataire_id) return res.status(403).json({ message: "Non autorise" });

  const now = new Date().toISOString();
  const preuve = req.file ? "/uploads/documents/" + req.file.filename : null;

  const result = db.prepare(`
    INSERT INTO payments (contract_id, montant, mois, methode, statut, statut_bailleur, preuve_paiement, date_paiement)
    VALUES (?, ?, ?, ?, 'paye', 'en_attente', ?, ?)
  `).run(contract_id, montant, mois, methode || "simulation", preuve, now);

  res.status(201).json({
    message: "Paiement enregistre avec preuve",
    paymentId: result.lastInsertRowid
  });
};

// MES paiements (locataire)
exports.getMyPayments = (req, res) => {
  const locataire_id = req.user.id;
  const payments = db.prepare(`
    SELECT pay.*, c.montant_loyer, p.titre AS property_titre, p.adresse AS property_adresse
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ?
    ORDER BY pay.date_paiement DESC
  `).all(locataire_id);
  res.json({ payments });
};

// Paiements reçus (bailleur)
exports.getPaymentsForBailleur = (req, res) => {
  const bailleur_id = req.user.id;
  const payments = db.prepare(`
    SELECT pay.*, c.montant_loyer, p.titre AS property_titre, p.adresse AS property_adresse,
           u.nom AS locataire_nom, u.email AS locataire_email
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY pay.date_paiement DESC
  `).all(bailleur_id);
  res.json({ payments });
};

// VALIDER ou REFUSER un paiement (bailleur)
exports.validerPaiement = (req, res) => {
  const { id } = req.params;
  const { statut_bailleur } = req.body;
  const bailleur_id = req.user.id;

  if (!["valide", "refuse"].includes(statut_bailleur)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  const payment = db.prepare(`
    SELECT pay.* FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE pay.id = ? AND p.bailleur_id = ?
  `).get(id, bailleur_id);

  if (!payment) return res.status(404).json({ message: "Paiement introuvable" });

  db.prepare("UPDATE payments SET statut_bailleur = ? WHERE id = ?").run(statut_bailleur, id);
  res.json({ message: "Statut mis à jour" });
};

// Détail d'un paiement
exports.getPaymentById = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  const payment = db.prepare(`
    SELECT pay.*, c.locataire_id, c.montant_loyer, c.date_debut,
           p.titre AS property_titre, p.adresse AS property_adresse, p.ville AS property_ville, p.bailleur_id,
           b.nom AS bailleur_nom, b.email AS bailleur_email,
           l.nom AS locataire_nom, l.email AS locataire_email
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    JOIN users l ON c.locataire_id = l.id
    WHERE pay.id = ?
  `).get(id);

  if (!payment) return res.status(404).json({ message: "Paiement introuvable" });

  const autorise = (role === "bailleur" && payment.bailleur_id === userId)
                || (role === "locataire" && payment.locataire_id === userId);

  if (!autorise) return res.status(403).json({ message: "Non autorise" });
  res.json({ payment });
};

// Tableau de bord
exports.getDashboard = (req, res) => {
  const bailleur_id = req.user.id;

  const contrats = db.prepare(`
    SELECT c.id AS contract_id, c.montant_loyer, c.date_debut, c.date_fin,
           u.id AS locataire_id, u.nom AS locataire_nom, u.email AS locataire_email,
           p.id AS property_id, p.titre AS property_titre, p.adresse AS property_adresse
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ? AND c.statut = 'actif'
    ORDER BY u.nom
  `).all(bailleur_id);

  const maintenant = new Date();
  const moisActuel = maintenant.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisActuelCapitalise = moisActuel.charAt(0).toUpperCase() + moisActuel.slice(1);

  const dashboard = contrats.map(c => {
    const paiementMois = db.prepare(`
      SELECT * FROM payments
      WHERE contract_id = ? AND mois = ? AND statut_bailleur = 'valide'
      ORDER BY date_paiement DESC LIMIT 1
    `).get(c.contract_id, moisActuelCapitalise);

    const totalPaye = db.prepare(`
      SELECT COALESCE(SUM(montant), 0) AS total FROM payments WHERE contract_id = ? AND statut_bailleur = 'valide'
    `).get(c.contract_id).total;

    const debut = new Date(c.date_debut);
    const moisEcoules = Math.max(0, (maintenant.getFullYear() - debut.getFullYear()) * 12 + (maintenant.getMonth() - debut.getMonth()) + 1);
    const totalPayeMois = db.prepare(`
      SELECT COUNT(DISTINCT mois) AS nb FROM payments WHERE contract_id = ? AND statut_bailleur = 'valide'
    `).get(c.contract_id).nb;
    const moisEnRetard = Math.max(0, moisEcoules - totalPayeMois);

    let statut = "a_jour";
    if (moisEnRetard >= 2) statut = "retard_grave";
    else if (moisEnRetard === 1) statut = "retard";
    else if (!paiementMois) statut = "en_attente";

    return {
      ...c,
      mois_actuel: moisActuelCapitalise,
      paye_ce_mois: !!paiementMois,
      paiement_mois: paiementMois || null,
      total_paye: totalPaye,
      mois_en_retard: moisEnRetard,
      statut_paiement: statut
    };
  });

  res.json({ dashboard, mois_actuel: moisActuelCapitalise });
};

// Rappels
exports.envoyerRappel = (req, res) => {
  const { contract_id, message } = req.body;
  const bailleur_id = req.user.id;

  if (!contract_id || !message) return res.status(400).json({ message: "Champs manquants" });

  const contract = db.prepare(`
    SELECT c.id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.id = ? AND p.bailleur_id = ?
  `).get(contract_id, bailleur_id);

  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });

  db.prepare("INSERT INTO reminders (contract_id, message) VALUES (?, ?)").run(contract_id, message);
  res.status(201).json({ message: "Rappel envoye" });
};

exports.getMesRappels = (req, res) => {
  const locataire_id = req.user.id;
  const rappels = db.prepare(`
    SELECT r.*, p.titre AS property_titre
    FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ?
    ORDER BY r.date_envoi DESC
  `).all(locataire_id);
  res.json({ rappels });
};

exports.marquerRappelLu = (req, res) => {
  const { id } = req.params;
  const locataire_id = req.user.id;
  const rappel = db.prepare(`
    SELECT r.* FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    WHERE r.id = ? AND c.locataire_id = ?
  `).get(id, locataire_id);

  if (!rappel) return res.status(404).json({ message: "Rappel introuvable" });
  db.prepare("UPDATE reminders SET statut = 'lu' WHERE id = ?").run(id);
  res.json({ message: "Rappel marque comme lu" });
};

// Export CSV
exports.exportCSV = (req, res) => {
  const bailleur_id = req.user.id;
  const payments = db.prepare(`
    SELECT 
      pay.id AS ID, u.nom AS Locataire, u.email AS Email, p.titre AS Logement,
      pay.mois AS Mois, pay.montant AS Montant, pay.methode AS Methode,
      pay.statut_bailleur AS Statut, pay.date_paiement AS Date_paiement
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY pay.date_paiement DESC
  `).all(bailleur_id);

  if (payments.length === 0) return res.status(400).json({ message: "Aucun paiement" });

  const data = payments.map(p => ({ ...p, Date_paiement: p.Date_paiement ? new Date(p.Date_paiement).toLocaleDateString("fr-FR") : "" }));

  try {
    const parser = new Parser({ fields: ["ID", "Locataire", "Email", "Logement", "Mois", "Montant", "Methode", "Statut", "Date_paiement"] });
    const csv = parser.parse(data);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"paiements-" + Date.now() + ".csv\"");
    res.send("\uFEFF" + csv);
  } catch (err) { res.status(500).json({ message: "Erreur generation" }); }
};