// ============================================
// authMiddleware.js — Protège les routes privées
// ============================================

const jwt = require("jsonwebtoken");
const JWT_SECRET = "ma_cle_secrete_a_changer_plus_tard";

exports.verifyToken = (req, res, next) => {
  // 1. Récupérer l'en-tête Authorization
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(403).json({ message: "Aucun token fourni" });
  }

  // Le format attendu : "Bearer xxxxxx"
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "Format de token invalide" });
  }

  // 2. Vérifier le token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // On attache les infos utilisateur à la requête
    next(); // On laisse passer la requête
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expire" });
  }
};

// Vérifier le rôle (ex: seul un bailleur peut créer un logement)
exports.requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Acces refuse : role insuffisant" });
    }
    next();
  };
};