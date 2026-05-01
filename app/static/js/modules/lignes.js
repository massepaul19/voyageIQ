/**
 * lignes.js — Module admin lignes : CRUD, arrêts dynamiques, horaires, animations
 * VoyageIQ Pro
 */
'use strict';

/* ─────────────────────────────────────────────────────────
   État
───────────────────────────────────────────────────────── */
let currentLigneId = null;
let editMode       = false;
let arretCounter   = 1;

/* ─────────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module lignes chargé.');

  // Filtres
  ['search-input','status-filter','type-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(id === 'search-input' ? 'input' : 'change', debounce(filterLignes, 220));
  });

  // Backdrop
  ['ligne-modal','horaires-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) closeModalById(id); });
  });

  // Forms
  const ligneForm = document.getElementById('ligne-form');
  if (ligneForm) ligneForm.addEventListener('submit', handleLigneSubmit);

  // ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') ['ligne-modal','horaires-modal'].forEach(closeModalById);
  });

  // Animations initiales
  animateTableRows();
  animateKPIs();
});

/* ─────────────────────────────────────────────────────────
   Animations
───────────────────────────────────────────────────────── */
function animateTableRows() {
  document.querySelectorAll('#lignes-table tbody tr').forEach((row, i) => {
    row.style.opacity   = '0';
    row.style.transform = 'translateX(-12px)';
    row.style.transition = `opacity .3s ${i * 45}ms, transform .3s ${i * 45}ms`;
    requestAnimationFrame(() => { row.style.opacity = '1'; row.style.transform = ''; });
  });
}

