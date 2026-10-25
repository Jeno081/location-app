// ============================================
// paymentController.js — Paiements + Preuves
// ============================================

const db = require("../database/db");
const pushService = require("../services/pushService");
const crypto = require("crypto");
const { Parser } = require("json2csv");
const { normaliserMois } = require("../database/migrate");
const { sendStoredFile } = require("../services/fileStore");

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

exports.createPayment = async (req, res) => {
  const { contract_id, montant, methode } = req.body;
  const locataire_id = req.user.id;

  // Le champ `mois` accepte un mois ou un tableau JSON de mois (paiement groupé).
  let moisBruts = req.body.mois;
  if (typeof moisBruts === "string" && moisBruts.trim().startsWith("[")) {
    try { moisBruts = JSON.parse(moisBruts); } catch (err) { moisBruts = null; }
  }
  if (!Array.isArray(moisBruts)) moisBruts = moisBruts ? [moisBruts] : [];
  const moisListe = [...new Set(moisBruts.map(normaliserMois).filter(Boolean))].sort();

  if (!contract_id || montant === undefined || moisListe.length === 0) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }
  if (moisListe.length > 12) {
    return res.status(400).json({ message: "Vous pouvez payer au maximum 12 mois à la fois." });
  }

  const montantNombre = Number(montant);
  if (!Number.isFinite(montantNombre) || montantNombre <= 0) {
    return res.status(400).json({ message: "Le montant doit être positif." });
  }

  const contract = await db.get("SELECT * FROM contracts WHERE id = ?", [contract_id]);
  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });
  if (contract.locataire_id !== locataire_id) return res.status(403).json({ message: "Non autorisé" });
  if (contract.statut !== "actif") {
    return res.status(409).json({ message: "Ce contrat n'est pas actif." });
  }

  // Un paiement refusé n'empêche plus de déclarer un nouveau paiement pour ce mois.
  const placeholders = moisListe.map(() => "?").join(",");
  const dejaPayes = await db.all(`
    SELECT mois, statut_bailleur FROM payments
    WHERE contract_id = ? AND mois IN (${placeholders}) AND statut_bailleur <> 'refuse'
  `, [contract_id, ...moisListe]);

  if (dejaPayes.length > 0) {
    const detail = dejaPayes.map((p) => moisLabel(p.mois)).join(", ");
    const dejaValide = dejaPayes.some((p) => p.statut_bailleur === "valide");
    return res.status(409).json({
      message: `Un paiement existe déjà pour : ${detail}.`,
      code: dejaValide ? "DEJA_VALIDE" : "DEJA_EN_ATTENTE",
      mois: dejaPayes.map((p) => p.mois)
    });
  }

  if (!req.file) {
    return res.status(400).json({ message: "La preuve de paiement est obligatoire." });
  }

  const preuve = "/uploads/documents/" + req.file.filename;
  const now = new Date().toISOString();
  const lotId = moisListe.length > 1 ? crypto.randomUUID() : null;
  const montantMois = Math.round((montantNombre / moisListe.length) * 100) / 100;
  const ids = [];

  try {
    await db.transaction(async (tx) => {
      for (let index = 0; index < moisListe.length; index++) {
        // Le dernier mois absorbe l'arrondi pour que le total corresponde exactement.
        const montantLigne = index === moisListe.length - 1
          ? Math.round((montantNombre - montantMois * (moisListe.length - 1)) * 100) / 100
          : montantMois;

        const result = await tx.run(`
          INSERT INTO payments (contract_id, montant, mois, methode, statut, statut_bailleur, preuve_paiement, lot_id, date_paiement)
          VALUES (?, ?, ?, ?, 'paye', 'en_attente', ?, ?, ?)
        `, [contract_id, montantLigne, moisListe[index], methode || "mobile", preuve, lotId, now]);
        ids.push(result.insertId);
      }
    });

    res.status(201).json({
      message: moisListe.length > 1
        ? `${moisListe.length} mois déclarés, en attente de validation.`
        : "Paiement enregistré, en attente de validation.",
      paymentId: ids[0],
      paymentIds: ids,
      lot_id: lotId,
      mois: moisListe.length === 1 ? moisListe[0] : moisListe,
      mois_label: moisListe.length === 1 ? moisLabel(moisListe[0]) : moisListe.map(moisLabel).join(", "),
      mois_labels: moisListe.map(moisLabel),
      total: montantNombre
    });

    try {
      const logement = await db.get("SELECT bailleur_id, titre FROM properties WHERE id = ?", [contract.property_id]);
      if (logement) {
        pushService.sendToUser(logement.bailleur_id, {
          title: "Nouveau paiement",
          body: `${req.user.nom || "Un locataire"} a déclaré ${montantNombre} $ pour ${moisListe.map(moisLabel).join(", ")}.`,
          url: "/bailleur.html#paiements",
          tag: `payment-${ids[0]}`,
          type: "payment"
        }).catch((err) => console.warn("[push] paiement :", err.message));
      }
    } catch (err) {
      console.warn("[push] paiement :", err.message);
    }
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Un paiement est déjà en attente pour un de ces mois." });
    }
    throw err;
  }
};

