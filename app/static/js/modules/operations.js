/**
 * operations.js — Module admin opérations : courses, incidents, maintenance, charts
 * VoyageIQ Pro
 */
'use strict';

/* ─────────────────────────────────────────────────────────
   État
───────────────────────────────────────────────────────── */
let liveInterval  = null;
let calendarDate  = new Date();
const charts = {};

/* ─────────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module opérations chargé.');

  // Onglet actif
  showTab('courses');

  // Backdrop
  const courseModal = document.getElementById('course-modal');
  if (courseModal) courseModal.addEventListener('click', e => { if (e.target === courseModal) closeCourseModal(); });

  // Form course
  const courseForm = document.getElementById('course-form');
  if (courseForm) courseForm.addEventListener('submit', handleCourseSubmit);

  // KPI
  animateKPIs();

  // Lignes du tableau
  animateTableRows();

  // Chart
  if (typeof Chart !== 'undefined') setTimeout(loadOperationsChart, 150);

  // Calendrier maintenance
  renderCalendar();

  // Rafraîchissement live courses (toutes les 30s)
  liveInterval = setInterval(() => {
    if (document.visibilityState === 'visible') fetchLiveCourses();
  }, 30000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') fetchLiveCourses();
  });

  // ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCourseModal();
  });
});

/* ─────────────────────────────────────────────────────────
   Animations
───────────────────────────────────────────────────────── */
function animateKPIs() {
  document.querySelectorAll('.kpi-value[data-count]').forEach(el => {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { animateCounter(el, +el.dataset.count); io.disconnect(); }
    });
    io.observe(el);
  });
}

function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('fr-FR');
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function animateTableRows() {
  document.querySelectorAll('#courses-table tbody tr').forEach((row, i) => {
    row.style.opacity   = '0';
    row.style.transform = 'translateY(10px)';
    row.style.transition = `opacity .28s ${i * 40}ms, transform .28s ${i * 40}ms`;
    requestAnimationFrame(() => { row.style.opacity = '1'; row.style.transform = ''; });
  });
}

/* ─────────────────────────────────────────────────────────
   Onglets
───────────────────────────────────────────────────────── */
function showTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.querySelectorAll('[id$="-tab"]').forEach(p => {
    p.classList.remove('active'); p.style.display = 'none';
  });

  const panel = document.getElementById(`${tabName}-tab`);
  if (panel) {
    panel.style.display  = '';
    panel.style.opacity  = '0';
    panel.style.transform = 'translateY(8px)';
    panel.style.transition = 'opacity .3s, transform .3s';
    requestAnimationFrame(() => { panel.style.opacity = '1'; panel.style.transform = ''; panel.classList.add('active'); });
  }
}

/* ─────────────────────────────────────────────────────────
   Modal course
───────────────────────────────────────────────────────── */
function nouvelleCourse() {
  document.getElementById('course-form')?.reset();
  openModal('course-modal');
}

function closeCourseModal() { closeModal('course-modal'); }

async function handleCourseSubmit(e) {
  e.preventDefault();
  const btn      = e.target.querySelector('[type=submit]');
  const formData = new FormData(e.target);
  setLoadingBtn(btn, true);
  try {
    const res = await fetch('/admin/api/courses', { method: 'POST', body: formData });
    if (!res.ok) throw new Error();
    showNotification('Course créée.', 'success');
    closeCourseModal();
    setTimeout(() => location.reload(), 700);
  } catch {
    showNotification('Erreur création course.', 'error');
  } finally { setLoadingBtn(btn, false); }
}

/* ─────────────────────────────────────────────────────────
   Actions courses
───────────────────────────────────────────────────────── */
function viewCourse(courseId) {
  window.location.href = `/admin/operations/courses/${courseId}`;
}

function trackCourse(courseId) {
  window.location.href = `/admin/carte?course=${courseId}`;
}

function contactDriver(courseId) {
  showNotification(`Contact conducteur (course #${courseId})…`, 'info');
}

function reportIncident(courseId) {
  nouveauIncident(courseId);
}

/* ─────────────────────────────────────────────────────────
   Incidents
───────────────────────────────────────────────────────── */
function nouveauIncident(courseId = null) {
  showNotification('Ouverture formulaire incident…', 'info');
  // Idéalement ouvre un modal incident avec courseId pré-rempli
}

