// ============================================
// chartController.js — Données pour les graphiques
// ============================================

const db = require("../database/db");

const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

exports.getRevenus = async (req, res) => {
  const now = new Date();
  const mois = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    mois.push({
      cle,
      label: `${MOIS_COURT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      total: 0
    });
  }

  const payments = await db.all(`
    SELECT pay.montant, pay.mois
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND pay.statut_bailleur = 'valide'
  `, [req.user.id]);

  const parCle = new Map(mois.map((m) => [m.cle, m]));
  for (const p of payments) {
    const m = parCle.get(p.mois);
    if (m) m.total += Number(p.montant) || 0;
  }

  res.json({
    labels: mois.map((m) => m.label),
    valeurs: mois.map((m) => m.total),
    total_annuel: mois.reduce((s, m) => s + m.total, 0)
  });
};

exports.getRepartition = async (req, res) => {
  const counts = { disponible: 0, loue: 0, archive: 0 };
  const rows = await db.all(`
    SELECT statut, COUNT(*) AS nb FROM properties WHERE bailleur_id = ? GROUP BY statut
  `, [req.user.id]);
  for (const row of rows) counts[row.statut] = Number(row.nb);

  res.json({
    labels: ["Disponibles", "Loués", "Archivés"],
    valeurs: [counts.disponible, counts.loue, counts.archive],
    total: counts.disponible + counts.loue + counts.archive
  });
};