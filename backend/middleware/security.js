// ============================================
// security.js — En-têtes, rate limiting, erreurs
// ============================================

const config = require("../config");

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "connect-src 'self' blob: https://*.googleapis.com https://*.google.com",
      "worker-src 'self' blob: https://cdn.jsdelivr.net",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'"
    ].join("; ")
  );
  if (config.IS_PRODUCTION) {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
}

// Rate limiter en mémoire : suffisant pour un déploiement mono-instance.
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 20, message = "Trop de tentatives. Réessayez plus tard." } = {}) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, Math.min(windowMs, 60_000));
  if (typeof cleanup.unref === "function") cleanup.unref();

  return (req, res, next) => {
    const key = `${req.ip}|${req.baseUrl}${req.path}`;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(max - 1));
      return next();
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }
    next();
  };
}

function apiNotFound(req, res) {
  res.status(404).json({ message: "Ressource introuvable" });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Corps de requête JSON invalide" });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: `Fichier trop volumineux (max ${Math.round(config.MAX_UPLOAD_BYTES / 1024 / 1024)} Mo)` });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ message: "Champ de fichier inattendu" });
  }
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "Cette donnée existe déjà." });
  }
  if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(409).json({ message: "Opération impossible : des données liées existent encore." });
  }
  if (err.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
    return res.status(400).json({ message: "Valeur invalide." });
  }

  const status = Number(err.status) || 500;
  if (status >= 500) {
    console.error("[error]", req.method, req.originalUrl, err);
  }
  return res.status(status).json({
    message: status >= 500 ? "Une erreur interne est survenue." : err.message
  });
}

module.exports = { securityHeaders, createRateLimiter, apiNotFound, errorHandler };
