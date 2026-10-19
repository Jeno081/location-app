// ============================================
// files.js — Résolution sûre des fichiers stockés
// ============================================

const path = require("path");
const fs = require("fs");
const config = require("../config");

const PRIVATE_ROOT = path.join(__dirname, "..", "private");

/**
 * Les chemins en base commencent par /uploads/... ou /private/...
 * On les résout dans les dossiers configurés et on refuse toute sortie.
 */
function resolveStoredPath(stored) {
  if (!stored || typeof stored !== "string") return null;

  let absolute;
  if (stored.startsWith("/uploads/")) {
    absolute = path.resolve(config.UPLOAD_DIR, stored.slice("/uploads/".length));
  } else if (stored.startsWith("/private/")) {
    absolute = path.resolve(PRIVATE_ROOT, stored.slice("/private/".length));
  } else {
    return null;
  }

  const autorise = absolute.startsWith(path.resolve(config.UPLOAD_DIR) + path.sep)
    || absolute.startsWith(path.resolve(PRIVATE_ROOT) + path.sep);

  if (!autorise || !fs.existsSync(absolute)) return null;
  return absolute;
}

module.exports = { resolveStoredPath };
