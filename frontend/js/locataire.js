// ============================================
// locataire.js — Logique de l'espace locataire
// ============================================

const API_URL = "/api";

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
  window.location.href = "login.html";
}

if (user && user.role !== "locataire") {
  window.location.href = "bailleur.html";
}

document.getElementById("userName").textContent = `👤 ${user.nom}`;

let allProperties = []; // stockage global pour la recherche

// ============================================
// 1. Charger tous les logements disponibles
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
    console.error(err);
  }
}

// ============================================
// 2. Afficher les logements
// ============================================
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
      <button class="btn-primary btn-block" onclick="contactBailleur(${p.id})">Contacter le bailleur</button>
    </div>
  `).join("");
}

// ============================================
// 3. Recherche
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
// 4. Contacter le bailleur (placeholder pour l'instant)
// ============================================
function contactBailleur(propertyId) {
  alert("🚧 La messagerie sera disponible dans une prochaine étape !");
}

// ============================================
// 5. Déconnexion
// ============================================
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// --- Chargement ---
loadProperties();