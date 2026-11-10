// ============================================
// cloudinaryDriver.js — Médias publics sur Cloudinary
// ============================================
//
// Seuls les médias publics passent par ce driver : photos de logement,
// avatars et photos/vidéos de signalement. Les documents sensibles restent
// dans MySQL via fileStore.persistUploads.

const cloudinary = require("cloudinary").v2;
const config = require("../../config");

const configure = config.CLOUDINARY_CONFIGURE;

if (configure) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true
  });
}

function estConfigure() {
  return configure;
}

function dossierPour(category) {
  const base = String(config.CLOUDINARY_FOLDER || "location-app").replace(/^\/+|\/+$/g, "");
  const sousDossier = String(category || "public").replace(/^\/+|\/+$/g, "");
  return `${base}/${sousDossier}`;
}

async function envoyerFichier(file, category) {
  if (!configure) throw new Error("Cloudinary n'est pas configuré.");
  if (!file || !file.path) throw new Error("Fichier local introuvable pour Cloudinary.");

  const options = {
    folder: dossierPour(category),
    resource_type: "auto",
    type: "upload",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    timeout: 120000
  };
  if (String(file.mimetype || "").startsWith("video/")) options.format = "mp4";

  const resultat = await cloudinary.uploader.upload(file.path, options);

  if (!resultat || !resultat.secure_url) {
    throw new Error("Cloudinary n'a pas renvoyé d'URL sécurisée.");
  }
  return resultat;
}

function analyserUrl(url) {
  if (!url || typeof url !== "string") return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    return null;
  }
  if (parsed.hostname !== "res.cloudinary.com") return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  // /<cloud>/<resource_type>/<delivery_type>/[...]/<public_id>.<ext>
  if (segments.length < 4) return null;
  const resourceType = segments[1];
  const deliveryType = segments[2];
  if (!["image", "video", "raw"].includes(resourceType)) return null;
  if (!["upload", "private", "authenticated"].includes(deliveryType)) return null;

  let reste = segments.slice(3);
  if (reste[0] && /^v\d+$/.test(reste[0])) reste = reste.slice(1);
  if (reste.length === 0) return null;
  const fichier = reste[reste.length - 1];
  const extension = fichier.includes(".") ? fichier.slice(fichier.lastIndexOf(".") + 1) : "";
  const publicId = [...reste.slice(0, -1), extension ? fichier.slice(0, -(extension.length + 1)) : fichier]
    .join("/");

  return { publicId, resourceType, deliveryType, format: extension };
}

function estUrlCloudinary(url) {
  return Boolean(analyserUrl(url));
}

async function supprimerFichier(url) {
  if (!configure) return false;
  const asset = analyserUrl(url);
  if (!asset) return false;
  try {
    await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType,
      type: asset.deliveryType,
      invalidate: true
    });
    return true;
  } catch (err) {
    console.warn("[cloudinary] suppression impossible :", asset.publicId, err.message);
    return false;
  }
}

module.exports = {
  estConfigure,
  envoyerFichier,
  analyserUrl,
  estUrlCloudinary,
  supprimerFichier,
  dossierPour
};
