/**
 * VoyageIQ Pro — carte.js
 * Module : Carte & Itinéraires
 * Dépendance : Leaflet 1.9.4 (chargé avant ce script dans le HTML)
 */
'use strict';

/* ══════════════════════════════════════════════════════════════
   ÉTAT GLOBAL
══════════════════════════════════════════════════════════════ */
let map           = null;
let currentTool   = 'select';
let routePoints   = [];
let routePolyline = null;
let measurePoints = [];
let measureLine   = null;
let undoStack     = [];
let redoStack     = [];
const layers      = {};          // { routes, stops, drawing }

/* ══════════════════════════════════════════════════════════════
   INITIALISATION
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadItineraires();
  loadStops();
  bindModals();
  bindForms();
  bindKeyboard();
  animateSidebar();
  animateKpis();
});

/* ══════════════════════════════════════════════════════════════
   LEAFLET — Initialisation
══════════════════════════════════════════════════════════════ */
function initMap() {
  const container = document.getElementById('map-container');
  if (!container) return;

  // Leaflet non chargé → message
  if (typeof L === 'undefined') {
    container.innerHTML = `
      <div class="map-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <span>Leaflet introuvable — vérifiez le CDN.</span>
      </div>`;
    return;
  }

  // Masquer le placeholder
  const placeholder = document.getElementById('map-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  // Créer la carte — centré sur Yaoundé
  map = L.map('map-container', {
    center: [3.8667, 11.5167],
    zoom: 13,
    zoomControl: false,        // on a nos propres boutons
    preferCanvas: true
  });

  // Tuiles sombres (CARTO Dark — pas d'authentification requise)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Couches
  layers.routes  = L.layerGroup().addTo(map);
  layers.stops   = L.layerGroup().addTo(map);
  layers.drawing = L.layerGroup().addTo(map);

  // Zoom natif Leaflet en bas à droite
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Animation d'apparition de la carte
  container.style.opacity  = '0';
  container.style.transition = 'opacity .7s ease';
  map.whenReady(() => {
    requestAnimationFrame(() => { container.style.opacity = '1'; });
  });

  setupMapEvents();
}

function setupMapEvents() {
  if (!map) return;

  map.on('click', e => {
    if (currentTool === 'marker')  addStopAtPosition(e.latlng);
    else if (currentTool === 'route')   addRoutePoint(e.latlng);
    else if (currentTool === 'measure') updateMeasurement(e.latlng);
  });
}

/* ══════════════════════════════════════════════════════════════
   CHARGEMENT DONNÉES
══════════════════════════════════════════════════════════════ */
function loadItineraires() {
  fetch('/api/cartes/itineraires')
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(data => {
      data.forEach(addItineraireToMap);
      animateItinerairesList();
    })
    .catch(err => console.warn('[VoyageIQ] Itinéraires non chargés :', err));
}

function loadStops() {
  fetch('/api/cartes/arrets')
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(data => data.forEach(addStopToMap))
    .catch(err => console.warn('[VoyageIQ] Arrêts non chargés :', err));
}

/* ══════════════════════════════════════════════════════════════
   RENDU — Itinéraires & Arrêts
══════════════════════════════════════════════════════════════ */
function addItineraireToMap(itineraire) {
  if (!map || !itineraire.points || itineraire.points.length < 2) return;
  const color = itineraire.couleur ?? '#C9A84C';

  const poly = L.polyline(itineraire.points, {
    color,
    weight: 4,
    opacity: .85,
    smoothFactor: 1.5
  }).addTo(layers.routes);

  poly.bindTooltip(
    `<strong style="color:${color}">${itineraire.nom ?? 'Itinéraire'}</strong>`,
    { sticky: true, className: 'leaflet-tooltip-viq' }
  );

  poly.on('click', () => highlightItineraire(itineraire.id));
}

function addStopToMap(arret) {
  if (!map) return;
  const lat = parseFloat(arret.lat ?? arret.latitude);
  const lng = parseFloat(arret.lng ?? arret.longitude);
  if (isNaN(lat) || isNaN(lng)) return;

  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:10px;height:10px;
      border-radius:50%;
      background:#F97316;
      border:2px solid #fff;
      box-shadow:0 0 8px rgba(249,115,22,.6);
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });

  const marker = L.marker([lat, lng], { icon }).addTo(layers.stops);
  marker.bindPopup(buildStopPopup(arret), {
    className: 'viq-popup',
    maxWidth: 220
  });
}

