/**
 * flotte.js — Module admin flotte : CRUD véhicules, maintenance, assignation
 * VoyageIQ Pro
 */
'use strict';

/* ─────────────────────────────────────────────────────────
   État local
───────────────────────────────────────────────────────── */
let currentVehiculeId = null;
let editMode = false;

/* ─────────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module flotte chargé.');

  // Filtres live
  const searchInput  = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const typeFilter   = document.getElementById('type-filter');

  if (searchInput)  searchInput.addEventListener('input', filterVehicules);
  if (statusFilter) statusFilter.addEventListener('change', filterVehicules);
  if (typeFilter)   typeFilter.addEventListener('change', filterVehicules);

  // Fermeture modales au clic backdrop
  ['vehicule-modal', 'assign-modal', 'maintenance-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) el.style.display = 'none'; });
  });

  // Forms
  const vehiculeForm = document.getElementById('vehicule-form');
  if (vehiculeForm) vehiculeForm.addEventListener('submit', handleVehiculeSubmit);

  const assignForm = document.getElementById('assign-form');
  if (assignForm) assignForm.addEventListener('submit', handleAssignSubmit);

  const maintenanceForm = document.getElementById('maintenance-form');
  if (maintenanceForm) maintenanceForm.addEventListener('submit', handleMaintenanceSubmit);
});

/* ─────────────────────────────────────────────────────────
   Modal véhicule
───────────────────────────────────────────────────────── */
function openVehiculeModal(vehiculeId = null) {
  editMode = !!vehiculeId;
  currentVehiculeId = vehiculeId;
  const modal = document.getElementById('vehicule-modal');
  const title = document.getElementById('modal-title');
  const form  = document.getElementById('vehicule-form');
  if (!modal) return;
  title.textContent = editMode ? 'Modifier véhicule' : 'Nouveau véhicule';
  form.reset();
  document.getElementById('vehicule-id').value = '';
  if (editMode) loadVehiculeData(vehiculeId);
  modal.style.display = 'flex';
}

function closeVehiculeModal() {
  const modal = document.getElementById('vehicule-modal');
  if (modal) modal.style.display = 'none';
  currentVehiculeId = null;
  editMode = false;
}

async function loadVehiculeData(vehiculeId) {
  try {
    const res = await fetch(`/admin/api/vehicules/${vehiculeId}`);
    if (!res.ok) throw new Error('Erreur');
    const data = await res.json();
    const fields = ['vehicule-id','immatriculation','marque','modele','annee_fabrication',
                    'type_vehicule','capacite','kilometrage','statut','prochaine_maintenance',
                    'date_derniere_maintenance','notes'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      const key = id.replace('-', '_');
      if (el) el.value = data[key] ?? data[id] ?? '';
    });
  } catch (err) {
    showNotification('Impossible de charger les données du véhicule.', 'error');
  }
}

async function editVehicule(vehiculeId) {
  openVehiculeModal(vehiculeId);
}

async function handleVehiculeSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('vehicule-id')?.value;
  const formData = new FormData(e.target);
  const url    = id ? `/admin/api/vehicules/${id}` : '/admin/api/vehicules';
  const method = id ? 'PUT' : 'POST';
  try {
    const res = await fetch(url, { method, body: formData });
    if (!res.ok) throw new Error('Erreur');
    showNotification(id ? 'Véhicule modifié.' : 'Véhicule créé.', 'success');
    closeVehiculeModal();
    setTimeout(() => location.reload(), 800);
  } catch (err) {
    showNotification('Une erreur est survenue.', 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Assignation chauffeur
───────────────────────────────────────────────────────── */
function assignDriver(vehiculeId) {
  const modal = document.getElementById('assign-modal');
  const field = document.getElementById('assign-vehicule-id');
  if (!modal) return;
  if (field) field.value = vehiculeId;
  modal.style.display = 'flex';
}

function closeAssignModal() {
  const modal = document.getElementById('assign-modal');
  if (modal) modal.style.display = 'none';
}

async function handleAssignSubmit(e) {
  e.preventDefault();
  const vehiculeId  = document.getElementById('assign-vehicule-id')?.value;
  const chauffeurId = document.getElementById('assign-chauffeur-id')?.value;
  try {
    const res = await fetch(`/admin/api/vehicules/${vehiculeId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chauffeur_id: chauffeurId })
    });
    if (!res.ok) throw new Error('Erreur');
    showNotification('Chauffeur assigné avec succès.', 'success');
    closeAssignModal();
    setTimeout(() => location.reload(), 800);
  } catch (err) {
    showNotification('Erreur lors de l\'assignation.', 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Maintenance
───────────────────────────────────────────────────────── */
function scheduleMaintenance(vehiculeId) {
  const modal = document.getElementById('maintenance-modal');
  const field = document.getElementById('maintenance-vehicule-id');
  if (!modal) return;
  if (field) field.value = vehiculeId;
  const form = document.getElementById('maintenance-form');
  if (form) form.reset();
  if (field) field.value = vehiculeId;
  modal.style.display = 'flex';
}

function closeMaintenanceModal() {
  const modal = document.getElementById('maintenance-modal');
  if (modal) modal.style.display = 'none';
}

async function handleMaintenanceSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  try {
    const res = await fetch('/admin/api/maintenance', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Erreur');
    showNotification('Maintenance planifiée.', 'success');
    closeMaintenanceModal();
    setTimeout(() => location.reload(), 800);
  } catch (err) {
    showNotification('Erreur lors de la planification.', 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Actions
───────────────────────────────────────────────────────── */
function viewHistory(vehiculeId) {
  window.location.href = `/admin/flotte/${vehiculeId}/historique`;
}

async function deleteVehicule(vehiculeId) {
  if (!confirm('Confirmer la suppression de ce véhicule ?')) return;
  try {
    const res = await fetch(`/admin/api/vehicules/${vehiculeId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erreur');
    showNotification('Véhicule supprimé.', 'success');
    const row = document.querySelector(`tr[data-vehicule-id="${vehiculeId}"]`);
    if (row) row.remove();
  } catch (err) {
    showNotification('Erreur lors de la suppression.', 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Filtres
───────────────────────────────────────────────────────── */
function filterVehicules() {
  const query  = document.getElementById('search-input')?.value.toLowerCase() ?? '';
  const status = document.getElementById('status-filter')?.value ?? '';
  const type   = document.getElementById('type-filter')?.value ?? '';

  document.querySelectorAll('#flotte-table tbody tr').forEach(row => {
    const text    = row.textContent.toLowerCase();
    const rowStat = row.dataset.statut ?? '';
    const rowType = row.dataset.type ?? '';

    row.style.display = (
      text.includes(query) &&
      (!status || rowStat === status) &&
      (!type   || rowType === type)
    ) ? '' : 'none';
  });
}

/* ─────────────────────────────────────────────────────────
   Export
───────────────────────────────────────────────────────── */
function exportFlotte() {
  const table = document.getElementById('flotte-table');
  if (!table) return;
  const rows = Array.from(table.querySelectorAll('tr'));
  const csv  = rows.map(r =>
    Array.from(r.querySelectorAll('th, td'))
      .slice(0, -1)
      .map(c => `"${c.textContent.trim()}"`)
      .join(',')
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'flotte.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────────────────
   Notification
───────────────────────────────────────────────────────── */
function showNotification(message, type = 'info') {
  const n = document.createElement('div');
  n.className = `notification notification--${type} show`;
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 400); }, 3500);
}
