// ============================================
// locataire.js — Espace locataire (avec recherche)
// ============================================

const API_URL = "/api";
const token = localStorage.getItem("token");
let user = null;
try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch (err) { user = null; }

if (!token || !user) window.location.href = "login.html";
if (user && user.role !== "locataire") window.location.href = "bailleur.html";

let globalData = {
  locations: [],
  contracts: [],
  payments: [],
  incidents: []
};

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    const cible = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    const content = document.getElementById("tab-" + cible);
    if (content) content.classList.add("active");
    setPageHeading(btn.dataset.title || btn.textContent.trim(), btn.dataset.sub || "");
    if (cible === "rappels") loadRappels();
    if (window.innerWidth < 1024) closeSidebar();
  });
});

// RECHERCHES
function rechercherContrats() {
  const q = document.getElementById("searchContrats").value.toLowerCase().trim();
  let filtered = globalData.contracts;
  if (q) filtered = filtered.filter(c => c.property_titre.toLowerCase().includes(q));
  renderContracts(filtered);
}

function rechercherPaiements() {
  const q = document.getElementById("searchPaiements").value.toLowerCase().trim();
  let filtered = globalData.payments;
  if (q) filtered = filtered.filter(p => p.property_titre.toLowerCase().includes(q) || p.mois.toLowerCase().includes(q));
  renderPayments(filtered);
}

