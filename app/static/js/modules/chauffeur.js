/**
 * chauffeurs.js — Module admin chauffeurs : CRUD, filtres, export
 * VoyageIQ Pro
 */
'use strict';

/* ─────────────────────────────────────────────────────────
   État local
───────────────────────────────────────────────────────── */
let currentChauffeurId = null;
let editMode = false;

/* ─────────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module chauffeurs chargé.');

  // Filtres live
  const searchInput  = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const vehicleFilter = document.getElementById('vehicle-filter');

  if (searchInput)   searchInput.addEventListener('input', filterChauffeurs);
  if (statusFilter)  statusFilter.addEventListener('change', filterChauffeurs);
  if (vehicleFilter) vehicleFilter.addEventListener('change', filterChauffeurs);

  // Fermeture modales au clic sur le backdrop
  ['chauffeur-modal', 'assign-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', function (e) {
        if (e.target === this) this.style.display = 'none';
      });
    }
  });

  // Soumission form chauffeur
  const chauffeurForm = document.getElementById('chauffeur-form');
  if (chauffeurForm) {
    chauffeurForm.addEventListener('submit', handleChauffeurSubmit);
  }

  // Soumission form assignation
  const assignForm = document.getElementById('assign-form');
  if (assignForm) {
    assignForm.addEventListener('submit', handleAssignSubmit);
  }
});

/* ─────────────────────────────────────────────────────────
   Modal chauffeur (créer / modifier)
───────────────────────────────────────────────────────── */
function openChauffeurModal(chauffeurId = null) {
  editMode = !!chauffeurId;
  currentChauffeurId = chauffeurId;

  const modal = document.getElementById('chauffeur-modal');
  const title = document.getElementById('modal-title');
  const form  = document.getElementById('chauffeur-form');

  if (!modal) return;
  title.textContent = editMode ? 'Modifier chauffeur' : 'Nouveau chauffeur';
  form.reset();
  document.getElementById('chauffeur-id').value = '';

  if (editMode) loadChauffeurData(chauffeurId);
  modal.style.display = 'flex';
}

function closeChauffeurModal() {
  const modal = document.getElementById('chauffeur-modal');
  if (modal) modal.style.display = 'none';
  currentChauffeurId = null;
  editMode = false;
}

async function loadChauffeurData(chauffeurId) {
  try {
    const res = await fetch(`/admin/api/chauffeurs/${chauffeurId}`);
    if (!res.ok) throw new Error('Erreur chargement');
    const data = await res.json();

    const fields = ['chauffeur-id','nom','prenom','email','telephone',
                    'adresse','numero_permis','date_expiration_permis',
                    'date_naissance','vehicule_id','statut','matricule'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = data[id.replace('-','_')] ?? data[id] ?? '';
    });
  } catch (err) {
    showNotification('Impossible de charger les données du chauffeur.', 'error');
    console.error(err);
  }
}

async function editChauffeur(chauffeurId) {
  openChauffeurModal(chauffeurId);
}

async function handleChauffeurSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const id = document.getElementById('chauffeur-id')?.value;
  const url    = id ? `/admin/api/chauffeurs/${id}` : '/admin/api/chauffeurs';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method, body: formData });
    if (!res.ok) throw new Error('Erreur serveur');
    showNotification(id ? 'Chauffeur modifié avec succès.' : 'Chauffeur créé avec succès.', 'success');
    closeChauffeurModal();
    setTimeout(() => location.reload(), 800);
  } catch (err) {
    showNotification('Une erreur est survenue.', 'error');
    console.error(err);
  }
}

/* ─────────────────────────────────────────────────────────
   Assignation véhicule
───────────────────────────────────────────────────────── */
function assignVehicle(chauffeurId) {
  const modal = document.getElementById('assign-modal');
  const field = document.getElementById('assign-chauffeur-id');
  if (!modal) return;
  if (field) field.value = chauffeurId;
  modal.style.display = 'flex';
}

function closeAssignModal() {
  const modal = document.getElementById('assign-modal');
  if (modal) modal.style.display = 'none';
}

async function handleAssignSubmit(e) {
  e.preventDefault();
  const chauffeurId = document.getElementById('assign-chauffeur-id')?.value;
  const vehiculeId  = document.getElementById('assign-vehicule-id')?.value;

  try {
    const res = await fetch(`/admin/api/chauffeurs/${chauffeurId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicule_id: vehiculeId })
    });
    if (!res.ok) throw new Error('Erreur');
    showNotification('Véhicule assigné avec succès.', 'success');
    closeAssignModal();
    setTimeout(() => location.reload(), 800);
  } catch (err) {
    showNotification('Erreur lors de l\'assignation.', 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Actions
───────────────────────────────────────────────────────── */
function viewProfile(chauffeurId) {
  window.location.href = `/admin/chauffeurs/${chauffeurId}`;
}

async function deleteChauffeur(chauffeurId) {
  if (!confirm('Confirmer la suppression de ce chauffeur ?')) return;
  try {
    const res = await fetch(`/admin/api/chauffeurs/${chauffeurId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erreur');
    showNotification('Chauffeur supprimé.', 'success');
    const row = document.querySelector(`tr[data-chauffeur-id="${chauffeurId}"]`);
    if (row) row.remove();
  } catch (err) {
    showNotification('Erreur lors de la suppression.', 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   Filtres tableau
───────────────────────────────────────────────────────── */
function filterChauffeurs() {
  const query   = document.getElementById('search-input')?.value.toLowerCase() ?? '';
  const status  = document.getElementById('status-filter')?.value ?? '';
  const vehicle = document.getElementById('vehicle-filter')?.value ?? '';

  document.querySelectorAll('#chauffeurs-table tbody tr').forEach(row => {
    const text    = row.textContent.toLowerCase();
    const rowStat = row.dataset.statut ?? '';
    const rowVeh  = row.dataset.vehicule ?? '';

    const matchText   = text.includes(query);
    const matchStatus = !status  || rowStat === status;
    const matchVeh    = !vehicle || rowVeh  === vehicle;

    row.style.display = (matchText && matchStatus && matchVeh) ? '' : 'none';
  });
}

/* ─────────────────────────────────────────────────────────
   Export CSV
───────────────────────────────────────────────────────── */
function exportChauffeurs() {
  const table = document.getElementById('chauffeurs-table');
  if (!table) return;
  const rows = Array.from(table.querySelectorAll('tr'));
  const csv  = rows.map(r =>
    Array.from(r.querySelectorAll('th, td'))
      .slice(0, -1) // exclure colonne actions
      .map(c => `"${c.textContent.trim()}"`)
      .join(',')
  ).join('\n');

  downloadBlob(csv, 'text/csv', 'chauffeurs.csv');
}

/* ─────────────────────────────────────────────────────────
   Utilitaires
───────────────────────────────────────────────────────── */
function downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function showNotification(message, type = 'info') {
  const n = document.createElement('div');
  n.className = `notification notification--${type} show`;
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 400); }, 3500);
}
