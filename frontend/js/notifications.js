// ============================================
// notifications.js — Badges dynamiques sur les onglets
// ============================================

const NOTIF_API = "/api/notifications";
const notifToken = localStorage.getItem("token");
const notifUser = JSON.parse(localStorage.getItem("user") || "null");

async function loadNotifications() {
  if (!notifToken || !notifUser) return;

  const endpoint = notifUser.role === "bailleur" ? "/bailleur" : "/locataire";

  try {
    const response = await fetch(NOTIF_API + endpoint, {
      headers: { "Authorization": "Bearer " + notifToken }
    });
    const data = await response.json();
    if (!response.ok) return;

    if (notifUser.role === "bailleur") {
      updateTabBadge("incidents", data.incidents);
      updateTabBadge("contrats", data.contrats);
      updateTabBadge("suivi", data.paiements);
    } else {
      updateTabBadge("rappels", data.rappels);
      updateTabBadge("signalements", data.incidents);
      updateTabBadge("paiements", data.paiements);
    }
  } catch (err) {
    console.error("Erreur notifications:", err);
  }
}

function updateTabBadge(tabName, count) {
  const tab = document.querySelector('.tab[data-tab="' + tabName + '"]');
  if (!tab) return;

  // Supprimer l'ancien badge s'il existe
  const old = tab.querySelector(".tab-badge");
  if (old) old.remove();

  // Ajouter le nouveau si count > 0
  if (count > 0) {
    const badge = document.createElement("span");
    badge.className = "tab-badge pulse";
    badge.textContent = count > 99 ? "99+" : count;
    tab.appendChild(badge);
  }
}

// Charger au démarrage
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(loadNotifications, 800);
});

// Rafraîchir toutes les 60 secondes
setInterval(loadNotifications, 60000);

// Exposer globalement pour rafraîchir après une action
window.loadNotifications = loadNotifications;
