// ============================================
// documentUpload.js
// ============================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const dossier = path.join(__dirname, "../uploads/documents");
if (!fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dossier),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, unique);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|pdf/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (allowed.test(ext) && (mime.startsWith("image/") || mime === "application/pdf")) {
    cb(null, true);
  } else {
    cb(new Error("Seuls les fichiers JPG, PNG, WEBP et PDF sont autorises"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = upload;