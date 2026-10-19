// ============================================
// calendar.js — Calendrier des échéances
// ============================================

const CALENDAR_API = "/api/calendar";
const calendarToken = localStorage.getItem("token");

let calendarCurrentDate = new Date();
let calendarEvents = {};

// ============================================
// AFFICHER LE CALENDRIER
// ============================================
async function loadCalendar(mois, annee) {
  const container = document.getElementById("calendarContent");
  if (!container) return;

  // Valeurs par défaut
  if (!mois) mois = calendarCurrentDate.getMonth() + 1;
  if (!annee) annee = calendarCurrentDate.getFullYear();

  try {
    const response = await fetch(`${CALENDAR_API}?mois=${mois}&annee=${annee}`, {
      headers: { "Authorization": "Bearer " + calendarToken }
    });
    const data = await response.json();
    if (!response.ok) {
      container.innerHTML = '<p class="empty-message">Erreur.</p>';
      return;
    }

    calendarEvents = data.evenements;

    // En-tête du calendrier
    let html = '<div class="calendar-header">' +
      '<button class="calendar-nav" onclick="navigateMonth(-1)">←</button>' +
      '<h3 class="calendar-month">' + escapeHtml(data.mois_nom) + '</h3>' +
      '<button class="calendar-nav" onclick="navigateMonth(1)">→</button>' +
      '</div>';

    // Statistiques du mois
    html += '<div class="calendar-stats">' +
      '<div class="calendar-stat">' +
        '<span class="calendar-stat-value">' + data.stats.loyers_payes + '/' + data.stats.loyers_attendus + '</span>' +
        '<span class="calendar-stat-label">Loyers payés</span>' +
      '</div>' +
      '<div class="calendar-stat">' +
        '<span class="calendar-stat-value">' + data.stats.montant_attendu + ' $</span>' +
        '<span class="calendar-stat-label">Attendu</span>' +
      '</div>' +
      '<div class="calendar-stat">' +
        '<span class="calendar-stat-value">' + data.stats.incidents + '</span>' +
        '<span class="calendar-stat-label">Incidents</span>' +
      '</div>' +
      '<div class="calendar-stat">' +
        '<span class="calendar-stat-value">' + data.stats.echeances + '</span>' +
        '<span class="calendar-stat-label">Échéances</span>' +
      '</div>' +
      '</div>';

    // Grille du calendrier
    const premierJour = new Date(annee, mois - 1, 1);
    const dernierJour = new Date(annee, mois, 0);
    const joursDansMois = dernierJour.getDate();
    let jourSemaine = premierJour.getDay();
    if (jourSemaine === 0) jourSemaine = 7;
    jourSemaine = jourSemaine - 1; // 0 = lundi

    const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const aujourdHui = new Date();
    const estMoisActuel = (aujourdHui.getMonth() + 1) === mois && aujourdHui.getFullYear() === annee;

    html += '<div class="calendar-grid">';
    jours.forEach(j => {
      html += '<div class="calendar-day-header">' + j + '</div>';
    });

    // Cases vides au début
    for (let i = 0; i < jourSemaine; i++) {
      html += '<div class="calendar-day empty"></div>';
    }

    // Jours du mois
    for (let j = 1; j <= joursDansMois; j++) {
      const events = calendarEvents[j] || [];
      const hasEvents = events.length > 0;
      const isToday = estMoisActuel && aujourdHui.getDate() === j;

      let classes = "calendar-day";
      if (hasEvents) classes += " has-events";
      if (isToday) classes += " today";

      html += '<div class="' + classes + '" onclick="showDayEvents(' + j + ')">' +
        '<span class="calendar-day-number">' + j + '</span>';

      if (hasEvents) {
        html += '<div class="calendar-day-events">';
        events.slice(0, 2).forEach(e => {
          const icon = e.type === "loyer" ? (e.statut === "paye" ? "✅" : "💰") :
                       e.type === "echeance" ? "⏰" :
                       e.type === "incident" ? "🔧" : "🔔";
          html += '<span class="calendar-event-dot" title="' + escapeHtml(e.description) + '">' + icon + '</span>';
        });
        if (events.length > 2) {
          html += '<span class="calendar-event-more">+' + (events.length - 2) + '</span>';
        }
        html += '</div>';
      }

      html += '</div>';
    }

    html += '</div>';

    // Liste des événements du mois
    const tousEvents = [];
    Object.keys(calendarEvents).forEach(j => {
      calendarEvents[j].forEach(e => {
        tousEvents.push({ ...e, jour: parseInt(j) });
      });
    });
    tousEvents.sort((a, b) => a.jour - b.jour);

    if (tousEvents.length > 0) {
      html += '<h3 class="calendar-section-title">📋 Détail des événements du mois</h3>';
      html += '<div class="calendar-events-list">';
      tousEvents.forEach(e => {
        const icon = e.type === "loyer" ? (e.statut === "paye" ? "✅" : "💰") :
                     e.type === "echeance" ? "⏰" :
                     e.type === "incident" ? "🔧" : "🔔";
        const label = e.type === "loyer" ? "Loyer" :
                      e.type === "echeance" ? "Échéance" :
                      e.type === "incident" ? "Incident" : "Rappel";
        const statutClass = e.statut === "paye" ? "actif" :
                           e.statut === "en_attente" ? "en_attente" :
                           e.statut === "ouvert" ? "en_attente" : "";

        html += '<div class="calendar-event-item">' +
          '<div class="calendar-event-icon">' + icon + '</div>' +
          '<div class="calendar-event-info">' +
            '<div class="calendar-event-day">Le ' + e.jour + ' — ' + label + '</div>' +
            '<div class="calendar-event-title">' + escapeHtml(e.titre) + '</div>' +
            '<div class="calendar-event-desc">' + escapeHtml(e.description) + '</div>' +
          '</div>' +
          (e.statut ? '<span class="calendar-event-badge ' + statutClass + '">' + escapeHtml(e.statut.replace("_", " ")) + '</span>' : '') +
          '</div>';
      });
      html += '</div>';
    } else {
      html += '<p class="empty-message">Aucun événement ce mois-ci.</p>';
    }

    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="empty-message">Erreur.</p>';
  }
}

