/**
 * analytique.js — VoyageIQ
 * Trace les graphiques à partir des données injectées dans window.ANALYTICS
 */

(function () {
  'use strict';

  /* ── Palette cohérente avec les CSS vars ─────────────────── */
  const C = {
    gold        : '#C9A84C',
    goldAlpha   : 'rgba(201,168,76,.15)',
    marine      : '#1A3A5C',
    marineAlpha : 'rgba(26,58,92,.25)',
    eco         : '#2E7D32',
    ecoAlpha    : 'rgba(46,125,50,.15)',
    orange      : '#E65100',
    orangeAlpha : 'rgba(230,81,0,.15)',
    ok          : '#22C55E',
    err         : '#EF4444',
    t2          : '#9CA3AF',
    t3          : '#6B7280',
    grid        : 'rgba(255,255,255,.06)',
  };

  /* ── Options communes ────────────────────────────────────── */
  const BASE_OPTS = {
    responsive          : true,
    maintainAspectRatio : false,
    animation           : { duration: 600 },
    plugins : {
      legend : { display: false },
      tooltip: {
        backgroundColor : 'rgba(15,15,15,.92)',
        borderColor     : C.gold,
        borderWidth     : 1,
        titleColor      : C.gold,
        bodyColor       : '#e5e7eb',
        padding         : 10,
        cornerRadius    : 6,
      },
    },
    scales : {
      x : {
        grid  : { color: C.grid },
        ticks : { color: C.t3, font: { size: 10 } },
      },
      y : {
        beginAtZero : true,
        grid        : { color: C.grid },
        ticks       : { color: C.t3, font: { size: 10 } },
      },
    },
  };

  /* ── Helpers ─────────────────────────────────────────────── */
  function ctx(id) {
    const el = document.getElementById(id);
    return el ? el.getContext('2d') : null;
  }

  function gradientV(context, top, bottom) {
    const { chart } = context;
    const { ctx: c, chartArea } = chart;
    if (!chartArea) return top;
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    return g;
  }

  /* Génère des labels si le backend n'en envoie pas encore */
  function fallbackLabels(n, unit) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      if (unit === 'h') {
        out.push(`${String(i).padStart(2,'0')}h`);
      } else {
        d.setDate(d.getDate() - i);
        out.push(d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }));
      }
    }
    return out;
  }

  /* ── 1. Graphique "Courses réalisées" (ligne + fill) ─────── */
  function initPerformanceChart(data) {
    const c = ctx('performanceChart');
    if (!c) return;

    const labels  = (data.labels  && data.labels.length)  ? data.labels  : fallbackLabels(data.courses?.length || 30, 'd');
    const courses = (data.courses && data.courses.length)  ? data.courses : [];

    new Chart(c, {
      type : 'line',
      data : {
        labels,
        datasets : [{
          label           : 'Courses',
          data            : courses,
          borderColor     : C.gold,
          borderWidth     : 2,
          pointRadius     : courses.length > 30 ? 0 : 3,
          pointHoverRadius: 5,
          pointBackgroundColor: C.gold,
          tension         : 0.4,
          fill            : true,
          backgroundColor : function(context) {
            return gradientV(context, C.goldAlpha, 'rgba(201,168,76,0)');
          },
        }],
      },
      options : {
        ...BASE_OPTS,
        plugins : {
          ...BASE_OPTS.plugins,
          legend : { display: false },
        },
      },
    });
  }

  /* ── 2. Flux horaires (barres) ───────────────────────────── */
  function initFluxChart(data) {
    const c = ctx('fluxChart');
    if (!c) return;

    const labels = (data.labels && data.labels.length) ? data.labels
      : Array.from({ length: 24 }, (_, i) => `${i}h`);
    const values = (data.data   && data.data.length)   ? data.data   : [];

    /* colorie la barre la plus haute en gold, les autres en marine */
    const max   = Math.max(...values);
    const colors = values.map(v => v === max ? C.gold : C.marine);

    new Chart(c, {
      type : 'bar',
      data : {
        labels,
        datasets : [{
          label           : 'Flux',
          data            : values,
          backgroundColor : colors,
          borderRadius    : 3,
          borderSkipped   : false,
        }],
      },
      options : {
        ...BASE_OPTS,
        plugins : {
          ...BASE_OPTS.plugins,
          legend : { display: false },
        },
        scales : {
          x : {
            grid  : { display: false },
            ticks : { color: C.t3, font: { size: 9 },
                      maxTicksLimit: 12 },
          },
          y : {
            beginAtZero : true,
            grid        : { color: C.grid },
            ticks       : { color: C.t3, font: { size: 9 } },
          },
        },
      },
    });
  }

  /* ── 3. Revenus — tendance (aire lissée) ─────────────────── */
  function initRevenusChart(data) {
    const c = ctx('revenusChart');
    if (!c) return;

    const labels = (data.labels && data.labels.length) ? data.labels : fallbackLabels(data.data?.length || 12, 'd');
    const values = (data.data   && data.data.length)   ? data.data   : [];

    new Chart(c, {
      type : 'line',
      data : {
        labels,
        datasets : [{
          label           : 'Revenus (FCFA)',
          data            : values,
          borderColor     : C.ok,
          borderWidth     : 2,
          pointRadius     : values.length > 30 ? 0 : 3,
          pointHoverRadius: 5,
          pointBackgroundColor: C.ok,
          tension         : 0.4,
          fill            : true,
          backgroundColor : function(context) {
            return gradientV(context, C.ecoAlpha, 'rgba(46,125,50,0)');
          },
        }],
      },
      options : {
        ...BASE_OPTS,
        scales : {
          x : BASE_OPTS.scales.x,
          y : {
            ...BASE_OPTS.scales.y,
            ticks : {
              color    : C.t3,
              font     : { size: 10 },
              callback : v => v >= 1_000_000 ? (v/1_000_000).toFixed(1)+'M'
                            : v >= 1_000     ? (v/1_000).toFixed(0)+'k'
                            : v,
            },
          },
        },
      },
    });
  }

  /* ── 4. Km parcourus — tendance ──────────────────────────── */
  function initDistanceChart(data) {
    const c = ctx('distanceChart');
    if (!c) return;

    const labels = (data.labels && data.labels.length) ? data.labels : fallbackLabels(data.data?.length || 12, 'd');
    const values = (data.data   && data.data.length)   ? data.data   : [];

    new Chart(c, {
      type : 'line',
      data : {
        labels,
        datasets : [{
          label           : 'Km',
          data            : values,
          borderColor     : C.orange,
          borderWidth     : 2,
          pointRadius     : values.length > 30 ? 0 : 3,
          pointHoverRadius: 5,
          pointBackgroundColor: C.orange,
          tension         : 0.4,
          fill            : true,
          backgroundColor : function(context) {
            return gradientV(context, C.orangeAlpha, 'rgba(230,81,0,0)');
          },
        }],
      },
      options : BASE_OPTS,
    });
  }

  /* ── Bootstrap ───────────────────────────────────────────── */
  function boot() {
    const A = window.ANALYTICS;
    if (!A) {
      console.warn('[VoyageIQ] window.ANALYTICS introuvable.');
      return;
    }

    initPerformanceChart(A.performance || {});
    initFluxChart(A.flux             || {});
    initRevenusChart(A.revenus        || {});
    initDistanceChart(A.distance      || {});

    console.log('[VoyageIQ] Analytique — graphiques tracés.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
