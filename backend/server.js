// ============================================
// server.js — Démarrage et arrêt propre
// ============================================

const config = require("./config");
const app = require("./app");
const db = require("./database/db");

const server = app.listen(config.PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

function shutdown(signal) {
  console.log(`\n${signal} reçu, arrêt en cours...`);
  server.close(() => {
    try { db.close(); } catch (err) { /* déjà fermée */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
