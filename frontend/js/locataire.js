// ============================================
// locataire.js — Espace locataire + incidents
// ============================================

const API_URL = "/api";
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) window.location.href = "login.html";
if (user && user.role !== "locataire") window.location.href = "bailleur.html";

document.getElementById("userName").textContent = `👤 ${user.nom}`;

let allProperties = [];

// ============================================
// 1. Charger les logements disponibles
// ============================================
async function loadProperties() {
  const container = document.getElementById("propertiesList");
  try {
    const response = await fetch(`${API_URL}/properties`);
    const data = await response.json();
    if (!response.ok) {
      container.innerHTML = `<p class="empty-message">Erreur : ${data.message}</p>`;
      return;
    }
    allProperties = data.properties;
    renderProperties(allProperties);
  } catch (err) {
    container.innerHTML = `<p class="empty-message">Impossible de contacter le serveur.</p>`;
  }
}

function renderProperties(properties) {
  const container = document.getElementById("propertiesList");
  if (properties.length === 0) {
    container.innerHTML = `<p class="empty-message">Aucun logement trouvé.</p>`;
    return;
  }
  container.innerHTML = properties.map(p => `
    <div class="property-card">
      <div class="property-status ${p.statut}">${p.statut}</div>
      <h3>${p.titre}</h3>
      <p class="property-address">📍 ${p.adresse}${p.ville ? ", " + p.ville : ""}</p>
      <p class="property-price">${p.loyer} $ <small>/ mois</small></p>
      <p class="property-charges">Charges : ${p.charges} $</p>
      ${p.description ? `<p class="property-desc">${p.description}</p>` : ""}
      <p class="property-bailleur">👤 Bailleur : ${p.bailleur_nom || "—"}</p>
      <button class="btn-secondary btn-block" onclick="openIncidentModal(${p.id})">🔧 Signaler un problème</button>
    </div>
  `).join("");
}

// ============================================
// 2. Recherche
// ============================================
document.getElementById("searchInput").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = allProperties.filter(p =>
    p.titre.toLowerCase().includes(q) ||
    (p.ville || "").toLowerCase().includes(q) ||
    (p.adresse || "").toLowerCase().includes(q)
  );
  renderProperties(filtered);
});

// ============================================
// 3. Signaler un incident
// ============================================
function openIncidentModal(propertyId) {
  document.getElementById("incidentPropertyId").value = propertyId;
  document.getElementById("incidentModal").style.display = "flex";
}

function closeIncidentModal() {
  document.getElementById("incidentModal").style.display = "none";
}

document.getElementById("incidentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const messageDiv = document.getElementById("incidentMessage");

  const body = {
    property_id: parseInt(document.getElementById("incidentPropertyId").value),
    description: document.getElementById("incidentDescription").value
  };

  try {
    const response = await fetch(`${API_URL}/incidents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = "✅ Signalement envoyé !";
      messageDiv.className = "message success";
      document.getElementById("incidentForm").reset();
      setTimeout(() => {
        closeIncidentModal();
        messageDiv.className = "message";
        loadMyIncidents();
      }, 1200);
    } else {
      messageDiv.textContent = "❌ " + data.message;
      messageDiv.className = "message error";
    }
  } catch (err) {
    messageDiv.textContent = "❌ Erreur serveur.";
    messageDiv.className = "message error";
  }
});

// ============================================
// 4. Charger mes signalements
// ============================================
async function loadMyIncidents() {
  const container = document.getElementById("incidentsList");
  try {
    const response = await fetch(`${API_URL}/incidents/mes-incidents`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p class="empty-message">Erreur : ${data.message}</p>`;
      return;
    }

    if (data.incidents.length === 0) {
      container.innerHTML = `<p class="empty-message">Vous n'avez encore signalé aucun problème.</p>`;
      return;
    }

    container.innerHTML = data.incidents.map(i => `
      <div class="property-card">
        <div class="property-status ${i.statut === 'resolu' ? 'disponible' : 'loue'}">${i.statut}</div>
        <h3>${i.property_titre}</h3>
        <p class="property-address">📍 ${i.property_adresse}</p>
        <p class="property-desc">${i.description}</p>
        <p class="property-charges">Signalé le : ${new Date(i.date_creation).toLocaleDateString('fr-FR')}</p>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="empty-message">Erreur de chargement.</p>`;
  }
}

// ============================================
// 5. Déconnexion
// ============================================
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

loadProperties();
loadMyIncidents();