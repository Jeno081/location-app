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

// --- Base de données MySQL -------------------------------------------------
// Compatible avec les variables fournies par l'add-on MySQL de Clever Cloud
// (MYSQL_ADDON_*) et avec une configuration générique DB_* sur Render.
function parseDatabaseUri(uri) {
  const url = new URL(uri);
  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    name: url.pathname.replace(/^\//, "")
  };
}

const databaseUri = process.env.DB_URI || process.env.MYSQL_ADDON_URI || process.env.DATABASE_URL || "";
const fromUri = databaseUri ? parseDatabaseUri(databaseUri) : null;

const DB_HOST = process.env.DB_HOST || process.env.MYSQL_ADDON_HOST || (fromUri && fromUri.host) || "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT || process.env.MYSQL_ADDON_PORT || (fromUri && fromUri.port) || 3306);
const DB_USER = process.env.DB_USER || process.env.MYSQL_ADDON_USER || (fromUri && fromUri.user) || "root";
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined
  ? process.env.DB_PASSWORD
  : process.env.MYSQL_ADDON_PASSWORD !== undefined
    ? process.env.MYSQL_ADDON_PASSWORD
    : (fromUri && fromUri.password) || "";
const DB_NAME = process.env.DB_NAME || process.env.MYSQL_ADDON_DB || (fromUri && fromUri.name) || "location_app";
const DB_SSL = String(process.env.DB_SSL || "").toLowerCase() === "true";
const DB_SSL_CA = process.env.DB_SSL_CA || null;
// Clever Cloud DEV limite l'utilisateur à 5 connexions : 2 par instance
// laisse de la marge pendant les déploiements Render (ancienne + nouvelle).
const DB_POOL_SIZE = Number(process.env.DB_POOL_SIZE) || 2;

const PORT = Number(process.env.PORT) || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "uploads");

module.exports = {
  NODE_ENV,
  IS_PRODUCTION,
  PORT,
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_SSL,
  DB_SSL_CA,
  DB_POOL_SIZE,
  UPLOAD_DIR,
  DOCUMENT_DIR: path.join(UPLOAD_DIR, "documents"),
  AVATAR_DIR: path.join(UPLOAD_DIR, "avatars"),
  FRONTEND_DIR: path.join(__dirname, "..", "frontend"),
  MAX_UPLOAD_BYTES: 10 * 1024 * 1024
};
