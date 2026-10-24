// ============================================
// incidentUpload.js — Photos et vidéos de signalement
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

const IMAGE_EXT = /jpeg|jpg|png|webp/;
const VIDEO_EXT = /mp4|webm|mov|m4v/;

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  const mime = file.mimetype || "";
  const image = IMAGE_EXT.test(ext) && /^image\/(jpeg|png|webp)$/.test(mime);
  const video = VIDEO_EXT.test(ext) && /^video\/(mp4|webm|quicktime|x-m4v)$/.test(mime);
  if (image || video) return cb(null, true);
  cb(new Error("Formats acceptés : JPG, PNG, WEBP, MP4, WEBM, MOV (5 fichiers maximum)"));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024, files: 5 }
});
