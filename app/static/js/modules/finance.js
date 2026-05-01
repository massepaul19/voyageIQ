/**
 * finance.js — VoyageIQ
 * Trace les graphiques à partir de window.FINANCE (données réelles injectées par Flask).
 * Aucune donnée aléatoire — tout vient du backend.
 */
'use strict';

/* ── Palette ───────────────────────────────────────────────── */
const C = {
  gold        : '#C9A84C',
  goldAlpha   : 'rgba(201,168,76,.15)',
  ok          : 'rgba(34,197,94,.75)',
  okLine      : '#22C55E',
  err         : 'rgba(239,68,68,.75)',
  errLine     : '#EF4444',
  info        : 'rgba(96,165,250,.75)',
  infoLine    : '#60A5FA',
  purple      : 'rgba(167,139,250,.75)',
  grid        : 'rgba(255,255,255,.05)',
  text        : '#888',
};

/* ── Helpers communs Chart.js ──────────────────────────────── */
function gradientV(chart, top, bottom) {
  const { ctx, chartArea } = chart;
  if (!chartArea) return top;
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

const SCALE_DEFAULTS = {
  x: { grid: { color: C.grid }, ticks: { color: C.text, font: { size: 10 } } },
  y: {
    beginAtZero: true,
    grid        : { color: C.grid },
    ticks: {
      color: C.text, font: { size: 10 },
      callback: v => v >= 1_000_000 ? (v/1_000_000).toFixed(1)+'M'
                   : v >= 1_000     ? (v/1_000).toFixed(0)+'k'
                   : v,
    },
  },
};

const TOOLTIP = {
  backgroundColor : 'rgba(15,15,15,.92)',
  borderColor     : C.gold,
  borderWidth     : 1,
  titleColor      : C.gold,
  bodyColor       : '#e5e7eb',
  padding         : 10,
  cornerRadius    : 6,
};

/* ── 1. Graphique "Revenus vs Dépenses — 6 mois" (double ligne) */
function initProfitabilityChart(data) {
  const el = document.getElementById('profitabilityChart');
  if (!el) return;

  const labels   = data.labels   || [];
  const revenus  = data.revenus  || [];
  const depenses = data.depenses || [];

  new Chart(el.getContext('2d'), {
    type : 'line',
    data : {
      labels,
      datasets : [
        {
          label               : 'Revenus (FCFA)',
          data                : revenus,
          borderColor         : C.okLine,
          borderWidth         : 2,
          pointBackgroundColor: C.okLine,
          pointRadius         : 4,
          pointHoverRadius    : 6,
          tension             : 0.4,
          fill                : true,
          backgroundColor     : ctx => gradientV(ctx.chart, 'rgba(34,197,94,.18)', 'rgba(34,197,94,0)'),
        },
        {
          label               : 'Dépenses (FCFA)',
          data                : depenses,
          borderColor         : C.errLine,
          borderWidth         : 2,
          pointBackgroundColor: C.errLine,
          pointRadius         : 4,
          pointHoverRadius    : 6,
          tension             : 0.4,
          fill                : true,
          backgroundColor     : ctx => gradientV(ctx.chart, 'rgba(239,68,68,.14)', 'rgba(239,68,68,0)'),
        },
      ],
    },
    options : {
      responsive          : true,
      maintainAspectRatio : false,
      animation           : { duration: 700, easing: 'easeOutQuart' },
      plugins : {
        legend : {
          display : true,
          position: 'top',
          align   : 'end',
          labels  : { color: C.text, font: { size: 11 }, usePointStyle: true, padding: 16 },
        },
        tooltip : TOOLTIP,
      },
      scales : SCALE_DEFAULTS,
    },
  });
}

/* ── 2. Doughnut "Répartition des charges" ─────────────────── */
function initBudgetChart(data) {
  const el = document.getElementById('budgetChart');
  if (!el) return;

  const labels = data.labels || ['Carburant','Maintenance','Personnel','Autres'];
  const values = data.data   || [];

  /* montants réels si disponibles, sinon les % */
  const total = values.reduce((a, b) => a + b, 0);
  const display = total > 0 ? values : [35, 25, 30, 10];

  new Chart(el.getContext('2d'), {
    type : 'doughnut',
    data : {
      labels,
      datasets : [{
        data            : display,
        backgroundColor : [C.gold, C.ok, C.info, C.purple],
        borderWidth     : 0,
        hoverOffset     : 10,
      }],
    },
    options : {
      cutout  : '68%',
      responsive          : true,
      maintainAspectRatio : false,
      animation : { animateRotate: true, duration: 800 },
      plugins : {
        legend : {
          position: 'bottom',
          labels  : { color: C.text, font: { size: 11 }, padding: 14, usePointStyle: true },
        },
        tooltip : {
          ...TOOLTIP,
          callbacks : {
            label : ctx => {
              const pct = total > 0
                ? ((ctx.parsed / total) * 100).toFixed(1)
                : ctx.parsed;
              return ` ${ctx.label} : ${Number(ctx.parsed).toLocaleString('fr-FR')} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/* ── 3. (optionnel) Courbe revenus seule si un canvas dédié ── */
function initRevenusChart(data) {
  const el = document.getElementById('revenusLineChart');   // canvas optionnel
  if (!el) return;

  new Chart(el.getContext('2d'), {
    type : 'bar',
    data : {
      labels   : data.labels || [],
      datasets : [{
        label           : 'Revenus (FCFA)',
        data            : data.data || [],
        backgroundColor : ctx => gradientV(ctx.chart, C.goldAlpha, 'rgba(201,168,76,0)'),
        borderColor     : C.gold,
        borderWidth     : 1,
        borderRadius    : 5,
        borderSkipped   : false,
      }],
    },
    options : {
      responsive          : true,
      maintainAspectRatio : false,
      animation           : { duration: 700 },
      plugins : { legend: { display: false }, tooltip: TOOLTIP },
      scales  : SCALE_DEFAULTS,
    },
  });
}

/* ── Animations UI ─────────────────────────────────────────── */
function animateTableRows() {
  document.querySelectorAll('.data-table tbody tr').forEach((row, i) => {
    row.style.opacity    = '0';
    row.style.transform  = 'translateY(8px)';
    row.style.transition = `opacity .25s ${i * 30}ms, transform .25s ${i * 30}ms`;
    requestAnimationFrame(() => { row.style.opacity = '1'; row.style.transform = ''; });
  });
}

/* ── Notifications ─────────────────────────────────────────── */
function showNotification(message, type = 'info') {
  let zone = document.getElementById('notif-zone');
  if (!zone) {
    zone = document.createElement('div');
    zone.id = 'notif-zone';
    zone.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(zone);
  }
  const colors = { success:'#22C55E', error:'#EF4444', warning:'#F59E0B', info:'#60A5FA' };
  const c = colors[type] ?? colors.info;
  const n = document.createElement('div');
  n.style.cssText = `display:flex;align-items:center;gap:10px;padding:12px 18px;background:var(--card);border:1px solid ${c};border-left:4px solid ${c};border-radius:8px;color:var(--t);font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.3);opacity:0;transform:translateX(20px);transition:opacity .3s,transform .3s;min-width:260px;`;
  n.textContent = message;
  zone.appendChild(n);
  requestAnimationFrame(() => { n.style.opacity = '1'; n.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    n.style.opacity = '0'; n.style.transform = 'translateX(20px)';
    setTimeout(() => n.remove(), 320);
  }, 3600);
}

/* ── Bootstrap ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module finance chargé.');

  const F = window.FINANCE;
  if (!F) {
    console.warn('[VoyageIQ] window.FINANCE introuvable.');
    return;
  }

  // Graphiques (après un micro-délai pour que le DOM soit peint)
  setTimeout(() => {
    initProfitabilityChart(F.profitability   || {});
    initBudgetChart(F.budget                 || {});
    initRevenusChart(F.revenus_chart         || {});
  }, 80);

  // Animation tableau
  animateTableRows();
});
