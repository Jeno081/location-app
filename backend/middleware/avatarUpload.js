// ============================================
// avatarUpload.js — Photos de profil (publiques)
// ============================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const config = require("../config");

fs.mkdirSync(config.AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext) && /^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error("Seules les images JPG, PNG et WEBP sont autorisées"));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});
