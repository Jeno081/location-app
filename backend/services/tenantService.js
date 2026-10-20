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
 * Peut s'exécuter dans une transaction existante en passant `executor`.
 * Retourne le nombre de lignes supprimées (compte locataire).
 */
async function deleteTenantAccount(locataireId, executor = null) {
  const work = async (ex) => {
    const files = [];

    const contrats = await ex.all("SELECT id FROM contracts WHERE locataire_id = ?", [locataireId]);
    const ids = contrats.map((c) => c.id);

    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      const preuves = await ex.all(
        `SELECT preuve_paiement AS fichier FROM payments WHERE contract_id IN (${placeholders})`,
        ids
      );
      preuves.forEach((row) => files.push(resolveStoredPath(row.fichier)));

      await ex.run(`DELETE FROM reminders WHERE contract_id IN (${placeholders})`, ids);
      await ex.run(`DELETE FROM payments WHERE contract_id IN (${placeholders})`, ids);
      await ex.run("DELETE FROM contracts WHERE locataire_id = ?", [locataireId]);
    }

    const documents = await ex.all("SELECT chemin AS fichier FROM documents WHERE locataire_id = ?", [locataireId]);
    documents.forEach((row) => files.push(resolveStoredPath(row.fichier)));
    const incidents = await ex.all("SELECT photo AS fichier FROM incidents WHERE locataire_id = ?", [locataireId]);
    incidents.forEach((row) => files.push(resolveStoredPath(row.fichier)));

    await ex.run("DELETE FROM incidents WHERE locataire_id = ?", [locataireId]);
    await ex.run("DELETE FROM documents WHERE locataire_id = ?", [locataireId]);
    const result = await ex.run("DELETE FROM users WHERE id = ? AND role = 'locataire'", [locataireId]);

    removeFiles(files);
    return result.changes;
  };

  return executor ? work(executor) : db.transaction(work);
}

module.exports = { deleteTenantAccount };
