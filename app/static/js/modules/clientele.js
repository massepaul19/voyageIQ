/**
 * clientele.js — Module admin clientèle : CRUD, abonnements, contact, animations
 * VoyageIQ Pro
 */
'use strict';

/* ─────────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module clientèle chargé.');

  // Filtres live
  ['search-input', 'abonnement-filter', 'status-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(id === 'search-input' ? 'input' : 'change', debounce(filterClients, 220));
  });

  // Fermeture backdrop
  ['client-modal', 'abonnement-modal', 'contact-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) closeModal(id); });
  });

  // Forms
  const clientForm = document.getElementById('client-form');
  if (clientForm) clientForm.addEventListener('submit', handleClientSubmit);

  const abonnementForm = document.getElementById('abonnement-form');
  if (abonnementForm) abonnementForm.addEventListener('submit', handleAbonnementSubmit);

  const contactForm = document.getElementById('contact-form');
  if (contactForm) contactForm.addEventListener('submit', handleContactSubmit);

  // ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      ['client-modal','abonnement-modal','contact-modal'].forEach(id => closeModal(id));
  });

  // Entrée progressive du tableau
  animateTableRows();

  // KPI animés
  animateKPIs();
});

/* ─────────────────────────────────────────────────────────
   Animations
───────────────────────────────────────────────────────── */
function animateTableRows() {
  document.querySelectorAll('#clients-table tbody tr').forEach((row, i) => {
    row.style.opacity   = '0';
    row.style.transform = 'translateY(12px)';
    row.style.transition = `opacity .3s ${i * 40}ms, transform .3s ${i * 40}ms`;
    requestAnimationFrame(() => { row.style.opacity = '1'; row.style.transform = 'translateY(0)'; });
  });
}

function animateKPIs() {
  document.querySelectorAll('.kpi-value[data-count]').forEach(el => {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateCounter(el, parseInt(el.dataset.count)); io.disconnect();
      }
    });
    io.observe(el);
  });
}

function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  const from  = 0;
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))).toLocaleString('fr-FR');
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function pulseRow(row) {
  row.style.transition = 'background .3s';
  row.style.background = 'rgba(201,168,76,.08)';
  setTimeout(() => { row.style.background = ''; }, 600);
}

/* ─────────────────────────────────────────────────────────
   Modal client
───────────────────────────────────────────────────────── */
function openClientModal(clientId = null) {
  const modal = document.getElementById('client-modal');
  const title = document.getElementById('modal-title');
  const form  = document.getElementById('client-form');
  if (!modal) return;
  title.textContent = clientId ? 'Modifier client' : 'Nouveau client';
  form.reset();
  document.getElementById('client-id').value = '';
  if (clientId) loadClientData(clientId);
  openModal('client-modal');
}

function closeClientModal() { closeModal('client-modal'); }

async function loadClientData(clientId) {
  try {
    const res    = await fetch(`/admin/api/clients/${clientId}`);
    const client = await res.json();
    const map = { 'client-id':'id','nom':'nom','prenom':'prenom','email':'email',
                  'telephone':'telephone','date_naissance':'date_naissance','genre':'genre',
                  'adresse':'adresse','statut':'statut','notes':'notes' };
    Object.entries(map).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.value = client[key] ?? '';
    });
  } catch {
    showNotification('Impossible de charger le client.', 'error');
  }
}

async function editClient(clientId) { openClientModal(clientId); }

async function handleClientSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  setLoadingBtn(btn, true);
  const id       = document.getElementById('client-id')?.value;
  const formData = new FormData(e.target);
  const url      = id ? `/admin/api/clients/${id}` : '/admin/api/clients';
  try {
    const res = await fetch(url, { method: id ? 'PUT' : 'POST', body: formData });
    if (!res.ok) throw new Error();
    showNotification(id ? 'Client modifié.' : 'Client créé.', 'success');
    closeClientModal();
    setTimeout(() => location.reload(), 700);
  } catch {
    showNotification('Erreur lors de l\'enregistrement.', 'error');
  } finally {
    setLoadingBtn(btn, false);
  }
}

/* ─────────────────────────────────────────────────────────
   Abonnement
───────────────────────────────────────────────────────── */
function manageAbonnement(clientId) {
  document.getElementById('abonnement-client-id').value = clientId;
  document.getElementById('abonnement-form')?.reset();
  document.getElementById('abonnement-client-id').value = clientId;
  openModal('abonnement-modal');
}

function closeAbonnementModal() { closeModal('abonnement-modal'); }

