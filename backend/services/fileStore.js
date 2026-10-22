// ============================================
// fileStore.js — Stockage persistant des fichiers en MySQL
// ============================================
//
// Render (plan gratuit) ne conserve pas son disque entre deux déploiements.
// Les fichiers envoyés sont donc enregistrés dans la table `files` et servis
// depuis la base, ce qui garantit leur persistance.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const db = require("../database/db");
const config = require("../config");

function publicPath(absolutePath) {
  const relative = path.relative(config.UPLOAD_DIR, absolutePath).split(path.sep).join("/");
  return "/uploads/" + relative;
}

async function compressImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype || "")) return null;
  try {
    const image = sharp(file.path, { failOn: "none" }).rotate();
    const metadata = await image.metadata();
    const resized = image.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
    if (metadata.hasAlpha) {
      return { buffer: await resized.webp({ quality: 82 }).toBuffer(), mime: "image/webp" };
    }
    return { buffer: await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer(), mime: "image/jpeg" };
  } catch (err) {
    console.warn("[files] compression impossible :", err.message);
    return null;
  }
}

async function persistFile(file) {
  if (!file || !file.path) return null;
  const stored = publicPath(file.path);

  let buffer = await fs.promises.readFile(file.path);
  let mime = file.mimetype || "application/octet-stream";

  const compressed = await compressImage(file);
  if (compressed) {
    buffer = compressed.buffer;
    mime = compressed.mime;
  }

  await db.run(`
    REPLACE INTO files (path, mime, taille, donnees) VALUES (?, ?, ?, ?)
  `, [stored, mime, buffer.length, buffer]);

  await fs.promises.unlink(file.path).catch(() => {});
  return stored;
}

// Middleware à placer après multer : enregistre les fichiers en base.
async function persistUploads(req, res, next) {
  try {
    const files = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...req.files);
    else if (req.files && typeof req.files === "object") {
      for (const values of Object.values(req.files)) files.push(...values);
    }
    for (const file of files) await persistFile(file);
    next();
  } catch (err) {
    next(err);
  }
}

function safeStoredPath(stored) {
  if (!stored || typeof stored !== "string") return null;
  if (!stored.startsWith("/uploads/")) return null;
  const absolute = path.resolve(config.UPLOAD_DIR, stored.slice("/uploads/".length));
  const root = path.resolve(config.UPLOAD_DIR) + path.sep;
  return absolute.startsWith(root) ? absolute : null;
}

// Envoie un fichier stocké (base d'abord, disque local ensuite).
async function sendStoredFile(res, stored, options = {}) {
  if (!stored) return false;
  const row = await db.get("SELECT mime, donnees FROM files WHERE path = ?", [stored]);
  if (row) {
    res.setHeader("Content-Type", row.mime);
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (options.download) {
      res.setHeader("Content-Disposition", `attachment; filename="${options.download}"`);
    } else if (options.inlineName) {
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(options.inlineName)}"`);
    }
    res.send(row.donnees);
    return true;
  }

  // Anciens fichiers encore présents sur le disque (développement local).
  const absolute = safeStoredPath(stored);
  if (absolute && fs.existsSync(absolute)) {
    if (options.download) {
      res.download(absolute, options.download);
    } else if (options.inlineName) {
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(options.inlineName)}"`);
      res.sendFile(absolute);
    } else {
      res.sendFile(absolute);
    }
    return true;
  }
  return false;
}

async function deleteStoredFiles(paths) {
  for (const stored of paths) {
    if (!stored || typeof stored !== "string") continue;
    try {
      await db.run("DELETE FROM files WHERE path = ?", [stored]);
      const absolute = safeStoredPath(stored);
      if (absolute && fs.existsSync(absolute)) fs.unlinkSync(absolute);
    } catch (err) {
      console.warn("[files] suppression impossible :", stored, err.message);
    }
  }
}

async function persistLocalFile(absolutePath, mime) {
  if (!absolutePath || !fs.existsSync(absolutePath)) return null;
  const stored = publicPath(absolutePath);
  const buffer = await fs.promises.readFile(absolutePath);
  await db.run(`
    REPLACE INTO files (path, mime, taille, donnees) VALUES (?, ?, ?, ?)
  `, [stored, mime || "application/octet-stream", buffer.length, buffer]);
  return stored;
}

module.exports = {
  persistUploads,
  persistFile,
  persistLocalFile,
  sendStoredFile,
  deleteStoredFiles,
  publicPath
};