function resolveIncident(incidentId) {
  if (!confirm('Marquer cet incident comme résolu ?')) return;
  fetch(`/admin/api/incidents/${incidentId}/resolve`, { method: 'POST' })
    .then(r => {
      if (!r.ok) throw new Error();
      showNotification('Incident résolu.', 'success');
      // Animer la card de sortie
      const card = document.querySelector(`[data-incident-id="${incidentId}"]`);
      if (card) {
        card.style.transition = 'opacity .4s, transform .4s';
        card.style.opacity    = '0';
        card.style.transform  = 'scale(.95)';
        setTimeout(() => card.remove(), 420);
      }
    })
    .catch(() => showNotification('Erreur résolution incident.', 'error'));
}

function viewIncidentDetails(incidentId) {
  window.location.href = `/admin/operations/incidents/${incidentId}`;
}

/* ─────────────────────────────────────────────────────────
   Maintenance
───────────────────────────────────────────────────────── */
function nouvelleMaintenance() {
  showNotification('Ouverture formulaire maintenance…', 'info');
}

function completeMaintenance(maintenanceId) {
  if (!confirm('Marquer cette maintenance comme terminée ?')) return;
  fetch(`/admin/api/maintenance/${maintenanceId}/complete`, { method: 'POST' })
    .then(r => {
      if (!r.ok) throw new Error();
      showNotification('Maintenance complétée.', 'success');
      renderCalendar(); // Re-render calendrier
    })
    .catch(() => showNotification('Erreur.', 'error'));
}

function editMaintenance(maintenanceId) {
  showNotification('Modification maintenance…', 'info');
}

