/**
 * alertes.js — Module admin alertes : CRUD, filtres multi, badge live, animations
 * VoyageIQ Pro
 */
'use strict';

/* ─────────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module alertes chargé.');

  // Filtres
  ['search-input','priorite-filter','status-filter','type-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(id === 'search-input' ? 'input' : 'change', debounce(filterAlertes, 200));
  });

  // Backdrop
  ['alerte-modal','config-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) closeModalById(id); });
  });

  // Forms
  const alerteForm = document.getElementById('alerte-form');
  if (alerteForm) alerteForm.addEventListener('submit', handleAlerteSubmit);

  const configForm = document.getElementById('config-form');
  if (configForm) configForm.addEventListener('submit', handleConfigSubmit);

  // ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') ['alerte-modal','config-modal'].forEach(closeModalById);
  });

  // Animations initiales
  animateCards();
  animateSummaryKPIs();

  // Mise à jour du badge de count
  fetchAlertesCount();
  setInterval(fetchAlertesCount, 60000);
});

/* ─────────────────────────────────────────────────────────
   Animations
───────────────────────────────────────────────────────── */
function animateCards() {
  document.querySelectorAll('.alerte-card, .card').forEach((card, i) => {
    card.style.opacity   = '0';
    card.style.transform = 'translateY(16px)';
    card.style.transition = `opacity .35s ${i * 55}ms ease, transform .35s ${i * 55}ms ease`;
    requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
  });
}

function animateSummaryKPIs() {
  document.querySelectorAll('.alertes-summary .kpi-value[data-count], .alertes-summary h3[data-count]').forEach(el => {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { animateCounter(el, +el.dataset.count); io.disconnect(); }
    });
    io.observe(el);
  });
}

function animateCounter(el, target, duration = 1000) {
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function flashCard(card) {
  card.style.transition = 'box-shadow .3s';
  card.style.boxShadow  = '0 0 0 2px var(--gold)';
  setTimeout(() => { card.style.boxShadow = ''; }, 600);
}

/* ─────────────────────────────────────────────────────────
   Modal alerte
───────────────────────────────────────────────────────── */
function creerAlerte(alerteId = null) {
  const modal = document.getElementById('alerte-modal');
  const title = document.getElementById('modal-title');
  const form  = document.getElementById('alerte-form');
  if (!modal) return;
  title.textContent = alerteId ? 'Modifier alerte' : 'Nouvelle alerte';
  form.reset();
  document.getElementById('alerte-id').value = '';
  if (alerteId) loadAlerteData(alerteId);
  openModalAnimated('alerte-modal');
}

function closeAlerteModal() { closeModalById('alerte-modal'); }

async function loadAlerteData(alerteId) {
  try {
    const res    = await fetch(`/admin/api/alertes/${alerteId}`);
    const alerte = await res.json();
    const fields = {
      'alerte-id': 'id', 'titre': 'titre', 'type_alerte': 'type_alerte',
      'priorite': 'priorite', 'description': 'description', 'source': 'source',
      'destinataires': 'destinataires', 'actions_recommandees': 'actions_recommandees'
    };
    Object.entries(fields).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.value = alerte[key] ?? '';
    });
    const emailCheck = document.getElementById('notification_email');
    if (emailCheck) emailCheck.checked = !!alerte.notification_email;
  } catch {
    showNotification('Impossible de charger l\'alerte.', 'error');
  }
}