// ============================================
// NAVIGATION MOIS
// ============================================
function navigateMonth(delta) {
  calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + delta);
  loadCalendar(calendarCurrentDate.getMonth() + 1, calendarCurrentDate.getFullYear());
}

// ============================================
// AFFICHER LES ÉVÉNEMENTS D'UN JOUR
// ============================================
function showDayEvents(jour) {
  const events = calendarEvents[jour] || [];
  if (events.length === 0) return;

  const container = document.getElementById("dayEventsContent");
  const title = document.getElementById("dayEventsTitle");

  const moisNom = calendarCurrentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  title.textContent = `Événements du ${jour} ${moisNom}`;

  container.innerHTML = events.map(e => {
    const icon = e.type === "loyer" ? (e.statut === "paye" ? "✅" : "💰") :
                 e.type === "echeance" ? "⏰" :
                 e.type === "incident" ? "🔧" : "🔔";
    const label = e.type === "loyer" ? "Loyer" :
                  e.type === "echeance" ? "Échéance" :
                  e.type === "incident" ? "Incident" : "Rappel";
    return '<div class="calendar-event-item">' +
      '<div class="calendar-event-icon">' + icon + '</div>' +
      '<div class="calendar-event-info">' +
        '<div class="calendar-event-day">' + label + '</div>' +
        '<div class="calendar-event-title">' + escapeHtml(e.titre) + '</div>' +
        '<div class="calendar-event-desc">' + escapeHtml(e.description) + '</div>' +
      '</div>' +
      '</div>';
  }).join("");

  document.getElementById("dayEventsModal").style.display = "flex";
}

function closeDayEventsModal() {
  document.getElementById("dayEventsModal").style.display = "none";
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  // Charger seulement si l'onglet existe
  if (document.getElementById("calendarContent")) {
    setTimeout(() => loadCalendar(), 600);
  }
});

window.loadCalendar = loadCalendar;
window.navigateMonth = navigateMonth;
window.showDayEvents = showDayEvents;
window.closeDayEventsModal = closeDayEventsModal;