async function handleAbonnementSubmit(e) {
  e.preventDefault();
  const btn      = e.target.querySelector('[type=submit]');
  const clientId = document.getElementById('abonnement-client-id')?.value;
  const formData = new FormData(e.target);
  setLoadingBtn(btn, true);
  try {
    const res = await fetch(`/admin/api/clients/${clientId}/abonnement`, {
      method: 'POST', body: formData
    });
    if (!res.ok) throw new Error();
    showNotification('Abonnement enregistré.', 'success');
    closeAbonnementModal();
    setTimeout(() => location.reload(), 700);
  } catch {
    showNotification('Erreur abonnement.', 'error');
  } finally {
    setLoadingBtn(btn, false);
  }
}

/* ─────────────────────────────────────────────────────────
   Contact
───────────────────────────────────────────────────────── */
function contactClient(clientId) {
  document.getElementById('contact-client-id').value = clientId;
  document.getElementById('contact-form')?.reset();
  document.getElementById('contact-client-id').value = clientId;
  openModal('contact-modal');
}

function closeContactModal() { closeModal('contact-modal'); }

async function handleContactSubmit(e) {
  e.preventDefault();
  const btn      = e.target.querySelector('[type=submit]');
  const clientId = document.getElementById('contact-client-id')?.value;
  const formData = new FormData(e.target);
  setLoadingBtn(btn, true);
  try {
    const res = await fetch(`/admin/api/clients/${clientId}/contact`, {
      method: 'POST', body: formData
    });
    if (!res.ok) throw new Error();
    showNotification('Message envoyé au client.', 'success');
    closeContactModal();
  } catch {
    showNotification('Erreur lors de l\'envoi.', 'error');
  } finally {
    setLoadingBtn(btn, false);
  }
}

/* ─────────────────────────────────────────────────────────
   Actions
───────────────────────────────────────────────────────── */
function viewClientProfile(clientId) {
  window.location.href = `/admin/clients/${clientId}`;
}

async function deleteClient(clientId) {
  if (!confirm('Supprimer ce client définitivement ?')) return;
  try {
    const res = await fetch(`/admin/api/clients/${clientId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showNotification('Client supprimé.', 'success');
    const row = document.querySelector(`tr[data-client-id="${clientId}"]`);
    if (row) slideOutRow(row);
  } catch {
    showNotification('Erreur lors de la suppression.', 'error');
  }
}

function slideOutRow(row) {
  row.style.transition = 'opacity .35s, transform .35s';
  row.style.opacity    = '0';
  row.style.transform  = 'translateX(-20px)';
  setTimeout(() => row.remove(), 380);
}

/* ─────────────────────────────────────────────────────────
   Export / Newsletter
───────────────────────────────────────────────────────── */
function exportClients() {
  showNotification('Export clients en cours…', 'info');
  window.location.href = '/admin/api/clients/export';
}

function sendNewsletter() {
  if (!confirm('Envoyer la newsletter à tous les clients actifs ?')) return;
  showNotification('Newsletter mise en file d\'envoi.', 'success');
}

/* ─────────────────────────────────────────────────────────
   Filtres
───────────────────────────────────────────────────────── */
function filterClients() {
  const q    = document.getElementById('search-input')?.value.toLowerCase() ?? '';
  const abo  = document.getElementById('abonnement-filter')?.value ?? '';
  const stat = document.getElementById('status-filter')?.value ?? '';

  let count = 0;
  document.querySelectorAll('#clients-table tbody tr').forEach(row => {
    const text = row.textContent.toLowerCase();
    const show = text.includes(q)
      && (!abo  || (row.dataset.abonnement ?? '') === abo)
      && (!stat || (row.dataset.statut     ?? '') === stat);
    row.style.display = show ? '' : 'none';
    if (show) { count++; if (!row.style.opacity || row.style.opacity === '0') pulseRow(row); }
  });

  const c = document.getElementById('clients-count');
  if (c) c.textContent = count;
}

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex'; el.style.opacity = '0';
  el.style.transition = 'opacity .25s';
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  const inner = el.querySelector('.modal-content,.modal__inner,.modal-box');
  if (inner) {
    inner.style.transform = 'scale(.95) translateY(-12px)'; inner.style.transition = 'transform .25s ease';
    requestAnimationFrame(() => { inner.style.transform = 'scale(1) translateY(0)'; });
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => { el.style.display = 'none'; el.style.opacity = ''; }, 220);
}

function setLoadingBtn(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.label = btn.textContent;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> En cours…';
    btn.disabled  = true;
  } else {
    btn.innerHTML = btn.dataset.label ?? 'Enregistrer';
    btn.disabled  = false;
  }
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function showNotification(message, type = 'info') {
  let zone = document.getElementById('notif-zone');
  if (!zone) {
    zone = document.createElement('div');
    zone.id = 'notif-zone';
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
