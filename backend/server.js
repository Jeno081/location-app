// ============================================
// server.js — Démarrage et arrêt propre
// ============================================

const config = require("./config");
const app = require("./app");
const db = require("./database/db");
const { runMigrations } = require("./database/migrate");

let server;

async function start() {
  await runMigrations();
  server = app.listen(config.PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${config.PORT} (${config.NODE_ENV})`);
  });
}

start().catch((err) => {
  console.error("[server] démarrage impossible :", err.message);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`\n${signal} reçu, arrêt en cours...`);
  const done = () => db.close().finally(() => process.exit(0));
  if (server) server.close(done);
  else done();
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