exports.getMyPayments = async (req, res) => {
  const payments = await db.all(`
    SELECT pay.*, c.montant_loyer, p.titre AS property_titre, p.adresse AS property_adresse
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ?
    ORDER BY pay.mois DESC, pay.date_paiement DESC
  `, [req.user.id]);
  res.json({ payments: payments.map(decorate) });
};

exports.getPaymentsForBailleur = async (req, res) => {
  const payments = await db.all(`
    SELECT pay.*, c.montant_loyer, p.titre AS property_titre, p.adresse AS property_adresse,
           u.nom AS locataire_nom, u.email AS locataire_email
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY pay.mois DESC, pay.date_paiement DESC
  `, [req.user.id]);
  res.json({ payments: payments.map(decorate) });
};

exports.validerPaiement = async (req, res) => {
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

  const payment = await db.get(`
    SELECT pay.*, c.locataire_id, p.titre AS property_titre
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE pay.id = ? AND p.bailleur_id = ?
  `, [id, req.user.id]);

  if (!payment) return res.status(404).json({ message: "Paiement introuvable" });
  if (payment.statut_bailleur === "valide") {
    return res.status(409).json({ message: "Ce paiement est déjà validé." });
  }
  if (payment.statut_bailleur === "refuse") {
    const remplacement = await db.get(`
      SELECT id FROM payments
      WHERE contract_id = ? AND mois = ? AND id <> ? AND statut_bailleur <> 'refuse'
      LIMIT 1
    `, [payment.contract_id, payment.mois, payment.id]);
    if (remplacement) {
      return res.status(409).json({ message: "Un paiement plus récent a déjà été déclaré pour ce mois." });
    }
  }

  await db.run(`
    UPDATE payments
    SET statut_bailleur = ?, motif_refus = ?, date_decision = ?
    WHERE id = ?
  `, [
    statut_bailleur,
    statut_bailleur === "refuse" ? motif : null,
    new Date().toISOString(),
    id
  ]);

  res.json({
    message: statut_bailleur === "valide" ? "Paiement validé" : "Paiement refusé",
    statut_bailleur,
    motif_refus: statut_bailleur === "refuse" ? motif : null
  });

  pushService.sendToUser(payment.locataire_id, {
    title: statut_bailleur === "valide" ? "Paiement validé" : "Paiement refusé",
    body: statut_bailleur === "valide"
      ? `Votre paiement de ${payment.montant} $ a été validé.`
      : `Motif : ${motif}`,
    url: "/locataire.html#paiements",
    tag: `payment-${payment.id}`,
    type: "payment"
  }).catch((err) => console.warn("[push] décision paiement :", err.message));
};

