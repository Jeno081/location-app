// ============================================
// bailleur.js — Espace bailleur COMPLET
// ============================================

const API_URL = "/api";
const token = localStorage.getItem("token");
let user = null;
try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch (err) { user = null; }

if (!token || !user) window.location.href = "login.html";
if (user && user.role !== "bailleur") window.location.href = "locataire.html";

let globalData = {
  properties: [],
  tenants: [],
  contracts: [],
  payments: [],
  incidents: [],
  dashboard: []
};

let currentFilter = "tous";
let currentPassword = "";

// ONGLETS
function activerOnglet(cible, options = {}) {
  if (!cible) return;
  let btn = null;
  try { btn = document.querySelector(`.tab[data-tab="${cible}"]`); } catch (err) { return; }
  if (!btn) return;

  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  const section = document.getElementById("tab-" + cible);
  if (section) section.classList.add("active");

  const overview = document.getElementById("overviewSection");
  if (overview) overview.style.display = cible === "suivi" ? "" : "none";

  setPageHeading(btn.dataset.title || btn.textContent.trim(), btn.dataset.sub || "");
  if (cible === "suivi") loadDashboard();
  if (cible === "annonces") { preparerSelectionAnnonce(); loadAnnouncements(); }
  if (cible === "messages") loadConversations();

  if (options.majHash !== false) {
    try { history.replaceState(null, "", `#${cible}`); } catch (err) { /* fichier local */ }
  }
  if (window.innerWidth < 1024) closeSidebar();
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => activerOnglet(btn.dataset.tab));
});

