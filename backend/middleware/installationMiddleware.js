// ============================================
// installationMiddleware.js — Verrou d'installation
// ============================================

const config = require("../config");
const installationService = require("../services/installationService");

const API_PUBLIQUES = new Set([
  "/install/status",
  "/health",
  "/config",
  "/auth/bailleur-existe"
]);

const PAGES_APPLICATION = new Set([
  "/",
  "/index.html",
  "/login.html",
  "/register.html",
  "/bailleur.html",
  "/locataire.html",
  "/profil.html",
  "/changer-mot-de-passe.html"
]);

async function apiInstallationGate(req, res, next) {
  if (API_PUBLIQUES.has(req.path)) return next();

  // En développement/test uniquement, l'inscription initiale reste possible
  // pour les tests locaux. En production, seul `npm run seed` installe l'app.
  if (!config.IS_PRODUCTION && req.path === "/auth/register") return next();

  const etat = await installationService.etatInstallation();
  if (etat.installed) return next();

  return res.status(503).json({
    message: "Cette instance n'est pas encore installée. Lancez npm run seed.",
    code: "NOT_INSTALLED"
  });
}

async function pageInstallationGate(req, res, next) {
  if (req.method !== "GET" || !PAGES_APPLICATION.has(req.path)) return next();

  const etat = await installationService.etatInstallation();
  if (etat.installed) return next();

  return res.redirect("/install.html");
}

module.exports = { apiInstallationGate, pageInstallationGate };
