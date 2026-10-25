// ============================================
// push.js — Activation des notifications Web Push (FCM)
// ============================================

let firebaseMessaging = null;
let firebaseInitialise = false;
const FCM_TOKEN_KEY = "fcm_token";

function pushConfigure() {
  const config = self.FIREBASE_CONFIG || {};
  return Boolean(
    config.apiKey
    && !String(config.apiKey).startsWith("REMPLACER")
    && self.FIREBASE_VAPID_KEY
    && !String(self.FIREBASE_VAPID_KEY).startsWith("REMPLACER")
  );
}

function pushSupporte() {
  return "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;
}

function estPwaInstallee() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

async function enregistrementServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.ready;
}

function initialiserMessaging() {
  if (firebaseInitialise || !pushConfigure() || typeof firebase === "undefined") return firebaseMessaging;
  firebaseInitialise = true;
  try {
    if (!firebase.apps.length) firebase.initializeApp(self.FIREBASE_CONFIG);
    firebaseMessaging = firebase.messaging();
    firebaseMessaging.onMessage((payload) => {
      const data = payload.data || {};
      const message = [data.title, data.body].filter(Boolean).join(" — ");
      if (message && typeof showToast === "function") showToast(message, "info");
      if (typeof window.loadNotifications === "function") window.loadNotifications();
    });
  } catch (err) {
    console.warn("Firebase Messaging indisponible :", err.message);
  }
  return firebaseMessaging;
}

function etatBoutonNotifications(etat, texte, hint) {
  const status = document.getElementById("pushStatus");
  const button = document.getElementById("pushButton");
  const test = document.getElementById("pushTestButton");
  const disable = document.getElementById("pushDisableButton");
  const hintElement = document.getElementById("pushHint");
  if (status) {
    status.textContent = texte;
    status.className = `badge badge-${etat}`;
  }
  if (button) button.style.display = etat === "success" ? "none" : "inline-flex";
  if (test) test.style.display = etat === "success" ? "inline-flex" : "none";
  if (disable) disable.style.display = etat === "success" ? "inline-flex" : "none";
  if (hintElement) hintElement.textContent = hint || "";
}

async function synchroniserAbonnement() {
  if (!pushConfigure() || !pushSupporte() || Notification.permission !== "granted") return;
  const registration = await enregistrementServiceWorker();
  if (!registration) return;
  const messaging = initialiserMessaging();
  if (!messaging) return;

  try {
    const token = await messaging.getToken({
      vapidKey: self.FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    if (!token) return;
    localStorage.setItem(FCM_TOKEN_KEY, token);
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        token,
        platform: estPwaInstallee() ? "pwa" : "web"
      })
    });
    etatBoutonNotifications("success", "Activées", "Vous recevrez une notification sur cet appareil.");
  } catch (err) {
    console.warn("Abonnement push impossible :", err.message);
    etatBoutonNotifications("danger", "Erreur", "Impossible d'activer les notifications pour le moment.");
  }
}

async function activerNotifications() {
  if (!pushConfigure()) {
    etatBoutonNotifications("warning", "Non configuré", "Les notifications ne sont pas encore configurées sur ce serveur.");
    return;
  }
  if (!pushSupporte()) {
    etatBoutonNotifications("warning", "Non compatible", "Ce navigateur ne prend pas en charge les notifications.");
    return;
  }
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !estPwaInstallee()) {
    etatBoutonNotifications("warning", "Installez l'app", "Sur iPhone, ajoutez d'abord l'application à l'écran d'accueil, puis activez les notifications.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    etatBoutonNotifications("danger", "Bloquées", "Autorisez les notifications dans les réglages du navigateur, puis réessayez.");
    return;
  }
  await synchroniserAbonnement();
}

async function desactiverNotifications() {
  const token = localStorage.getItem(FCM_TOKEN_KEY);
  if (token) {
    try {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ token })
      });
    } catch (err) { /* ignoré */ }
    localStorage.removeItem(FCM_TOKEN_KEY);
  }
  if (firebaseMessaging) {
    try { await firebaseMessaging.deleteToken(); } catch (err) { /* ignoré */ }
  }
  etatBoutonNotifications("neutral", "Désactivées", "Vous ne recevrez plus de notifications sur cet appareil.");
}

async function envoyerNotificationTest() {
  try {
    const response = await fetch("/api/push/test", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) showToast(data.message || "Notification envoyée", data.sent ? "success" : "info");
    else showToast(data.message || "Envoi impossible", "error");
  } catch (err) {
    showToast("Impossible de contacter le serveur", "error");
  }
}

async function initialiserNotificationsUI() {
  initialiserMessaging();

  if (!document.getElementById("pushStatus")) {
    if (pushConfigure() && pushSupporte() && Notification.permission === "granted") {
      synchroniserAbonnement().catch(() => {});
    }
    return;
  }

  if (!pushConfigure()) {
    etatBoutonNotifications("warning", "Non configuré", "Ajoutez vos clés Firebase pour activer les notifications.");
    return;
  }
  if (!pushSupporte()) {
    etatBoutonNotifications("warning", "Non compatible",
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !estPwaInstallee()
        ? "Sur iPhone, ajoutez d'abord l'application à l'écran d'accueil, puis activez les notifications."
        : "Ce navigateur ne prend pas en charge les notifications.");
    return;
  }
  if (Notification.permission === "denied") {
    etatBoutonNotifications("danger", "Bloquées", "Autorisez les notifications dans les réglages du navigateur.");
    return;
  }
  if (Notification.permission === "granted") {
    etatBoutonNotifications("success", "Activées", "Vérification de l'abonnement…");
    synchroniserAbonnement().catch(() => {});
    return;
  }
  etatBoutonNotifications("neutral", "Désactivées", "Activez les notifications pour être prévenu même lorsque l'application est fermée.");
}

document.addEventListener("DOMContentLoaded", initialiserNotificationsUI);
