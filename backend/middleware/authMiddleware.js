// ============================================
// authMiddleware.js — Protection des routes privées
// ============================================

const jwt = require("jsonwebtoken");
const db = require("../database/db");
const config = require("../config");

const PASSWORD_CHANGE_ALLOWED = new Set([
  "/api/users/changer-mot-de-passe",
  "/api/users/profil",
  "/api/auth/logout",
  "/api/auth/me"
]);

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      token_version: Number(user.token_version) || 0
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

exports.signToken = signToken;

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Authentification requise" });

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Format de token invalide" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Session expirée ou token invalide" });
  }

  // On recharge l'utilisateur : un token révoqué (mot de passe changé,
  // compte supprimé) ne doit plus fonctionner.
  const user = db.prepare(`
    SELECT id, nom, email, role, token_version, doit_changer_mot_de_passe
    FROM users WHERE id = ?
  `).get(decoded.id);

  if (!user) return res.status(401).json({ message: "Compte introuvable" });
  if ((Number(user.token_version) || 0) !== (Number(decoded.token_version) || 0)) {
    return res.status(401).json({ message: "Session expirée", code: "TOKEN_REVOKED" });
  }

  req.user = user;

  // Un locataire créé par le bailleur doit changer son mot de passe temporaire
  // avant d'accéder au reste de l'application (pas seulement côté client).
  if (user.doit_changer_mot_de_passe) {
    const chemin = (req.originalUrl || "").split("?")[0];
    if (!PASSWORD_CHANGE_ALLOWED.has(chemin)) {
      return res.status(403).json({
        message: "Vous devez changer votre mot de passe temporaire.",
        code: "PASSWORD_CHANGE_REQUIRED"
      });
    }
  }

  next();
};

exports.requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ message: "Accès refusé : rôle insuffisant" });
  }
  next();
};
