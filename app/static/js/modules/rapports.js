/**
 * rapports.js — Module admin rapports : génération, planification, export, animations
 * VoyageIQ Pro
 */
'use strict';

/* ─────────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module rapports chargé.');

  // Filtres
  ['periode-filter','status-filter','type-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', filterRapports);
  });

  // Backdrop
  ['rapport-modal','planification-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) closeModalById(id); });
  });

  // Forms
  const rapportForm = document.getElementById('rapport-form');
  if (rapportForm) rapportForm.addEventListener('submit', handleRapportSubmit);

  const planForm = document.getElementById('planification-form');
  if (planForm) planForm.addEventListener('submit', handlePlanificationSubmit);

  // ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') ['rapport-modal','planification-modal'].forEach(closeModalById);
  });

  // Animations
  animateReportCards();
  animateTableRows();
});

/* ─────────────────────────────────────────────────────────
   Animations
───────────────────────────────────────────────────────── */
function animateReportCards() {
  document.querySelectorAll('.report-card').forEach((card, i) => {
    card.style.opacity   = '0';
    card.style.transform = 'translateY(18px)';
    card.style.transition = `opacity .35s ${i * 70}ms, transform .35s ${i * 70}ms`;
    requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = ''; });
  });
}

function animateTableRows() {
  document.querySelectorAll('#rapports-table tbody tr').forEach((row, i) => {
    row.style.opacity   = '0';
    row.style.transform = 'translateX(-10px)';
    row.style.transition = `opacity .28s ${i * 40}ms, transform .28s ${i * 40}ms`;
    requestAnimationFrame(() => { row.style.opacity = '1'; row.style.transform = ''; });
  });
}

function spinIcon(btn) {
  const icon = btn.querySelector('i');
  if (!icon) return;
  icon.classList.add('fa-spin');
  setTimeout(() => icon.classList.remove('fa-spin'), 1500);
}

/* ─────────────────────────────────────────────────────────
   Modal rapport
───────────────────────────────────────────────────────── */
function genererRapport(rapportId = null) {
  const modal = document.getElementById('rapport-modal');
  const title = document.getElementById('modal-title');
  const form  = document.getElementById('rapport-form');
  if (!modal) return;

  title.textContent = rapportId ? 'Modifier rapport' : 'Nouveau rapport';
  form.reset();
  document.getElementById('rapport-id').value = '';

  // Dates par défaut : mois en cours
  const today    = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const dateDebut = document.getElementById('date_debut');
  const dateFin   = document.getElementById('date_fin');
  if (dateDebut) dateDebut.valueAsDate = firstDay;
  if (dateFin)   dateFin.valueAsDate   = lastDay;

  if (rapportId) loadRapportData(rapportId);
  openModalAnimated('rapport-modal');
}

function closeRapportModal() { closeModalById('rapport-modal'); }

async function loadRapportData(rapportId) {
  try {
    const res    = await fetch(`/admin/api/rapports/${rapportId}`);
    const rapport = await res.json();
    const fields = {
      'rapport-id':'id','nom_rapport':'nom','type_rapport':'type_rapport',
      'format_rapport':'format_rapport','date_debut':'date_debut',
      'date_fin':'date_fin','description':'description'
    };
    Object.entries(fields).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.value = rapport[key] ?? '';
    });
  } catch {
    showNotification('Impossible de charger le rapport.', 'error');
  }
}

