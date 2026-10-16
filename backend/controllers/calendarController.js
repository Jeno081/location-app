// ============================================
// calendarController.js — Calendrier des échéances
// ============================================

const db = require("../database/db");

// ============================================
// GET /api/calendar?mois=X&annee=Y
// (bailleur uniquement)
// ============================================
exports.getCalendar = (req, res) => {
  const bailleur_id = req.user.id;
  const maintenant = new Date();

  const mois = parseInt(req.query.mois) || (maintenant.getMonth() + 1);
  const annee = parseInt(req.query.annee) || maintenant.getFullYear();

  // Bornes du mois
  const debut = new Date(annee, mois - 1, 1);
  const fin = new Date(annee, mois, 0, 23, 59, 59);

  // Nom du mois en français (capitalisé)
  const moisNom = debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisNomCap = moisNom.charAt(0).toUpperCase() + moisNom.slice(1);

  // 1. Contrats actifs avec leurs infos
  const contrats = db.prepare(`
    SELECT c.id, c.montant_loyer, c.date_debut, c.date_fin,
           u.nom AS locataire_nom, u.email AS locataire_email,
           p.titre AS property_titre, p.adresse AS property_adresse
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ? AND c.statut = 'actif'
  `).all(bailleur_id);

  // 2. Loyers attendus ce mois
  const loyers = contrats.map(c => {
    // Le contrat doit avoir commencé
    const debutContrat = new Date(c.date_debut);
    const actifCeMois = debutContrat <= fin && (!c.date_fin || new Date(c.date_fin) >= debut);

    if (!actifCeMois) return null;

    // Le loyer a-t-il été payé ?
    const paye = db.prepare(`
      SELECT id, montant, date_paiement FROM payments
      WHERE contract_id = ? AND mois = ?
      LIMIT 1
    `).get(c.id, moisNomCap);

    return {
      type: "loyer",
      date: `${annee}-${String(mois).padStart(2, "0")}-05`, // Le 5 du mois
      titre: c.locataire_nom,
      description: `Loyer ${c.montant_loyer} $ — ${c.property_titre}`,
      statut: paye ? "paye" : "en_attente",
      paiement: paye || null
    };
  }).filter(l => l !== null);

  // 3. Contrats arrivant à échéance ce mois
  const contratsEcheance = contrats.filter(c => {
    if (!c.date_fin) return false;
    const finContrat = new Date(c.date_fin);
    return finContrat >= debut && finContrat <= fin;
  }).map(c => ({
    type: "echeance",
    date: c.date_fin,
    titre: c.locataire_nom,
    description: `Fin de contrat — ${c.property_titre}`
  }));

  // 4. Incidents non résolus ce mois
  const incidents = db.prepare(`
    SELECT i.id, i.description, i.statut, i.date_creation, i.photo,
           p.titre AS property_titre, u.nom AS locataire_nom
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    JOIN users u ON i.locataire_id = u.id
    WHERE p.bailleur_id = ?
      AND i.statut != 'resolu'
      AND i.date_creation >= ?
      AND i.date_creation <= ?
    ORDER BY i.date_creation DESC
  `).all(bailleur_id, debut.toISOString(), fin.toISOString());

  const incidentsFormates = incidents.map(i => ({
    type: "incident",
    date: i.date_creation,
    titre: i.locataire_nom,
    description: i.description.substring(0, 60) + (i.description.length > 60 ? "..." : ""),
    statut: i.statut,
    property: i.property_titre
  }));

  // 5. Rappels envoyés ce mois
  const rappels = db.prepare(`
    SELECT r.id, r.message, r.statut, r.date_envoi,
           u.nom AS locataire_nom, p.titre AS property_titre
    FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    JOIN users u ON c.locataire_id = u.id
    WHERE p.bailleur_id = ?
      AND r.date_envoi >= ?
      AND r.date_envoi <= ?
    ORDER BY r.date_envoi DESC
  `).all(bailleur_id, debut.toISOString(), fin.toISOString());

  const rappelsFormates = rappels.map(r => ({
    type: "rappel",
    date: r.date_envoi,
    titre: r.locataire_nom,
    description: r.message.substring(0, 60) + (r.message.length > 60 ? "..." : ""),
    statut: r.statut,
    property: r.property_titre
  }));

  // 6. Regrouper tous les événements par jour
  const tousEvenements = [...loyers, ...contratsEcheance, ...incidentsFormates, ...rappelsFormates];

  const evenementsParJour = {};
  tousEvenements.forEach(e => {
    const date = new Date(e.date);
    const jour = date.getDate();
    if (!evenementsParJour[jour]) evenementsParJour[jour] = [];
    evenementsParJour[jour].push(e);
  });

  // 7. Statistiques du mois
  const stats = {
    loyers_attendus: loyers.length,
    loyers_payes: loyers.filter(l => l.statut === "paye").length,
    loyers_en_attente: loyers.filter(l => l.statut === "en_attente").length,
    montant_attendu: loyers.reduce((s, l) => {
      const m = l.description.match(/(\d+)/);
      return s + (m ? parseInt(m[1]) : 0);
    }, 0),
    incidents: incidentsFormates.length,
    rappels: rappelsFormates.length,
    echeances: contratsEcheance.length
  };

  res.json({
    mois: mois,
    annee: annee,
    mois_nom: moisNomCap,
    evenements: evenementsParJour,
    stats: stats
  });
};