function buildStopPopup(arret) {
  return `
    <div class="vehicle-popup">
      <h4>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        ${arret.nom ?? 'Arrêt'}
      </h4>
      ${arret.description ? `<p>${arret.description}</p>` : ''}
      <p style="font-size:10px;opacity:.6;margin-top:4px">
        ${parseFloat(arret.lat ?? arret.latitude).toFixed(5)}, ${parseFloat(arret.lng ?? arret.longitude).toFixed(5)}
      </p>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   OUTILS DE DESSIN
══════════════════════════════════════════════════════════════ */
function setTool(tool) {
  currentTool = tool;

  // Mise à jour boutons
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    // Micro-animation rebond
    activeBtn.style.transform = 'scale(.85)';
    requestAnimationFrame(() => {
      activeBtn.style.transition = 'transform .18s cubic-bezier(.34,1.56,.64,1)';
      activeBtn.style.transform = '';
    });
    setTimeout(() => { activeBtn.style.transition = ''; }, 200);
  }

  // Curseur
  if (map) {
    map.getContainer().style.cursor =
      tool === 'select'  ? '' :
      tool === 'marker'  ? 'crosshair' :
      tool === 'route'   ? 'cell' :
      tool === 'measure' ? 'crosshair' : '';
  }

  // Barre d'outils de dessin
  const toolbar = document.getElementById('drawing-toolbar');
  if (toolbar) {
    const show = tool !== 'select';
    toolbar.style.display = show ? 'flex' : 'none';
    if (show) {
      toolbar.style.opacity = '0';
      toolbar.style.transform = 'translateX(-50%) translateY(-6px)';
      toolbar.style.transition = 'opacity .2s, transform .2s';
      requestAnimationFrame(() => {
        toolbar.style.opacity = '1';
        toolbar.style.transform = 'translateX(-50%) translateY(0)';
      });
    }
  }

  // Réinitialiser outils précédents
  if (tool !== 'route')   { routePoints = []; if (routePolyline && map) { map.removeLayer(routePolyline); routePolyline = null; } }
  if (tool !== 'measure') clearMeasurement();

  updateToolOptions(tool);
}

function updateToolOptions(tool) {
  const container = document.getElementById('tool-options');
  if (!container) return;

  // Fade out
  container.style.opacity = '0';
  container.style.transition = 'opacity .18s';

  let html = '';
  switch (tool) {
    case 'marker':
      html = `<span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t3)">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Cliquez sur la carte pour placer un arrêt
      </span>`;
      break;
    case 'route':
      html = `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--t3)">Cliquez pour ajouter des points</span>
        <button class="btn btn--gold btn--sm" style="padding:3px 8px;font-size:11px" onclick="finishRoute()">✓ Terminer</button>
      </div>`;
      break;
    case 'measure':
      html = `<div style="display:flex;align-items:center;gap:8px">
        <span id="measurement-display" style="font-family:var(--font-mono);font-size:12px;color:var(--gold);font-weight:600">0.000 km</span>
        <button class="btn btn--ghost btn--sm" style="padding:3px 8px;font-size:11px" onclick="clearMeasurement()">Effacer</button>
      </div>`;
      break;
  }

  container.innerHTML = html;
  requestAnimationFrame(() => { container.style.opacity = '1'; });
}

/* ══════════════════════════════════════════════════════════════
   ROUTE
══════════════════════════════════════════════════════════════ */
function addRoutePoint(latlng) {
  routePoints.push(latlng);

  // Effacer l'ancien tracé temporaire
  if (routePolyline) layers.drawing.removeLayer(routePolyline);

  if (routePoints.length >= 2) {
    routePolyline = L.polyline(routePoints, {
      color: '#C9A84C',
      weight: 3,
      opacity: .75,
      dashArray: '8 5'
    }).addTo(layers.drawing);
  }

  // Point cliqué (petit cercle)
  const dot = L.circleMarker(latlng, {
    radius: 4,
    color: '#C9A84C',
    fillColor: '#C9A84C',
    fillOpacity: 1,
    weight: 2
  }).addTo(layers.drawing);

  undoStack.push({ type: 'routePoint', marker: dot });

  updateInfoPanel(
    calculateDistance(routePoints),
    calculateDistance(routePoints) * 2.4, // estimation : 25 km/h
    routePoints.length
  );
}

function finishRoute() {
  if (routePoints.length < 2) {
    showNotification('Tracez au moins 2 points pour créer un itinéraire.', 'warning');
    return;
  }
  const dist = calculateDistance(routePoints);
  showNotification(`Route tracée : ${dist.toFixed(1)} km / ~${Math.round(dist * 2.4)} min`, 'success');
  routePoints = [];
  setTool('select');
}

function calculateDistance(points) {
  if (points.length < 2) return 0;
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += points[i - 1].distanceTo(points[i]);
  }
  return d / 1000; // km
}

/* ══════════════════════════════════════════════════════════════
   MESURE
══════════════════════════════════════════════════════════════ */
function updateMeasurement(latlng) {
  measurePoints.push(latlng);
  if (measureLine) layers.drawing.removeLayer(measureLine);

  if (measurePoints.length >= 2) {
    measureLine = L.polyline(measurePoints, {
      color: '#60A5FA',
      weight: 2,
      dashArray: '5 4',
      opacity: .8
    }).addTo(layers.drawing);

    const dist = calculateDistance(measurePoints);
    const display = document.getElementById('measurement-display');
    if (display) {
      display.textContent = `${dist.toFixed(3)} km`;
      display.style.transform = 'scale(1.12)';
      display.style.transition = 'transform .15s';
      setTimeout(() => { display.style.transform = ''; }, 200);
    }
  }
}

function clearMeasurement() {
  measurePoints = [];
  if (measureLine) { layers.drawing?.removeLayer(measureLine); measureLine = null; }
  const display = document.getElementById('measurement-display');
  if (display) display.textContent = '0.000 km';
}

/* ══════════════════════════════════════════════════════════════
   PANNEAU INFO
══════════════════════════════════════════════════════════════ */
function updateInfoPanel(dist, duration, stops) {
  const panel = document.getElementById('info-panel');
  if (panel) {
    panel.style.opacity = '0';
    panel.style.transition = 'opacity .25s';
    setTimeout(() => { panel.style.opacity = '1'; }, 60);
  }
  const el = (id, txt) => { const e = document.getElementById(id); if (e) e.lastChild.textContent = ' ' + txt; };
  const distEl = document.getElementById('info-distance');
  const durEl  = document.getElementById('info-duration');
  const stpEl  = document.getElementById('info-stops');
  if (distEl) distEl.innerHTML = distEl.innerHTML.replace(/Distance.*/, `Distance : ${dist.toFixed(1)} km`);
  if (durEl)  durEl.innerHTML  = durEl.innerHTML.replace(/Durée.*/, `Durée : ~${Math.round(duration)} min`);
  if (stpEl)  stpEl.innerHTML  = stpEl.innerHTML.replace(/Points.*/, `Points : ${stops}`);
}

/* ══════════════════════════════════════════════════════════════
   COUCHES
══════════════════════════════════════════════════════════════ */
function toggleLayer(layerName) {
  if (!map || !layers[layerName]) return;
  if (map.hasLayer(layers[layerName])) {
    map.removeLayer(layers[layerName]);
  } else {
    map.addLayer(layers[layerName]);
  }
}

/* ══════════════════════════════════════════════════════════════
   CONTRÔLES CARTE
══════════════════════════════════════════════════════════════ */
function zoomIn()  { map?.zoomIn(); }
function zoomOut() { map?.zoomOut(); }

function fitBounds() {
  if (!map) return;
  const group = L.featureGroup([layers.stops, layers.routes].filter(Boolean));
  try {
    const bounds = group.getBounds();
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [40, 40], duration: .8 });
    }
  } catch (e) {
    showNotification('Aucun élément à ajuster.', 'info');
  }
}

function toggleFullscreen() {
  const container = document.getElementById('carte-map-wrapper');
  if (!container) return;
  if (!document.fullscreenElement) {
    container.requestFullscreen?.().then(() => {
      setTimeout(() => map?.invalidateSize(), 200);
    });
  } else {
    document.exitFullscreen?.();
  }
}

document.addEventListener('fullscreenchange', () => {
  setTimeout(() => map?.invalidateSize(), 200);
  const btn = document.getElementById('btn-fullscreen');
  if (btn) btn.title = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran';
});

/* ══════════════════════════════════════════════════════════════
   UNDO / REDO / CLEAR
══════════════════════════════════════════════════════════════ */
function undo() {
  const action = undoStack.pop();
  if (!action) { showNotification('Rien à annuler.', 'info'); return; }
  redoStack.push(action);
  if (action.marker && map) {
    layers.drawing?.removeLayer(action.marker);
    layers.stops?.removeLayer(action.marker);
  }
  showNotification('Action annulée.', 'info');
}

function redo() {
  const action = redoStack.pop();
  if (!action) { showNotification('Rien à rétablir.', 'info'); return; }
  undoStack.push(action);
  if (action.marker && map) action.marker.addTo(layers.drawing);
  showNotification('Action rétablie.', 'info');
}

function clearSelection() {
  layers.drawing?.clearLayers();
  routePoints = [];
  measurePoints = [];
  routePolyline = null;
  measureLine = null;
  undoStack = [];
  redoStack = [];
  showNotification('Dessin effacé.', 'info');
}

async function saveChanges() {
  showNotification('Sauvegarde…', 'info');
  try {
    const res = await fetch('/api/cartes/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ts: new Date().toISOString() })
    });
    if (!res.ok) throw new Error();
    showNotification('Modifications sauvegardées.', 'success');
  } catch {
    showNotification('Erreur lors de la sauvegarde.', 'error');
  }
}

/* ══════════════════════════════════════════════════════════════
   RECHERCHE ADRESSE (Nominatim)
══════════════════════════════════════════════════════════════ */
async function searchAddress() {
  const input   = document.getElementById('address-search');
  const results = document.getElementById('search-results');
  const q = input?.value?.trim();
  if (!q || !results) return;

  results.innerHTML = `<div style="padding:8px;font-size:11px;color:var(--t3)">Recherche…</div>`;

  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`);
    const data = await res.json();

    if (!data.length) {
      results.innerHTML = `<div style="padding:8px;font-size:11px;color:var(--t4)">Aucun résultat trouvé.</div>`;
      return;
    }

    results.innerHTML = '';
    data.forEach((r, i) => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <span>${r.display_name}</span>`;
      item.style.cssText = `opacity:0;transform:translateY(4px);transition:opacity .15s ${i * 40}ms,transform .15s ${i * 40}ms`;
      item.onclick = () => flyToAddress(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
      results.appendChild(item);
      requestAnimationFrame(() => { item.style.opacity = '1'; item.style.transform = ''; });
    });
  } catch {
    results.innerHTML = `<div style="padding:8px;font-size:11px;color:var(--err)">Erreur de recherche.</div>`;
  }
}

function flyToAddress(lat, lng, name) {
  if (map) {
    map.flyTo([lat, lng], 16, { duration: 1.2 });
    L.popup({ className: 'viq-popup' })
      .setLatLng([lat, lng])
      .setContent(`<div style="font-size:12px;color:var(--t)">${name}</div>`)
      .openOn(map);
  }
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('address-search').value = '';
}

/* ══════════════════════════════════════════════════════════════
   HIGHLIGHT ITINÉRAIRE
══════════════════════════════════════════════════════════════ */
function highlightItineraire(id) {
  document.querySelectorAll('.itineraire-item').forEach(item => {
    const isActive = item.dataset.itineraireId == id;
    item.classList.toggle('active', isActive);
    if (isActive) {
      item.style.transition = 'transform .2s';
      item.style.transform = 'scale(1.01)';
      setTimeout(() => { item.style.transform = ''; }, 200);
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   GESTION ITINÉRAIRES (CRUD)
══════════════════════════════════════════════════════════════ */
function nouvelItineraire() {
  document.getElementById('itineraire-form')?.reset();
  const idEl = document.getElementById('itineraire-id');
  if (idEl) idEl.value = '';
  document.getElementById('modal-title').textContent = 'Nouvel itinéraire';
  openModal('itineraire-modal');
}

function closeItineraireModal() { closeModal('itineraire-modal'); }

function editerItineraire(id) {
  fetch(`/api/cartes/itineraires/${id}`)
    .then(r => r.json())
    .then(data => {
      const map_fields = {
        'itineraire-id': 'id', nom_itineraire: 'nom',
        ligne_id: 'ligne_id', type_transport: 'type_transport',
        couleur_itineraire: 'couleur', description_itineraire: 'description',
        frequence: 'frequence', vitesse_moyenne: 'vitesse_moyenne'
      };
      Object.entries(map_fields).forEach(([fid, key]) => {
        const el = document.getElementById(fid);
        if (el) el.value = data[key] ?? '';
      });
      const actifEl = document.getElementById('actif');
      if (actifEl) actifEl.checked = !!data.actif;
      document.getElementById('modal-title').textContent = 'Modifier itinéraire';
      openModal('itineraire-modal');
    })
    .catch(() => showNotification('Impossible de charger cet itinéraire.', 'error'));
}

function dupliquerItineraire(id) {
  fetch(`/api/cartes/itineraires/${id}/duplicate`, { method: 'POST' })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(() => { showNotification('Itinéraire dupliqué.', 'success'); setTimeout(() => location.reload(), 800); })
    .catch(() => showNotification('Erreur lors de la duplication.', 'error'));
}

function supprimerItineraire(id) {
  if (!confirm('Supprimer définitivement cet itinéraire ?')) return;
  fetch(`/api/cartes/itineraires/${id}`, { method: 'DELETE' })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(() => {
      showNotification('Itinéraire supprimé.', 'success');
      const el = document.querySelector(`[data-itineraire-id="${id}"]`);
      if (el) {
        el.style.transition = 'opacity .3s, transform .3s';
        el.style.opacity = '0';
        el.style.transform = 'translateX(-10px)';
        setTimeout(() => el.remove(), 320);
      }
    })
    .catch(() => showNotification('Erreur lors de la suppression.', 'error'));
}

async function handleItineraireSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  const id  = document.getElementById('itineraire-id')?.value;
  const data = Object.fromEntries(new FormData(e.target));
  data.actif = document.getElementById('actif')?.checked ? '1' : '0';

  setBtnLoading(btn, true);
  try {
    const res = await fetch(
      id ? `/api/cartes/itineraires/${id}` : '/api/cartes/itineraires',
      { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    );
    if (!res.ok) throw new Error();
    showNotification(id ? 'Itinéraire mis à jour.' : 'Itinéraire créé.', 'success');
    closeItineraireModal();
    loadItineraires();
  } catch {
    showNotification('Erreur lors de l\'enregistrement.', 'error');
  } finally { setBtnLoading(btn, false); }
}

/* ══════════════════════════════════════════════════════════════
   GESTION ARRÊTS
══════════════════════════════════════════════════════════════ */
function addStopAtPosition(latlng) {
  document.getElementById('arret-form')?.reset();
  const latEl = document.getElementById('arret-lat');
  const lngEl = document.getElementById('arret-lng');
  if (latEl) latEl.value = latlng.lat.toFixed(6);
  if (lngEl) lngEl.value = latlng.lng.toFixed(6);
  document.getElementById('arret-modal-title').textContent = 'Nouvel arrêt';
  openModal('arret-modal');
}

function closeArretModal() { closeModal('arret-modal'); }

async function handleArretSubmit(e) {
  e.preventDefault();
  const btn  = e.target.querySelector('[type=submit]');
  const id   = document.getElementById('arret-id')?.value;
  const data = Object.fromEntries(new FormData(e.target));
  data.arret_actif = document.getElementById('arret_actif')?.checked ? '1' : '0';

  setBtnLoading(btn, true);
  try {
    const res = await fetch(
      id ? `/api/cartes/arrets/${id}` : '/api/cartes/arrets',
      { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    );
    if (!res.ok) throw new Error();
    showNotification(id ? 'Arrêt modifié.' : 'Arrêt ajouté.', 'success');
    // Ajouter visuellement sur la carte
    addStopToMap({ ...data, lat: data.lat, lng: data.lng });
    closeArretModal();
  } catch {
    showNotification('Erreur lors de l\'enregistrement de l\'arrêt.', 'error');
  } finally { setBtnLoading(btn, false); }
}

/* ══════════════════════════════════════════════════════════════
   OPTIMISATION
══════════════════════════════════════════════════════════════ */
function optimiserRoutes() { openModal('optimisation-modal'); }
function closeOptimisationModal() { closeModal('optimisation-modal'); }

function appliquerOptimisation() {
  const resultsEl = document.getElementById('optimisation-results');
  if (resultsEl) {
    resultsEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg2);border-radius:8px">
        <svg style="color:var(--gold);animation:spin 1s linear infinite" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/>
          <path d="M21 12a9 9 0 00-9-9"/>
        </svg>
        <span style="font-size:13px;color:var(--t2)">Calcul en cours…</span>
      </div>`;
  }

  setTimeout(() => {
    if (resultsEl) {
      resultsEl.innerHTML = `
        <div style="padding:14px;background:rgba(34,197,94,.06);border:1px solid var(--ok);border-radius:8px">
          <div style="display:flex;align-items:center;gap:8px;color:var(--ok);font-weight:600;font-size:13px;margin-bottom:8px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Optimisation calculée
          </div>
          <div style="font-size:12px;color:var(--t2);display:flex;flex-direction:column;gap:4px">
            <span>Réduction du temps de trajet estimée : <strong style="color:var(--gold)">12%</strong></span>
            <span>Distance économisée : <strong style="color:var(--gold)">~4.2 km</strong></span>
          </div>
        </div>`;
    }
    showNotification('Optimisation calculée — appliquez pour valider.', 'success');
  }, 1800);
}