// Rouvrir le même onglet après un rafraîchissement.
const ongletInitial = window.location.hash.replace(/^#/, "");
let ongletInitialBtn = null;
try { ongletInitialBtn = ongletInitial ? document.querySelector(`.tab[data-tab="${ongletInitial}"]`) : null; } catch (err) { ongletInitialBtn = null; }
if (ongletInitialBtn) {
  document.addEventListener("DOMContentLoaded", () => activerOnglet(ongletInitial, { majHash: false }), { once: true });
}

// ============================================
// 1. FILTRES & RECHERCHES
// ============================================
function filterProperties(btn, filtre) {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentFilter = filtre;
  rechercherProprietes();
}

function rechercherProprietes() {
  const q = document.getElementById("searchBiens").value.toLowerCase().trim();
  let filtered = globalData.properties;
  if (currentFilter !== "tous") filtered = filtered.filter(p => p.statut === currentFilter);
  if (q) {
    filtered = filtered.filter(p => 
      p.titre.toLowerCase().includes(q) || 
      p.adresse.toLowerCase().includes(q) || 
      (p.ville && p.ville.toLowerCase().includes(q))
    );
  }
  renderProperties(filtered);
}

function rechercherLocataires() {
  const q = document.getElementById("searchLocataires").value.toLowerCase().trim();
  let filtered = globalData.tenants;
  if (q) {
    filtered = filtered.filter(l => 
      l.nom.toLowerCase().includes(q) || 
      l.email.toLowerCase().includes(q) || 
      l.property_titre.toLowerCase().includes(q)
    );
  }
  renderTenants(filtered);
}

function rechercherContrats() {
  const q = document.getElementById("searchContrats").value.toLowerCase().trim();
  let filtered = globalData.contracts;
  if (q) {
    filtered = filtered.filter(c => 
      c.property_titre.toLowerCase().includes(q) || 
      c.locataire_nom.toLowerCase().includes(q) || 
      c.locataire_email.toLowerCase().includes(q)
    );
  }
  renderContracts(filtered);
}

function rechercherPaiements() {
  const q = document.getElementById("searchPaiements").value.toLowerCase().trim();
  let filtered = globalData.payments;
  if (q) {
    filtered = filtered.filter(p => 
      p.property_titre.toLowerCase().includes(q) || 
      p.locataire_nom.toLowerCase().includes(q) || 
      p.mois.toLowerCase().includes(q)
    );
  }
  renderPayments(filtered);
}

function rechercherIncidents() {
  const q = document.getElementById("searchIncidents").value.toLowerCase().trim();
  let filtered = globalData.incidents;
  if (q) {
    filtered = filtered.filter(i => 
      i.property_titre.toLowerCase().includes(q) || 
      i.locataire_nom.toLowerCase().includes(q) || 
      i.description.toLowerCase().includes(q)
    );
  }
  renderIncidents(filtered);
}

// ============================================
// 2. CHARGEMENT DES DONNÉES
// ============================================
async function loadProperties() {
  try {
    const response = await fetch(API_URL + "/properties/mes-logements/liste", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;

    globalData.properties = data.properties;
    document.getElementById("statTotal").textContent = globalData.properties.length;
    document.getElementById("statDispo").textContent = globalData.properties.filter(p => p.statut === "disponible").length;
    document.getElementById("statLoues").textContent = globalData.properties.filter(p => p.statut === "loue").length;
    document.getElementById("statLoyer").textContent = formatMoney(
      globalData.properties.filter(p => p.statut === "loue").reduce((sum, p) => sum + (p.loyer || 0), 0)
    );

    rechercherProprietes();
  } catch (err) { console.error(err); }
}

async function loadTenants() {
  try {
    const response = await fetch(API_URL + "/users/mes-locataires", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;
    globalData.tenants = data.locataires;
    rechercherLocataires();
    if (typeof preparerSelectionAnnonce === "function") preparerSelectionAnnonce();
  } catch (err) { console.error(err); }
}

async function loadContracts() {
  try {
    const response = await fetch(API_URL + "/contracts/mes-contrats", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;
    globalData.contracts = data.contracts;
    rechercherContrats();
  } catch (err) { console.error(err); }
}

async function loadPayments() {
  try {
    const response = await fetch(API_URL + "/payments/recus", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;
    globalData.payments = data.payments;
    const total = globalData.payments
      .filter(p => p.statut_bailleur === "valide")
      .reduce((s, p) => s + Number(p.montant || 0), 0);
    document.getElementById("statEncaisse").textContent = formatMoney(total);
    rechercherPaiements();
  } catch (err) { console.error(err); }
}

async function loadIncidents() {
  try {
    const response = await fetch(API_URL + "/incidents/recus", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;
    globalData.incidents = data.incidents;
    rechercherIncidents();
  } catch (err) { console.error(err); }
}

async function loadDashboard() {
  const container = document.getElementById("dashboardPaiements");
  try {
    const response = await fetch(API_URL + "/payments/tableau-de-bord", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    if (!response.ok) return;
    globalData.dashboard = data.dashboard;

    const enRetard = data.dashboard.filter(d => d.statut_paiement === "retard" || d.statut_paiement === "retard_grave").length;
    document.getElementById("statRetards").textContent = enRetard;

    if (data.dashboard.length === 0) {
      container.innerHTML = '<div class="empty-state"><i data-lucide="home"></i><h3>Aucun contrat actif</h3><p>Créez un contrat pour commencer à suivre les loyers.</p></div>';
      if (typeof lucide !== "undefined") lucide.createIcons();
      return;
    }

    container.innerHTML = data.dashboard.map(d => {
      let badge, tone, message;
      if (d.statut_paiement === "a_jour") {
        badge = "À jour"; tone = "success"; message = `Loyer de ${escapeHtml(data.mois_actuel)} reçu`;
      } else if (d.statut_paiement === "en_attente") {
        badge = "En attente"; tone = "warning"; message = `En attente du loyer de ${escapeHtml(data.mois_actuel)}`;
      } else if (d.statut_paiement === "retard") {
        badge = "1 mois de retard"; tone = "danger"; message = `${d.mois_en_retard} mois en retard`;
      } else {
        badge = "Retard important"; tone = "danger"; message = `${d.mois_en_retard} mois en retard`;
      }

      return `<article class="property-card card">
        <div class="card-top">
          <span class="badge badge-${tone}">${badge}</span>
          <span class="card-id">CTR-${String(d.contract_id).padStart(4, "0")}</span>
        </div>
        <h3 class="card-title">${escapeHtml(d.locataire_nom)}</h3>
        <p class="card-sub"><i data-lucide="home"></i> ${escapeHtml(d.property_titre)} · ${escapeHtml(d.property_adresse)}</p>
        <div class="card-metrics">
          <div><span>Loyer</span><strong>${formatMoney(d.montant_loyer)}</strong></div>
          <div><span>Total payé</span><strong>${formatMoney(d.total_paye)}</strong></div>
          <div><span>Mois en retard</span><strong>${d.mois_en_retard}</strong></div>
        </div>
        <p class="card-note">${message}</p>
        ${d.dernier_rappel ? `
          <div class="reminder-status ${d.dernier_rappel.confirme ? "confirmed" : "pending"}">
            <i data-lucide="${d.dernier_rappel.confirme ? "check-circle" : "clock"}"></i>
            <div>
              <strong>${d.dernier_rappel.confirme ? "Rappel confirmé par le locataire" : "Rappel envoyé — en attente de confirmation"}</strong>
              <small>Envoyé le ${formatDate(d.dernier_rappel.date_envoi)}${d.dernier_rappel.confirme ? ` · Confirmé le ${formatDate(d.dernier_rappel.date_confirmation)}` : ""}</small>
            </div>
          </div>` : ""}
        <div class="card-actions">
          ${(!d.paye_ce_mois || d.mois_en_retard > 0) ? `<button class="btn-secondary btn-sm" onclick="openRappelModal(${d.contract_id})"><i data-lucide="bell"></i> ${d.dernier_rappel ? "Relancer" : "Envoyer un rappel"}</button>` : ""}
          <button class="btn-ghost btn-sm" onclick="document.querySelector('[data-tab=paiements]').click()">Voir les paiements <i data-lucide="arrow-right"></i></button>
        </div>
      </article>`;
    }).join("");
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) { console.error(err); }
}

// ============================================
// 3. RENDERERS
// ============================================
function renderProperties(properties) {
  const container = document.getElementById("propertiesList");
  if (properties.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="home"></i><h3>Aucun logement</h3><p>Ajoutez votre premier bien pour commencer.</p></div>';
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  container.innerHTML = properties.map(p => {
    let photos = [];
    try { photos = p.photos ? JSON.parse(p.photos) : []; } catch (err) { photos = []; }

    const photosHtml = photos.length > 0
      ? `<div class="property-photos" onclick="openPropertyGallery(${p.id})" role="button" tabindex="0" aria-label="Voir les photos de ${escapeHtml(p.titre)}">
           <img src="${escapeHtml(photos[0])}" alt="${escapeHtml(p.titre)}" onerror="this.closest('.property-photos').classList.add('photo-missing'); this.remove();">
           <span class="photo-count"><i data-lucide="image"></i> ${photos.length}</span>
           <span class="photo-zoom"><i data-lucide="maximize-2"></i></span>
         </div>`
      : '<div class="property-no-photo"><i data-lucide="image"></i><span>Aucune photo</span></div>';

    const tone = p.statut === "disponible" ? "success" : (p.statut === "loue" ? "info" : "neutral");
    const label = p.statut === "disponible" ? "Disponible" : (p.statut === "loue" ? "Loué" : "Archivé");

    return `<article class="property-card card">
      <div class="card-top">
        <span class="badge badge-${tone}">${label}</span>
        <span class="card-id">#${p.id}</span>
      </div>
      ${photosHtml}
      <h3 class="card-title">${escapeHtml(p.titre)}</h3>
      <p class="card-sub"><i data-lucide="map-pin"></i> ${escapeHtml(p.adresse)}${p.ville ? ` · ${escapeHtml(p.ville)}` : ""}</p>
      <div class="card-metrics">
        <div><span>Loyer</span><strong>${formatMoney(p.loyer)}</strong></div>
        ${Number(p.charges) > 0 ? `<div><span>Charges</span><strong>${formatMoney(p.charges)}</strong></div>` : ""}
      </div>
      ${p.description ? `<p class="card-desc">${escapeHtml(p.description)}</p>` : ""}
      <div class="card-actions">
        <label for="photos-${p.id}" class="btn-secondary btn-sm"><i data-lucide="camera"></i> Ajouter des photos</label>
        <input type="file" id="photos-${p.id}" accept="image/*" multiple hidden onchange="uploadPhotos(${p.id}, this.files)">
        <button class="btn-secondary btn-sm" onclick="openEditProperty(${p.id})"><i data-lucide="pencil"></i> Modifier</button>
        <button class="btn-ghost btn-sm danger-text" onclick="deleteProperty(${p.id})"><i data-lucide="trash-2"></i> Supprimer</button>
      </div>
    </article>`;
  }).join("");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function openPropertyGallery(propertyId) {
  const property = globalData.properties.find((p) => Number(p.id) === Number(propertyId));
  if (!property) return;
  let photos = [];
  try { photos = property.photos ? JSON.parse(property.photos) : []; } catch (err) { photos = []; }
  if (photos.length === 0) {
    showToast("Aucune photo pour ce logement", "info");
    return;
  }
  openImageLightbox(photos, 0, property.titre);
}

function openEditProperty(propertyId) {
  const property = globalData.properties.find((p) => Number(p.id) === Number(propertyId));
  if (!property) return;

  document.getElementById("editPropertyId").value = property.id;
  document.getElementById("editPropertyTitre").value = property.titre || "";
  document.getElementById("editPropertyAdresse").value = property.adresse || "";
  document.getElementById("editPropertyVille").value = property.ville || "";
  document.getElementById("editPropertyLoyer").value = property.loyer ?? "";
  document.getElementById("editPropertyStatut").value = property.statut || "disponible";
  document.getElementById("editPropertyDescription").value = property.description || "";
  document.getElementById("editPropertyModal").style.display = "flex";
}

function closeEditPropertyModal() {
  document.getElementById("editPropertyModal").style.display = "none";
}

async function savePropertyEdit(event) {
  event.preventDefault();
  const id = document.getElementById("editPropertyId").value;
  const body = {
    titre: document.getElementById("editPropertyTitre").value,
    adresse: document.getElementById("editPropertyAdresse").value,
    ville: document.getElementById("editPropertyVille").value,
    loyer: Number(document.getElementById("editPropertyLoyer").value),
    statut: document.getElementById("editPropertyStatut").value,
    description: document.getElementById("editPropertyDescription").value
  };

  try {
    const response = await fetch(`${API_URL}/properties/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { showToast(data.message || "Modification impossible", "error"); return; }
    showToast("Logement mis à jour", "success");
    closeEditPropertyModal();
    loadProperties();
    loadDashboard();
  } catch (err) { showToast("Erreur serveur", "error"); }
}

function deleteProperty(propertyId) {
  const property = globalData.properties.find((p) => Number(p.id) === Number(propertyId));
  if (!property) return;

  confirmAction({
    title: "Supprimer ce logement ?",
    message: `« ${property.titre} » sera définitivement supprimé. Les logements avec un historique de contrats ou des signalements doivent être archivés, pas supprimés.`,
    confirmLabel: "Supprimer",
    cancelLabel: "Annuler",
    danger: true,
    onConfirm: async () => {
      try {
        const response = await fetch(`${API_URL}/properties/${propertyId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) { showToast(data.message || "Suppression impossible", "error"); return; }
        showToast("Logement supprimé", "success");
        loadProperties();
        loadDashboard();
      } catch (err) { showToast("Erreur serveur", "error"); }
    }
  });
}

function renderTenants(tenants) {
  const container = document.getElementById("tenantsList");
  if (tenants.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="users"></i><h3>Aucun locataire</h3><p>Les locataires apparaîtront ici dès qu\'un contrat sera actif.</p></div>';
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  container.innerHTML = tenants.map(l => {
    const avatarHtml = l.photo_profil
      ? `<img class="avatar avatar-lg" src="${escapeHtml(l.photo_profil)}" alt="">`
      : `<span class="avatar avatar-lg avatar-initials">${escapeHtml(String(l.nom || "?").charAt(0).toUpperCase())}</span>`;

    return `<article class="property-card card">
      <div class="card-top">
        <span class="badge badge-${l.contract_statut === "actif" ? "success" : "warning"}">${l.contract_statut === "actif" ? "Actif" : "En attente"}</span>
        <span class="card-id">#${l.id}</span>
      </div>
      <div class="person-row">
        ${avatarHtml}
        <div>
          <h3 class="card-title">${escapeHtml(l.nom)}</h3>
          <p class="card-sub"><i data-lucide="mail"></i> ${escapeHtml(l.email)}</p>
          <p class="card-sub"><i data-lucide="phone"></i> ${escapeHtml(l.telephone || "—")}</p>
        </div>
      </div>
      <div class="card-metrics">
        <div><span>Logement</span><strong>${escapeHtml(l.property_titre)}</strong></div>
        <div><span>Loyer</span><strong>${formatMoney(l.montant_loyer)}</strong></div>
      </div>
      <p class="card-note">Du ${formatDate(l.date_debut)}${l.date_fin ? ` au ${formatDate(l.date_fin)}` : ""}</p>
      <p class="contract-signature ${l.doit_changer_mot_de_passe === 1 ? "unsigned" : "signed"}">
        ${l.doit_changer_mot_de_passe === 1 ? "Mot de passe temporaire non changé" : "Mot de passe personnalisé"}
      </p>
      <div class="card-actions">
        <button class="btn-secondary btn-sm" onclick="openDocsModal(${l.id})"><i data-lucide="id-card"></i> Documents</button>
        <button class="btn-ghost btn-sm danger-text" onclick="deleteTenant(${l.id})"><i data-lucide="trash-2"></i> Supprimer</button>
      </div>
    </article>`;
  }).join("");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderContracts(contracts) {
  const container = document.getElementById("contractsList");
  if (contracts.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="file-text"></i><h3>Aucun contrat</h3><p>Créez un contrat pour formaliser une location.</p></div>';
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  container.innerHTML = contracts.map(c => {
    const estTermine = c.statut === "termine";
    const tone = c.statut === "actif" ? "success" : (c.statut === "en_attente" ? "warning" : "neutral");
    const label = c.statut === "actif" ? "Actif" : (c.statut === "en_attente" ? "En attente" : "Terminé");

    const fin = c.date_fin ? new Date(c.date_fin) : null;
    const joursRestants = fin ? Math.ceil((fin.getTime() - Date.now()) / 86400000) : null;
    const bientot = c.statut === "actif" && joursRestants !== null && joursRestants <= 60;
    const expire = joursRestants !== null && joursRestants < 0;
    const renewBadge = bientot
      ? `<div class="renew-badge ${expire || joursRestants <= 30 ? "danger" : "warning"}">
           <i data-lucide="calendar-clock"></i>
           ${expire ? "Contrat expiré" : `Expire dans ${joursRestants} jour${joursRestants > 1 ? "s" : ""}`}
         </div>`
      : "";

    return `<article class="property-card card">
      <div class="card-top">
        <span class="badge badge-${tone}">${label}</span>
        <span class="card-id">CTR-${String(c.id).padStart(4, "0")}</span>
      </div>
      <h3 class="card-title">${escapeHtml(c.property_titre)}</h3>
      <p class="card-sub"><i data-lucide="map-pin"></i> ${escapeHtml(c.property_adresse)}</p>
      <div class="person-row">
        <span class="avatar avatar-sm avatar-initials">${escapeHtml(String(c.locataire_nom || "?").charAt(0).toUpperCase())}</span>
        <div>
          <p class="card-sub"><strong>${escapeHtml(c.locataire_nom)}</strong></p>
          <p class="card-sub">${escapeHtml(c.locataire_email)}</p>
        </div>
      </div>
      <div class="card-metrics">
        <div><span>Loyer</span><strong>${formatMoney(c.montant_loyer)}</strong></div>
        <div><span>Début</span><strong>${formatDate(c.date_debut)}</strong></div>
        <div><span>Fin</span><strong>${c.date_fin ? formatDate(c.date_fin) : "Indéterminée"}</strong></div>
      </div>
      ${renewBadge}
      ${c.clauses_personnalisees ? `<p class="card-desc"><strong>Clauses :</strong> ${escapeHtml(c.clauses_personnalisees.slice(0, 140))}${c.clauses_personnalisees.length > 140 ? "…" : ""}</p>` : ""}
      ${c.date_terminaison ? `<p class="card-note">Terminé le ${formatDate(c.date_terminaison)}</p>` : ""}
      <p class="contract-signature ${c.signature_bailleur ? "signed" : "unsigned"}">${c.signature_bailleur ? "Signé par vous" : "En attente de votre signature"}</p>
      <p class="contract-signature ${c.signature_locataire ? "signed" : "unsigned"}">${c.signature_locataire ? "Signé par le locataire" : "En attente du locataire"}</p>
      <div class="card-actions">
        ${!c.signature_bailleur && !estTermine ? `<button class="btn-primary btn-sm" onclick="signContract(${c.id})"><i data-lucide="pen-line"></i> Signer</button>` : ""}
        ${bientot ? `<button class="btn-primary btn-sm" onclick="openRenewModal(${c.id}, '${String(c.date_fin).slice(0, 10)}')"><i data-lucide="refresh-cw"></i> Renouveler</button>` : ""}
        ${!estTermine && !c.signature_locataire ? `<button class="btn-secondary btn-sm" onclick="editClauses(${c.id})"><i data-lucide="pencil"></i> Clauses</button>` : ""}
        <button class="btn-secondary btn-sm" onclick="openContractPDF(${c.id})"><i data-lucide="file-text"></i> Voir le PDF</button>
        <button class="btn-ghost btn-sm" onclick="downloadContractPDF(${c.id})" title="Télécharger le contrat"><i data-lucide="download"></i> Télécharger</button>
        ${!estTermine ? `<button class="btn-ghost btn-sm danger-text" onclick="terminerContrat(${c.id})"><i data-lucide="x-circle"></i> Mettre fin</button>` : ""}
      </div>
    </article>`;
  }).join("");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function statutPaiement(p) {
  if (p.statut_bailleur === "valide") return { badge: "Validé", tone: "success" };
  if (p.statut_bailleur === "refuse") return { badge: "Refusé", tone: "danger" };
  return { badge: "À valider", tone: "warning" };
}

function noteRefus(p) {
  if (p.statut_bailleur !== "refuse") return "";
  const date = p.date_decision ? ` le ${formatDate(p.date_decision)}` : "";
  return `<div class="decision-note danger">
    <i data-lucide="x-circle"></i>
    <div>
      <strong>Refusé${date}</strong>
      <p>${escapeHtml(p.motif_refus || "Aucun motif précisé.")}</p>
    </div>
  </div>`;
}

function boutonsValidation(p, lotId) {
  if (p.statut_bailleur !== "en_attente") return "";
  const cible = lotId ? `validerLot('${lotId}', 'valide')` : `validerPaiement(${p.id}, 'valide')`;
  const cibleRefus = lotId ? `validerLot('${lotId}', 'refuse')` : `validerPaiement(${p.id}, 'refuse')`;
  return `<button class="btn-primary btn-sm" onclick="${cible}"><i data-lucide="check"></i> Valider${lotId ? " le lot" : ""}</button>
    <button class="btn-ghost btn-sm danger-text" onclick="${cibleRefus}"><i data-lucide="x"></i> Refuser${lotId ? " le lot" : ""}</button>`;
}

function renderPaymentCard(p) {
  const { badge, tone } = statutPaiement(p);
  const documentLabel = p.statut_bailleur === "valide" ? "Quittance" : (p.statut_bailleur === "refuse" ? "Reçu de refus" : "Reçu provisoire");

  return `<article class="property-card card ${p.statut_bailleur === "refuse" ? "card-alert" : ""}">
    <div class="card-top">
      <span class="badge badge-${tone}">${badge}</span>
      <span class="card-id">${escapeHtml(formatMonth(p.mois_label || p.mois))}</span>
    </div>
    <h3 class="card-title">${escapeHtml(p.property_titre)}</h3>
    <p class="card-sub"><i data-lucide="user"></i> ${escapeHtml(p.locataire_nom)}</p>
    <div class="card-metrics">
      <div><span>Montant</span><strong>${formatMoney(p.montant)}</strong></div>
      <div><span>Méthode</span><strong>${escapeHtml((p.methode || "—").replace("_", " "))}</strong></div>
      <div><span>Déclaré le</span><strong>${formatDate(p.date_paiement)}</strong></div>
    </div>
    ${noteRefus(p)}
    <div class="card-actions">
      ${p.preuve_paiement ? `<button class="btn-secondary btn-sm" onclick="openProtectedFile('/api/payments/${p.id}/preuve', 'Preuve de paiement')"><i data-lucide="eye"></i> Preuve</button>` : ""}
      ${boutonsValidation(p)}
      <button class="btn-secondary btn-sm" onclick="openReceiptPDF(${p.id})"><i data-lucide="receipt"></i> ${documentLabel}</button>
      <button class="btn-ghost btn-sm" onclick="downloadReceiptPDF(${p.id})" title="Télécharger le PDF"><i data-lucide="download"></i></button>
    </div>
  </article>`;
}

function renderPaymentLot(groupe) {
  const items = groupe.items;
  const premier = items[0];
  const { badge, tone } = statutPaiement(premier);
  const total = items.reduce((somme, p) => somme + Number(p.montant || 0), 0);

  return `<article class="property-card card ${premier.statut_bailleur === "refuse" ? "card-alert" : ""}">
    <div class="card-top">
      <span class="badge badge-${tone}">${badge}</span>
      <span class="card-id">Paiement groupé · ${items.length} mois</span>
    </div>
    <h3 class="card-title">${escapeHtml(premier.property_titre)}</h3>
    <p class="card-sub"><i data-lucide="user"></i> ${escapeHtml(premier.locataire_nom)}</p>
    <div class="lot-months">
      ${items.map((p) => `<span class="lot-month">
        ${escapeHtml(formatMonth(p.mois_label || p.mois))}
        <button type="button" onclick="openReceiptPDF(${p.id})" title="Voir le PDF"><i data-lucide="eye"></i></button>
        <button type="button" onclick="downloadReceiptPDF(${p.id})" title="Télécharger"><i data-lucide="download"></i></button>
      </span>`).join("")}
    </div>
    <div class="card-metrics">
      <div><span>Total</span><strong>${formatMoney(total)}</strong></div>
      <div><span>Mois réglés</span><strong>${items.length}</strong></div>
      <div><span>Déclaré le</span><strong>${formatDate(premier.date_paiement)}</strong></div>
    </div>
    ${noteRefus(premier)}
    <div class="card-actions">
      ${premier.preuve_paiement ? `<button class="btn-secondary btn-sm" onclick="openProtectedFile('/api/payments/${premier.id}/preuve', 'Preuve de paiement')"><i data-lucide="eye"></i> Preuve</button>` : ""}
      ${boutonsValidation(premier, groupe.lotId)}
    </div>
  </article>`;
}

function renderPayments(payments) {
  const container = document.getElementById("paymentsList");
  if (payments.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="credit-card"></i><h3>Aucun paiement</h3><p>Les paiements déclarés par vos locataires apparaîtront ici.</p></div>';
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  const groupes = [];
  const lots = new Map();
  for (const paiement of payments) {
    if (paiement.lot_id) {
      if (!lots.has(paiement.lot_id)) {
        const groupe = { lotId: paiement.lot_id, items: [] };
        lots.set(paiement.lot_id, groupe);
        groupes.push(groupe);
      }
      lots.get(paiement.lot_id).items.push(paiement);
    } else {
      groupes.push({ lotId: null, items: [paiement] });
    }
  }

  container.innerHTML = groupes
    .map((groupe) => (groupe.items.length > 1 ? renderPaymentLot(groupe) : renderPaymentCard(groupe.items[0])))
    .join("");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function openValidationModal({ id = "", lotId = "", statut }) {
  document.getElementById("validatePaymentId").value = id;
  document.getElementById("validatePaymentLot").value = lotId;
  document.getElementById("validatePaymentAction").value = statut;

  const motifGroup = document.getElementById("validatePaymentMotifGroup");
  const motifInput = document.getElementById("validatePaymentMotif");
  motifInput.value = "";

  if (statut === "valide") {
    document.getElementById("validatePaymentTitle").textContent = lotId ? "Valider le lot" : "Valider le paiement";
    document.getElementById("validatePaymentText").textContent = "Confirmez-vous avoir bien reçu ce paiement sur votre compte ?";
    document.getElementById("validatePaymentBtn").style.background = "var(--success)";
    document.getElementById("validatePaymentBtn").textContent = "Oui, valider";
    motifGroup.style.display = "none";
    motifInput.required = false;
  } else {
    document.getElementById("validatePaymentTitle").textContent = lotId ? "Refuser le lot" : "Refuser le paiement";
    document.getElementById("validatePaymentText").textContent = "Indiquez au locataire pourquoi ce paiement est refusé : il pourra corriger et déclarer un nouveau paiement pour les mêmes mois.";
    document.getElementById("validatePaymentBtn").style.background = "var(--danger)";
    document.getElementById("validatePaymentBtn").textContent = "Oui, refuser";
    motifGroup.style.display = "";
    motifInput.required = true;
    setTimeout(() => motifInput.focus(), 80);
  }

  document.getElementById("validatePaymentModal").style.display = "flex";
}

function validerPaiement(id, statut) { openValidationModal({ id, statut }); }
function validerLot(lotId, statut) { openValidationModal({ lotId, statut }); }

function closeValidatePaymentModal() {
  document.getElementById("validatePaymentModal").style.display = "none";
}

async function confirmValidatePayment() {
  const id = document.getElementById("validatePaymentId").value;
  const lotId = document.getElementById("validatePaymentLot").value;
  const statut = document.getElementById("validatePaymentAction").value;
  const motif = document.getElementById("validatePaymentMotif").value.trim();

  if (statut === "refuse" && motif.length < 5) {
    showToast("Merci d'indiquer un motif de refus (5 caractères minimum).", "error");
    document.getElementById("validatePaymentMotif").focus();
    return;
  }

  const url = lotId ? `${API_URL}/payments/lots/${lotId}/valider` : `${API_URL}/payments/${id}/valider`;

  try {
    const r = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ statut_bailleur: statut, motif_refus: motif })
    });

    if (r.ok) {
      showToast(
        statut === "valide"
          ? (lotId ? "Lot validé." : "Paiement validé.")
          : "Paiement refusé — le locataire peut corriger et repayer.",
        "success"
      );
      closeValidatePaymentModal();
      loadPayments();
      loadDashboard();
      if (window.loadNotifications) window.loadNotifications();
    } else {
      const data = await r.json();
      showToast(data.message, "error");
    }
  } catch (err) { showToast("Erreur", "error"); }
}

function renderIncidents(incidents) {
  const container = document.getElementById("incidentsList");
  if (incidents.length === 0) {
    container.innerHTML = '<div class="empty-state"><i data-lucide="wrench"></i><h3>Aucun incident</h3><p>Vos locataires n\'ont signalé aucun problème.</p></div>';
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
      <p class="card-sub"><i data-lucide="user"></i> ${escapeHtml(i.locataire_nom)} · ${escapeHtml(i.locataire_tel || "—")}</p>
      <p class="card-desc">${escapeHtml(i.description)}</p>
      <p class="card-note">Signalé le ${formatDate(i.date_creation)}</p>
      <div class="card-actions">
        ${i.photo ? `<button class="btn-secondary btn-sm" onclick="openProtectedFile('/api/incidents/${i.id}/photo', 'Photo du signalement')"><i data-lucide="image"></i> Voir la photo</button>` : ""}
        <select onchange="updateIncidentStatus(${i.id}, this.value)" class="input input-sm" aria-label="Statut de l'incident">
          <option value="ouvert" ${i.statut === "ouvert" ? "selected" : ""}>Ouvert</option>
          <option value="en_cours" ${i.statut === "en_cours" ? "selected" : ""}>En cours</option>
          <option value="resolu" ${i.statut === "resolu" ? "selected" : ""}>Résolu</option>
        </select>
      </div>
    </article>`;
  }).join("");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

// ============================================
// 4. ACTIONS
// ============================================
function openPropertyModal() { document.getElementById("propertyModal").style.display = "flex"; }
function closePropertyModal() { document.getElementById("propertyModal").style.display = "none"; }

document.getElementById("propertyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    titre: document.getElementById("titre").value,
    adresse: document.getElementById("adresse").value,
    ville: document.getElementById("ville").value,
    loyer: parseFloat(document.getElementById("loyer").value),
    description: document.getElementById("description").value
  };

  try {
    const response = await fetch(API_URL + "/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (response.ok) {
      const photoInput = document.getElementById("photos");
      if (photoInput && photoInput.files.length > 0) await uploadPhotos(data.propertyId, photoInput.files);
      showToast("Logement créé !", "success");
      document.getElementById("propertyForm").reset();
      closePropertyModal();
      loadProperties();
    } else showToast(data.message, "error");
  } catch (err) { showToast("Erreur serveur", "error"); }
});

async function uploadPhotos(propertyId, files) {
  if (!files || files.length === 0) return;
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) formData.append("photos", files[i]);

  try {
    const r = await fetch(API_URL + "/properties/" + propertyId + "/photos", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });
    if (r.ok) loadProperties();
  } catch (err) { showToast("Erreur upload", "error"); }
}

function dateDuJour() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function afficherErreurContrat(message) {
  const box = document.getElementById("contractFormError");
  if (!box) return;
  box.textContent = message || "";
  box.style.display = message ? "block" : "none";
}

function openContractModal() {
  afficherErreurContrat("");
  const debut = document.getElementById("contractDebut");
  debut.min = dateDuJour();
  if (!debut.value) debut.value = dateDuJour();

  const select = document.getElementById("contractProperty");
  select.innerHTML = '<option value="">-- Choisir --</option>';
  globalData.properties.filter(p => p.statut === "disponible").forEach(p => {
    select.innerHTML += `<option value="${Number(p.id)}" data-loyer="${Number(p.loyer) || 0}">${escapeHtml(p.titre)} — ${escapeHtml(p.adresse)}</option>`;
  });
  select.onchange = () => {
    const opt = select.options[select.selectedIndex];
    if (opt && opt.dataset.loyer) document.getElementById("contractMontant").value = opt.dataset.loyer;
  };
  document.getElementById("contractModal").style.display = "flex";
}
function closeContractModal() {
  afficherErreurContrat("");
  document.getElementById("contractModal").style.display = "none";
}

document.getElementById("contractForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  afficherErreurContrat("");

  const body = {
    property_id: parseInt(document.getElementById("contractProperty").value),
    locataire_email: document.getElementById("contractLocataire").value,
    locataire_nom: document.getElementById("contractLocataireNom").value || null,
    locataire_telephone: document.getElementById("contractLocataireTel").value || null,
    date_debut: document.getElementById("contractDebut").value,
    date_fin: document.getElementById("contractFin").value || null,
    montant_loyer: parseFloat(document.getElementById("contractMontant").value),
    clauses_personnalisees: document.getElementById("contractClauses").value || null
  };

  if (!body.date_debut || body.date_debut < dateDuJour()) {
    afficherErreurContrat("La date de début ne peut pas être dans le passé. Choisissez aujourd'hui ou une date future.");
    document.getElementById("contractDebut").focus();
    return;
  }
  if (body.date_fin && body.date_fin <= body.date_debut) {
    afficherErreurContrat("La date de fin doit être postérieure à la date de début.");
    document.getElementById("contractFin").focus();
    return;
  }

  try {
    const response = await fetch(API_URL + "/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (response.ok) {
      showToast("Contrat créé !", "success");
      document.getElementById("contractForm").reset();
      closeContractModal();
      if (data.mot_de_passe_temporaire) {
        currentPassword = data.mot_de_passe_temporaire;
        document.getElementById("passwordDisplay").textContent = data.mot_de_passe_temporaire;
        document.getElementById("passwordModal").style.display = "flex";
      }
      loadProperties(); loadContracts(); loadTenants();
      if (window.loadNotifications) window.loadNotifications();
    } else {
      afficherErreurContrat(data.message || "Impossible de créer le contrat.");
    }
  } catch (err) { afficherErreurContrat("Erreur serveur. Réessayez dans un instant."); }
});

function closePasswordModal() {
  document.getElementById("passwordModal").style.display = "none";
  currentPassword = "";
}

function copyPassword() {
  if (!currentPassword) return;
  navigator.clipboard.writeText(currentPassword).then(() => showToast("Copié", "success")).catch(() => {
    const el = document.createElement("textarea");
    el.value = currentPassword;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
    showToast("Copié", "success");
  });
}

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
      loadProperties();
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

function terminerContrat(id) {
  document.getElementById("terminateContractId").value = id;
  document.getElementById("terminateMotif").value = "";
  document.getElementById("terminateContractModal").style.display = "flex";
}

function closeTerminateModal() {
  document.getElementById("terminateContractModal").style.display = "none";
}

document.getElementById("terminateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("terminateContractId").value;
  const motif = document.getElementById("terminateMotif").value;

  try {
    const r = await fetch(API_URL + "/contracts/" + id + "/terminer", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ motif: motif || "Non precise" })
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      showToast(data.message || "Contrat terminé", "success");
      closeTerminateModal();
      loadContracts(); loadProperties(); loadTenants();
      if (window.loadNotifications) window.loadNotifications();
    } else {
      showToast(data.message || "Erreur", "error");
    }
  } catch (err) { showToast("Erreur", "error"); }
});

async function editClauses(contractId) {
  const contrat = globalData.contracts.find(c => Number(c.id) === Number(contractId));
  const clausesActuelles = contrat ? (contrat.clauses_personnalisees || "") : "";
  const nouvelles = prompt("Modifier les clauses du contrat :", clausesActuelles);
  if (nouvelles === null) return;

  try {
    const r = await fetch(API_URL + "/contracts/" + contractId + "/clauses", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ clauses_personnalisees: nouvelles })
    });
    const data = await r.json();
    if (r.ok) {
      showToast("Clauses mises à jour", "success");
      loadContracts();
    } else showToast(data.message, "error");
  } catch (err) { showToast("Erreur serveur", "error"); }
}

async function openContractPDF(id) {
  await openProtectedFile(`/api/contracts/${id}/pdf`, `Contrat CTR-${String(id).padStart(4, "0")}`);
}

async function openReceiptPDF(id) {
  await openProtectedFile(`/api/payments/${id}/quittance`, `Quittance QUI-${String(id).padStart(6, "0")}`);
}

async function downloadContractPDF(id) {
  await downloadPdf(`/api/contracts/${id}/pdf`, `contrat-${id}.pdf`);
}

async function downloadReceiptPDF(id) {
  await downloadPdf(`/api/payments/${id}/quittance`, `quittance-${id}.pdf`);
}

async function downloadPdf(url, filename) {
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showToast(data.message || "Téléchargement impossible", "error");
      return;
    }
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    }, 1500);
  } catch (err) { showToast("Erreur", "error"); }
}

async function deleteTenant(id) {
  const locataire = globalData.tenants.find(t => Number(t.id) === Number(id));
  const nom = locataire ? locataire.nom : "ce locataire";
  if (!confirm(`Supprimer ${nom} et toutes ses données ?`)) return;
  try {
    const r = await fetch(API_URL + "/users/" + id, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await r.json();
    if (r.ok) { showToast("Locataire supprimé", "success"); loadTenants(); }
    else showToast(data.message, "error");
  } catch (err) { showToast("Erreur", "error"); }
}

async function openDocsModal(locataireId) {
  const locataire = globalData.tenants.find(t => Number(t.id) === Number(locataireId));
  const nom = locataire ? locataire.nom : "Locataire";
  document.getElementById("docsModalTitle").textContent = "Documents de " + nom;
  document.getElementById("docsModalContent").innerHTML = '<p class="empty-message">Chargement…</p>';
  document.getElementById("docsModal").style.display = "flex";

  try {
    const response = await fetch(API_URL + "/documents/locataire/" + locataireId, {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    const container = document.getElementById("docsModalContent");

    if (!response.ok) { container.innerHTML = '<p class="empty-message">Erreur.</p>'; return; }
    if (data.documents.length === 0) { container.innerHTML = '<p class="empty-message">Aucun document.</p>'; return; }

    const labels = { cni: "Carte d'identité", passeport: "Passeport", fiche_paie: "Fiche de paie", autre: "Autre" };
    const tone = { valide: "success", refuse: "danger", en_attente: "warning" };

    container.innerHTML = data.documents.map(d => `
      <article class="property-card card">
        <div class="card-top">
          <span class="badge badge-${tone[d.statut] || "neutral"}">${escapeHtml((d.statut || "").replace("_", " "))}</span>
          <span class="card-id">${escapeHtml(labels[d.type] || d.type)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(d.nom_fichier)}</h3>
        ${d.commentaire ? `<p class="card-desc">${escapeHtml(d.commentaire)}</p>` : ""}
        <p class="card-note">Ajouté le ${formatDate(d.date_upload)}</p>
        <div class="card-actions">
          <button class="btn-secondary btn-sm" onclick="openProtectedFile('/api/documents/${d.id}/file', 'Document')"><i data-lucide="eye"></i> Voir</button>
          <button class="btn-secondary btn-sm" onclick="openDocDecision(${d.id}, 'valide', ${locataireId})"><i data-lucide="check"></i> Valider</button>
          <button class="btn-ghost btn-sm danger-text" onclick="openDocDecision(${d.id}, 'refuse', ${locataireId})"><i data-lucide="x"></i> Refuser</button>
        </div>
      </article>
    `).join("");
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) { document.getElementById("docsModalContent").innerHTML = '<p class="empty-message">Erreur.</p>'; }
}

function closeDocsModal() { document.getElementById("docsModal").style.display = "none"; }

function openDocDecision(docId, statut, locataireId) {
  const refuse = statut === "refuse";
  document.getElementById("docDecisionId").value = docId;
  document.getElementById("docDecisionLocataire").value = locataireId;
  document.getElementById("docDecisionStatut").value = statut;
  document.getElementById("docDecisionTitle").textContent = refuse ? "Refuser le document" : "Valider le document";
  document.getElementById("docDecisionText").textContent = refuse
    ? "Indiquez au locataire pourquoi ce document est refusé. Il pourra le remplacer."
    : "Vous pouvez ajouter un commentaire (facultatif).";
  document.getElementById("docDecisionComment").value = "";
  document.getElementById("docDecisionComment").placeholder = refuse
    ? "Ex : la photo est illisible, merci d'envoyer un scan complet."
    : "Commentaire facultatif…";
  const bouton = document.getElementById("docDecisionBtn");
  bouton.textContent = refuse ? "Refuser le document" : "Valider le document";
  bouton.style.background = refuse ? "var(--danger)" : "var(--success)";
  document.getElementById("docDecisionModal").style.display = "flex";
  setTimeout(() => document.getElementById("docDecisionComment").focus(), 80);
}

function closeDocDecision() {
  document.getElementById("docDecisionModal").style.display = "none";
}

async function confirmDocDecision() {
  const docId = document.getElementById("docDecisionId").value;
  const locataireId = document.getElementById("docDecisionLocataire").value;
  const statut = document.getElementById("docDecisionStatut").value;
  const commentaire = document.getElementById("docDecisionComment").value.trim();

  if (statut === "refuse" && commentaire.length < 3) {
    showToast("Merci d'indiquer un motif de refus (3 caractères minimum).", "error");
    document.getElementById("docDecisionComment").focus();
    return;
  }

  try {
    const response = await fetch(`${API_URL}/documents/${docId}/statut`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ statut, commentaire })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { showToast(data.message || "Erreur", "error"); return; }
    showToast(statut === "refuse" ? "Document refusé" : "Document validé", "success");
    closeDocDecision();
    openDocsModal(locataireId);
  } catch (err) { showToast("Erreur", "error"); }
}

async function exportCSV() {
  try {
    const response = await fetch(API_URL + "/payments/export-csv", {
      headers: { "Authorization": "Bearer " + token }
    });

    if (!response.ok) {
      const data = await response.json();
      showToast(data.message || "Erreur d'export", "error");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paiements-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Fichier CSV téléchargé !", "success");
  } catch (err) {
    showToast("Erreur lors de l'export", "error");
  }
}

async function updateIncidentStatus(id, statut) {
  try {
    const r = await fetch(API_URL + "/incidents/" + id + "/statut", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ statut: statut })
    });
    if (r.ok) {
      showToast("Statut mis à jour", "success");
      loadIncidents();
      if (window.loadNotifications) window.loadNotifications();
    }
  } catch (err) { console.error(err); }
}

function openRenewModal(contractId, dateFin) {
  const date = new Date(`${String(dateFin).slice(0, 10)}T00:00:00`);
  date.setFullYear(date.getFullYear() + 1);
  const nouvelleFin = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  document.getElementById("renewContractId").value = contractId;
  document.getElementById("renewDateFin").value = nouvelleFin;
  document.getElementById("renewText").textContent =
    `Le contrat sera prolongé jusqu'à la nouvelle date de fin. Le locataire verra la mise à jour dans son espace.`;
  document.getElementById("renewModal").style.display = "flex";
}

function closeRenewModal() { document.getElementById("renewModal").style.display = "none"; }

async function confirmRenew() {
  const id = document.getElementById("renewContractId").value;
  const nouvelleFin = document.getElementById("renewDateFin").value;
  if (!nouvelleFin) { showToast("Choisissez une nouvelle date de fin.", "error"); return; }

  try {
    const response = await fetch(`${API_URL}/contracts/${id}/renouveler`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nouvelle_date_fin: nouvelleFin })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { showToast(data.message || "Renouvellement impossible", "error"); return; }
    showToast(data.message || "Contrat renouvelé", "success");
    closeRenewModal();
    loadContracts();
    loadDashboard();
  } catch (err) { showToast("Erreur serveur", "error"); }
}

function openRappelModal(contractId) {
  const ligne = (globalData.dashboard || []).find(d => Number(d.contract_id) === Number(contractId));
  const contrat = globalData.contracts.find(c => Number(c.id) === Number(contractId));
  const nom = ligne ? ligne.locataire_nom : (contrat ? contrat.locataire_nom : "locataire");
  const bien = ligne && ligne.property_titre ? ` de votre logement ${ligne.property_titre}` : "";
  const retard = ligne && ligne.mois_en_retard > 0
    ? ` (${ligne.mois_en_retard} mois en retard)`
    : "";
  document.getElementById("rappelContractId").value = contractId;
  document.getElementById("rappelMessage").value = `Bonjour ${nom}, nous vous rappelons que le loyer${bien} est en attente${retard}. Merci de régulariser votre situation.`;
  document.getElementById("rappelModal").style.display = "flex";
}
function closeRappelModal() { document.getElementById("rappelModal").style.display = "none"; }

document.getElementById("rappelForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    contract_id: parseInt(document.getElementById("rappelContractId").value),
    message: document.getElementById("rappelMessage").value
  };
  try {
    const r = await fetch(API_URL + "/payments/rappel", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(body)
    });
    if (r.ok) {
      showToast("Rappel envoyé", "success");
      closeRappelModal();
      loadDashboard();
      if (window.loadNotifications) window.loadNotifications();
    }
  } catch (err) { showToast("Erreur", "error"); }
});

// INITIALISATION
loadDashboard();
loadProperties();
loadContracts();
loadTenants();
loadPayments();
loadIncidents();

// LANCEMENT DES GRAPHIQUES
if (typeof window.loadChartRevenus === "function") {
  setTimeout(() => {
    window.loadChartRevenus();
    window.loadChartRepartition();
  }, 500);
}