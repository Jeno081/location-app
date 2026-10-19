// ============================================
// documentUpload.js — Documents privés
// ============================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const config = require("../config");

fs.mkdirSync(config.DOCUMENT_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.DOCUMENT_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|pdf/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  if (allowed.test(ext) && (/^image\/(jpeg|png|webp)$/.test(mime) || mime === "application/pdf")) {
    return cb(null, true);
  }
  cb(new Error("Seuls les fichiers JPG, PNG, WEBP et PDF sont autorisés"));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.MAX_UPLOAD_BYTES }
});
