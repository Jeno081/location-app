// ============================================
// paymentController.js — Paiements + Preuves
// ============================================

const db = require("../database/db");
const { Parser } = require("json2csv");
const { normaliserMois } = require("../database/migrate");
const { resolveStoredPath } = require("../utils/files");

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function moisLabel(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value || "";
  const [annee, mois] = value.split("-").map(Number);
  if (mois < 1 || mois > 12) return value;
  return `${MOIS_LABELS[mois - 1]} ${annee}`;
}

function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function decorate(payment) {
  return { ...payment, mois_label: moisLabel(payment.mois) };
}

function csvSafe(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

exports.createPayment = (req, res) => {
  const { contract_id, montant, methode } = req.body;
  const locataire_id = req.user.id;
  const mois = normaliserMois(req.body.mois);

  if (!contract_id || montant === undefined || !req.body.mois) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }
  if (!mois) return res.status(400).json({ message: "Mois invalide. Utilisez le format AAAA-MM." });

  const montantNombre = Number(montant);
  if (!Number.isFinite(montantNombre) || montantNombre <= 0) {
    return res.status(400).json({ message: "Le montant doit être positif." });
  }

  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contract_id);
  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (contract.locataire_id !== locataire_id) return res.status(403).json({ message: "Non autorisé" });
  if (contract.statut !== "actif") {
    return res.status(409).json({ message: "Ce contrat n'est pas actif." });
  }

  // Un paiement refusé n'empêche plus de déclarer un nouveau paiement pour ce mois.
  const dejaPaye = db.prepare(`
    SELECT id, statut_bailleur FROM payments
    WHERE contract_id = ? AND mois = ? AND statut_bailleur <> 'refuse'
  `).get(contract_id, mois);
  if (dejaPaye) {
    return res.status(409).json({
      message: dejaPaye.statut_bailleur === "valide"
        ? "Le loyer de ce mois est déjà validé."
        : "Un paiement est déjà en attente de validation pour ce mois."
    });
  }

  if (!req.file) {
    return res.status(400).json({ message: "La preuve de paiement est obligatoire." });
  }

  const preuve = "/uploads/documents/" + req.file.filename;
  const now = new Date().toISOString();

  try {
    const result = db.prepare(`
      INSERT INTO payments (contract_id, montant, mois, methode, statut, statut_bailleur, preuve_paiement, date_paiement)
      VALUES (?, ?, ?, ?, 'paye', 'en_attente', ?, ?)
    `).run(contract_id, montantNombre, mois, methode || "mobile", preuve, now);

    res.status(201).json({
      message: "Paiement enregistré, en attente de validation.",
      paymentId: result.lastInsertRowid,
      mois,
      mois_label: moisLabel(mois)
    });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ message: "Un paiement est déjà en attente pour ce mois." });
    }
    throw err;
  }
};

exports.getMyPayments = (req, res) => {
  const payments = db.prepare(`
    SELECT pay.*, c.montant_loyer, p.titre AS property_titre, p.adresse AS property_adresse
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ?
    ORDER BY pay.mois DESC, pay.date_paiement DESC
  `).all(req.user.id);
  res.json({ payments: payments.map(decorate) });
};

exports.getPaymentsForBailleur = (req, res) => {
  const payments = db.prepare(`
    SELECT pay.*, c.montant_loyer, p.titre AS property_titre, p.adresse AS property_adresse,
           u.nom AS locataire_nom, u.email AS locataire_email
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY pay.mois DESC, pay.date_paiement DESC
  `).all(req.user.id);
  res.json({ payments: payments.map(decorate) });
};

exports.validerPaiement = (req, res) => {
  const { id } = req.params;
  const { statut_bailleur } = req.body;
  const motif = String(req.body.motif_refus || "").trim();

  if (!["valide", "refuse"].includes(statut_bailleur)) {
    return res.status(400).json({ message: "Statut invalide" });
  }
  if (statut_bailleur === "refuse" && motif.length < 5) {
    return res.status(400).json({ message: "Merci d'indiquer un motif de refus (5 caractères minimum)." });
  }
  if (motif.length > 500) {
    return res.status(400).json({ message: "Motif trop long (500 caractères max)." });
  }

  const payment = db.prepare(`
    SELECT pay.* FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE pay.id = ? AND p.bailleur_id = ?
  `).get(id, req.user.id);

  if (!payment) return res.status(404).json({ message: "Paiement introuvable" });
  if (payment.statut_bailleur === "valide") {
    return res.status(409).json({ message: "Ce paiement est déjà validé." });
  }
  if (payment.statut_bailleur === "refuse") {
    const remplacement = db.prepare(`
      SELECT id FROM payments
      WHERE contract_id = ? AND mois = ? AND id <> ? AND statut_bailleur <> 'refuse'
    `).get(payment.contract_id, payment.mois, payment.id);
    if (remplacement) {
      return res.status(409).json({ message: "Un paiement plus récent a déjà été déclaré pour ce mois." });
    }
  }

  db.prepare(`
    UPDATE payments
    SET statut_bailleur = ?, motif_refus = ?, date_decision = ?
    WHERE id = ?
  `).run(
    statut_bailleur,
    statut_bailleur === "refuse" ? motif : null,
    new Date().toISOString(),
    id
  );

  res.json({
    message: statut_bailleur === "valide" ? "Paiement validé" : "Paiement refusé",
    statut_bailleur,
    motif_refus: statut_bailleur === "refuse" ? motif : null
  });
};