function animateKPIs() {
  document.querySelectorAll('.kpi-value[data-count]').forEach(el => {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateCounter(el, +el.dataset.count); io.disconnect();
      }
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

/* ─────────────────────────────────────────────────────────
   Modal ligne
───────────────────────────────────────────────────────── */
function openLigneModal(ligneId = null) {
  editMode       = !!ligneId;
  currentLigneId = ligneId;

  const modal  = document.getElementById('ligne-modal');
  const title  = document.getElementById('modal-title');
  const form   = document.getElementById('ligne-form');
  if (!modal) return;

  title.textContent = editMode ? 'Modifier ligne' : 'Nouvelle ligne';
  form.reset();
  document.getElementById('ligne-id').value = '';

  // Reset arrêts dynamiques
  resetArrets();

  if (editMode) loadLigneData(ligneId);
  openModal('ligne-modal');
}

function closeLigneModal() { closeModalById('ligne-modal'); currentLigneId = null; editMode = false; }

async function loadLigneData(ligneId) {
  try {
    const res   = await fetch(`/admin/api/lignes/${ligneId}`);
    const ligne = await res.json();

    const fields = ['ligne-id','numero_ligne','nom_ligne','point_depart','point_arrivee',
                    'heure_depart','heure_arrivee','duree_estimee','frequence','type_ligne',
                    'distance','prix_base','prix_reduit','prix_enfant','statut','description'];
    fields.forEach(id => {
      const el  = document.getElementById(id);
      const key = id.replace('-', '_');
      if (el) el.value = ligne[key] ?? ligne[id] ?? '';
    });

    // Arrêts
    const container = document.getElementById('arrets-container');
    if (container && ligne.arrets?.length) {
      container.innerHTML = '';
      arretCounter = 0;
      ligne.arrets.forEach(a => addArret(a.nom ?? a));
    }
  } catch {
    showNotification('Impossible de charger la ligne.', 'error');
  }
}

async function editLigne(ligneId) { openLigneModal(ligneId); }

async function handleLigneSubmit(e) {
  e.preventDefault();
  const btn  = e.target.querySelector('[type=submit]');
  const id   = document.getElementById('ligne-id')?.value;
  const formData = new FormData(e.target);
  setLoadingBtn(btn, true);
  try {
    const res = await fetch(
      id ? `/admin/api/lignes/${id}` : '/admin/api/lignes',
      { method: id ? 'PUT' : 'POST', body: formData }
    );
    if (!res.ok) throw new Error();
    showNotification(id ? 'Ligne modifiée.' : 'Ligne créée.', 'success');
    closeLigneModal();
    setTimeout(() => location.reload(), 700);
  } catch {
    showNotification('Erreur lors de l\'enregistrement.', 'error');
  } finally { setLoadingBtn(btn, false); }
}

/* ─────────────────────────────────────────────────────────
   Arrêts dynamiques
───────────────────────────────────────────────────────── */
function resetArrets() {
  arretCounter = 1;
  const container = document.getElementById('arrets-container');
  if (!container) return;
  container.innerHTML = `
    <div class="arret-input-group" data-arret="${arretCounter}">
      <span class="arret-num">${arretCounter}</span>
      <input type="text" class="form-input arret-input" name="arrets[]" placeholder="Nom de l'arrêt">
      <button type="button" class="btn btn-sm btn-ghost arret-add" onclick="addArret()"><i class="fas fa-plus"></i></button>
    </div>`;
}

function addArret(value = '') {
  arretCounter++;
  const container = document.getElementById('arrets-container');
  if (!container) return;

  const div = document.createElement('div');
  div.className     = 'arret-input-group';
  div.dataset.arret = arretCounter;
  div.style.opacity = '0';
  div.style.transform = 'translateY(-6px)';
  div.style.transition = 'opacity .2s, transform .2s';
  div.innerHTML = `
    <span class="arret-num">${arretCounter}</span>
    <input type="text" class="form-input arret-input" name="arrets[]" placeholder="Nom de l'arrêt" value="${value}">
    <button type="button" class="btn btn-sm btn-danger arret-remove" onclick="removeArret(this)"><i class="fas fa-minus"></i></button>`;

  container.appendChild(div);
  requestAnimationFrame(() => { div.style.opacity = '1'; div.style.transform = 'translateY(0)'; });
  div.querySelector('input')?.focus();
}

function removeArret(btn) {
  const group = btn.closest('.arret-input-group');
  if (!group) return;
  group.style.transition = 'opacity .2s, transform .2s, max-height .2s';
  group.style.opacity    = '0';
  group.style.transform  = 'translateX(10px)';
  group.style.maxHeight  = group.offsetHeight + 'px';
  setTimeout(() => {
    group.style.maxHeight = '0';
    group.style.margin    = '0';
    setTimeout(() => {
      group.remove();
      // Renuméroter
      document.querySelectorAll('#arrets-container .arret-num').forEach((num, i) => {
        num.textContent = i + 1;
      });
    }, 150);
  }, 180);
}

/* ─────────────────────────────────────────────────────────
   Actions lignes
───────────────────────────────────────────────────────── */
function viewItineraire(ligneId) {
  window.location.href = `/admin/carte?ligne=${ligneId}`;
}

function viewStats(ligneId) {
  window.location.href = `/admin/analytique?ligne=${ligneId}`;
}

async function deleteLigne(ligneId) {
  if (!confirm('Supprimer cette ligne ? Cette action est irréversible.')) return;
  try {
    const res = await fetch(`/admin/api/lignes/${ligneId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showNotification('Ligne supprimée.', 'success');
    const row = document.querySelector(`tr[data-ligne-id="${ligneId}"]`);
    if (row) slideOutRow(row);
  } catch {
    showNotification('Erreur lors de la suppression.', 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Modal horaires
───────────────────────────────────────────────────────── */
function manageHoraires(ligneId) {
  document.getElementById('horaires-ligne-id').value = ligneId;
  openModal('horaires-modal');
  loadHoraires(ligneId);
}

function closeHorairesModal() { closeModalById('horaires-modal'); }

async function loadHoraires(ligneId) {
  const list = document.getElementById('horaires-list');
  if (!list) return;

  list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--t3)"><i class="fas fa-spinner fa-spin"></i> Chargement…</div>`;

  try {
    const res     = await fetch(`/admin/api/lignes/${ligneId}/horaires`);
    const horaires = await res.json();

    if (!horaires.length) {
      list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--t3)">Aucun horaire enregistré.</div>`;
      return;
    }

    list.innerHTML = horaires.map((h, i) => `
      <div class="horaire-item" style="opacity:0;transform:translateY(8px);transition:opacity .25s ${i*40}ms,transform .25s ${i*40}ms">
        <span class="heure-depart"><i class="fas fa-circle" style="color:var(--ok);font-size:8px;"></i> ${h.heure_depart}</span>
        <span class="arrow"><i class="fas fa-arrow-right"></i></span>
        <span class="heure-arrivee"><i class="fas fa-circle" style="color:var(--err);font-size:8px;"></i> ${h.heure_arrivee}</span>
        <span style="flex:1;font-size:11px;color:var(--t3)">${h.jours ?? 'Tous les jours'}</span>
        <button class="btn btn-sm btn-danger" onclick="deleteHoraire(${h.id})"><i class="fas fa-trash"></i></button>
      </div>`).join('');

    requestAnimationFrame(() => {
      list.querySelectorAll('.horaire-item').forEach(el => {
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  } catch {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--err)">Erreur de chargement.</div>`;
  }
}

function addHoraire() {
  const ligneId  = document.getElementById('horaires-ligne-id')?.value;
  const depart   = prompt('Heure de départ (HH:MM) :');
  if (!depart) return;
  const arrivee  = prompt('Heure d\'arrivée (HH:MM) :');
  if (!arrivee) return;

  fetch('/admin/api/horaires', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ligne_id: ligneId, heure_depart: depart, heure_arrivee: arrivee })
  })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(() => { showNotification('Horaire ajouté.', 'success'); loadHoraires(ligneId); })
    .catch(() => showNotification('Erreur ajout horaire.', 'error'));
}

async function deleteHoraire(horaireId) {
  if (!confirm('Supprimer cet horaire ?')) return;
  try {
    await fetch(`/admin/api/horaires/${horaireId}`, { method: 'DELETE' });
    showNotification('Horaire supprimé.', 'success');
    const ligneId = document.getElementById('horaires-ligne-id')?.value;
    if (ligneId) loadHoraires(ligneId);
  } catch {
    showNotification('Erreur suppression horaire.', 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Export
───────────────────────────────────────────────────────── */
function exportLignes() {
  showNotification('Export des lignes en cours…', 'info');
  window.location.href = '/admin/api/lignes/export';
}

/* ─────────────────────────────────────────────────────────
   Filtres
───────────────────────────────────────────────────────── */
function filterLignes() {
  const q    = document.getElementById('search-input')?.value.toLowerCase() ?? '';
  const stat = document.getElementById('status-filter')?.value ?? '';
  const type = document.getElementById('type-filter')?.value ?? '';

  document.querySelectorAll('#lignes-table tbody tr').forEach(row => {
    const show = row.textContent.toLowerCase().includes(q)
      && (!stat || (row.dataset.statut ?? '') === stat)
      && (!type || (row.dataset.type   ?? '') === type);
    row.style.display    = show ? '' : 'none';
    row.style.transition = 'opacity .2s';
    row.style.opacity    = show ? '1' : '0';
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