exports.validerLot = async (req, res) => {
  const { lotId } = req.params;
  const { statut_bailleur } = req.body;
  const motif = String(req.body.motif_refus || "").trim();

  if (!["valide", "refuse"].includes(statut_bailleur)) {
    return res.status(400).json({ message: "Statut invalide" });
  }
  if (statut_bailleur === "refuse" && motif.length < 5) {
    return res.status(400).json({ message: "Merci d'indiquer un motif de refus (5 caractères minimum)." });
  }

  const paiements = await db.all(`
    SELECT pay.id, pay.montant, c.locataire_id
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE pay.lot_id = ? AND pay.statut_bailleur = 'en_attente' AND p.bailleur_id = ?
  `, [lotId, req.user.id]);

  if (paiements.length === 0) {
    return res.status(404).json({ message: "Aucun paiement en attente pour ce lot." });
  }

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    for (const paiement of paiements) {
      await tx.run(`
        UPDATE payments SET statut_bailleur = ?, motif_refus = ?, date_decision = ? WHERE id = ?
      `, [statut_bailleur, statut_bailleur === "refuse" ? motif : null, now, paiement.id]);
    }
  });

  res.json({
    message: statut_bailleur === "valide"
      ? `${paiements.length} paiement(s) validé(s).`
      : `${paiements.length} paiement(s) refusé(s).`,
    count: paiements.length,
    statut_bailleur
  });

  const locataires = [...new Set(paiements.map((paiement) => paiement.locataire_id))];
  pushService.sendToUsers(locataires, {
    title: statut_bailleur === "valide" ? "Paiements validés" : "Paiements refusés",
    body: statut_bailleur === "valide"
      ? `${paiements.length} mois ont été validés par votre bailleur.`
      : `${paiements.length} paiement(s) refusé(s). Motif : ${motif}`,
    url: "/locataire.html#paiements",
    tag: `lot-${lotId}`,
    type: "payment"
  }).catch((err) => console.warn("[push] lot paiement :", err.message));
};

exports.getPaymentById = async (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;

  const payment = await db.get(`
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
  `, [id]);

  if (!payment) return res.status(404).json({ message: "Paiement introuvable" });
  const autorise = (role === "bailleur" && payment.bailleur_id === userId)
    || (role === "locataire" && payment.locataire_id === userId);
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  res.json({ payment: decorate(payment) });
};

exports.getPaymentProof = async (req, res) => {
  const payment = await db.get(`
    SELECT pay.preuve_paiement, c.locataire_id, p.bailleur_id
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE pay.id = ?
  `, [req.params.id]);

  if (!payment) return res.status(404).json({ message: "Paiement introuvable" });
  const autorise = (req.user.role === "bailleur" && payment.bailleur_id === req.user.id)
    || (req.user.role === "locataire" && payment.locataire_id === req.user.id);
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  res.setHeader("Cache-Control", "private, max-age=0");
  const sent = await sendStoredFile(res, payment.preuve_paiement, { inlineName: "preuve-paiement" });
  if (!sent) return res.status(404).json({ message: "Aucune preuve disponible" });
};

exports.getDashboard = async (req, res) => {
  const bailleur_id = req.user.id;
  const now = new Date();
  const moisCle = currentMonthKey(now);

  const contrats = await db.all(`
    SELECT c.id AS contract_id, c.montant_loyer, c.date_debut, c.date_fin,
           u.id AS locataire_id, u.nom AS locataire_nom, u.email AS locataire_email,
           p.id AS property_id, p.titre AS property_titre, p.adresse AS property_adresse
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ? AND c.statut = 'actif'
    ORDER BY u.nom
  `, [bailleur_id]);

  const agregats = await db.all(`
    SELECT contract_id,
           COUNT(DISTINCT mois) AS nb_mois,
           COALESCE(SUM(montant), 0) AS total,
           MAX(CASE WHEN mois = ? THEN 1 ELSE 0 END) AS paye_ce_mois
    FROM payments
    WHERE statut_bailleur = 'valide'
    GROUP BY contract_id
  `, [moisCle]);
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
    else if (!Number(agg.paye_ce_mois)) statut = "en_attente";

    return {
      ...c,
      mois_actuel: moisLabel(moisCle),
      mois_cle: moisCle,
      paye_ce_mois: !!Number(agg.paye_ce_mois),
      total_paye: Number(agg.total || 0),
      mois_en_retard: moisEnRetard,
      statut_paiement: statut
    };
  });

  const rappels = await db.all(`
    SELECT r.id, r.contract_id, r.message, r.statut, r.date_envoi, r.date_lecture, r.date_confirmation
    FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ?
    ORDER BY r.date_envoi DESC, r.id DESC
  `, [bailleur_id]);

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

