// ============================================
// tenantService.js — Suppression transactionnelle d'un locataire
// ============================================

const fs = require("fs");
const db = require("../database/db");
const { resolveStoredPath } = require("../utils/files");

function removeFiles(paths) {
  for (const file of paths) {
    if (!file) continue;
    try {
      if (fs.existsSync(file) && fs.statSync(file).isFile()) fs.unlinkSync(file);
    } catch (err) {
      console.warn("[tenantService] impossible de supprimer", file, err.message);
    }
  }
}

/**
 * Supprime un compte locataire et toutes ses données dépendantes.
 * Les contrats sont supprimés car contracts.locataire_id est NOT NULL.
 * Retourne le nombre de lignes supprimées.
 */
function deleteTenantAccount(locataireId) {
  const files = [];

  const supprimer = db.transaction(() => {
    const contrats = db.prepare("SELECT id FROM contracts WHERE locataire_id = ?").all(locataireId);
    const ids = contrats.map((c) => c.id);

    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      db.prepare(`SELECT preuve_paiement AS fichier FROM payments WHERE contract_id IN (${placeholders})`)
        .all(...ids)
        .forEach((row) => files.push(resolveStoredPath(row.fichier)));
      db.prepare(`DELETE FROM reminders WHERE contract_id IN (${placeholders})`).run(...ids);
      db.prepare(`DELETE FROM payments WHERE contract_id IN (${placeholders})`).run(...ids);
      db.prepare(`DELETE FROM contracts WHERE locataire_id = ?`).run(locataireId);
    }

    db.prepare("SELECT chemin AS fichier FROM documents WHERE locataire_id = ?")
      .all(locataireId)
      .forEach((row) => files.push(resolveStoredPath(row.fichier)));
    db.prepare("SELECT photo AS fichier FROM incidents WHERE locataire_id = ?")
      .all(locataireId)
      .forEach((row) => files.push(resolveStoredPath(row.fichier)));

    db.prepare("DELETE FROM incidents WHERE locataire_id = ?").run(locataireId);
    db.prepare("DELETE FROM documents WHERE locataire_id = ?").run(locataireId);
    const result = db.prepare("DELETE FROM users WHERE id = ? AND role = 'locataire'").run(locataireId);
    return result.changes;
  });

  const changes = supprimer();
  removeFiles(files);
  return changes;
}

module.exports = { deleteTenantAccount };
