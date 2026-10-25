// ============================================
// pushService.js — Notifications Web Push via FCM
// ============================================

const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const db = require("../database/db");
const config = require("../config");

let firebaseApp = null;
let initTried = false;
let warningShown = false;

function chargerCompteService() {
  if (config.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const raw = config.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(json);
  }
  if (config.FIREBASE_PROJECT_ID && config.FIREBASE_CLIENT_EMAIL && config.FIREBASE_PRIVATE_KEY) {
    return {
      project_id: config.FIREBASE_PROJECT_ID,
      client_email: config.FIREBASE_CLIENT_EMAIL,
      private_key: config.FIREBASE_PRIVATE_KEY
    };
  }
  return null;
}

function initialiser() {
  if (firebaseApp) return firebaseApp;
  if (initTried) return null;
  initTried = true;

  try {
    const compte = chargerCompteService();
    if (!compte) {
      if (!warningShown) {
        console.warn("[push] Firebase non configuré : notifications push désactivées.");
        warningShown = true;
      }
      return null;
    }
    firebaseApp = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(compte) });
    return firebaseApp;
  } catch (err) {
    console.error("[push] Initialisation Firebase impossible :", err.message);
    return null;
  }
}

function urlAbsolue(url) {
  const base = config.APP_URL || "https://location-app-dx4m.onrender.com";
  try { return new URL(url || "/", base).href; } catch (err) { return base; }
}

async function supprimerTokens(tokens) {
  if (tokens.length === 0) return;
  const placeholders = tokens.map(() => "?").join(",");
  await db.run(`DELETE FROM push_subscriptions WHERE token IN (${placeholders})`, tokens);
}

async function envoyerAuxTokens(tokens, payload) {
  if (!initialiser() || tokens.length === 0) return 0;

  const messageBase = {
    data: {
      title: String(payload.title || "Location App"),
      body: String(payload.body || ""),
      url: String(payload.url || "/"),
      tag: String(payload.tag || "location-app"),
      type: String(payload.type || "info")
    },
    webpush: {
      headers: { Urgency: "high" },
      fcmOptions: { link: urlAbsolue(payload.url) }
    },
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default" } } }
  };

  let envoyes = 0;
  const invalides = [];

  for (let i = 0; i < tokens.length; i += 500) {
    const lot = tokens.slice(i, i + 500);
    try {
      const resultat = await getMessaging().sendEachForMulticast({ ...messageBase, tokens: lot });
      envoyes += resultat.successCount;
      resultat.responses.forEach((reponse, index) => {
        if (!reponse.success) {
          const code = reponse.error && reponse.error.code;
          if (code === "messaging/registration-token-not-registered"
            || code === "messaging/invalid-registration-token"
            || code === "messaging/invalid-argument") {
            invalides.push(lot[index]);
          } else {
            console.warn("[push] Envoi impossible :", code || reponse.error);
          }
        }
      });
    } catch (err) {
      console.error("[push] Erreur d'envoi FCM :", err.message);
    }
  }

  await supprimerTokens(invalides);
  return envoyes;
}

async function sendToUser(userId, payload) {
  const abonnements = await db.all(
    "SELECT token FROM push_subscriptions WHERE user_id = ?",
    [userId]
  );
  return envoyerAuxTokens(abonnements.map((a) => a.token), payload);
}

async function sendToUsers(userIds, payload) {
  const ids = [...new Set((userIds || []).map(Number).filter(Boolean))];
  let total = 0;
  for (const id of ids) total += await sendToUser(id, payload);
  return total;
}

module.exports = { sendToUser, sendToUsers };
