/**
 * VoyageIQ Pro — main.js
 * Comportements globaux : navbar mobile, flash auto-close
 */
(function () {
  'use strict';

  /* ── Navbar mobile ── */
  const toggler = document.getElementById('navToggler');
  const menu    = document.getElementById('navMenu');
  const overlay = document.getElementById('navOverlay');

  function openMenu() {
    menu.classList.add('open');
    overlay.classList.add('show');
    toggler.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    menu.classList.remove('open');
    overlay.classList.remove('show');
    toggler.setAttribute('aria-expanded', 'false');
  }

  if (toggler) {
    toggler.addEventListener('click', () =>
      menu.classList.contains('open') ? closeMenu() : openMenu()
    );
  }
  if (overlay) overlay.addEventListener('click', closeMenu);

  /* ── Auto-close flash messages ── */
  document.querySelectorAll('.flash-zone .alert').forEach(a => {
    setTimeout(() => a.remove(), 5000);
  });

})();
