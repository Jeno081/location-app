// ============================================
// tenantService.js — Suppression transactionnelle d'un locataire
// ============================================

const db = require("../database/db");
const { deleteStoredFiles } = require("./fileStore");

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
      preuves.forEach((row) => row.fichier && files.push(row.fichier));

      await ex.run(`DELETE FROM reminders WHERE contract_id IN (${placeholders})`, ids);
      await ex.run(`DELETE FROM payments WHERE contract_id IN (${placeholders})`, ids);
      await ex.run("DELETE FROM contracts WHERE locataire_id = ?", [locataireId]);
    }

    const documents = await ex.all("SELECT chemin AS fichier FROM documents WHERE locataire_id = ?", [locataireId]);
    documents.forEach((row) => row.fichier && files.push(row.fichier));
    const incidents = await ex.all("SELECT photo AS fichier FROM incidents WHERE locataire_id = ?", [locataireId]);
    incidents.forEach((row) => row.fichier && files.push(row.fichier));

    await ex.run("DELETE FROM incidents WHERE locataire_id = ?", [locataireId]);
    await ex.run("DELETE FROM documents WHERE locataire_id = ?", [locataireId]);
    const result = await ex.run("DELETE FROM users WHERE id = ? AND role = 'locataire'", [locataireId]);

    await deleteStoredFiles(files);
    return result.changes;
  };

  return executor ? work(executor) : db.transaction(work);
}

module.exports = { deleteTenantAccount };