exports.getPaymentById = (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;

  const payment = db.prepare(`
    SELECT pay.*, c.locataire_id, c.montant_loyer, c.date_debut,
           p.titre AS property_titre, p.adresse AS property_adresse, p.ville AS property_ville,
           p.bailleur_id, b.nom AS bailleur_nom, b.email AS bailleur_email,
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
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  res.json({ payment: decorate(payment) });
};

exports.getPaymentProof = (req, res) => {
  const payment = db.prepare(`
    SELECT pay.preuve_paiement, c.locataire_id, p.bailleur_id
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE pay.id = ?
  `).get(req.params.id);

  if (!payment) return res.status(404).json({ message: "Paiement introuvable" });
  const autorise = (req.user.role === "bailleur" && payment.bailleur_id === req.user.id)
    || (req.user.role === "locataire" && payment.locataire_id === req.user.id);
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  const file = resolveStoredPath(payment.preuve_paiement);
  if (!file) return res.status(404).json({ message: "Aucune preuve disponible" });

  res.setHeader("Cache-Control", "private, max-age=0");
  res.setHeader("Content-Disposition", "inline");
  res.sendFile(file);
};

exports.getDashboard = (req, res) => {
  const bailleur_id = req.user.id;
  const now = new Date();
  const moisCle = currentMonthKey(now);

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

  const agregats = db.prepare(`
    SELECT contract_id,
           COUNT(DISTINCT mois) AS nb_mois,
           COALESCE(SUM(montant), 0) AS total,
           MAX(CASE WHEN mois = ? THEN 1 ELSE 0 END) AS paye_ce_mois
    FROM payments
    WHERE statut_bailleur = 'valide'
    GROUP BY contract_id
  `).all(moisCle);
  const parContrat = new Map(agregats.map((a) => [a.contract_id, a]));

  const dashboard = contrats.map((c) => {
    const agg = parContrat.get(c.contract_id) || { nb_mois: 0, total: 0, paye_ce_mois: 0 };
    const [annee, mois, jour] = String(c.date_debut).slice(0, 10).split("-").map(Number);
    const debut = new Date(annee, (mois || 1) - 1, jour || 1);
    const moisEcoules = Math.max(0, (now.getFullYear() - debut.getFullYear()) * 12 + (now.getMonth() - debut.getMonth()) + 1);
    const moisEnRetard = Math.max(0, moisEcoules - Number(agg.nb_mois || 0));

    let statut = "a_jour";
    if (moisEnRetard >= 2) statut = "retard_grave";
    else if (moisEnRetard === 1) statut = "retard";
    else if (!agg.paye_ce_mois) statut = "en_attente";

    return {
      ...c,
      mois_actuel: moisLabel(moisCle),
      mois_cle: moisCle,
      paye_ce_mois: !!agg.paye_ce_mois,
      total_paye: Number(agg.total || 0),
      mois_en_retard: moisEnRetard,
      statut_paiement: statut
    };
  });

  const rappels = db.prepare(`
    SELECT r.id, r.contract_id, r.message, r.statut, r.date_envoi, r.date_lecture, r.date_confirmation
    FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ?
    ORDER BY r.date_envoi DESC, r.id DESC
  `).all(bailleur_id);

  const dernierRappel = new Map();
  for (const rappel of rappels) {
    if (!dernierRappel.has(rappel.contract_id)) {
      dernierRappel.set(rappel.contract_id, { ...rappel, confirme: !!rappel.date_confirmation });
    }
  }

  res.json({
    dashboard: dashboard.map((d) => ({
      ...d,
      dernier_rappel: dernierRappel.get(d.contract_id) || null
    })),
    mois_actuel: moisLabel(moisCle),
    mois_cle: moisCle
  });
};

exports.envoyerRappel = (req, res) => {
  const { contract_id } = req.body;
  const message = String(req.body.message || "").trim();
  if (!contract_id || !message) return res.status(400).json({ message: "Champs manquants" });
  if (message.length > 500) return res.status(400).json({ message: "Message trop long (500 caractères max)." });

  const contract = db.prepare(`
    SELECT c.id, u.nom AS locataire_nom, p.titre AS property_titre
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE c.id = ? AND p.bailleur_id = ? AND c.statut = 'actif'
  `).get(contract_id, req.user.id);
  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });

  const result = db.prepare("INSERT INTO reminders (contract_id, message) VALUES (?, ?)").run(contract_id, message);
  const rappel = db.prepare("SELECT * FROM reminders WHERE id = ?").get(result.lastInsertRowid);

  res.status(201).json({
    message: "Rappel envoyé",
    rappel: { ...rappel, confirme: false, locataire_nom: contract.locataire_nom, property_titre: contract.property_titre }
  });
};

exports.getRappelsBailleur = (req, res) => {
  const rappels = db.prepare(`
    SELECT r.*, u.nom AS locataire_nom, u.email AS locataire_email, p.titre AS property_titre
    FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY r.date_envoi DESC, r.id DESC
  `).all(req.user.id);

  res.json({ rappels: rappels.map((r) => ({ ...r, confirme: !!r.date_confirmation })) });
};

exports.getMesRappels = (req, res) => {
  const rappels = db.prepare(`
    SELECT r.*, p.titre AS property_titre, b.nom AS bailleur_nom
    FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    WHERE c.locataire_id = ?
    ORDER BY r.date_envoi DESC, r.id DESC
  `).all(req.user.id);
  res.json({
    rappels: rappels.map((r) => ({
      ...r,
      confirme: !!r.date_confirmation,
      lu: r.statut === "lu" || !!r.date_lecture
    }))
  });
};

exports.marquerRappelLu = (req, res) => {
  const rappel = db.prepare(`
    SELECT r.* FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    WHERE r.id = ? AND c.locataire_id = ?
  `).get(req.params.id, req.user.id);

  if (!rappel) return res.status(404).json({ message: "Rappel introuvable" });
  if (rappel.statut !== "lu") {
    db.prepare("UPDATE reminders SET statut = 'lu', date_lecture = COALESCE(date_lecture, ?) WHERE id = ?")
      .run(new Date().toISOString(), req.params.id);
  }
  res.json({ message: "Rappel marqué comme lu" });
};

// Accusé de réception : le locataire confirme explicitement avoir reçu le rappel.
exports.confirmerRappel = (req, res) => {
  const rappel = db.prepare(`
    SELECT r.* FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    WHERE r.id = ? AND c.locataire_id = ?
  `).get(req.params.id, req.user.id);

  if (!rappel) return res.status(404).json({ message: "Rappel introuvable" });

  if (rappel.date_confirmation) {
    return res.json({
      message: "Réception déjà confirmée",
      date_confirmation: rappel.date_confirmation
    });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE reminders
    SET statut = 'lu', date_lecture = COALESCE(date_lecture, ?), date_confirmation = ?
    WHERE id = ?
  `).run(now, now, req.params.id);

  res.json({ message: "Réception confirmée", date_confirmation: now });
};

