/**
 * avis.js — Module admin avis : modération, filtres, charts, animations
 * VoyageIQ Pro
 */
'use strict';

/* ─────────────────────────────────────────────────────────
   Animations utilitaires
───────────────────────────────────────────────────────── */
function animateIn(el, cls = 'anim-fade-in') {
  el.classList.remove(cls);
  void el.offsetWidth; // reflow
  el.classList.add(cls);
}

function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  const from  = parseInt(el.textContent.replace(/\D/g, '')) || 0;
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (target - from) * ease).toLocaleString('fr-FR');
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function pulseElement(el) {
  el.style.transform = 'scale(1.06)';
  el.style.transition = 'transform .15s ease';
  setTimeout(() => { el.style.transform = ''; }, 200);
}

function ripple(e) {
  const btn = e.currentTarget;
  const circle = document.createElement('span');
  const rect   = btn.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height);
  circle.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px;position:absolute;border-radius:50%;background:rgba(255,255,255,.25);transform:scale(0);animation:rippleAnim .5s linear;pointer-events:none;`;
  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

/* ─────────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module avis chargé.');

  // Compteurs animés
  document.querySelectorAll('.kpi-value[data-count]').forEach(el => {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateCounter(el, parseInt(el.dataset.count));
        io.disconnect();
      }
    });
    io.observe(el);
  });

  // Filtres
  const searchInput  = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const ratingFilter = document.getElementById('rating-filter');
  const catFilter    = document.getElementById('category-filter');

  if (searchInput)  searchInput.addEventListener('input',  debounce(filterAvis, 250));
  if (statusFilter) statusFilter.addEventListener('change', filterAvis);
  if (ratingFilter) ratingFilter.addEventListener('change', filterAvis);
  if (catFilter)    catFilter.addEventListener('change', filterAvis);

  // Backdrop modales
  ['avis-modal','reponse-modal','rejet-modal','regles-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) closeModal(id); });
  });

  // Ripple sur boutons primaires
  document.querySelectorAll('.btn-primary, .btn-success, .btn-danger').forEach(btn => {
    btn.addEventListener('click', ripple);
  });

  // Apparition progressive des cards
  animateCards();

  // Charts
  if (typeof Chart !== 'undefined') {
    initCharts();
  }

  // Fermeture ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['avis-modal','reponse-modal','rejet-modal','regles-modal']
        .forEach(id => closeModal(id));
    }
  });
});

/* ─────────────────────────────────────────────────────────
   Animation d'apparition des cards
───────────────────────────────────────────────────────── */
function animateCards() {
  const cards = document.querySelectorAll('.avis-card');
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `opacity .35s ease ${i * 60}ms, transform .35s ease ${i * 60}ms`;
    requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
  });
}

/* ─────────────────────────────────────────────────────────
   Charts
───────────────────────────────────────────────────────── */
function initCharts() {
  const gold  = '#C9A84C';
  const gold2 = 'rgba(201,168,76,.15)';
  const ok    = 'rgba(34,197,94,.7)';
  const warn  = 'rgba(245,158,11,.7)';
  const err   = 'rgba(239,68,68,.7)';

  const ratingCtx = document.getElementById('ratingChart');
  if (ratingCtx) {
    new Chart(ratingCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['5 ★', '4 ★', '3 ★', '2 ★', '1 ★'],
        datasets: [{
          data: [42, 28, 15, 10, 5],
          backgroundColor: ['#22C55E','#86EFAC','#FCD34D','#F97316','#EF4444'],
          borderWidth: 0, hoverOffset: 8
        }]
      },
      options: {
        cutout: '72%',
        plugins: {
          legend: { position: 'right', labels: { color: '#A0A0A0', font: { size: 11 } } }
        },
        animation: { animateRotate: true, duration: 900, easing: 'easeOutQuart' }
      }
    });
  }

  const categoryCtx = document.getElementById('categoryChart');
  if (categoryCtx) {
    new Chart(categoryCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Ponctualité', 'Confort', 'Propreté', 'Chauffeur', 'Prix'],
        datasets: [{
          label: 'Note moyenne',
          data: [4.1, 3.8, 4.3, 4.5, 3.6],
          backgroundColor: gold2,
          borderColor: gold,
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: { min: 0, max: 5, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#666' } },
          y: { grid: { display: false }, ticks: { color: '#A0A0A0', font: { size: 11 } } }
        },
        plugins: { legend: { display: false } },
        animation: { duration: 900, easing: 'easeOutQuart' }
      }
    });
  }
}

/* ─────────────────────────────────────────────────────────
   Actions boutons page
───────────────────────────────────────────────────────── */
function nouveauAvis() {
  showNotification('Redirection vers le formulaire d\'avis…', 'info');
  // window.location.href = '/admin/avis/nouveau';
}

function exporterAvis() {
  const params = new URLSearchParams({
    status:   document.getElementById('status-filter')?.value   ?? '',
    rating:   document.getElementById('rating-filter')?.value   ?? '',
    category: document.getElementById('category-filter')?.value ?? ''
  });
  showNotification('Export en cours…', 'info');
  window.location.href = `/admin/api/avis/export?${params}`;
}

function reglesModeration() {
  openModal('regles-modal');
}

function closeReglesModal() { closeModal('regles-modal'); }

function modifierRegles() {
  showNotification('Règles de modération mises à jour.', 'success');
  closeReglesModal();
}

/* ─────────────────────────────────────────────────────────
   Voir avis
───────────────────────────────────────────────────────── */
function voirAvis(avisId) {
  fetch(`/admin/api/avis/${avisId}`)
    .then(r => r.json())
    .then(data => {
      document.getElementById('modal-title').textContent = `Avis de ${data.auteur ?? 'Inconnu'}`;
      const container = document.getElementById('avis-details');
      container.innerHTML = createAvisDetailsHTML(data);
      animateIn(container);
      openModal('avis-modal');
    })
    .catch(() => showNotification('Impossible de charger cet avis.', 'error'));
}

function createAvisDetailsHTML(avis) {
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<i class="fas fa-star${i < (avis.note ?? 0) ? ' filled' : ''}"></i>`
  ).join('');

  return `
    <div class="avis-header-detail">
      <div class="author-avatar-large" style="background:var(--gold-bg);display:flex;align-items:center;justify-content:center;color:var(--gold);font-weight:700;font-size:18px;">
        ${(avis.auteur ?? 'A').charAt(0).toUpperCase()}
      </div>
      <div class="author-info">
        <div class="author-name">${avis.auteur ?? 'Anonyme'}</div>
        <div class="author-details"><i class="fas fa-calendar-alt"></i> ${avis.date ?? ''}</div>
        <div class="author-details"><i class="fas fa-route"></i> ${avis.ligne ?? 'N/A'}</div>
      </div>
    </div>
    <div class="avis-rating-detail">
      <div class="rating-stars">${stars}</div>
      <span class="rating-value">${avis.note ?? '—'}/5</span>
    </div>
    <div class="avis-content-detail">${avis.commentaire ?? ''}</div>
    <div class="details-actions" style="margin-top:16px;">
      <button class="btn btn-success" onclick="approuverAvis(${avis.id})"><i class="fas fa-check"></i> Approuver</button>
      <button class="btn btn-danger" onclick="rejeterAvis(${avis.id})"><i class="fas fa-times"></i> Rejeter</button>
      <button class="btn btn-primary" onclick="repondreAvis(${avis.id})"><i class="fas fa-reply"></i> Répondre</button>
      <button class="btn btn-warning" onclick="signalerAvis(${avis.id})"><i class="fas fa-flag"></i> Signaler</button>
      <button class="btn" onclick="closeAvisModal()">Fermer</button>
    </div>`;
}

