/**
 * VoyageIQ Pro — main.js
 * Comportements partagés sur toutes les pages admin :
 *   sidebar mobile, dropdown profil, flash auto-dismiss,
 *   modales, confirm delete, table search + sort
 *
 * CORRECTION : les classes CSS dans base_admin.html utilisent
 * `.sidebar.open` et `.sidebar-overlay.visible` (sans préfixe BEM).
 * Ce fichier est aligné sur ces classes.
 */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Sidebar mobile ─────────────────────────────────────── */
  const sidebar     = document.getElementById('sidebar');
  const burgerBtn   = document.getElementById('burgerBtn');
  const closeBtn    = document.getElementById('sidebarClose');   // bouton ✕ dans la sidebar
  const overlay     = document.getElementById('sidebarOverlay');

  const openSidebar = () => {
    sidebar?.classList.add('open');                // ✅ correspond au CSS `.sidebar.open`
    overlay?.classList.add('visible');             // ✅ correspond au CSS `.sidebar-overlay.visible`
    burgerBtn?.classList.add('active');
    burgerBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeSidebar = () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('visible');
    burgerBtn?.classList.remove('active');
    burgerBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  burgerBtn?.addEventListener('click', () => {
    sidebar?.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  closeBtn?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);

  /* Fermer avec Escape */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  /* Fermer la sidebar si on revient en mode desktop */
  window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => {
    if (e.matches) { closeSidebar(); document.body.style.overflow = ''; }
  });

  /* ── Dropdown profil ─────────────────────────────────────── */
  const profileMenu     = document.getElementById('profileMenu');
  const profileDropdown = document.getElementById('profileDropdown');

  profileMenu?.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;            // ne pas bloquer les liens du dropdown
    e.stopPropagation();
    const isOpen = profileMenu.classList.toggle('open');
    profileMenu.setAttribute('aria-expanded', isOpen);
    profileDropdown?.classList.toggle('topbar__profile-dropdown--open', isOpen);
  });

  profileMenu?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      profileMenu.click();
    }
  });

  document.addEventListener('click', (e) => {
    if (profileMenu && !profileMenu.contains(e.target)) {
      profileMenu.classList.remove('open');
      profileMenu.setAttribute('aria-expanded', 'false');
      profileDropdown?.classList.remove('topbar__profile-dropdown--open');
    }
  });

  /* ── Auto-dismiss flash messages ─────────────────────────── */
  document.querySelectorAll('.flash').forEach(el => {
    setTimeout(() => {
      el.style.transition = 'opacity .35s, transform .35s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
    }, 4000);
    setTimeout(() => el.remove(), 4380);
  });

  /* ── Confirm delete ──────────────────────────────────────── */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-confirm-delete]');
    if (!btn) return;
    const msg = btn.getAttribute('data-confirm-delete') || 'Confirmer la suppression ?';
    if (!confirm(msg)) e.preventDefault();
  });

  /* ── Modal helpers ───────────────────────────────────────── */
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.getAttribute('data-modal')));
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function (e) {
      if (e.target === this) closeModal(this.id);
    });
  });

  document.querySelectorAll('.modal__close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal')?.classList.remove('show');
      document.body.style.overflow = '';
    });
  });

  /* ── Table search ────────────────────────────────────────── */
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const q = this.value.toLowerCase().trim();
      document.querySelectorAll('.data-table tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  /* ── Table sort ──────────────────────────────────────────── */
  document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
    th.addEventListener('click', function () {
      const col   = +this.getAttribute('data-sort');
      const tbody = this.closest('table').querySelector('tbody');
      const rows  = Array.from(tbody.querySelectorAll('tr'));
      const dir   = this.getAttribute('data-dir') === 'asc' ? 'desc' : 'asc';

      document.querySelectorAll('.data-table th[data-sort]').forEach(h => {
        h.removeAttribute('data-dir');
        h.classList.remove('sort-asc', 'sort-desc');
      });

      this.setAttribute('data-dir', dir);
      this.classList.add(`sort-${dir}`);

      rows.sort((a, b) => {
        const aVal = a.cells[col]?.textContent.trim() || '';
        const bVal = b.cells[col]?.textContent.trim() || '';
        return dir === 'asc'
          ? aVal.localeCompare(bVal, 'fr', { numeric: true })
          : bVal.localeCompare(aVal, 'fr', { numeric: true });
      });

      rows.forEach(r => tbody.appendChild(r));
    });
  });

});

/* ── Global modal helpers (accessibles depuis les templates) */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('show'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const m = id ? document.getElementById(id) : document.querySelector('.modal.show');
  if (m) { m.classList.remove('show'); document.body.style.overflow = ''; }
}
