// ============================================
// app.js — Application Express
// ============================================

const express = require("express");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const db = require("./database/db");
const { securityHeaders, createRateLimiter, apiNotFound, errorHandler } = require("./middleware/security");

// Les fichiers envoyés sont stockés dans UPLOAD_DIR (disque persistant ou volume).
fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
fs.mkdirSync(config.DOCUMENT_DIR, { recursive: true });
fs.mkdirSync(config.AVATAR_DIR, { recursive: true });

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", config.IS_PRODUCTION ? 1 : false);

app.use(securityHeaders);
app.use(express.json({ limit: "1mb" }));

// Fichiers publics : photos de logement et avatars.
// Les documents (pièces d'identité, preuves de paiement) passent par /api/.../file.
app.use("/uploads/documents", (req, res) => {
  res.status(404).json({ message: "Document protégé. Utilisez l'interface de l'application." });
});

// Les fichiers sont stockés en base (table `files`) pour survivre aux
// redéploiements Render ; le disque local reste un repli pour le développement.
app.use("/uploads", async (req, res, next) => {
  try {
    const stored = "/uploads" + req.path;
    const row = await db.get("SELECT mime, donnees FROM files WHERE path = ?", [stored]);
    if (row) {
      res.setHeader("Content-Type", row.mime);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", config.IS_PRODUCTION ? "public, max-age=86400" : "no-cache");
      return res.send(row.donnees);
    }
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/uploads", express.static(config.UPLOAD_DIR, {
  maxAge: config.IS_PRODUCTION ? "1h" : 0,
  setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff")
}));

app.use(express.static(config.FRONTEND_DIR, {
  maxAge: config.IS_PRODUCTION ? "1h" : 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    if (filePath.endsWith("sw.js") || filePath.endsWith("manifest.json")) {
      res.setHeader("Cache-Control", "no-cache");
    }
  }
}));

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", version: require("./package.json").version });
  } catch (err) {
    res.status(503).json({ status: "error" });
  }
});

app.get("/api", (req, res) => {
  res.json({ message: "API Location App opérationnelle" });
});

// Limitation de la force brute sur l'authentification.
app.use("/api/auth/login", createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }));
app.use("/api/auth/register", createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }));
app.use("/api/auth/forgot-password", createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }));

app.use("/api/auth", require("./routes/api/auth"));
app.use("/api/users", require("./routes/api/users"));
app.use("/api/properties", require("./routes/api/properties"));
app.use("/api/incidents", require("./routes/api/incidents"));
app.use("/api/contracts", require("./routes/api/contracts"));
app.use("/api/payments", require("./routes/api/payments"));
app.use("/api/history", require("./routes/api/history"));
app.use("/api/notifications", require("./routes/api/notifications"));
app.use("/api/charts", require("./routes/api/charts"));
app.use("/api/calendar", require("./routes/api/calendar"));
app.use("/api/documents", require("./routes/api/documents"));
app.use("/api/announcements", require("./routes/api/announcements"));
app.use("/api/conversations", require("./routes/api/conversations"));
app.use("/api/push", require("./routes/api/push"));

app.use("/api", apiNotFound);
app.use(errorHandler);

module.exports = app;
