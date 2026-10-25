// ============================================
// conversationController.js — Demandes et messagerie
// ============================================

const db = require("../database/db");
const pushService = require("../services/pushService");

async function chargerConversation(id, user) {
  const conversation = await db.get(`
    SELECT c.*, b.nom AS bailleur_nom, l.nom AS locataire_nom
    FROM conversations c
    JOIN users b ON b.id = c.bailleur_id
    JOIN users l ON l.id = c.locataire_id
    WHERE c.id = ?
  `, [id]);

  if (!conversation) return { error: 404 };
  const autorise = (user.role === "bailleur" && conversation.bailleur_id === user.id)
    || (user.role === "locataire" && conversation.locataire_id === user.id);
  return autorise ? { conversation } : { error: 403 };
}

exports.getConversations = async (req, res) => {
  const filtre = req.user.role === "bailleur" ? "c.bailleur_id = ?" : "c.locataire_id = ?";

  const conversations = await db.all(`
    SELECT c.*,
           b.nom AS bailleur_nom,
           l.nom AS locataire_nom,
           (SELECT m.contenu FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS dernier_message,
           (SELECT m.date_envoi FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS derniere_date,
           (SELECT COUNT(*) FROM messages m
             WHERE m.conversation_id = c.id AND m.sender_id <> ? AND m.lu = 0) AS non_lus
    FROM conversations c
    JOIN users b ON b.id = c.bailleur_id
    JOIN users l ON l.id = c.locataire_id
    WHERE ${filtre}
    ORDER BY c.date_maj DESC, c.id DESC
  `, [req.user.id, req.user.id]);

  res.json({ conversations });
};

exports.createConversation = async (req, res) => {
  if (req.user.role !== "locataire") {
    return res.status(403).json({ message: "Seul un locataire peut créer une demande." });
  }

  const sujet = String(req.body.sujet || "").trim();
  const message = String(req.body.message || "").trim();
  if (!sujet || !message) {
    return res.status(400).json({ message: "Le sujet et le message sont obligatoires." });
  }
  if (sujet.length > 150) return res.status(400).json({ message: "Sujet trop long (150 caractères max)." });
  if (message.length > 5000) return res.status(400).json({ message: "Message trop long (5000 caractères max)." });

  const lien = await db.get(`
    SELECT p.bailleur_id
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ?
    ORDER BY (c.statut = 'actif') DESC, c.id DESC
    LIMIT 1
  `, [req.user.id]);
  if (!lien) return res.status(400).json({ message: "Aucun bailleur associé à votre compte." });

  const conversationId = await db.transaction(async (tx) => {
    const result = await tx.run(`
      INSERT INTO conversations (bailleur_id, locataire_id, sujet) VALUES (?, ?, ?)
    `, [lien.bailleur_id, req.user.id, sujet]);
    await tx.run(`
      INSERT INTO messages (conversation_id, sender_id, contenu) VALUES (?, ?, ?)
    `, [result.insertId, req.user.id, message]);
    return result.insertId;
  });

  res.status(201).json({ message: "Demande envoyée.", conversationId });

  pushService.sendToUser(lien.bailleur_id, {
    title: "Nouvelle demande",
    body: `${req.user.nom || "Un locataire"} : ${sujet}`,
    url: "/bailleur.html#messages",
    tag: `conversation-${conversationId}`,
    type: "conversation"
  }).catch((err) => console.warn("[push] demande :", err.message));
};

exports.getConversation = async (req, res) => {
  const { conversation, error } = await chargerConversation(req.params.id, req.user);
  if (error) return res.status(error).json({ message: error === 404 ? "Conversation introuvable" : "Non autorisé" });

  const messages = await db.all(`
    SELECT m.*, u.nom AS sender_nom
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ?
    ORDER BY m.id ASC
  `, [conversation.id]);

  await db.run(`
    UPDATE messages SET lu = 1
    WHERE conversation_id = ? AND sender_id <> ? AND lu = 0
  `, [conversation.id, req.user.id]);

  res.json({ conversation, messages });
};

exports.sendMessage = async (req, res) => {
  const { conversation, error } = await chargerConversation(req.params.id, req.user);
  if (error) return res.status(error).json({ message: error === 404 ? "Conversation introuvable" : "Non autorisé" });

  const contenu = String(req.body.contenu || "").trim();
  if (!contenu) return res.status(400).json({ message: "Le message est vide." });
  if (contenu.length > 5000) return res.status(400).json({ message: "Message trop long (5000 caractères max)." });

  const message = await db.transaction(async (tx) => {
    const result = await tx.run(`
      INSERT INTO messages (conversation_id, sender_id, contenu) VALUES (?, ?, ?)
    `, [conversation.id, req.user.id, contenu]);
    await tx.run("UPDATE conversations SET date_maj = CURRENT_TIMESTAMP WHERE id = ?", [conversation.id]);
    return tx.get(`
      SELECT m.*, u.nom AS sender_nom FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?
    `, [result.insertId]);
  });

  res.status(201).json({ message: "Message envoyé.", data: message });

  const destinataire = req.user.role === "bailleur"
    ? conversation.locataire_id
    : conversation.bailleur_id;
  const url = req.user.role === "bailleur"
    ? "/locataire.html#messages"
    : "/bailleur.html#messages";

  pushService.sendToUser(destinataire, {
    title: "Nouveau message",
    body: `${req.user.nom || "Location App"} : ${contenu.slice(0, 120)}`,
    url,
    tag: `conversation-${conversation.id}`,
    type: "message"
  }).catch((err) => console.warn("[push] message :", err.message));
};

exports.updateConversationStatus = async (req, res) => {
  const { statut } = req.body;
  if (!["ouvert", "traite", "refuse"].includes(statut)) {
    return res.status(400).json({ message: "Statut invalide." });
  }

  const { conversation, error } = await chargerConversation(req.params.id, req.user);
  if (error) return res.status(error).json({ message: error === 404 ? "Conversation introuvable" : "Non autorisé" });
  if (req.user.role !== "bailleur") {
    return res.status(403).json({ message: "Seul le bailleur peut changer le statut." });
  }

  await db.run("UPDATE conversations SET statut = ?, date_maj = CURRENT_TIMESTAMP WHERE id = ?", [statut, conversation.id]);
  res.json({ message: "Statut mis à jour", statut });
};
