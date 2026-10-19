// ============================================
// config.js — Configuration centralisée
// ============================================

const fs = require("fs");
const path = require("path");

// Petit chargeur .env maison : évite une dépendance supplémentaire.
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Racine du projet puis dossier backend (le second ne écrase pas le premier).
loadEnvFile(path.join(__dirname, "..", ".env"));
loadEnvFile(path.join(__dirname, ".env"));

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

const DEV_SECRET = "location-app-dev-secret-change-me-in-production";
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;

if (IS_PRODUCTION && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error("JWT_SECRET doit être défini avec au moins 32 caractères en production.");
}
if (!IS_PRODUCTION && !process.env.JWT_SECRET) {
  console.warn("[config] JWT_SECRET non défini : utilisation d'un secret de développement.");
}

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, "database", "location.sqlite");
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "uploads");

module.exports = {
  NODE_ENV,
  IS_PRODUCTION,
  PORT,
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  DB_PATH,
  UPLOAD_DIR,
  DOCUMENT_DIR: path.join(UPLOAD_DIR, "documents"),
  AVATAR_DIR: path.join(UPLOAD_DIR, "avatars"),
  FRONTEND_DIR: path.join(__dirname, "..", "frontend"),
  MAX_UPLOAD_BYTES: 10 * 1024 * 1024
};
