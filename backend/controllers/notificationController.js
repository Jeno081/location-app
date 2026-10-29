// ============================================
// notificationController.js — Badges de notification
// ============================================

const badgeService = require("../services/badgeService");

exports.getNotificationsLocataire = async (req, res) => {
  res.json(await badgeService.compter(req.user.id, "locataire"));
};

exports.getNotificationsBailleur = async (req, res) => {
  res.json(await badgeService.compter(req.user.id, "bailleur"));
};