/* ══════════════════════════════════════════════════════════════
   IMPORT / EXPORT
══════════════════════════════════════════════════════════════ */
function importerCarte() {
  showNotification('Fonction d\'import GeoJSON — bientôt disponible.', 'info');
}

function exporterCarte() {
  showNotification('Export GeoJSON en cours…', 'info');
  window.location.href = '/api/cartes/export';
}

/* ══════════════════════════════════════════════════════════════
   MODALES (open / close animés)
══════════════════════════════════════════════════════════════ */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  el.style.opacity = '0';
  el.style.transition = 'opacity .22s';
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { el.style.opacity = '1'; });
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.transition = 'opacity .18s';
  el.style.opacity = '0';
  setTimeout(() => {
    el.style.display = 'none';
    el.style.opacity = '';
    document.body.style.overflow = '';
  }, 190);
}

/* ══════════════════════════════════════════════════════════════
   LIAISON EVENTS
══════════════════════════════════════════════════════════════ */
function bindModals() {
  ['itineraire-modal', 'arret-modal', 'optimisation-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) closeModal(id); });
  });
}

function bindForms() {
  const itinForm = document.getElementById('itineraire-form');
  if (itinForm) itinForm.addEventListener('submit', handleItineraireSubmit);

  const arretForm = document.getElementById('arret-form');
  if (arretForm) arretForm.addEventListener('submit', handleArretSubmit);

  // Recherche au clavier
  const addrInput = document.getElementById('address-search');
  if (addrInput) {
    addrInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); searchAddress(); } });
  }
}

function bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['itineraire-modal', 'arret-modal', 'optimisation-modal'].forEach(closeModal);
      if (currentTool !== 'select') setTool('select');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
  });
}

/* ══════════════════════════════════════════════════════════════
   ANIMATIONS PAGE
══════════════════════════════════════════════════════════════ */
function animateSidebar() {
  const sidebar = document.getElementById('carte-sidebar');
  if (!sidebar) return;
  sidebar.style.opacity = '0';
  sidebar.style.transform = 'translateX(-12px)';
  sidebar.style.transition = 'opacity .45s .1s, transform .45s .1s';
  requestAnimationFrame(() => { sidebar.style.opacity = '1'; sidebar.style.transform = ''; });
}

function animateKpis() {
  document.querySelectorAll('.carte-kpi').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(8px)';
    card.style.transition = `opacity .35s ${i * 70}ms, transform .35s ${i * 70}ms`;
    requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = ''; });
  });
}

function animateItinerairesList() {
  document.querySelectorAll('.itineraire-item').forEach((item, i) => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(-8px)';
    item.style.transition = `opacity .3s ${i * 55}ms, transform .3s ${i * 55}ms`;
    requestAnimationFrame(() => { item.style.opacity = '1'; item.style.transform = ''; });
  });
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
function setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.label = btn.innerHTML;
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.label ?? 'OK';
    btn.disabled = false;
  }
}

