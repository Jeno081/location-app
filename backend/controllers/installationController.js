// ============================================
// installationController.js — État public d'installation
// ============================================

const installationService = require("../services/installationService");

exports.status = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(await installationService.statutPublic());
};