function rechercherIncidents() {
  const q = document.getElementById("searchIncidents").value.toLowerCase().trim();
  let filtered = globalData.incidents;
  if (q) filtered = filtered.filter(i => i.property_titre.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  renderIncidents(filtered);
}

// CHARGEMENT
async function loadMesLocations() {
  const container = document.getElementById("propertiesList");
  try {
    const response = await fetch(API_URL + "/properties/mes-locations", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    globalData.locations = data.properties;
    if (globalData.locations.length === 0) {
      container.innerHTML = '<div class="empty-state"><i data-lucide="home"></i><h3>Aucun logement attribué</h3><p>Votre bailleur doit créer et activer un contrat.</p></div>';
      const banner = document.getElementById("infoVide");
      if (banner) banner.style.display = "flex";
      if (typeof lucide !== "undefined") lucide.createIcons();
      return;
    }
    const banner = document.getElementById("infoVide");
    if (banner) banner.style.display = "none";

    container.innerHTML = globalData.locations.map(p => {
      let photos = [];
      try { photos = p.photos ? JSON.parse(p.photos) : []; } catch (err) { photos = []; }
      const photosHtml = photos.length > 0
        ? `<div class="property-photos" onclick="openPropertyGallery(${p.id})" role="button" tabindex="0" aria-label="Voir les photos de ${escapeHtml(p.titre)}">
             <img src="${escapeHtml(photos[0])}" alt="${escapeHtml(p.titre)}" onerror="this.closest('.property-photos').classList.add('photo-missing'); this.remove();">
             <span class="photo-count"><i data-lucide="image"></i> ${photos.length}</span>
             <span class="photo-zoom"><i data-lucide="maximize-2"></i></span>
           </div>`
        : '<div class="property-no-photo"><i data-lucide="image"></i><span>Aucune photo</span></div>';

      return `<article class="property-card card">
        <div class="card-top">
          <span class="badge badge-success">Loué</span>
          <span class="card-id">${escapeHtml(p.titre)}</span>
        </div>
        ${photosHtml}
        <h3 class="card-title">${escapeHtml(p.titre)}</h3>
        <p class="card-sub"><i data-lucide="map-pin"></i> ${escapeHtml(p.adresse)}${p.ville ? ` · ${escapeHtml(p.ville)}` : ""}</p>
        <div class="card-metrics">
          <div><span>Loyer</span><strong>${formatMoney(p.loyer)}</strong></div>
          <div><span>Charges</span><strong>${formatMoney(p.charges)}</strong></div>
        </div>
        ${p.description ? `<p class="card-desc">${escapeHtml(p.description)}</p>` : ""}
        <div class="landlord-box">
          <span class="avatar avatar-sm avatar-initials">${escapeHtml(String(p.bailleur_nom || "?").charAt(0).toUpperCase())}</span>
          <div>
            <span class="landlord-label">Votre bailleur</span>
            <strong>${escapeHtml(p.bailleur_nom)}</strong>
            <small>${escapeHtml(p.bailleur_email)} · ${escapeHtml(p.bailleur_telephone || "—")}</small>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-secondary btn-sm" onclick="downloadContractPDF(${p.contract_id})"><i data-lucide="file-down"></i> Contrat PDF</button>
          <button class="btn-secondary btn-sm" onclick="openIncidentModal(${p.id})"><i data-lucide="wrench"></i> Signaler un problème</button>
          <button class="btn-primary btn-sm" onclick="openPaymentModal(${p.contract_id}, ${Number(p.montant_loyer) || 0})"><i data-lucide="wallet"></i> Payer le loyer</button>
        </div>
      </article>`;
    }).join("");
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) { container.innerHTML = '<p class="empty-message">Erreur serveur.</p>'; }
}

function openPropertyGallery(propertyId) {
  const property = globalData.locations.find((p) => Number(p.id) === Number(propertyId));
  if (!property) return;
  let photos = [];
  try { photos = property.photos ? JSON.parse(property.photos) : []; } catch (err) { photos = []; }
  if (photos.length === 0) {
    showToast("Aucune photo pour ce logement", "info");
    return;
  }
  openImageLightbox(photos, 0, property.titre);
}

async function loadContracts() {
  try {
    const response = await fetch(API_URL + "/contracts/mes-locations", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    globalData.contracts = data.contracts;
    rechercherContrats();
  } catch (err) { console.error(err); }
}

async function loadPayments() {
  try {
    const response = await fetch(API_URL + "/payments/mes-paiements", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    globalData.payments = data.payments;
    rechercherPaiements();
  } catch (err) { console.error(err); }
}

async function loadMyIncidents() {
  try {
    const response = await fetch(API_URL + "/incidents/mes-incidents", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    globalData.incidents = data.incidents;
    rechercherIncidents();
  } catch (err) { console.error(err); }
}

// RENDERERS
function renderContracts(contracts) {
  const container = document.getElementById("contractsList");
  if (contracts.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="file-text"></i><h3>Aucun contrat</h3><p>Votre bailleur n\'a pas encore créé de contrat.</p></div>';
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }
  container.innerHTML = contracts.map(c => {
    const estTermine = c.statut === "termine";
    const tone = c.statut === "actif" ? "success" : (c.statut === "en_attente" ? "warning" : "neutral");
    const label = c.statut === "actif" ? "Actif" : (c.statut === "en_attente" ? "À signer" : "Terminé");

    const fin = c.date_fin ? new Date(c.date_fin) : null;
    const joursRestants = fin ? Math.ceil((fin.getTime() - Date.now()) / 86400000) : null;
    const bientot = c.statut === "actif" && joursRestants !== null && joursRestants <= 60;
    const renewBadge = bientot
      ? `<div class="renew-badge ${joursRestants < 0 || joursRestants <= 30 ? "danger" : "warning"}">
           <i data-lucide="calendar-clock"></i>
           ${joursRestants < 0 ? "Contrat expiré" : `Expire dans ${joursRestants} jour${joursRestants > 1 ? "s" : ""}`}
         </div>`
      : "";

    return `<article class="property-card card">
      <div class="card-top">
        <span class="badge badge-${tone}">${label}</span>
        <span class="card-id">CTR-${String(c.id).padStart(4, "0")}</span>
      </div>
      <h3 class="card-title">${escapeHtml(c.property_titre)}</h3>
      <p class="card-sub"><i data-lucide="map-pin"></i> ${escapeHtml(c.property_adresse)}${c.property_ville ? ` · ${escapeHtml(c.property_ville)}` : ""}</p>
      <p class="card-sub"><i data-lucide="user"></i> ${escapeHtml(c.bailleur_nom)}</p>
      <div class="card-metrics">
        <div><span>Loyer</span><strong>${formatMoney(c.montant_loyer)}</strong></div>
        <div><span>Début</span><strong>${formatDate(c.date_debut)}</strong></div>
        <div><span>Fin</span><strong>${c.date_fin ? formatDate(c.date_fin) : "Indéterminée"}</strong></div>
      </div>
      ${renewBadge}
      ${c.date_terminaison ? `<p class="card-note">Terminé le ${formatDate(c.date_terminaison)}</p>` : ""}
      <p class="contract-signature ${c.signature_bailleur ? "signed" : "unsigned"}">${c.signature_bailleur ? "Signé par le bailleur" : "En attente du bailleur"}</p>
      <p class="contract-signature ${c.signature_locataire ? "signed" : "unsigned"}">${c.signature_locataire ? "Signé par vous" : "En attente de votre signature"}</p>
      <div class="card-actions">
        ${!c.signature_locataire && !estTermine ? `<button class="btn-primary btn-sm" onclick="signContract(${c.id})"><i data-lucide="pen-line"></i> Signer</button>` : ""}
        <button class="btn-secondary btn-sm" onclick="openContractPDF(${c.id})"><i data-lucide="file-text"></i> Voir le PDF</button>
        <button class="btn-ghost btn-sm" onclick="downloadContractPDF(${c.id})" title="Télécharger le contrat"><i data-lucide="download"></i></button>
      </div>
    </article>`;
  }).join("");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderPayments(payments) {
  const container = document.getElementById("paymentsList");
  if (payments.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="credit-card"></i><h3>Aucun paiement</h3><p>Déclarez votre premier loyer depuis votre logement.</p></div>';
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }
  const activeKeys = new Set(
    payments
      .filter(p => p.statut_bailleur !== "refuse")
      .map(p => `${p.contract_id}|${p.mois}`)
  );

  container.innerHTML = payments.map(p => {
    const statut = p.statut_bailleur;
    const tone = statut === "valide" ? "success" : (statut === "refuse" ? "danger" : "warning");
    const label = statut === "valide" ? "Validé" : (statut === "refuse" ? "Refusé" : "En attente");
    const remplace = statut === "refuse" && activeKeys.has(`${p.contract_id}|${p.mois}`);

    const decisionDate = p.date_decision ? ` le ${formatDate(p.date_decision)}` : "";
    const note = statut === "refuse"
      ? `<div class="decision-note danger">
           <i data-lucide="x-circle"></i>
           <div>
             <strong>Paiement refusé${decisionDate}</strong>
             <p>${escapeHtml(p.motif_refus || "Aucun motif précisé.")}</p>
           </div>
         </div>
         ${remplace ? '<p class="card-note">Ce mois a depuis été régularisé par un nouveau paiement.</p>' : ""}`
      : statut === "en_attente"
        ? '<p class="card-note">En attente de validation par votre bailleur.</p>'
        : "";

    const actions = statut === "refuse" && !remplace
      ? `<button class="btn-primary btn-sm" onclick="retryPayment(${p.contract_id}, ${Number(p.montant) || 0}, '${escapeHtml(p.mois)}')"><i data-lucide="refresh-cw"></i> Corriger et repayer</button>`
      : statut === "valide"
        ? `<button class="btn-secondary btn-sm" onclick="openReceiptPDF(${p.id})"><i data-lucide="receipt"></i> Voir la quittance</button>
           <button class="btn-ghost btn-sm" onclick="downloadReceiptPDF(${p.id})" title="Télécharger la quittance"><i data-lucide="download"></i></button>`
        : "";

    return `<article class="property-card card ${statut === "refuse" ? "card-alert" : ""}">
      <div class="card-top">
        <span class="badge badge-${tone}">${label}</span>
        <span class="card-id">${escapeHtml(formatMonth(p.mois_label || p.mois))}</span>
      </div>
      <h3 class="card-title">${escapeHtml(p.property_titre)}</h3>
      <p class="card-sub"><i data-lucide="map-pin"></i> ${escapeHtml(p.property_adresse)}</p>
      <div class="card-metrics">
        <div><span>Montant</span><strong>${formatMoney(p.montant)}</strong></div>
        <div><span>Méthode</span><strong>${escapeHtml((p.methode || "—").replace("_", " "))}</strong></div>
        <div><span>Déclaré le</span><strong>${formatDate(p.date_paiement)}</strong></div>
      </div>
      ${note}
      <div class="card-actions">
        ${p.preuve_paiement ? `<button class="btn-secondary btn-sm" onclick="openProtectedFile('/api/payments/${p.id}/preuve', 'Preuve de paiement')"><i data-lucide="eye"></i> Voir la preuve</button>` : ""}
        ${actions}
      </div>
    </article>`;
  }).join("");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderIncidents(incidents) {
  const container = document.getElementById("incidentsList");
  if (incidents.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="wrench"></i><h3>Aucun signalement</h3><p>Tout va bien dans votre logement.</p></div>';
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }
  container.innerHTML = incidents.map(i => {
    const tone = i.statut === "resolu" ? "success" : (i.statut === "en_cours" ? "info" : "warning");
    const label = i.statut === "resolu" ? "Résolu" : (i.statut === "en_cours" ? "En cours" : "Ouvert");
    return `<article class="property-card card">
      <div class="card-top">
        <span class="badge badge-${tone}">${label}</span>
        <span class="card-id">#${i.id}</span>
      </div>
      <h3 class="card-title">${escapeHtml(i.property_titre)}</h3>
      <p class="card-sub"><i data-lucide="map-pin"></i> ${escapeHtml(i.property_adresse)}</p>
      <p class="card-desc">${escapeHtml(i.description)}</p>
      <p class="card-note">Signalé le ${formatDate(i.date_creation)}</p>
      <div class="card-actions">
        ${i.photo ? `<button class="btn-secondary btn-sm" onclick="openProtectedFile('/api/incidents/${i.id}/photo', 'Photo du signalement')"><i data-lucide="image"></i> Voir la photo</button>` : ""}
      </div>
    </article>`;
  }).join("");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

// ACTIONS
function moisCle(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function decalerMois(cle, delta) {
  const [annee, mois] = cle.split("-").map(Number);
  const date = new Date(annee, mois - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function moisDeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : moisCle(date);
}

function moisSelectionnes() {
  return [...document.querySelectorAll('#paymentMonths input[type="checkbox"]:checked')].map((input) => input.value);
}

function updatePaymentTotal() {
  const mois = moisSelectionnes();
  const contractId = document.getElementById("paymentContract").value;
  const location = globalData.locations.find((p) => Number(p.contract_id) === Number(contractId));
  const loyer = location ? Number(location.montant_loyer) || 0 : 0;
  const total = mois.length * loyer;

  document.getElementById("paymentMontant").value = total;
  document.getElementById("paymentTotal").textContent =
    `${formatMoney(total)}${mois.length > 1 ? ` · ${mois.length} mois` : ""}`;
  document.getElementById("paymentMonthsHint").textContent = mois.length
    ? `${mois.length} mois sélectionné(s)${mois.length > 1 ? " — total calculé automatiquement" : ""}.`
    : "Sélectionnez au moins un mois à régler.";
}

function renderPaymentMonths(contractId, moisPasses) {
  const container = document.getElementById("paymentMonths");
  const location = globalData.locations.find((p) => Number(p.contract_id) === Number(contractId));

  if (!location) {
    container.innerHTML = '<p class="form-hint">Choisissez un contrat pour voir les mois disponibles.</p>';
    updatePaymentTotal();
    return;
  }

  const debut = moisDeDate(location.date_debut) || moisCle();
  const fin = decalerMois(moisCle(), 6);
  let mois = [];
  for (let cle = debut; cle <= fin; cle = decalerMois(cle, 1)) mois.push(cle);
  if (mois.length > 24) mois = mois.slice(-24);

  // Un mois ciblé (retry d'un paiement refusé) reste toujours proposé.
  const cibles = Array.isArray(moisPasses) ? moisPasses : moisPasses ? [moisPasses] : [];
  for (const cle of cibles) {
    if (cle && !mois.includes(cle)) mois.push(cle);
  }
  mois.sort();

  const payes = new Map();
  globalData.payments.forEach((p) => {
    if (Number(p.contract_id) === Number(contractId) && p.statut_bailleur !== "refuse") {
      payes.set(p.mois, p.statut_bailleur);
    }
  });

  const selection = new Set(
    (Array.isArray(moisPasses) ? moisPasses : moisPasses ? [moisPasses] : []).filter((m) => mois.includes(m))
  );
  if (selection.size === 0) {
    const courant = moisCle();
    if (mois.includes(courant) && !payes.has(courant)) selection.add(courant);
  }

  container.innerHTML = mois.map((cle) => {
    const statut = payes.get(cle);
    const disabled = !!statut;
    const checked = selection.has(cle);
    return `<label class="month-option ${disabled ? "disabled" : ""} ${checked ? "selected" : ""}">
      <input type="checkbox" value="${cle}" ${disabled ? "disabled" : ""} ${checked ? "checked" : ""}>
      <span>${escapeHtml(formatMonth(cle))}${statut ? `<small>${statut === "valide" ? "Payé" : "En attente"}</small>` : ""}</span>
    </label>`;
  }).join("");

  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", () => {
      input.closest(".month-option").classList.toggle("selected", input.checked);
      updatePaymentTotal();
    });
  });

  updatePaymentTotal();
}

function openPaymentModal(contractId, montant, mois) {
  if (globalData.locations.length === 0) {
    showToast("Aucun logement actif pour déclarer un paiement", "error");
    return;
  }
  const select = document.getElementById("paymentContract");
  select.innerHTML = '<option value="">-- Choisir --</option>' + globalData.locations.map(p =>
    `<option value="${p.contract_id}">${escapeHtml(p.titre)} — ${formatMoney(p.montant_loyer)}</option>`
  ).join("");
  if (contractId) select.value = String(contractId);
  else if (!select.value) select.value = String(globalData.locations[0].contract_id);

  renderPaymentMonths(select.value, mois || null);

  const notice = document.getElementById("paymentRetryNotice");
  if (notice) {
    if (mois) {
      notice.innerHTML = `<i data-lucide="refresh-cw"></i><span>Nouveau paiement pour <strong>${formatMonth(mois)}</strong>. L'ancien paiement refusé reste conservé dans votre historique.</span>`;
      notice.style.display = "flex";
      if (typeof lucide !== "undefined") lucide.createIcons();
    } else {
      notice.style.display = "none";
      notice.innerHTML = "";
    }
  }

  document.getElementById("paymentModal").style.display = "flex";
}

function retryPayment(contractId, montant, mois) {
  openPaymentModal(contractId, montant, mois);
}
function closePaymentModal() { document.getElementById("paymentModal").style.display = "none"; }

document.getElementById("paymentContract").addEventListener("change", (e) => {
  renderPaymentMonths(e.target.value, null);
});

document.getElementById("paymentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const methode = document.querySelector('input[name="methode"]:checked').value;
  const preuve = document.getElementById("paymentPreuve").files[0];
  const mois = moisSelectionnes();

  if (mois.length === 0) {
    showToast("Sélectionnez au moins un mois à régler.", "error");
    return;
  }

  if (!preuve) {
    showToast("Veuillez ajouter une preuve de paiement", "error");
    return;
  }

  const formData = new FormData();
  formData.append("contract_id", document.getElementById("paymentContract").value);
  formData.append("mois", JSON.stringify(mois));
  formData.append("montant", document.getElementById("paymentMontant").value);
  formData.append("methode", methode);
  formData.append("preuve", preuve);

  try {
    const response = await fetch(API_URL + "/payments", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });
    const data = await response.json();
    if (response.ok) {
      showToast(
        mois.length > 1
          ? `${mois.length} mois déclarés — en attente de validation.`
          : "Paiement déclaré ! En attente de validation.",
        "success"
      );
      document.getElementById("paymentForm").reset();
      const notice = document.getElementById("paymentRetryNotice");
      if (notice) { notice.style.display = "none"; notice.innerHTML = ""; }
      closePaymentModal();
      loadPayments();
      if (window.loadNotifications) window.loadNotifications();
    } else showToast(data.message, "error");
  } catch (err) { showToast("Erreur serveur", "error"); }
});

// Autres fonctions (identiques à avant pour ne pas casser l'existant)
function openUploadModal() { document.getElementById("uploadModal").style.display = "flex"; }
function closeUploadModal() { document.getElementById("uploadModal").style.display = "none"; }

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = document.getElementById("docType").value;
  const fichier = document.getElementById("docFichier").files[0];
  if (!fichier) { showToast("Sélectionnez un fichier", "error"); return; }
  const formData = new FormData();
  formData.append("type", type);
  formData.append("fichier", fichier);
  try {
    const response = await fetch(API_URL + "/documents", { method: "POST", headers: { "Authorization": "Bearer " + token }, body: formData });
    if (response.ok) {
      showToast("Document uploadé !", "success");
      document.getElementById("uploadForm").reset();
      closeUploadModal();
      loadDocuments();
    } else { const data = await response.json(); showToast(data.message, "error"); }
  } catch (err) { showToast("Erreur serveur", "error"); }
});

async function loadDocuments() {
  const container = document.getElementById("documentsList");
  try {
    const response = await fetch(API_URL + "/documents/mes-documents", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    if (data.documents.length === 0) {
      container.innerHTML = '<div class="empty-state"><i data-lucide="id-card"></i><h3>Aucun document</h3><p>Ajoutez votre CNI, passeport ou fiche de paie.</p></div>';
      if (typeof lucide !== "undefined") lucide.createIcons();
      return;
    }
    const labels = { cni: "Carte d'identité", passeport: "Passeport", fiche_paie: "Fiche de paie", autre: "Autre" };
    const tone = { valide: "success", refuse: "danger", en_attente: "warning" };

    container.innerHTML = data.documents.map(d => `
      <article class="property-card card">
        <div class="card-top">
          <span class="badge badge-${tone[d.statut] || "neutral"}">${escapeHtml((d.statut || "").replace("_", " "))}</span>
          <span class="card-id">${escapeHtml(labels[d.type] || d.type)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(d.nom_fichier)}</h3>
        <p class="card-note">Ajouté le ${formatDate(d.date_upload)}</p>
        ${d.commentaire ? `<p class="card-desc">${escapeHtml(d.commentaire)}</p>` : ""}
        <div class="card-actions">
          <button class="btn-secondary btn-sm" onclick="openProtectedFile('/api/documents/${d.id}/file', 'Document')"><i data-lucide="eye"></i> Voir</button>
          <button class="btn-ghost btn-sm danger-text" onclick="deleteDocument(${d.id})"><i data-lucide="trash-2"></i> Supprimer</button>
        </div>
      </article>
    `).join("");
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) { console.error(err); }
}

async function deleteDocument(id) {
  if (!confirm("Supprimer ce document ?")) return;
  try {
    const r = await fetch(API_URL + "/documents/" + id, { method: "DELETE", headers: { "Authorization": "Bearer " + token } });
    if (r.ok) { showToast("Document supprimé", "success"); loadDocuments(); }
  } catch (err) { showToast("Erreur", "error"); }
}

function openIncidentModal(propertyId) {
  document.getElementById("incidentPropertyId").value = propertyId;
  document.getElementById("incidentModal").style.display = "flex";
}
function closeIncidentModal() { document.getElementById("incidentModal").style.display = "none"; }

document.getElementById("incidentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const description = document.getElementById("incidentDescription").value;
  const propertyId = document.getElementById("incidentPropertyId").value;
  const photos = document.getElementById("incidentPhotos").files;
  const formData = new FormData();
  formData.append("property_id", propertyId);
  formData.append("description", description);
  for (let i = 0; i < photos.length; i++) formData.append("photos", photos[i]);
  try {
    const response = await fetch(API_URL + "/incidents", { method: "POST", headers: { "Authorization": "Bearer " + token }, body: formData });
    const data = await response.json();
    if (response.ok) {
      showToast(data.count + " incident(s) signalé(s) !", "success");
      document.getElementById("incidentForm").reset();
      closeIncidentModal();
      loadMyIncidents();
      if (window.loadNotifications) window.loadNotifications();
    } else showToast(data.message || "Erreur", "error");
  } catch (err) { showToast("Erreur serveur", "error"); }
});

function signContract(id) {
  document.getElementById("signatureContractId").value = id;
  document.getElementById("signatureModal").style.display = "flex";
}

function closeSignatureModal() {
  document.getElementById("signatureModal").style.display = "none";
  document.getElementById("signatureContractId").value = "";
}

async function confirmSignature() {
  const id = document.getElementById("signatureContractId").value;
  if (!id) return;

  const btn = document.getElementById("signatureConfirmBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Signature..."; }

  try {
    const r = await fetch(API_URL + "/contracts/" + id + "/signer", {
      method: "PUT",
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      showToast(data.message || "Contrat signé !", "success");
      closeSignatureModal();
      loadContracts();
      loadMesLocations();
      if (window.loadNotifications) window.loadNotifications();
    } else {
      showToast(data.message || "Erreur lors de la signature", "error");
    }
  } catch (err) {
    showToast("Erreur serveur", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Signer le contrat"; }
  }
}

async function openContractPDF(id) {
  await openProtectedFile(`/api/contracts/${id}/pdf`, `Contrat CTR-${String(id).padStart(4, "0")}`);
}

async function openReceiptPDF(id) {
  await openProtectedFile(`/api/payments/${id}/quittance`, `Quittance QUI-${String(id).padStart(6, "0")}`);
}

async function downloadContractPDF(id) {
  await downloadProtectedFile(`/api/contracts/${id}/pdf`, `contrat-${id}.pdf`);
}

async function downloadReceiptPDF(id) {
  await downloadProtectedFile(`/api/payments/${id}/quittance`, `quittance-${id}.pdf`);
}

async function loadRappels() {
  const container = document.getElementById("rappelsList");
  try {
    const response = await fetch(API_URL + "/payments/mes-rappels", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;
    if (data.rappels.length === 0) {
      container.innerHTML = '<div class="empty-state"><i data-lucide="bell"></i><h3>Aucun rappel</h3><p>Vous n\'avez aucun message de votre bailleur.</p></div>';
      if (typeof lucide !== "undefined") lucide.createIcons();
      return;
    }
    container.innerHTML = data.rappels.map(r => {
      const confirme = !!r.confirme;
      const lu = !!r.lu || r.statut === "lu";
      const badge = confirme ? "Réception confirmée" : (lu ? "Lu" : "Nouveau");
      const tone = confirme ? "success" : (lu ? "neutral" : "danger");
      return `
      <article class="property-card card ${!confirme ? "card-alert" : ""}">
        <div class="card-top">
          <span class="badge badge-${tone}">${badge}</span>
          <span class="card-id">${formatDate(r.date_envoi)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(r.property_titre)}</h3>
        <p class="card-desc">${escapeHtml(r.message)}</p>
        ${confirme
          ? `<p class="card-note reminder-confirmed"><i data-lucide="check-circle"></i> Réception confirmée le ${formatDate(r.date_confirmation)}</p>`
          : `<div class="card-actions"><button class="btn-primary btn-sm" onclick="confirmerRappel(${r.id})"><i data-lucide="check-check"></i> Confirmer la réception</button></div>`}
      </article>`;
    }).join("");
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) { console.error(err); }
}

async function confirmerRappel(id) {
  try {
    const r = await fetch(API_URL + "/payments/rappels/" + id + "/confirmer", {
      method: "PUT",
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      showToast(data.message || "Impossible de confirmer la réception", "error");
      return;
    }
    showToast("Réception confirmée", "success");
    loadRappels();
    if (window.loadNotifications) window.loadNotifications();
  } catch (err) { showToast("Erreur", "error"); }
}

async function loadHistory() {
  const statsContainer = document.getElementById("historyStats");
  const contentContainer = document.getElementById("historyContent");
  if (!statsContainer || !contentContainer) return;
  try {
    const response = await fetch(API_URL + "/history", { headers: { "Authorization": "Bearer " + token } });
    const data = await response.json();
    if (!response.ok) return;

    statsContainer.innerHTML = `
      <article class="stat-card"><span class="stat-icon tone-indigo"><i data-lucide="file-text"></i></span><div><div class="stat-value">${data.stats.nb_contrats}</div><div class="stat-label">Contrats</div></div></article>
      <article class="stat-card"><span class="stat-icon tone-emerald"><i data-lucide="wallet"></i></span><div><div class="stat-value">${formatMoney(data.stats.total_paye)}</div><div class="stat-label">Total payé</div></div></article>
      <article class="stat-card"><span class="stat-icon tone-sky"><i data-lucide="credit-card"></i></span><div><div class="stat-value">${data.stats.nb_paiements}</div><div class="stat-label">Paiements</div></div></article>
      <article class="stat-card"><span class="stat-icon tone-amber"><i data-lucide="wrench"></i></span><div><div class="stat-value">${data.stats.nb_incidents}</div><div class="stat-label">Signalements</div></div></article>
    `;

    const contratsHtml = data.contrats.length === 0
      ? '<p class="empty-message">Aucun contrat.</p>'
      : `<div class="properties-grid">${data.contrats.map(c => `
          <article class="property-card card">
            <div class="card-top"><span class="badge badge-${c.statut === "actif" ? "success" : "neutral"}">${c.statut === "actif" ? "Actif" : (c.statut === "termine" ? "Terminé" : "En attente")}</span><span class="card-id">CTR-${String(c.id).padStart(4, "0")}</span></div>
            <h3 class="card-title">${escapeHtml(c.property_titre)}</h3>
            <p class="card-sub"><i data-lucide="map-pin"></i> ${escapeHtml(c.property_adresse)}</p>
            <div class="card-metrics"><div><span>Loyer</span><strong>${formatMoney(c.montant_loyer)}</strong></div><div><span>Début</span><strong>${formatDate(c.date_debut)}</strong></div></div>
            <div class="card-actions"><button class="btn-secondary btn-sm" onclick="openContractPDF(${c.id})"><i data-lucide="file-text"></i> Voir</button><button class="btn-ghost btn-sm" onclick="downloadContractPDF(${c.id})" title="Télécharger"><i data-lucide="download"></i></button></div>
          </article>`).join("")}</div>`;

    const paiementsHtml = data.paiements.length === 0
      ? '<p class="empty-message">Aucun paiement.</p>'
      : `<div class="properties-grid">${data.paiements.map(p => `
          <article class="property-card card">
            <div class="card-top"><span class="badge badge-${p.statut === "valide" ? "success" : "warning"}">${escapeHtml(p.statut)}</span><span class="card-id">${escapeHtml(formatMonth(p.mois))}</span></div>
            <h3 class="card-title">${escapeHtml(p.property_titre)}</h3>
            <div class="card-metrics"><div><span>Montant</span><strong>${formatMoney(p.montant)}</strong></div><div><span>Mois</span><strong>${escapeHtml(formatMonth(p.mois))}</strong></div></div>
            <div class="card-actions"><button class="btn-secondary btn-sm" onclick="openReceiptPDF(${p.id})"><i data-lucide="receipt"></i> Voir</button><button class="btn-ghost btn-sm" onclick="downloadReceiptPDF(${p.id})" title="Télécharger"><i data-lucide="download"></i></button></div>
          </article>`).join("")}</div>`;

    contentContainer.innerHTML = `
      <div class="section-head"><div><h2 class="section-title">Historique des contrats</h2><p class="section-sub">Vos locations passées et actuelles.</p></div></div>
      ${contratsHtml}
      <div class="section-head" style="margin-top:40px;"><div><h2 class="section-title">Historique des paiements</h2><p class="section-sub">Tous vos règlements et reçus.</p></div></div>
      ${paiementsHtml}
    `;
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) { console.error(err); }
}

// INITIALISATION
loadMesLocations();
loadContracts();
loadPayments();
loadRappels();
loadDocuments();
loadMyIncidents();
loadHistory();