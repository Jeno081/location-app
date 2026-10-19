// ============================================
// app.js — Application Express
// ============================================

const express = require("express");
const path = require("path");
const config = require("./config");
const { runMigrations } = require("./database/migrate");
const { securityHeaders, createRateLimiter, apiNotFound, errorHandler } = require("./middleware/security");

runMigrations();

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
app.use("/uploads", express.static(config.UPLOAD_DIR, {
  maxAge: config.IS_PRODUCTION ? "1h" : 0,
  setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff")
}));

app.use(express.static(config.FRONTEND_DIR, {
  maxAge: config.IS_PRODUCTION ? "1h" : 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
  }
}));

app.get("/api/health", (req, res) => {
  try {
    const db = require("./database/db");
    db.prepare("SELECT 1").get();
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

app.use("/api", apiNotFound);
app.use(errorHandler);

module.exports = app;
