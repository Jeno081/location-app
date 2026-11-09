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

// --- Identité de l'instance (branding par client) --------------------------
function texteEnv(nom, valeurParDefaut = "") {
  const valeur = process.env[nom];
  return valeur === undefined || valeur === "" ? valeurParDefaut : String(valeur).trim();
}

function couleurEnv(nom, valeurParDefaut) {
  const valeur = texteEnv(nom, valeurParDefaut);
  return /^#[0-9a-f]{6}$/i.test(valeur) ? valeur : valeurParDefaut;
}

function langueEnv() {
  return ["fr", "en"].includes(texteEnv("APP_DEFAULT_LANGUAGE", "fr"))
    ? texteEnv("APP_DEFAULT_LANGUAGE", "fr")
    : "fr";
}

const APP_NAME = texteEnv("APP_NAME", "Location App");
const APP_SHORT_NAME = texteEnv("APP_SHORT_NAME", APP_NAME);
const APP_COMPANY_NAME = texteEnv("APP_COMPANY_NAME", APP_NAME);
const APP_TAGLINE = texteEnv("APP_TAGLINE", "Gestion locative");
const APP_DESCRIPTION = texteEnv(
  "APP_DESCRIPTION",
  `${APP_NAME} — gérez vos biens, contrats, loyers et locataires depuis un espace unique.`
);
const APP_URL = texteEnv("APP_URL", "");
const CLIENT_SLUG = texteEnv("CLIENT_SLUG", "");
const APP_SUPPORT_EMAIL = texteEnv("APP_SUPPORT_EMAIL", "");
const APP_SUPPORT_PHONE = texteEnv("APP_SUPPORT_PHONE", "");
const APP_DEFAULT_LANGUAGE = langueEnv();
const APP_LOCALE = texteEnv("APP_LOCALE", "fr-FR");
const APP_CURRENCY = texteEnv("APP_CURRENCY", "USD");
const APP_CURRENCY_SYMBOL = texteEnv("APP_CURRENCY_SYMBOL", "$");
const APP_TIMEZONE = texteEnv("APP_TIMEZONE", "");

const APP_LOGO_URL = texteEnv("APP_LOGO_URL", "/icons/logo.png");
const APP_ICON_192_URL = texteEnv("APP_ICON_192_URL", "/icons/icon-192.png");
const APP_ICON_512_URL = texteEnv("APP_ICON_512_URL", "/icons/icon-512.png");
const APP_ICON_MASKABLE_URL = texteEnv("APP_ICON_MASKABLE_URL", "/icons/maskable-512.png");
const APP_APPLE_ICON_URL = texteEnv("APP_APPLE_ICON_URL", "/icons/apple-touch-icon.png");
const APP_FAVICON_URL = texteEnv("APP_FAVICON_URL", "/icons/favicon-32.png");

const APP_PRIMARY_COLOR = couleurEnv("APP_PRIMARY_COLOR", "#4f46e5");
const APP_ACCENT_COLOR = couleurEnv("APP_ACCENT_COLOR", "#14b8a6");
const APP_THEME_COLOR = couleurEnv("APP_THEME_COLOR", "#0b1220");
const APP_BACKGROUND_COLOR = couleurEnv("APP_BACKGROUND_COLOR", "#000000");

// Chaque client possède son propre projet Firebase. Les valeurs Web sont
// publiques ; le compte de service reste uniquement dans les variables privées.
const FIREBASE_WEB_API_KEY = texteEnv("FIREBASE_WEB_API_KEY", "");
const FIREBASE_WEB_AUTH_DOMAIN = texteEnv("FIREBASE_WEB_AUTH_DOMAIN", "");
const FIREBASE_WEB_PROJECT_ID = texteEnv("FIREBASE_WEB_PROJECT_ID", "");
const FIREBASE_WEB_STORAGE_BUCKET = texteEnv("FIREBASE_WEB_STORAGE_BUCKET", "");
const FIREBASE_WEB_MESSAGING_SENDER_ID = texteEnv("FIREBASE_WEB_MESSAGING_SENDER_ID", "");
const FIREBASE_WEB_APP_ID = texteEnv("FIREBASE_WEB_APP_ID", "");
const FIREBASE_VAPID_KEY = texteEnv("FIREBASE_VAPID_KEY", "");

if (APP_TIMEZONE) {
  process.env.TZ = APP_TIMEZONE;
}

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
  MAX_UPLOAD_BYTES: 10 * 1024 * 1024,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
  FIREBASE_PRIVATE_KEY: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "",
  FIREBASE_WEB_API_KEY,
  FIREBASE_WEB_AUTH_DOMAIN,
  FIREBASE_WEB_PROJECT_ID,
  FIREBASE_WEB_STORAGE_BUCKET,
  FIREBASE_WEB_MESSAGING_SENDER_ID,
  FIREBASE_WEB_APP_ID,
  FIREBASE_VAPID_KEY,
  APP_NAME,
  APP_SHORT_NAME,
  APP_COMPANY_NAME,
  APP_TAGLINE,
  APP_DESCRIPTION,
  APP_URL,
  CLIENT_SLUG,
  APP_SUPPORT_EMAIL,
  APP_SUPPORT_PHONE,
  APP_DEFAULT_LANGUAGE,
  APP_LOCALE,
  APP_CURRENCY,
  APP_CURRENCY_SYMBOL,
  APP_TIMEZONE,
  APP_LOGO_URL,
  APP_ICON_192_URL,
  APP_ICON_512_URL,
  APP_ICON_MASKABLE_URL,
  APP_APPLE_ICON_URL,
  APP_FAVICON_URL,
  APP_PRIMARY_COLOR,
  APP_ACCENT_COLOR,
  APP_THEME_COLOR,
  APP_BACKGROUND_COLOR
};
