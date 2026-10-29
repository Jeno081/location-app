// ============================================
// badgeService.js — Compteurs de badges et d'actions en attente
// ============================================

const db = require("../database/db");

function moisCourant(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function compterLocataire(locataireId) {
  const rappels = await db.get(`
    SELECT COUNT(*) AS nb FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    WHERE c.locataire_id = ? AND r.date_confirmation IS NULL
  `, [locataireId]);

  const incidents = await db.get(`
    SELECT COUNT(*) AS nb FROM incidents
    WHERE locataire_id = ? AND statut != 'resolu'
  `, [locataireId]);

  const contratsActifs = await db.all(`
    SELECT id FROM contracts WHERE locataire_id = ? AND statut = 'actif'
  `, [locataireId]);

  let paiements = 0;
  if (contratsActifs.length > 0) {
    const placeholders = contratsActifs.map(() => "?").join(",");
    const payes = await db.all(`
      SELECT contract_id FROM payments
      WHERE mois = ? AND statut_bailleur = 'valide'
        AND contract_id IN (${placeholders})
    `, [moisCourant(), ...contratsActifs.map((c) => c.id)]);
    const payesSet = new Set(payes.map((p) => p.contract_id));
    paiements = contratsActifs.filter((c) => !payesSet.has(c.id)).length;
  }

  const refuses = await db.get(`
    SELECT COUNT(*) AS nb FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    WHERE c.locataire_id = ? AND pay.statut_bailleur = 'refuse'
      AND NOT EXISTS (
        SELECT 1 FROM payments p2
        WHERE p2.contract_id = pay.contract_id AND p2.mois = pay.mois
          AND p2.statut_bailleur <> 'refuse'
      )
  `, [locataireId]);

  const messages = await db.get(`
    SELECT COUNT(*) AS nb
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.locataire_id = ? AND m.sender_id <> ? AND m.lu = 0
  `, [locataireId, locataireId]);

  const documents = await db.get(`
    SELECT COUNT(*) AS nb FROM documents
    WHERE locataire_id = ? AND statut = 'refuse'
  `, [locataireId]);

  const annonces = await db.get(`
    SELECT COUNT(*) AS nb FROM announcements a
    WHERE a.bailleur_id = (
      SELECT p.bailleur_id
      FROM contracts c JOIN properties p ON c.property_id = p.id
      WHERE c.locataire_id = ? ORDER BY (c.statut = 'actif') DESC, c.id DESC LIMIT 1
    )
    AND (
      a.audience = 'tous'
      OR EXISTS (
        SELECT 1 FROM announcement_recipients ar
        WHERE ar.announcement_id = a.id AND ar.locataire_id = ?
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM announcement_reads arl
      WHERE arl.announcement_id = a.id AND arl.user_id = ?
    )
  `, [locataireId, locataireId, locataireId]);

  const compteurs = {
    rappels: Number(rappels.nb),
    incidents: Number(incidents.nb),
    paiements,
    paiements_refuses: Number(refuses.nb),
    messages: Number(messages.nb),
    documents: Number(documents.nb),
    annonces: Number(annonces.nb)
  };
  compteurs.total = compteurs.rappels + compteurs.incidents
    + Math.max(compteurs.paiements, compteurs.paiements_refuses)
    + compteurs.messages + compteurs.documents + compteurs.annonces;
  return compteurs;
}

async function compterBailleur(bailleurId) {
  const incidents = await db.get(`
    SELECT COUNT(*) AS nb FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE p.bailleur_id = ? AND i.statut != 'resolu'
  `, [bailleurId]);

  const contrats = await db.get(`
    SELECT COUNT(*) AS nb FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND c.statut = 'en_attente'
  `, [bailleurId]);

  const paiements = await db.get(`
    SELECT COUNT(*) AS nb FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND pay.statut_bailleur = 'en_attente'
  `, [bailleurId]);

  const contratsActifs = await db.all(`
    SELECT c.id, c.date_debut FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND c.statut = 'actif'
  `, [bailleurId]);

  const paiementsValides = await db.all(`
    SELECT pay.contract_id, COUNT(DISTINCT pay.mois) AS nb
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND pay.statut_bailleur = 'valide'
    GROUP BY pay.contract_id
  `, [bailleurId]);
  const payesParContrat = new Map(paiementsValides.map((p) => [p.contract_id, Number(p.nb)]));

  const now = new Date();
  let retards = 0;
  for (const c of contratsActifs) {
    const [annee, mois] = String(c.date_debut).slice(0, 10).split("-").map(Number);
    const debut = new Date(annee, (mois || 1) - 1, 1);
    const moisEcoules = Math.max(0, (now.getFullYear() - debut.getFullYear()) * 12 + (now.getMonth() - debut.getMonth()) + 1);
    if (moisEcoules - (payesParContrat.get(c.id) || 0) >= 1) retards++;
  }

  const messages = await db.get(`
    SELECT COUNT(*) AS nb
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.bailleur_id = ? AND m.sender_id <> ? AND m.lu = 0
  `, [bailleurId, bailleurId]);

  const demandes = await db.get(`
    SELECT COUNT(*) AS nb FROM password_reset_requests r
    WHERE r.statut = 'en_attente'
      AND EXISTS (
        SELECT 1 FROM contracts c
        JOIN properties p ON c.property_id = p.id
        WHERE c.locataire_id = r.locataire_id AND p.bailleur_id = ?
      )
  `, [bailleurId]);

  const documents = await db.get(`
    SELECT COUNT(DISTINCT d.id) AS nb
    FROM documents d
    JOIN contracts c ON c.locataire_id = d.locataire_id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND d.statut = 'en_attente'
  `, [bailleurId]);

  const compteurs = {
    incidents: Number(incidents.nb),
    contrats: Number(contrats.nb),
    paiements: Number(paiements.nb),
    retards,
    messages: Number(messages.nb),
    demandes: Number(demandes.nb),
    documents: Number(documents.nb)
  };
  compteurs.total = compteurs.incidents + compteurs.contrats + compteurs.paiements
    + compteurs.retards + compteurs.messages + compteurs.demandes + compteurs.documents;
  return compteurs;
}

async function compter(userId, role) {
  if (role === "bailleur") return compterBailleur(userId);
  if (role === "locataire") return compterLocataire(userId);
  const user = await db.get("SELECT role FROM users WHERE id = ?", [userId]);
  if (!user) return { total: 0 };
  return user.role === "bailleur" ? compterBailleur(userId) : compterLocataire(userId);
}

module.exports = { compter };
