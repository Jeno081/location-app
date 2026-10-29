// ============================================
// announcementController.js — Annonces du bailleur
// ============================================

const db = require("../database/db");
const pushService = require("../services/pushService");

async function bailleurDuLocataire(locataireId) {
  const row = await db.get(`
    SELECT p.bailleur_id
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ?
    ORDER BY (c.statut = 'actif') DESC, c.id DESC
    LIMIT 1
  `, [locataireId]);
  return row ? row.bailleur_id : null;
}

exports.createAnnouncement = async (req, res) => {
  const bailleur_id = req.user.id;
  const titre = String(req.body.titre || "").trim();
  const message = String(req.body.message || "").trim();
  const audience = req.body.audience === "selection" ? "selection" : "tous";

  if (!titre || !message) {
    return res.status(400).json({ message: "Le titre et le message sont obligatoires." });
  }
  if (titre.length > 150) return res.status(400).json({ message: "Titre trop long (150 caractères max)." });
  if (message.length > 5000) return res.status(400).json({ message: "Message trop long (5000 caractères max)." });

  let destinataires = [];
  if (audience === "selection") {
    const demandes = Array.isArray(req.body.locataire_ids)
      ? [...new Set(req.body.locataire_ids.map(Number).filter(Number.isInteger))]
      : [];
    if (demandes.length === 0) {
      return res.status(400).json({ message: "Sélectionnez au moins un locataire." });
    }
    const placeholders = demandes.map(() => "?").join(",");
    const valides = await db.all(`
      SELECT DISTINCT c.locataire_id
      FROM contracts c
      JOIN properties p ON c.property_id = p.id
      WHERE p.bailleur_id = ? AND c.locataire_id IN (${placeholders})
    `, [bailleur_id, ...demandes]);
    destinataires = valides.map((row) => row.locataire_id);
    if (destinataires.length !== demandes.length) {
      return res.status(400).json({ message: "Un des locataires sélectionnés est invalide." });
    }
  }

  const announcementId = await db.transaction(async (tx) => {
    const result = await tx.run(`
      INSERT INTO announcements (bailleur_id, titre, message, audience) VALUES (?, ?, ?, ?)
    `, [bailleur_id, titre, message, audience]);
    for (const locataireId of destinataires) {
      await tx.run(`
        INSERT INTO announcement_recipients (announcement_id, locataire_id) VALUES (?, ?)
      `, [result.insertId, locataireId]);
    }
    return result.insertId;
  });

  res.status(201).json({
    message: audience === "tous" ? "Annonce envoyée à tous les locataires." : "Annonce envoyée.",
    announcementId,
    destinataires: destinataires.length
  });

  try {
    let cibles = destinataires;
    if (audience === "tous") {
      const lignes = await db.all(`
        SELECT DISTINCT c.locataire_id
        FROM contracts c
        JOIN properties p ON c.property_id = p.id
        WHERE p.bailleur_id = ?
      `, [bailleur_id]);
      cibles = lignes.map((ligne) => ligne.locataire_id);
    }

    pushService.sendToUsers(cibles, {
      title: "Nouvelle annonce",
      body: titre,
      url: "/locataire.html#annonces",
      tag: `annonce-${announcementId}`,
      type: "announcement"
    }).catch((err) => console.warn("[push] annonce :", err.message));
  } catch (err) {
    console.warn("[push] annonce :", err.message);
  }
};

exports.getAnnouncements = async (req, res) => {
  if (req.user.role === "bailleur") {
    const annonces = await db.all(`
      SELECT * FROM announcements WHERE bailleur_id = ? ORDER BY date_creation DESC, id DESC
    `, [req.user.id]);

    const recipients = await db.all(`
      SELECT ar.announcement_id, u.id, u.nom
      FROM announcement_recipients ar
      JOIN users u ON u.id = ar.locataire_id
      JOIN announcements a ON a.id = ar.announcement_id
      WHERE a.bailleur_id = ?
      ORDER BY u.nom
    `, [req.user.id]);

    const parAnnonce = new Map();
    for (const recipient of recipients) {
      if (!parAnnonce.has(recipient.announcement_id)) parAnnonce.set(recipient.announcement_id, []);
      parAnnonce.get(recipient.announcement_id).push(recipient.nom);
    }

    return res.json({
      announcements: annonces.map((a) => ({
        ...a,
        destinataires: a.audience === "tous" ? ["Tous les locataires"] : (parAnnonce.get(a.id) || [])
      }))
    });
  }

  const bailleurId = await bailleurDuLocataire(req.user.id);
  if (!bailleurId) return res.json({ announcements: [] });

  const annonces = await db.all(`
    SELECT a.*, b.nom AS bailleur_nom,
      EXISTS (
        SELECT 1 FROM announcement_reads ar
        WHERE ar.announcement_id = a.id AND ar.user_id = ?
      ) AS lu
    FROM announcements a
    JOIN users b ON b.id = a.bailleur_id
    WHERE a.bailleur_id = ?
      AND (
        a.audience = 'tous'
        OR EXISTS (
          SELECT 1 FROM announcement_recipients ar
          WHERE ar.announcement_id = a.id AND ar.locataire_id = ?
        )
      )
    ORDER BY a.date_creation DESC, a.id DESC
  `, [req.user.id, bailleurId, req.user.id]);

  res.json({ announcements: annonces });
};

exports.marquerAnnoncesLues = async (req, res) => {
  if (req.user.role !== "locataire") {
    return res.status(403).json({ message: "Non autorisé" });
  }

  const bailleurId = await bailleurDuLocataire(req.user.id);
  if (!bailleurId) return res.json({ message: "Aucune annonce à marquer.", count: 0 });

  const result = await db.run(`
    INSERT IGNORE INTO announcement_reads (announcement_id, user_id)
    SELECT a.id, ?
    FROM announcements a
    WHERE a.bailleur_id = ?
      AND (
        a.audience = 'tous'
        OR EXISTS (
          SELECT 1 FROM announcement_recipients ar
          WHERE ar.announcement_id = a.id AND ar.locataire_id = ?
        )
      )
  `, [req.user.id, bailleurId, req.user.id]);

  res.json({ message: "Annonces marquées comme lues.", count: result.affectedRows || 0 });
};
