// ============================================
// pushController.js — Abonnements aux notifications
// ============================================

const db = require("../database/db");
const pushService = require("../services/pushService");

exports.subscribe = async (req, res) => {
  const token = String(req.body.token || "").trim();
  const platform = String(req.body.platform || "web").slice(0, 30);
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 255);

  if (token.length < 20 || token.length > 512) {
    return res.status(400).json({ message: "Jeton de notification invalide." });
  }

  await db.run(`
    INSERT INTO push_subscriptions (user_id, token, platform, user_agent)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      platform = VALUES(platform),
      user_agent = VALUES(user_agent),
      date_maj = CURRENT_TIMESTAMP
  `, [req.user.id, token, platform, userAgent || null]);

  res.status(201).json({ message: "Notifications activées." });
};

exports.unsubscribe = async (req, res) => {
  const token = String(req.body.token || "").trim();
  if (!token) return res.status(400).json({ message: "Jeton manquant." });

  await db.run(
    "DELETE FROM push_subscriptions WHERE token = ? AND user_id = ?",
    [token, req.user.id]
  );
  res.json({ message: "Notifications désactivées." });
};

exports.health = async (req, res) => {
  const status = await pushService.getStatus(null);
  res.json({
    configured: status.configured,
    initialized: status.initialized,
    projectId: status.projectId,
    error: status.error ? "Firebase initialization failed" : null
  });
};

exports.status = async (req, res) => {
  res.json(await pushService.getStatus(req.user.id));
};

exports.test = async (req, res) => {
  const destination = req.user.role === "bailleur"
    ? "/bailleur.html#messages"
    : "/locataire.html#messages";

  const envoyes = await pushService.sendToUser(req.user.id, {
    title: "Location App",
    body: "Les notifications fonctionnent. Vous recevrez désormais les nouveautés ici.",
    url: destination,
    tag: "test-notification",
    type: "test"
  });
  const diagnostic = await pushService.getStatus(req.user.id);

  res.json({
    message: envoyes > 0
      ? "Notification de test envoyée."
      : "Aucune notification envoyée. Vérifiez la configuration Firebase et l'abonnement de cet appareil.",
    sent: envoyes,
    diagnostic
  });
};