async function handleRapportSubmit(e) {
  e.preventDefault();
  const btn  = e.target.querySelector('[type=submit]');
  const id   = document.getElementById('rapport-id')?.value;
  const data = Object.fromEntries(new FormData(e.target));
  setLoadingBtn(btn, true);
  try {
    const res = await fetch(
      id ? `/admin/api/rapports/${id}` : '/admin/api/rapports',
      { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    );
    if (!res.ok) throw new Error();
    showNotification(id ? 'Rapport modifié.' : 'Rapport créé et mis en génération.', 'success');
    closeRapportModal();
    setTimeout(() => location.reload(), 800);
  } catch {
    showNotification('Erreur lors de l\'enregistrement.', 'error');
  } finally { setLoadingBtn(btn, false); }
}

/* ─────────────────────────────────────────────────────────
   Planification
───────────────────────────────────────────────────────── */
function planifierRapport() {
  document.getElementById('planification-form')?.reset();
  openModalAnimated('planification-modal');
}

function closePlanificationModal() { closeModalById('planification-modal'); }

async function handlePlanificationSubmit(e) {
  e.preventDefault();
  const btn  = e.target.querySelector('[type=submit]');
  const data = Object.fromEntries(new FormData(e.target));
  setLoadingBtn(btn, true);
  try {
    const res = await fetch('/admin/api/rapports/planification', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error();
    showNotification('Rapport planifié avec succès.', 'success');
    closePlanificationModal();
  } catch {
    showNotification('Erreur planification.', 'error');
  } finally { setLoadingBtn(btn, false); }
}

/* ─────────────────────────────────────────────────────────
   Actions sur rapports
───────────────────────────────────────────────────────── */
function viewRapport(rapportId) {
  window.open(`/admin/api/rapports/${rapportId}/view`, '_blank');
}

function downloadRapport(rapportId) {
  showNotification('Téléchargement en cours…', 'info');
  window.location.href = `/admin/api/rapports/${rapportId}/download`;
}

function emailRapport(rapportId) {
  fetch(`/admin/api/rapports/${rapportId}/email`, { method: 'POST' })
    .then(r => {
      if (!r.ok) throw new Error();
      showNotification('Rapport envoyé par email.', 'success');
    })
    .catch(() => showNotification('Erreur envoi email.', 'error'));
}

function duplicateRapport(rapportId) {
  fetch(`/admin/api/rapports/${rapportId}/duplicate`, { method: 'POST' })
    .then(r => {
      if (!r.ok) throw new Error();
      showNotification('Rapport dupliqué.', 'success');
      setTimeout(() => location.reload(), 700);
    })
    .catch(() => showNotification('Erreur duplication.', 'error'));
}

async function deleteRapport(rapportId) {
  if (!confirm('Supprimer ce rapport définitivement ?')) return;
  try {
    const res = await fetch(`/admin/api/rapports/${rapportId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showNotification('Rapport supprimé.', 'success');
    const row = document.querySelector(`tr[data-rapport-id="${rapportId}"]`);
    if (row) slideOutRow(row);
  } catch {
    showNotification('Erreur suppression.', 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Rapports rapides (quick cards)
───────────────────────────────────────────────────────── */
function genererRapportJournalier() {
  const today = new Date();
  prefillAndOpen(
    `Rapport journalier — ${today.toLocaleDateString('fr-FR')}`,
    'operationnel', 'pdf', today, today
  );
}

function genererRapportHebdomadaire() {
  const today     = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd   = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  prefillAndOpen(
    `Rapport hebdomadaire — Semaine ${getWeekNumber(today)}`,
    'complet', 'pdf', weekStart, weekEnd
  );
}

function genererRapportFinancier() {
  const today    = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  prefillAndOpen(
    `Rapport financier — ${today.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`,
    'financier', 'excel', firstDay, lastDay
  );
}

function genererRapportFlotte() {
  const today    = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  prefillAndOpen(
    `Rapport flotte — ${today.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`,
    'flotte', 'pdf', firstDay, lastDay
  );
}

function prefillAndOpen(nom, type, format, dateDebut, dateFin) {
  const modal = document.getElementById('rapport-modal');
  if (!modal) return;
  document.getElementById('modal-title').textContent = 'Générer rapport';
  document.getElementById('rapport-form')?.reset();
  document.getElementById('rapport-id').value = '';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('nom_rapport',    nom);
  set('type_rapport',   type);
  set('format_rapport', format);
  const toISO = d => d.toISOString().split('T')[0];
  set('date_debut', toISO(dateDebut));
  set('date_fin',   toISO(dateFin));

  openModalAnimated('rapport-modal');
}

function getWeekNumber(date) {
  const d   = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/* ─────────────────────────────────────────────────────────
   Export global
───────────────────────────────────────────────────────── */
function exportRapports() {
  showNotification('Export de la liste des rapports…', 'info');
  window.location.href = '/admin/api/rapports/export';
}

/* ─────────────────────────────────────────────────────────
   Filtres
───────────────────────────────────────────────────────── */
function filterRapports() {
  const periode = document.getElementById('periode-filter')?.value ?? '';
  const status  = document.getElementById('status-filter')?.value ?? '';
  const type    = document.getElementById('type-filter')?.value ?? '';

  document.querySelectorAll('#rapports-table tbody tr').forEach(row => {
    const show = (!periode || (row.dataset.periode ?? '') === periode)
              && (!status  || (row.dataset.statut  ?? '') === status)
              && (!type    || (row.dataset.type    ?? '') === type);
    row.style.display = show ? '' : 'none';
  });
}

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
function openModalAnimated(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex'; el.style.opacity = '0'; el.style.transition = 'opacity .25s';
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  const inner = el.querySelector('.modal-content,.modal__inner,.modal-box');
  if (inner) {
    inner.style.transform = 'scale(.96) translateY(-12px)'; inner.style.transition = 'transform .25s';
    requestAnimationFrame(() => { inner.style.transform = ''; });
  }
}

function closeModalById(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => { el.style.display = 'none'; el.style.opacity = ''; }, 230);
}

function slideOutRow(row) {
  row.style.transition = 'opacity .35s, transform .35s';
  row.style.opacity    = '0';
  row.style.transform  = 'translateX(-20px)';
  setTimeout(() => row.remove(), 380);
}

function setLoadingBtn(btn, loading) {
  if (!btn) return;
  if (loading) { btn.dataset.label = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération…'; btn.disabled = true; }
  else { btn.innerHTML = btn.dataset.label ?? 'Générer'; btn.disabled = false; }
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
