/**
 * localisation.js — Carte de localisation des véhicules (Leaflet.js)
 * VoyageIQ-Pro · ESTLC 2025-2026
 *
 * Utilisé par : admin_localisation.html + chauffeur_localisation.html
 * Dépend de   : Leaflet.js (chargé via CDN dans le template)
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════
     CONFIG
  ══════════════════════════════════════════════════ */
  const CONFIG = {
    // Centre par défaut : Yaoundé, Cameroun
    center      : [3.8480, 11.5021],
    zoom        : 7,
    zoomVehicule: 14,
    tileUrl     : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttrib  : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    refreshMs   : 30000,   // Rafraîchir la position toutes les 30 secondes
  };

  /* Villes principales du réseau (Cameroun) */
  const VILLES = [
    { nom: 'Yaoundé',  lat: 3.8480,  lng: 11.5021 },
    { nom: 'Douala',   lat: 4.0511,  lng: 9.7679  },
    { nom: 'Bafoussam',lat: 5.4764,  lng: 10.4176 },
    { nom: 'Bamenda',  lat: 5.9597,  lng: 10.1459 },
    { nom: 'Garoua',   lat: 9.3010,  lng: 13.3970 },
    { nom: 'Maroua',   lat: 10.5913, lng: 14.3190 },
    { nom: 'Ngaoundéré',lat:7.3211, lng: 13.5830 },
    { nom: 'Bertoua',  lat: 4.5813,  lng: 13.6847 },
    { nom: 'Ebolowa',  lat: 2.9000,  lng: 11.1500 },
    { nom: 'Kribi',    lat: 2.9400,  lng: 9.9100  },
  ];

  /* ══════════════════════════════════════════════════
     ÉTAT
  ══════════════════════════════════════════════════ */
  let map           = null;
  let vehiculeMarkers = {};
  let userMarker    = null;
  let watchId       = null;
  let refreshTimer  = null;

  /* ══════════════════════════════════════════════════
     ICÔNES LEAFLET
  ══════════════════════════════════════════════════ */
  function makeIcon(color, label) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <text x="18" y="22" font-size="11" font-family="monospace" font-weight="bold"
            fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>
    </svg>`;
    return L.divIcon({
      html      : svg,
      className : '',
      iconSize  : [36, 48],
      iconAnchor: [18, 48],
      popupAnchor:[0, -44],
    });
  }

  const ICONS = {
    operationnel : makeIcon('#22C55E', 'BUS'),
    maintenance  : makeIcon('#F59E0B', 'MNT'),
    hors_service : makeIcon('#EF4444', 'HS'),
    user         : makeIcon('#C9A84C', 'MOI'),
    ville        : L.divIcon({
      html: `<div style="width:8px;height:8px;border-radius:50%;background:#4A90D9;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.5)"></div>`,
      className: '',
      iconSize : [8, 8],
      iconAnchor:[4, 4],
    }),
  };

  /* ══════════════════════════════════════════════════
     INITIALISATION CARTE
  ══════════════════════════════════════════════════ */
  function initMap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (typeof L === 'undefined') {
      container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--t3);flex-direction:column;gap:8px">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span style="font-size:13px">Leaflet.js non chargé</span>
        </div>`;
      return;
    }

    /* Créer la carte */
    map = L.map(containerId, {
      center   : CONFIG.center,
      zoom     : CONFIG.zoom,
      zoomControl: true,
    });

    /* Tuiles OpenStreetMap */
    L.tileLayer(CONFIG.tileUrl, {
      attribution: CONFIG.tileAttrib,
      maxZoom    : 19,
    }).addTo(map);

    /* Villes du réseau */
    VILLES.forEach(v => {
      L.marker([v.lat, v.lng], { icon: ICONS.ville })
        .addTo(map)
        .bindTooltip(v.nom, { permanent: false, direction: 'top', className: 'leaflet-tooltip-viq' });
    });

    /* Charger les véhicules si données disponibles */
    if (window.VEHICULES_DATA) {
      chargerVehicules(window.VEHICULES_DATA);
    }

    /* Si mode chauffeur : afficher position actuelle */
    if (window.MODE_CHAUFFEUR) {
      demarrerLocalisation();
    }

    console.log('[VoyageIQ] Carte initialisée');
    return map;
  }

  /* ══════════════════════════════════════════════════
     VÉHICULES — MARQUEURS
  ══════════════════════════════════════════════════ */
  function chargerVehicules(vehicules) {
    if (!map || !Array.isArray(vehicules)) return;

    /* Effacer les anciens marqueurs */
    Object.values(vehiculeMarkers).forEach(m => map.removeLayer(m));
    vehiculeMarkers = {};

    vehicules.forEach(v => {
      if (!v.lat || !v.lng) return;

      const icon   = ICONS[v.statut] || ICONS.operationnel;
      const marker = L.marker([v.lat, v.lng], { icon })
        .addTo(map)
        .bindPopup(buildPopupVehicule(v), { maxWidth: 260 });

      vehiculeMarkers[v.id] = marker;
    });
  }

  function buildPopupVehicule(v) {
    const statutLabel = { operationnel: 'En service', maintenance: 'Maintenance', hors_service: 'Hors service' };
    const statutColor = { operationnel: '#22C55E',    maintenance: '#F59E0B',     hors_service: '#EF4444' };
    const couleur = statutColor[v.statut] || '#C9A84C';

    return `
      <div style="font-family:var(--font-main,sans-serif);min-width:200px">
        <div style="font-family:monospace;font-size:14px;font-weight:700;color:#111;margin-bottom:6px">
          ${v.plaque || '—'}
        </div>
        <div style="font-size:12px;color:#555;margin-bottom:4px">${v.modele || ''}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${couleur};display:inline-block"></span>
          <span style="font-size:11px;color:${couleur};font-weight:600">${statutLabel[v.statut] || v.statut}</span>
        </div>
        ${v.ligne ? `<div style="font-size:11px;color:#888">Ligne : <strong>${v.ligne}</strong></div>` : ''}
        ${v.km_actuel != null ? `<div style="font-size:11px;color:#888;margin-top:2px">Km : ${Number(v.km_actuel).toLocaleString('fr-FR')}</div>` : ''}
        ${v.derniere_position ? `<div style="font-size:10px;color:#aaa;margin-top:4px">Dernière pos. : ${v.derniere_position}</div>` : ''}
      </div>`;
  }

  /* ══════════════════════════════════════════════════
     GÉOLOCALISATION CHAUFFEUR
  ══════════════════════════════════════════════════ */
  function demarrerLocalisation() {
    if (!navigator.geolocation) {
      afficherStatut('Géolocalisation non disponible sur cet appareil.', 'err');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => positionObtenue(pos),
      err => erreurGeo(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    /* Suivi continu */
    watchId = navigator.geolocation.watchPosition(
      pos => positionObtenue(pos),
      err => erreurGeo(err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  function arreterLocalisation() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  function positionObtenue(pos) {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;

    if (!map) return;

    /* Marqueur utilisateur */
    if (userMarker) {
      userMarker.setLatLng([lat, lng]);
    } else {
      userMarker = L.marker([lat, lng], { icon: ICONS.user })
        .addTo(map)
        .bindPopup(`<div style="font-size:12px;font-weight:600">Ma position<br><span style="font-family:monospace;color:#888">${lat.toFixed(5)}, ${lng.toFixed(5)}</span><br><span style="font-size:10px;color:#aaa">Précision : ±${Math.round(accuracy)}m</span></div>`);
      map.setView([lat, lng], CONFIG.zoomVehicule);
    }

    /* Mettre à jour l'affichage */
    majAffichagePosition(lat, lng, accuracy);

    /* Envoyer au serveur (si endpoint disponible) */
    if (window.POSITION_ENDPOINT) {
      envoyerPosition(lat, lng);
    }
  }

  function majAffichagePosition(lat, lng, accuracy) {
    const el = document.getElementById('positionInfo');
    if (el) {
      el.innerHTML = `
        <div style="font-family:monospace;font-size:12px;color:var(--t2)">
          <span style="color:var(--ok)">●</span>
          ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E
          <span style="color:var(--t3);margin-left:8px">±${Math.round(accuracy)}m</span>
        </div>`;
    }
    const ts = document.getElementById('positionTimestamp');
    if (ts) ts.textContent = new Date().toLocaleTimeString('fr-FR');
  }

  function erreurGeo(err) {
    const msgs = {
      1: 'Permission de géolocalisation refusée.',
      2: 'Position indisponible (signal GPS faible).',
      3: 'Délai de géolocalisation dépassé.',
    };
    afficherStatut(msgs[err.code] || 'Erreur de géolocalisation.', 'warn');
  }

  function envoyerPosition(lat, lng) {
    fetch(window.POSITION_ENDPOINT, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ lat, lng, ts: Date.now() }),
    }).catch(() => {/* Silencieux — perte réseau acceptable */});
  }

  /* ══════════════════════════════════════════════════
     UTILITAIRES
  ══════════════════════════════════════════════════ */
  function afficherStatut(msg, type) {
    const el = document.getElementById('carteStatut');
    if (!el) return;
    const colors = { ok: 'var(--ok)', warn: 'var(--warn)', err: 'var(--err)', info: 'var(--info)' };
    el.innerHTML = `<span style="color:${colors[type] || colors.info};font-size:12px">${msg}</span>`;
  }

  function centrerSurVehicule(id) {
    const marker = vehiculeMarkers[id];
    if (marker && map) {
      map.setView(marker.getLatLng(), CONFIG.zoomVehicule);
      marker.openPopup();
    }
  }

  function centrerSurVille(nom) {
    const v = VILLES.find(x => x.nom.toLowerCase() === nom.toLowerCase());
    if (v && map) map.setView([v.lat, v.lng], 11);
  }

  /* Redimensionner la carte quand le conteneur change de taille */
  function invalidateMapSize() {
    if (map) setTimeout(() => map.invalidateSize(), 100);
  }

  /* ══════════════════════════════════════════════════
     BOUTONS CARTE (si présents dans le DOM)
  ══════════════════════════════════════════════════ */
  function bindControls() {
    /* Bouton centrer sur ma position */
    document.getElementById('btnMaPosition')?.addEventListener('click', () => {
      if (userMarker && map) {
        map.setView(userMarker.getLatLng(), CONFIG.zoomVehicule);
      } else {
        demarrerLocalisation();
      }
    });

    /* Bouton centrer sur le réseau entier */
    document.getElementById('btnVueGlobale')?.addEventListener('click', () => {
      if (map) map.setView(CONFIG.center, CONFIG.zoom);
    });

    /* Sélecteur de ville */
    document.getElementById('selectVille')?.addEventListener('change', e => {
      if (e.target.value) centrerSurVille(e.target.value);
    });

    /* Clic sur un item de liste véhicule */
    document.querySelectorAll('[data-vehicule-id]').forEach(el => {
      el.addEventListener('click', () => centrerSurVehicule(el.dataset.vehiculeId));
    });
  }

  /* ══════════════════════════════════════════════════
     POINT D'ENTRÉE
  ══════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    /* Chercher le conteneur carte */
    const containerId = window.CARTE_CONTAINER_ID || 'carteVehicules';
    initMap(containerId);
    bindControls();

    /* Exposer les fonctions utiles globalement */
    window.VIQCarte = {
      centrerSurVehicule,
      centrerSurVille,
      chargerVehicules,
      demarrerLocalisation,
      arreterLocalisation,
      invalidateMapSize,
    };
  });

})();
