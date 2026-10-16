// ============================================
// charts.js — Graphiques Chart.js responsives
// ============================================

const CHART_API = "/api/charts";
const chartToken = localStorage.getItem("token");

let chartRevenusInstance = null;
let chartRepartitionInstance = null;

// ============================================
// GRAPHIQUE 1 — Revenus mensuels (barres)
// ============================================
async function loadChartRevenus() {
  const canvas = document.getElementById("chartRevenus");
  if (!canvas) return;

  try {
    const response = await fetch(CHART_API + "/revenus", {
      headers: { "Authorization": "Bearer " + chartToken }
    });
    const data = await response.json();
    if (!response.ok) return;

    if (chartRevenusInstance) chartRevenusInstance.destroy();

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, "rgba(99, 102, 241, 0.9)");
    gradient.addColorStop(1, "rgba(236, 72, 153, 0.6)");

    // Détecter si on est sur mobile
    const isMobile = window.innerWidth < 768;

    chartRevenusInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [{
          label: "Revenus ($)",
          data: data.valeurs,
          backgroundColor: gradient,
          borderRadius: isMobile ? 4 : 8,
          borderSkipped: false,
          maxBarThickness: isMobile ? 20 : 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index"
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1e293b",
            padding: isMobile ? 8 : 12,
            titleFont: { size: isMobile ? 11 : 13, weight: "bold" },
            bodyFont: { size: isMobile ? 10 : 12 },
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return context.parsed.y + " $";
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.05)", drawBorder: false },
            ticks: {
              color: "#64748b",
              font: { size: isMobile ? 9 : 11 },
              callback: function(value) {
                if (isMobile && value >= 1000) return (value / 1000).toFixed(0) + "k";
                return value + " $";
              },
              maxTicksLimit: isMobile ? 5 : 8
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: "#64748b",
              font: { size: isMobile ? 9 : 11 },
              maxRotation: isMobile ? 60 : 0,
              minRotation: isMobile ? 45 : 0,
              autoSkip: isMobile
            }
          }
        }
      }
    });
  } catch (err) {
    console.error("Erreur chart revenus:", err);
  }
}

// ============================================
// GRAPHIQUE 2 — Répartition (camembert)
// ============================================
async function loadChartRepartition() {
  const canvas = document.getElementById("chartRepartition");
  if (!canvas) return;

  try {
    const response = await fetch(CHART_API + "/repartition", {
      headers: { "Authorization": "Bearer " + chartToken }
    });
    const data = await response.json();
    if (!response.ok) return;

    if (chartRepartitionInstance) chartRepartitionInstance.destroy();

    const ctx = canvas.getContext("2d");
    const toutesValeursZero = data.valeurs.every(v => v === 0);
    const isMobile = window.innerWidth < 768;

    chartRepartitionInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: toutesValeursZero ? ["Aucun logement"] : data.labels,
        datasets: [{
          data: toutesValeursZero ? [1] : data.valeurs,
          backgroundColor: toutesValeursZero
            ? ["#e2e8f0"]
            : ["#10b981", "#6366f1", "#94a3b8"],
          borderWidth: 0,
          hoverOffset: isMobile ? 5 : 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: isMobile ? "60%" : "65%",
        layout: {
          padding: isMobile ? 5 : 10
        },
        plugins: {
          legend: {
            position: isMobile ? "bottom" : "bottom",
            labels: {
              padding: isMobile ? 10 : 18,
              font: { size: isMobile ? 11 : 13, weight: "600" },
              color: "#475569",
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: isMobile ? 8 : 10,
              boxHeight: isMobile ? 8 : 10
            }
          },
          tooltip: {
            backgroundColor: "#1e293b",
            padding: isMobile ? 8 : 12,
            cornerRadius: 8,
            titleFont: { size: isMobile ? 11 : 13, weight: "bold" },
            bodyFont: { size: isMobile ? 10 : 12 },
            callbacks: {
              label: function(context) {
                if (toutesValeursZero) return "Aucun logement";
                const total = context.dataset.data.reduce((s, v) => s + v, 0);
                const pct = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                return context.label + " : " + context.parsed + " (" + pct + "%)";
              }
            }
          }
        }
      }
    });
  } catch (err) {
    console.error("Erreur chart repartition:", err);
  }
}

// ============================================
// RECHARGER LES GRAPHIQUES AU RESIZE
// ============================================
let resizeTimeout = null;
window.addEventListener("resize", () => {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (chartRevenusInstance) {
      chartRevenusInstance.resize();
    }
    if (chartRepartitionInstance) {
      chartRepartitionInstance.resize();
    }
  }, 250);
});

// ============================================
// INITIALISATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js non chargé");
      return;
    }
    loadChartRevenus();
    loadChartRepartition();
  }, 500);
});

window.loadChartRevenus = loadChartRevenus;
window.loadChartRepartition = loadChartRepartition;