/**
 * VoyageIQ Pro — dashboard.js
 * Graphiques Chart.js alimentés par les données réelles de la BD
 * via les variables Jinja2 injectées dans le template.
 *
 * Variables attendues (injectées par le template) :
 *   window.DASH = {
 *     labels_7j     : [...],   // 7 derniers jours
 *     voyages_7j    : [...],   // nb voyages / jour
 *     recettes_7j   : [...],   // recettes FCFA / jour
 *     repartition   : { guichet, reservation, digital },  // totaux %
 *     lignes_perf   : [{ nom, code, taux }],  // taux remplissage
 *   }
 */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Live clock ──────────────────────────────────────────── */
  function updateClock() {
    const now  = new Date();
    const pad  = n => String(n).padStart(2, '0');
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const jours = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const mois  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const dateStr = `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()}`;

    const clk = document.getElementById('liveClock');
    const dt  = document.getElementById('liveDate');
    if (clk) clk.textContent = time;
    if (dt)  dt.textContent  = dateStr;
  }

  updateClock();
  setInterval(updateClock, 1000);

  /* ── KPI counter animation ───────────────────────────────── */
  function animateCounter(el, target, duration = 1200) {
    const start = performance.now();
    const isFloat = target % 1 !== 0;

    function step(now) {
      const pct  = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      const val  = ease * target;
      el.textContent = isFloat
        ? val.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : Math.round(val).toLocaleString('fr-FR');
      if (pct < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const target = parseFloat(e.target.getAttribute('data-target'));
        if (!isNaN(target)) animateCounter(e.target, target);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('[data-target]').forEach(el => observer.observe(el));

  /* ── Chart.js global defaults ────────────────────────────── */
  if (typeof Chart === 'undefined') {
    console.warn('[VoyageIQ] Chart.js non chargé');
    return;
  }

  Chart.defaults.color       = '#74706A';
  Chart.defaults.borderColor = 'rgba(255,255,255,.05)';
  Chart.defaults.font.family = "'JetBrains Mono', monospace";
  Chart.defaults.font.size   = 11;

  /* Données injectées depuis le template */
  const D = window.DASH || {};

  /* ── Graphique voyages (bar) ─────────────────────────────── */
  const voyagesCtx = document.getElementById('voyagesChart');
  if (voyagesCtx && D.labels_7j) {
    new Chart(voyagesCtx, {
      type: 'bar',
      data: {
        labels: D.labels_7j,
        datasets: [{
          label: 'Voyages',
          data:  D.voyages_7j,
          backgroundColor: 'rgba(26,58,92,.75)',
          borderColor:     '#2A5A8C',
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: 'rgba(201,168,76,.3)',
          hoverBorderColor:     '#C9A84C',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#74706A' } },
          y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#74706A' }, beginAtZero: true },
        },
      },
    });
  }

  /* ── Graphique recettes (line) ───────────────────────────── */
  const recettesCtx = document.getElementById('recettesChart');
  if (recettesCtx && D.labels_7j) {
    new Chart(recettesCtx, {
      type: 'line',
      data: {
        labels: D.labels_7j,
        datasets: [{
          label: 'Recettes (FCFA)',
          data:  D.recettes_7j,
          borderColor:     '#C9A84C',
          backgroundColor: 'rgba(201,168,76,.07)',
          borderWidth: 2,
          pointBackgroundColor: '#C9A84C',
          pointBorderColor:     '#090909',
          pointBorderWidth: 2,
          pointRadius: 5,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#74706A' } },
          y: {
            grid: { color: 'rgba(255,255,255,.04)' },
            ticks: {
              color: '#74706A',
              callback: v => (v >= 1_000_000
                ? (v / 1_000_000).toFixed(1) + 'M'
                : (v / 1000).toFixed(0) + 'k'),
            },
            beginAtZero: false,
          },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });
  }

  /* ── Donut répartition ventes ────────────────────────────── */
  const repartCtx = document.getElementById('repartitionChart');
  if (repartCtx && D.repartition) {
    const r = D.repartition;
    const total = (r.guichet || 0) + (r.reservation || 0) + (r.digital || 0) || 1;
    new Chart(repartCtx, {
      type: 'doughnut',
      data: {
        labels: ['Guichet', 'Réservation', 'Digital'],
        datasets: [{
          data: [
            Math.round((r.guichet     / total) * 100),
            Math.round((r.reservation / total) * 100),
            Math.round((r.digital     / total) * 100),
          ],
          backgroundColor: ['#C9A84C', '#1A3A5C', '#E07B39'],
          borderColor:     '#131313',
          borderWidth: 3,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#74706A', padding: 14, font: { size: 11 }, boxWidth: 10, boxHeight: 10 },
          },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.label} : ${ctx.parsed}%` },
          },
        },
      },
    });
  }

  /* ── Refresh button ──────────────────────────────────────── */
  document.getElementById('refreshDashboard')?.addEventListener('click', function () {
    const icon = this.querySelector('i');
    if (icon) {
      icon.style.transition = 'transform .5s ease';
      icon.style.transform  = 'rotate(360deg)';
      setTimeout(() => { icon.style.transform = ''; icon.style.transition = ''; }, 500);
    }
    // Recharge la page pour obtenir les nouvelles données depuis la BD
    window.location.reload();
  });

});