exports.envoyerRappel = async (req, res) => {
  const { contract_id } = req.body;
  const message = String(req.body.message || "").trim();
  if (!contract_id || !message) return res.status(400).json({ message: "Champs manquants" });
  if (message.length > 500) return res.status(400).json({ message: "Message trop long (500 caractères max)." });

  const contract = await db.get(`
    SELECT c.id, u.nom AS locataire_nom, p.titre AS property_titre
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE c.id = ? AND p.bailleur_id = ? AND c.statut = 'actif'
  `, [contract_id, req.user.id]);
  if (!contract) return res.status(404).json({ message: "Contrat introuvable" });

  const result = await db.run("INSERT INTO reminders (contract_id, message) VALUES (?, ?)", [contract_id, message]);
  const rappel = await db.get("SELECT * FROM reminders WHERE id = ?", [result.insertId]);

  res.status(201).json({
    message: "Rappel envoyé",
    rappel: { ...rappel, confirme: false, locataire_nom: contract.locataire_nom, property_titre: contract.property_titre }
  });
};

exports.getRappelsBailleur = async (req, res) => {
  const rappels = await db.all(`
    SELECT r.*, u.nom AS locataire_nom, u.email AS locataire_email, p.titre AS property_titre
    FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY r.date_envoi DESC, r.id DESC
  `, [req.user.id]);

  res.json({ rappels: rappels.map((r) => ({ ...r, confirme: !!r.date_confirmation })) });
};

exports.getMesRappels = async (req, res) => {
  const rappels = await db.all(`
    SELECT r.*, p.titre AS property_titre, b.nom AS bailleur_nom
    FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    WHERE c.locataire_id = ?
    ORDER BY r.date_envoi DESC, r.id DESC
  `, [req.user.id]);
  res.json({
    rappels: rappels.map((r) => ({
      ...r,
      confirme: !!r.date_confirmation,
      lu: r.statut === "lu" || !!r.date_lecture
    }))
  });
};

exports.marquerRappelLu = async (req, res) => {
  const rappel = await db.get(`
    SELECT r.* FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    WHERE r.id = ? AND c.locataire_id = ?
  `, [req.params.id, req.user.id]);

  if (!rappel) return res.status(404).json({ message: "Rappel introuvable" });
  if (rappel.statut !== "lu") {
    await db.run("UPDATE reminders SET statut = 'lu', date_lecture = COALESCE(date_lecture, ?) WHERE id = ?",
      [new Date().toISOString(), req.params.id]);
  }
  res.json({ message: "Rappel marqué comme lu" });
};

// Accusé de réception : le locataire confirme explicitement avoir reçu le rappel.
exports.confirmerRappel = async (req, res) => {
  const rappel = await db.get(`
    SELECT r.* FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    WHERE r.id = ? AND c.locataire_id = ?
  `, [req.params.id, req.user.id]);

  if (!rappel) return res.status(404).json({ message: "Rappel introuvable" });

  if (rappel.date_confirmation) {
    return res.json({
      message: "Réception déjà confirmée",
      date_confirmation: rappel.date_confirmation
    });
  }

  const now = new Date().toISOString();
  await db.run(`
    UPDATE reminders
    SET statut = 'lu', date_lecture = COALESCE(date_lecture, ?), date_confirmation = ?
    WHERE id = ?
  `, [now, now, req.params.id]);

  res.json({ message: "Réception confirmée", date_confirmation: now });
};

exports.exportCSV = async (req, res) => {
  const payments = await db.all(`
    SELECT pay.id, u.nom AS locataire, u.email, p.titre AS logement,
           pay.mois, pay.montant, pay.methode, pay.statut_bailleur, pay.date_paiement
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY pay.mois DESC, pay.date_paiement DESC
  `, [req.user.id]);

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