function closeAvisModal() { closeModal('avis-modal'); }

/* ─────────────────────────────────────────────────────────
   Approuver / Rejeter
───────────────────────────────────────────────────────── */
function approuverAvis(avisId) {
  const row = document.querySelector(`[data-avis-id="${avisId}"]`) ??
              document.querySelector(`.avis-card:has([onclick*="${avisId}"])`);

  fetch(`/admin/api/avis/${avisId}/approuver`, { method: 'POST' })
    .then(r => {
      if (!r.ok) throw new Error();
      showNotification('Avis approuvé.', 'success');
      if (row) {
        row.style.transition = 'opacity .4s, transform .4s';
        row.classList.remove('pending', 'rejected');
        row.classList.add('approved');
        pulseElement(row);
      }
      closeAvisModal();
    })
    .catch(() => showNotification('Erreur lors de l\'approbation.', 'error'));
}

function rejeterAvis(avisId) {
  document.getElementById('rejet-avis-id').value = avisId;
  openModal('rejet-modal');
}

function closeRejetModal() { closeModal('rejet-modal'); }

/* ─────────────────────────────────────────────────────────
   Signaler / Supprimer
───────────────────────────────────────────────────────── */
function signalerAvis(avisId) {
  fetch(`/admin/api/avis/${avisId}/signaler`, { method: 'POST' })
    .then(r => {
      if (!r.ok) throw new Error();
      showNotification('Avis signalé pour révision.', 'warning');
    })
    .catch(() => showNotification('Erreur.', 'error'));
}