exports.exportCSV = (req, res) => {
  const payments = db.prepare(`
    SELECT pay.id, u.nom AS locataire, u.email, p.titre AS logement,
           pay.mois, pay.montant, pay.methode, pay.statut_bailleur, pay.date_paiement
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY pay.mois DESC, pay.date_paiement DESC
  `).all(req.user.id);

  if (payments.length === 0) return res.status(404).json({ message: "Aucun paiement à exporter" });

  const data = payments.map((p) => ({
    ID: p.id,
    Locataire: csvSafe(p.locataire),
    Email: csvSafe(p.email),
    Logement: csvSafe(p.logement),
    Mois: moisLabel(p.mois),
    Montant: p.montant,
    Methode: csvSafe(p.methode || ""),
    Statut: p.statut_bailleur,
    Date: p.date_paiement ? new Date(p.date_paiement).toLocaleDateString("fr-FR") : ""
  }));

  try {
    const parser = new Parser({
      fields: ["ID", "Locataire", "Email", "Logement", "Mois", "Montant", "Methode", "Statut", "Date"]
    });
    const csv = parser.parse(data);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="paiements-${Date.now()}.csv"`);
    res.send("\uFEFF" + csv);
  } catch (err) {
    res.status(500).json({ message: "Erreur de génération du fichier" });
  }
};
