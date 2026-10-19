// ============================================
// calendarController.js — Calendrier des échéances
// ============================================

const db = require("../database/db");

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

exports.getCalendar = (req, res) => {
  const now = new Date();
  const mois = Math.min(12, Math.max(1, parseInt(req.query.mois, 10) || now.getMonth() + 1));
  const annee = Math.min(2100, Math.max(2000, parseInt(req.query.annee, 10) || now.getFullYear()));
  const moisCle = `${annee}-${String(mois).padStart(2, "0")}`;
  const moisNom = `${MOIS_LABELS[mois - 1]} ${annee}`;

  const debut = new Date(annee, mois - 1, 1);
  const fin = new Date(annee, mois, 0, 23, 59, 59);

  const contrats = db.prepare(`
    SELECT c.id, c.montant_loyer, c.date_debut, c.date_fin,
           u.nom AS locataire_nom, p.titre AS property_titre, p.adresse AS property_adresse
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ? AND c.statut = 'actif'
  `).all(req.user.id);

  const loyers = contrats.map((c) => {
    const debutContrat = new Date(c.date_debut);
    const actifCeMois = debutContrat <= fin && (!c.date_fin || new Date(c.date_fin) >= debut);
    if (!actifCeMois) return null;

    const paye = db.prepare(`
      SELECT id, montant, date_paiement FROM payments
      WHERE contract_id = ? AND mois = ? AND statut_bailleur = 'valide'
      LIMIT 1
    `).get(c.id, moisCle);

    return {
      type: "loyer",
      date: `${annee}-${String(mois).padStart(2, "0")}-05`,
      titre: c.locataire_nom,
      description: `Loyer ${c.montant_loyer} $ — ${c.property_titre}`,
      montant: Number(c.montant_loyer) || 0,
      statut: paye ? "paye" : "en_attente",
      paiement: paye || null
    };
  }).filter(Boolean);

  const contratsEcheance = contrats.filter((c) => {
    if (!c.date_fin) return false;
    const finContrat = new Date(c.date_fin);
    return finContrat >= debut && finContrat <= fin;
  }).map((c) => ({
    type: "echeance",
    date: c.date_fin,
    titre: c.locataire_nom,
    description: `Fin de contrat — ${c.property_titre}`
  }));

  const incidents = db.prepare(`
    SELECT i.id, i.description, i.statut, i.date_creation, i.photo,
           p.titre AS property_titre, u.nom AS locataire_nom
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    JOIN users u ON i.locataire_id = u.id
    WHERE p.bailleur_id = ?
      AND i.statut != 'resolu'
      AND datetime(i.date_creation) >= datetime(?)
      AND datetime(i.date_creation) <= datetime(?)
    ORDER BY i.date_creation DESC
  `).all(req.user.id, debut.toISOString(), fin.toISOString());

  const incidentsFormates = incidents.map((i) => ({
    type: "incident",
    date: i.date_creation,
    titre: i.locataire_nom,
    description: i.description.substring(0, 60) + (i.description.length > 60 ? "..." : ""),
    statut: i.statut,
    property: i.property_titre
  }));

  const rappels = db.prepare(`
    SELECT r.id, r.message, r.statut, r.date_envoi,
           u.nom AS locataire_nom, p.titre AS property_titre
    FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
      AND datetime(r.date_envoi) >= datetime(?)
      AND datetime(r.date_envoi) <= datetime(?)
    ORDER BY r.date_envoi DESC
  `).all(req.user.id, debut.toISOString(), fin.toISOString());

  const rappelsFormates = rappels.map((r) => ({
    type: "rappel",
    date: r.date_envoi,
    titre: r.locataire_nom,
    description: r.message.substring(0, 60) + (r.message.length > 60 ? "..." : ""),
    statut: r.statut,
    property: r.property_titre
  }));

  const tousEvenements = [...loyers, ...contratsEcheance, ...incidentsFormates, ...rappelsFormates];
  const evenementsParJour = {};
  for (const evenement of tousEvenements) {
    const jour = Number(String(evenement.date).slice(8, 10));
    if (!jour) continue;
    if (!evenementsParJour[jour]) evenementsParJour[jour] = [];
    evenementsParJour[jour].push(evenement);
  }

  res.json({
    mois,
    annee,
    mois_nom: moisNom,
    mois_cle: moisCle,
    evenements: evenementsParJour,
    stats: {
      loyers_attendus: loyers.length,
      loyers_payes: loyers.filter((l) => l.statut === "paye").length,
      loyers_en_attente: loyers.filter((l) => l.statut === "en_attente").length,
      montant_attendu: loyers.reduce((s, l) => s + (l.montant || 0), 0),
      incidents: incidentsFormates.length,
      rappels: rappelsFormates.length,
      echeances: contratsEcheance.length
    }
  });
};
