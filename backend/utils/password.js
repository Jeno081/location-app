// ============================================
// password.js — Génération de mots de passe temporaires
// ============================================

const crypto = require("crypto");

function genererMotDePasse() {
  // 23 caractères, toujours au moins une lettre et un chiffre.
  return `Lk${crypto.randomInt(10)}${crypto.randomBytes(10).toString("hex")}`;
}

module.exports = { genererMotDePasse };
