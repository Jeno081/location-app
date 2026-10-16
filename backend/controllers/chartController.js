// ============================================
// chartController.js — Données pour les graphiques
// ============================================

const db = require("../database/db");

// ============================================
// GET /api/charts/revenus — Revenus des 12 derniers mois
// (bailleur)
// ============================================
exports.getRevenus = (req, res) => {
  const bailleur_id = req.user.id;

  const maintenant = new Date();
  const mois = [];

  // Construire les 12 derniers mois
  for (let i = 11; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    const moisNom = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const moisNomCap = moisNom.charAt(0).toUpperCase() + moisNom.slice(1);
    mois.push({ label: label, moisNom: moisNomCap, total: 0 });
  }

  // Récupérer tous les paiements du bailleur
  const payments = db.prepare(`
    SELECT pay.montant, pay.mois, pay.date_paiement
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ?
  `).all(bailleur_id);

  // Agréger par mois
  payments.forEach(p => {
    const m = mois.find(x => x.moisNom === p.mois);
    if (m) m.total += p.montant;
  });

  res.json({
    labels: mois.map(m => m.label),
    valeurs: mois.map(m => m.total),
    total_annuel: mois.reduce((s, m) => s + m.total, 0)
  });
};

// ============================================
// GET /api/charts/repartition — Répartition des logements
// (bailleur)
// ============================================
exports.getRepartition = (req, res) => {
  const bailleur_id = req.user.id;

  const dispo = db.prepare("SELECT COUNT(*) AS nb FROM properties WHERE bailleur_id = ? AND statut = 'disponible'").get(bailleur_id).nb;
  const loues = db.prepare("SELECT COUNT(*) AS nb FROM properties WHERE bailleur_id = ? AND statut = 'loue'").get(bailleur_id).nb;
  const archives = db.prepare("SELECT COUNT(*) AS nb FROM properties WHERE bailleur_id = ? AND statut = 'archive'").get(bailleur_id).nb;

  res.json({
    labels: ["Disponibles", "Loués", "Archivés"],
    valeurs: [dispo, loues, archives],
    total: dispo + loues + archives
  });
};