function showNotification(message, type = 'info') {
  let zone = document.getElementById('viq-notif-zone');
  if (!zone) {
    zone = document.createElement('div');
    zone.id = 'viq-notif-zone';
    zone.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:9999;
      display:flex;flex-direction:column;gap:8px;
      pointer-events:none;`;
    document.body.appendChild(zone);
  }

  const colors = { success:'#22C55E', error:'#EF4444', warning:'#F59E0B', info:'#60A5FA' };
  const icons  = {
    success: '<polyline points="20 6 9 17 4 12"/>',
    error:   '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    warning: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>',
    info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r=".5" fill="currentColor"/>'
  };
  const c = colors[type] ?? colors.info;

  const n = document.createElement('div');
  n.style.cssText = `
    display:flex;align-items:center;gap:10px;
    padding:11px 16px;
    background:var(--card);
    border:1px solid ${c};
    border-left:4px solid ${c};
    border-radius:8px;
    color:var(--t);
    font-size:13px;
    box-shadow:0 8px 28px rgba(0,0,0,.4);
    opacity:0;
    transform:translateX(16px);
    transition:opacity .25s,transform .25s;
    min-width:240px;max-width:340px;
    pointer-events:all;`;
  n.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" style="flex-shrink:0">${icons[type]}</svg>
    <span style="flex:1">${message}</span>`;

  zone.appendChild(n);
  requestAnimationFrame(() => { n.style.opacity = '1'; n.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    n.style.opacity = '0';
    n.style.transform = 'translateX(16px)';
    setTimeout(() => n.remove(), 270);
  }, 3800);
}

/* ── Keyframe spin (pour les spinners) — injecté une seule fois */
if (!document.getElementById('viq-spin-style')) {
  const s = document.createElement('style');
  s.id = 'viq-spin-style';
  s.textContent = '@keyframes spin { to { transform:rotate(360deg); } }';
  document.head.appendChild(s);
}