function supprimerAvis(avisId) {
  if (!confirm('Supprimer définitivement cet avis ?')) return;
  fetch(`/admin/api/avis/${avisId}`, { method: 'DELETE' })
    .then(r => {
      if (!r.ok) throw new Error();
      showNotification('Avis supprimé.', 'success');
      const card = document.querySelector(`[data-avis-id="${avisId}"]`);
      if (card) {
        card.style.transition = 'opacity .4s, transform .4s, max-height .4s';
        card.style.opacity    = '0';
        card.style.transform  = 'translateX(-20px)';
        card.style.maxHeight  = card.offsetHeight + 'px';
        setTimeout(() => {
          card.style.maxHeight = '0';
          card.style.margin    = '0';
          card.style.padding   = '0';
          setTimeout(() => card.remove(), 350);
        }, 300);
      }
    })
    .catch(() => showNotification('Erreur lors de la suppression.', 'error'));
}

/* ─────────────────────────────────────────────────────────
   Répondre
───────────────────────────────────────────────────────── */
function repondreAvis(avisId) {
  document.getElementById('reponse-avis-id').value = avisId;
  document.getElementById('reponse-contenu').value = '';
  openModal('reponse-modal');
}

function closeReponseModal() { closeModal('reponse-modal'); }

/* ─────────────────────────────────────────────────────────
   Filtres
───────────────────────────────────────────────────────── */
function filterAvis() {
  const q      = document.getElementById('search-input')?.value.toLowerCase() ?? '';
  const status = document.getElementById('status-filter')?.value ?? '';
  const rating = document.getElementById('rating-filter')?.value ?? '';
  const cat    = document.getElementById('category-filter')?.value ?? '';

  let visible = 0;
  document.querySelectorAll('.avis-card, #avis-table tbody tr').forEach(el => {
    const text  = el.textContent.toLowerCase();
    const rStat = el.dataset.statut ?? el.dataset.status ?? '';
    const rRate = el.dataset.note   ?? el.dataset.rating ?? '';
    const rCat  = el.dataset.categorie ?? el.dataset.category ?? '';

    const show = text.includes(q)
      && (!status || rStat === status)
      && (!rating || rRate === rating)
      && (!cat    || rCat  === cat);

    el.style.transition = 'opacity .2s';
    el.style.opacity    = show ? '1' : '0.15';
    el.style.display    = show ? '' : 'none';
    if (show) visible++;
  });

  // Feedback compteur
  const counter = document.getElementById('avis-count');
  if (counter) counter.textContent = visible;
}

/* ─────────────────────────────────────────────────────────
   Helpers modal
───────────────────────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display  = 'flex';
  el.style.opacity  = '0';
  el.style.transition = 'opacity .25s ease';
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  const inner = el.querySelector('.modal-content, .modal__inner, .modal-box');
  if (inner) {
    inner.style.transform  = 'translateY(-16px) scale(.97)';
    inner.style.transition = 'transform .25s ease';
    requestAnimationFrame(() => { inner.style.transform = 'translateY(0) scale(1)'; });
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => { el.style.display = 'none'; el.style.opacity = ''; }, 220);
}

/* ─────────────────────────────────────────────────────────
   Notification toast
───────────────────────────────────────────────────────── */
function showNotification(message, type = 'info') {
  let zone = document.getElementById('notif-zone');
  if (!zone) {
    zone = document.createElement('div');
    zone.id = 'notif-zone';
    zone.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(zone);
  }
  const n = document.createElement('div');
  const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
  const colors = { success: '#22C55E', error: '#EF4444', warning: '#F59E0B', info: '#60A5FA' };
  n.style.cssText = `display:flex;align-items:center;gap:10px;padding:12px 18px;background:var(--card);border:1px solid ${colors[type] ?? colors.info};border-left:4px solid ${colors[type] ?? colors.info};border-radius:8px;color:var(--t);font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.35);opacity:0;transform:translateX(20px);transition:opacity .3s ease,transform .3s ease;min-width:260px;`;
  n.innerHTML = `<i class="fas fa-${icons[type] ?? 'info-circle'}" style="color:${colors[type]};"></i><span>${message}</span>`;
  zone.appendChild(n);
  requestAnimationFrame(() => { n.style.opacity = '1'; n.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    n.style.opacity   = '0';
    n.style.transform = 'translateX(20px)';
    setTimeout(() => n.remove(), 320);
  }, 3600);
}

/* ─────────────────────────────────────────────────────────
   Debounce
───────────────────────────────────────────────────────── */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