async function handleAlerteSubmit(e) {
  e.preventDefault();
  const btn  = e.target.querySelector('[type=submit]');
  const id   = document.getElementById('alerte-id')?.value;
  const data = Object.fromEntries(new FormData(e.target));
  setLoadingBtn(btn, true);
  try {
    const res = await fetch(
      id ? `/admin/api/alertes/${id}` : '/admin/api/alertes',
      { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    );
    if (!res.ok) throw new Error();
    showNotification(id ? 'Alerte modifiée.' : 'Alerte créée.', 'success');
    closeAlerteModal();
    setTimeout(() => location.reload(), 700);
  } catch {
    showNotification('Erreur lors de l\'enregistrement.', 'error');
  } finally { setLoadingBtn(btn, false); }
}

/* ─────────────────────────────────────────────────────────
   Config notifications
───────────────────────────────────────────────────────── */
function configurerNotifications() {
  openModalAnimated('config-modal');
}

function closeConfigModal() { closeModalById('config-modal'); }

async function handleConfigSubmit(e) {
  e.preventDefault();
  const btn      = e.target.querySelector('[type=submit]');
  const formData = new FormData(e.target);
  setLoadingBtn(btn, true);
  try {
    const res = await fetch('/admin/api/alertes/config', { method: 'POST', body: formData });
    if (!res.ok) throw new Error();
    showNotification('Configuration sauvegardée.', 'success');
    closeConfigModal();
  } catch {
    showNotification('Erreur de configuration.', 'error');
  } finally { setLoadingBtn(btn, false); }
}

/* ─────────────────────────────────────────────────────────
   Actions sur alertes
───────────────────────────────────────────────────────── */
async function marquerLue(alerteId) {
  try {
    const res = await fetch(`/admin/api/alertes/${alerteId}/marquer-lue`, { method: 'POST' });
    if (!res.ok) throw new Error();
    showNotification('Alerte marquée comme lue.', 'success');

    // Animer la suppression de l'indicateur non-lu
    const card = document.querySelector(`[data-alerte-id="${alerteId}"]`);
    if (card) {
      card.classList.remove('non-lue');
      flashCard(card);
    }
    fetchAlertesCount();
  } catch {
    showNotification('Erreur.', 'error');
  }
}

function marquerToutesLues() {
  if (!confirm('Marquer toutes les alertes comme lues ?')) return;
  fetch('/admin/api/alertes/marquer-toutes-lues', { method: 'POST' })
    .then(r => {
      if (!r.ok) throw new Error();
      showNotification('Toutes les alertes sont marquées comme lues.', 'success');
      // Animation : retirer indicateurs
      document.querySelectorAll('.alerte-card.non-lue').forEach(card => {
        card.style.transition = 'border-left-color .4s';
        card.classList.remove('non-lue');
      });
      fetchAlertesCount();
    })
    .catch(() => showNotification('Erreur.', 'error'));
}

function traiterAlerte(alerteId) {
  showNotification(`Traitement de l'alerte #${alerteId}…`, 'info');
  // Ouvrir workflow de traitement
}

function archiverAlerte(alerteId) {
  if (!confirm('Archiver cette alerte ?')) return;
  fetch(`/admin/api/alertes/${alerteId}/archiver`, { method: 'POST' })
    .then(r => {
      if (!r.ok) throw new Error();
      showNotification('Alerte archivée.', 'success');
      const card = document.querySelector(`[data-alerte-id="${alerteId}"]`);
      if (card) slideOutCard(card);
    })
    .catch(() => showNotification('Erreur archivage.', 'error'));
}

function slideOutCard(card) {
  card.style.transition  = 'opacity .35s, transform .35s, max-height .35s, margin .35s, padding .35s';
  card.style.opacity     = '0';
  card.style.transform   = 'translateX(20px)';
  card.style.maxHeight   = card.offsetHeight + 'px';
  setTimeout(() => {
    card.style.maxHeight = '0';
    card.style.margin    = '0';
    card.style.padding   = '0';
    setTimeout(() => card.remove(), 350);
  }, 280);
}

/* ─────────────────────────────────────────────────────────
   Filtres multi-critères
───────────────────────────────────────────────────────── */
function filterAlertes() {
  const q       = document.getElementById('search-input')?.value.toLowerCase() ?? '';
  const priorite = document.getElementById('priorite-filter')?.value ?? '';
  const status  = document.getElementById('status-filter')?.value ?? '';
  const type    = document.getElementById('type-filter')?.value ?? '';

  let visible = 0;
  document.querySelectorAll('.alerte-card, #alertes-table tbody tr').forEach(el => {
    const text   = el.textContent.toLowerCase();
    const rPrio  = el.dataset.priorite  ?? '';
    const rStat  = el.dataset.statut    ?? el.dataset.status ?? '';
    const rType  = el.dataset.type      ?? '';

    const show = text.includes(q)
      && (!priorite || rPrio === priorite)
      && (!status   || rStat === status)
      && (!type     || rType === type);

    el.style.transition = 'opacity .2s, transform .2s';
    if (show) {
      el.style.display   = '';
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
      visible++;
    } else {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => { if (!show) el.style.display = 'none'; }, 200);
    }
  });

  const c = document.getElementById('alertes-count');
  if (c) c.textContent = visible;
}

/* ─────────────────────────────────────────────────────────
   Badge count live
───────────────────────────────────────────────────────── */
async function fetchAlertesCount() {
  try {
    const res  = await fetch('/admin/api/alertes/count');
    const data = await res.json();
    updateAlertesCount(data);
  } catch {
    // silencieux
  }
}

function updateAlertesCount(data) {
  const badge = document.querySelector('.alertes-badge, .nav-badge, [data-alertes-badge]');
  if (!badge) return;
  const prev = parseInt(badge.textContent) || 0;
  const next = data.non_lues ?? data.count ?? 0;
  if (prev === next) return;
  badge.textContent = next;
  // Pulse animation si nouveau
  if (next > prev) {
    badge.style.transform  = 'scale(1.5)';
    badge.style.transition = 'transform .2s ease';
    badge.style.background = '#EF4444';
    setTimeout(() => { badge.style.transform = ''; }, 300);
  }
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
    inner.style.transform = 'scale(.96) translateY(-12px)'; inner.style.transition = 'transform .25s ease';
    requestAnimationFrame(() => { inner.style.transform = ''; });
  }
}

function closeModalById(id) {
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

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
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