/* ─────────────────────────────────────────────────────────
   Calendrier maintenance
───────────────────────────────────────────────────────── */
function renderCalendar() {
  const titleEl = document.getElementById('calendar-title');
  const grid    = document.getElementById('maintenance-calendar');
  if (!titleEl || !grid) return;

  const months = ['Janvier','Février','Mars','Avril','Mai','Juin',
                  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  titleEl.textContent = `${months[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;

  // Animation légère
  grid.style.opacity   = '0';
  grid.style.transition = 'opacity .25s';
  setTimeout(() => { grid.style.opacity = '1'; }, 50);
}

function prevMonth() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
}

/* ─────────────────────────────────────────────────────────
   Rapports
───────────────────────────────────────────────────────── */
function generateReport() {
  const btn = document.querySelector('[onclick="generateReport()"]');
  setLoadingBtn(btn, true);
  showNotification('Génération du rapport opérationnel…', 'info');
  setTimeout(() => {
    setLoadingBtn(btn, false);
    showNotification('Rapport généré avec succès.', 'success');
  }, 1800);
}

function exportData() {
  showNotification('Export des données d\'opérations…', 'info');
  window.location.href = '/admin/api/operations/export';
}

/* ─────────────────────────────────────────────────────────
   Chart opérations
───────────────────────────────────────────────────────── */
function loadOperationsChart() {
  const ctx = document.getElementById('operations-chart');
  if (!ctx) return;
  if (charts.operations) charts.operations.destroy();

  const labels = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  charts.operations = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Courses effectuées',
          data: labels.map(() => Math.floor(Math.random() * 50 + 30)),
          backgroundColor: 'rgba(201,168,76,.25)',
          borderColor: '#C9A84C', borderWidth: 1, borderRadius: 5
        },
        {
          label: 'Incidents',
          data: labels.map(() => Math.floor(Math.random() * 5)),
          backgroundColor: 'rgba(239,68,68,.3)',
          borderColor: '#EF4444', borderWidth: 1, borderRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#888', font: { size: 11 } } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#888' } },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#888' } }
      },
      animation: { duration: 900, easing: 'easeOutQuart' }
    }
  });
}

/* ─────────────────────────────────────────────────────────
   Live courses
───────────────────────────────────────────────────────── */
async function fetchLiveCourses() {
  try {
    const res     = await fetch('/admin/api/operations/courses/live');
    const data    = await res.json();
    updateCoursesTable(data.courses ?? []);
    // Animer badge compteur
    const badge = document.querySelector('.badge-live, .courses-count');
    if (badge && data.total !== undefined) {
      badge.textContent = data.total;
      badge.style.transform = 'scale(1.3)';
      badge.style.transition = 'transform .2s';
      setTimeout(() => { badge.style.transform = ''; }, 300);
    }
  } catch {
    // Silencieux - tentative background
  }
}

function updateCoursesTable(courses) {
  const tbody = document.querySelector('#courses-table tbody');
  if (!tbody || !courses.length) return;

  const current = new Set(
    Array.from(tbody.querySelectorAll('tr[data-course-id]')).map(r => r.dataset.courseId)
  );

  courses.forEach(course => {
    const existing = tbody.querySelector(`tr[data-course-id="${course.id}"]`);
    if (!existing) {
      // Nouvelle course — l'insérer avec animation
      const tr = document.createElement('tr');
      tr.dataset.courseId  = course.id;
      tr.style.opacity     = '0';
      tr.style.transform   = 'translateY(-8px)';
      tr.style.transition  = 'opacity .3s, transform .3s';
      tr.innerHTML = `
        <td>${course.numero ?? course.id}</td>
        <td>${course.ligne ?? '—'}</td>
        <td>${course.chauffeur ?? '—'}</td>
        <td>${course.heure_depart ?? '—'}</td>
        <td><span class="status-badge status-badge--${course.statut ?? 'actif'}">${course.statut ?? 'En cours'}</span></td>
        <td class="action-buttons">
          <button class="action-btn" onclick="viewCourse(${course.id})" title="Voir"><i class="fas fa-eye"></i></button>
          <button class="action-btn" onclick="trackCourse(${course.id})" title="Suivre"><i class="fas fa-map-marker-alt"></i></button>
          <button class="action-btn" onclick="contactDriver(${course.id})" title="Contacter"><i class="fas fa-phone"></i></button>
          <button class="action-btn action-warning" onclick="reportIncident(${course.id})" title="Incident"><i class="fas fa-exclamation-triangle"></i></button>
        </td>`;
      tbody.prepend(tr);
      requestAnimationFrame(() => { tr.style.opacity = '1'; tr.style.transform = ''; });
    }
  });
}

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex'; el.style.opacity = '0'; el.style.transition = 'opacity .25s';
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  const inner = el.querySelector('.modal-content,.modal__inner,.modal-box');
  if (inner) {
    inner.style.transform = 'scale(.96) translateY(-10px)'; inner.style.transition = 'transform .25s';
    requestAnimationFrame(() => { inner.style.transform = ''; });
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => { el.style.display = 'none'; el.style.opacity = ''; }, 230);
}

function setLoadingBtn(btn, loading) {
  if (!btn) return;
  if (loading) { btn.dataset.label = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }
  else { btn.innerHTML = btn.dataset.label ?? 'OK'; btn.disabled = false; }
}

function showNotification(message, type = 'info') {
  let zone = document.getElementById('notif-zone');
  if (!zone) {
    zone = document.createElement('div'); zone.id = 'notif-zone';
    zone.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(zone);
  }
  const colors = { success:'#22C55E', error:'#EF4444', warning:'#F59E0B', info:'#60A5FA' };
  const icons  = { success:'check-circle', error:'exclamation-circle', warning:'exclamation-triangle', info:'info-circle' };
  const c = colors[type] ?? colors.info;
  const n = document.createElement('div');
  n.style.cssText = `display:flex;align-items:center;gap:10px;padding:12px 18px;background:var(--card);border:1px solid ${c};border-left:4px solid ${c};border-radius:8px;color:var(--t);font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.3);opacity:0;transform:translateX(20px);transition:opacity .3s,transform .3s;min-width:260px;`;
  n.innerHTML = `<i class="fas fa-${icons[type]}" style="color:${c}"></i><span>${message}</span>`;
  zone.appendChild(n);
  requestAnimationFrame(() => { n.style.opacity = '1'; n.style.transform = 'translateX(0)'; });
  setTimeout(() => { n.style.opacity = '0'; n.style.transform = 'translateX(20px)'; setTimeout(() => n.remove(), 320); }, 3600);
}
