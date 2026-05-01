/**
 * admin.js — Module admin : gestion utilisateurs, stats, etc.
 */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module admin chargé.');

  // ── Gestion des modales ──────────────────────────────────
  const modals = document.querySelectorAll('.modal');
  const modalTriggers = document.querySelectorAll('[data-modal]');

  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      const modalId = this.getAttribute('data-modal');
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
      }
    });
  });

  // Fermer les modales
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal') || e.target.classList.contains('modal__close')) {
      const modal = e.target.closest('.modal');
      if (modal) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
      }
    }
  });

  // ── Confirmation de suppression ──────────────────────────
  const deleteButtons = document.querySelectorAll('[data-confirm-delete]');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      const message = this.getAttribute('data-confirm-delete') || 'Êtes-vous sûr de vouloir supprimer cet élément ?';
      if (!confirm(message)) {
        e.preventDefault();
      }
    });
  });

  // ── Recherche utilisateurs ──────────────────────────────
  const userSearch = document.getElementById('userSearch');
  if (userSearch) {
    userSearch.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      const rows = document.querySelectorAll('.admin-users__table tbody tr');

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }

  // ── Tri des tableaux ────────────────────────────────────
  const sortableHeaders = document.querySelectorAll('.admin-users__table th[data-sort]');
  sortableHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const column = this.getAttribute('data-sort');
      const table = this.closest('table');
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));

      // Toggle sort direction
      const currentDir = this.getAttribute('data-dir') || 'asc';
      const newDir = currentDir === 'asc' ? 'desc' : 'asc';
      this.setAttribute('data-dir', newDir);

      // Remove sort indicators
      sortableHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
      this.classList.add(`sort-${newDir}`);

      // Sort rows
      rows.sort((a, b) => {
        const aVal = a.querySelector(`[data-sort-${column}]`)?.textContent || '';
        const bVal = b.querySelector(`[data-sort-${column}]`)?.textContent || '';

        if (newDir === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });

      // Reorder DOM
      rows.forEach(row => tbody.appendChild(row));
    });
  });

  // ── Stats animation ─────────────────────────────────────
  const statNumbers = document.querySelectorAll('.admin-stat-content h3');
  statNumbers.forEach(stat => {
    const target = parseInt(stat.textContent.replace(/[^\d]/g, ''));
    if (target && target > 0) {
      animateNumber(stat, 0, target, 1000);
    }
  });

  function animateNumber(element, start, end, duration) {
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const current = Math.floor(start + (end - start) * progress);
      element.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // ── Export données ──────────────────────────────────────
  const exportButtons = document.querySelectorAll('[data-export]');
  exportButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const type = this.getAttribute('data-export');
      const table = document.querySelector('.admin-users__table');

      if (type === 'csv' && table) {
        exportToCSV(table);
      }
    });
  });

  function exportToCSV(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    const csv = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => `"${cell.textContent.trim()}"`).join(',');
    }).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utilisateurs.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
});
