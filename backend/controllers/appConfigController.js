// ============================================
// appConfigController.js — Configuration publique de l'instance
// ============================================

const fs = require("fs");
const path = require("path");
const config = require("../config");

function configurationPublique() {
  return {
    appName: config.APP_NAME,
    shortName: config.APP_SHORT_NAME,
    companyName: config.APP_COMPANY_NAME,
    tagline: config.APP_TAGLINE,
    description: config.APP_DESCRIPTION,
    appUrl: config.APP_URL,
    clientSlug: config.CLIENT_SLUG,
    supportEmail: config.APP_SUPPORT_EMAIL,
    supportPhone: config.APP_SUPPORT_PHONE,
    defaultLanguage: config.APP_DEFAULT_LANGUAGE,
    locale: config.APP_LOCALE,
    currency: config.APP_CURRENCY,
    currencySymbol: config.APP_CURRENCY_SYMBOL,
    timezone: config.APP_TIMEZONE,
    logoUrl: config.APP_LOGO_URL,
    icon192Url: config.APP_ICON_192_URL,
    icon512Url: config.APP_ICON_512_URL,
    iconMaskableUrl: config.APP_ICON_MASKABLE_URL,
    appleIconUrl: config.APP_APPLE_ICON_URL,
    faviconUrl: config.APP_FAVICON_URL,
    primaryColor: config.APP_PRIMARY_COLOR,
    accentColor: config.APP_ACCENT_COLOR,
    themeColor: config.APP_THEME_COLOR,
    backgroundColor: config.APP_BACKGROUND_COLOR,
    features: {
      notifications: Boolean(
        config.FIREBASE_WEB_API_KEY
        && config.FIREBASE_WEB_PROJECT_ID
        && config.FIREBASE_WEB_MESSAGING_SENDER_ID
        && config.FIREBASE_WEB_APP_ID
        && config.FIREBASE_VAPID_KEY
      ),
      publicMediaStorage: config.PUBLIC_MEDIA_STORAGE
    }
  };
}

exports.getConfig = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(configurationPublique());
};

exports.getBootstrapScript = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.type("application/javascript");
  res.send(`window.APP_CONFIG = ${JSON.stringify(configurationPublique())};\n`);
};

exports.getManifest = (req, res) => {
  const pub = configurationPublique();
  res.setHeader("Cache-Control", "no-cache");
  res.type("application/manifest+json");
  res.json({
    id: "/",
    name: pub.appName,
    short_name: pub.shortName,
    description: pub.description,
    lang: pub.defaultLanguage,
    dir: "ltr",
    start_url: "/login.html?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: pub.backgroundColor,
    theme_color: pub.themeColor,
    categories: ["business", "finance", "productivity"],
    prefer_related_applications: false,
    icons: [
      { src: pub.icon192Url, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: pub.icon512Url, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: pub.iconMaskableUrl, sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  });
};

exports.getFirebaseConfig = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.type("application/javascript");

  if (config.FIREBASE_WEB_API_KEY && config.FIREBASE_WEB_PROJECT_ID
    && config.FIREBASE_WEB_MESSAGING_SENDER_ID && config.FIREBASE_WEB_APP_ID
    && config.FIREBASE_VAPID_KEY) {
    const firebaseConfig = {
      apiKey: config.FIREBASE_WEB_API_KEY,
      authDomain: config.FIREBASE_WEB_AUTH_DOMAIN,
      projectId: config.FIREBASE_WEB_PROJECT_ID,
      storageBucket: config.FIREBASE_WEB_STORAGE_BUCKET,
      messagingSenderId: config.FIREBASE_WEB_MESSAGING_SENDER_ID,
      appId: config.FIREBASE_WEB_APP_ID
    };
    return res.send(
      `self.FIREBASE_CONFIG = ${JSON.stringify(firebaseConfig)};\n`
      + `self.FIREBASE_VAPID_KEY = ${JSON.stringify(config.FIREBASE_VAPID_KEY)};\n`
    );
  }

  // Repli pour l'instance historique uniquement. Dès qu'un CLIENT_SLUG est
  // défini en production, les variables FIREBASE_WEB_* deviennent obligatoires
  // afin qu'un nouveau client ne puisse jamais réutiliser le projet précédent.
  const fallback = path.join(config.FRONTEND_DIR, "js", "firebase-config.js");
  if ((!config.IS_PRODUCTION || !config.CLIENT_SLUG) && fs.existsSync(fallback)) {
    return res.send(fs.readFileSync(fallback, "utf8"));
  }

  res.send(
    "self.FIREBASE_CONFIG = {};\n"
    + "self.FIREBASE_VAPID_KEY = \"\";\n"
  );
};
