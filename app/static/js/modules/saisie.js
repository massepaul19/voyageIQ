/**
 * saisie.js — Module saisie : validation, calculs automatiques, etc.
 */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module saisie chargé.');

  // ── Calculs automatiques ────────────────────────────────
  const form = document.getElementById('saisieForm');
  if (form) {
    setupAutoCalculations(form);
  }

  function setupAutoCalculations(form) {
    // Recettes totales
    const recetteInputs = ['rec_guichet', 'rec_reservation', 'rec_digital'];
    recetteInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', calculateTotalRecettes);
      }
    });

    // Dépenses totales
    const depInputs = ['dep_carburant', 'dep_autres'];
    depInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', calculateTotalDepenses);
      }
    });

    // Marge automatique
    const allInputs = [...recetteInputs, ...depInputs];
    allInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', calculateMarge);
      }
    });
  }

  function calculateTotalRecettes() {
    const guichet = parseFloat(document.getElementById('rec_guichet')?.value || 0);
    const reservation = parseFloat(document.getElementById('rec_reservation')?.value || 0);
    const digital = parseFloat(document.getElementById('rec_digital')?.value || 0);
    const total = guichet + reservation + digital;

    const totalField = document.getElementById('recettes_total');
    if (totalField) {
      totalField.value = total.toFixed(2);
    }

    calculateMarge();
  }

  function calculateTotalDepenses() {
    const carburant = parseFloat(document.getElementById('dep_carburant')?.value || 0);
    const autres = parseFloat(document.getElementById('dep_autres')?.value || 0);
    const total = carburant + autres;

    const totalField = document.getElementById('depenses_total');
    if (totalField) {
      totalField.value = total.toFixed(2);
    }

    calculateMarge();
  }

  function calculateMarge() {
    const recettes = parseFloat(document.getElementById('recettes_total')?.value || 0);
    const depenses = parseFloat(document.getElementById('depenses_total')?.value || 0);
    const marge = recettes - depenses;

    const margeField = document.getElementById('marge');
    if (margeField) {
      margeField.value = marge.toFixed(2);
    }

    // Update visual indicator
    const margeIndicator = document.getElementById('marge_indicator');
    if (margeIndicator) {
      margeIndicator.className = 'marge-indicator';
      if (marge > 0) {
        margeIndicator.classList.add('positive');
        margeIndicator.textContent = `+${marge.toFixed(2)} FCFA`;
      } else if (marge < 0) {
        margeIndicator.classList.add('negative');
        margeIndicator.textContent = `${marge.toFixed(2)} FCFA`;
      } else {
        margeIndicator.classList.add('neutral');
        margeIndicator.textContent = '0 FCFA';
      }
    }
  }

  // ── Validation du formulaire ────────────────────────────
  if (form) {
    form.addEventListener('submit', function(e) {
      if (!validateForm()) {
        e.preventDefault();
        return false;
      }

      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Enregistrement...';
      }
    });
  }

  function validateForm() {
    let isValid = true;
    const errors = [];

    // Date obligatoire
    const dateField = document.getElementById('date');
    if (!dateField?.value) {
      errors.push('La date est obligatoire');
      isValid = false;
    }

    // Ligne obligatoire
    const ligneField = document.getElementById('ligne_id');
    if (!ligneField?.value) {
      errors.push('La ligne est obligatoire');
      isValid = false;
    }

    // Au moins un voyage
    const voyagesField = document.getElementById('voyages');
    if (!voyagesField?.value || parseInt(voyagesField.value) <= 0) {
      errors.push('Le nombre de voyages doit être supérieur à 0');
      isValid = false;
    }

    // Au moins un passager
    const passagersField = document.getElementById('passagers');
    if (!passagersField?.value || parseInt(passagersField.value) <= 0) {
      errors.push('Le nombre de passagers doit être supérieur à 0');
      isValid = false;
    }

    // Afficher les erreurs
    const errorContainer = document.getElementById('form-errors');
    if (errorContainer) {
      if (errors.length > 0) {
        errorContainer.innerHTML = errors.map(err => `<div class="error">${err}</div>`).join('');
        errorContainer.style.display = 'block';
      } else {
        errorContainer.style.display = 'none';
      }
    }

    return isValid;
  }

  // ── Auto-save draft ─────────────────────────────────────
  let autoSaveTimer;
  const inputs = form?.querySelectorAll('input, select, textarea');
  if (inputs) {
    inputs.forEach(input => {
      input.addEventListener('input', function() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(saveDraft, 2000);
      });
    });
  }

  function saveDraft() {
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }

    // Save to localStorage
    localStorage.setItem('saisie_draft', JSON.stringify(data));

    // Show saved indicator
    showNotification('Brouillon sauvegardé automatiquement', 'info');
  }

  // Load draft on page load
  const draft = localStorage.getItem('saisie_draft');
  if (draft) {
    try {
      const data = JSON.parse(draft);
      Object.keys(data).forEach(key => {
        const input = document.getElementById(key);
        if (input && !input.value) {
          input.value = data[key];
        }
      });
      calculateTotalRecettes();
      calculateTotalDepenses();
    } catch (e) {
      console.warn('Erreur chargement draft:', e);
    }
  }

  // ── Notifications ───────────────────────────────────────
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // ── Format numbers ──────────────────────────────────────
  const numberInputs = document.querySelectorAll('input[type="number"]');
  numberInputs.forEach(input => {
    input.addEventListener('blur', function() {
      if (this.value && !isNaN(this.value)) {
        this.value = parseFloat(this.value).toFixed(2);
      }
    });
  });

  // ── Keyboard shortcuts ──────────────────────────────────
  document.addEventListener('keydown', function(e) {
    // Ctrl+Enter to submit
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      form?.dispatchEvent(new Event('submit'));
    }

    // Ctrl+S to save draft
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveDraft();
      showNotification('Brouillon sauvegardé', 'success');
    }
  });
});
