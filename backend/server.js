// ============================================
// server.js — Démarrage et arrêt propre
// ============================================

const config = require("./config");
const app = require("./app");
const db = require("./database/db");
const { runMigrations } = require("./database/migrate");

let server;

const STARTUP_ATTEMPTS = 8;
const STARTUP_DELAY_MS = 5000;

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function preparerBase() {
  let derniereErreur;
  for (let tentative = 1; tentative <= STARTUP_ATTEMPTS; tentative++) {
    try {
      await runMigrations();
      if (tentative > 1) console.log("[server] base de données de nouveau disponible");
      return;
    } catch (err) {
      derniereErreur = err;
      console.error(`[server] base indisponible (${tentative}/${STARTUP_ATTEMPTS}) : ${err.code || err.message}`);
      if (tentative < STARTUP_ATTEMPTS) await attendre(STARTUP_DELAY_MS);
    }
  }
  throw derniereErreur;
}

async function start() {
  await preparerBase();
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
