/**
 * VoyageIQ-Pro — public.js
 * Interactions et animations de la vitrine publique
 * Chargé après main.js via base_public.html
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════════════════════════
     COMPTEURS ANIMÉS (stats hero)
  ══════════════════════════════════════════════════════════ */
  function animateCounter(el) {
    const target   = parseInt(el.dataset.count, 10) || 0;
    const duration = 1600;
    const start    = performance.now();

    function update(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease     = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(ease * target).toLocaleString('fr');
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        entry.target.dataset.counted = 'true';
        animateCounter(entry.target);
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('[data-count]').forEach(el => {
    el.textContent = '0';
    counterObs.observe(el);
  });

  /* ══════════════════════════════════════════════════════════
     ANIMATIONS D'ENTRÉE AU SCROLL
  ══════════════════════════════════════════════════════════ */

  // Injecter les styles is-visible une seule fois
  if (!document.getElementById('pub-reveal-style')) {
    const s = document.createElement('style');
    s.id = 'pub-reveal-style';
    s.textContent = `.is-visible { opacity: 1 !important; transform: translateY(0) !important; }`;
    document.head.appendChild(s);
  }

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  // Cartes avec délai en cascade
  const revealSelectors = [
    '.ligne-card',
    '.service-card',
    '.contact-card',
    '.agence-card',
    '.cta-chauffeur',
    '.section__header',
  ];

  document.querySelectorAll(revealSelectors.join(', ')).forEach((el, i) => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(28px)';
    el.style.transition = `opacity .5s ease ${(i % 6) * 70}ms, transform .5s ease ${(i % 6) * 70}ms`;
    revealObs.observe(el);
  });

  /* ══════════════════════════════════════════════════════════
     SMOOTH SCROLL (ancres)
  ══════════════════════════════════════════════════════════ */
  const navbarHeight = () => document.getElementById('pubNavbar')?.offsetHeight || 68;

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href   = link.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - navbarHeight() - 8,
        behavior: 'smooth'
      });
    });
  });

  /* ══════════════════════════════════════════════════════════
     HIGHLIGHT NAV AU SCROLL
  ══════════════════════════════════════════════════════════ */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.pub-navbar__link[href*="#"]');

  function highlightNav() {
    let current = '';
    const offset = navbarHeight() + 60;
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - offset) {
        current = sec.id;
      }
    });
    navLinks.forEach(link => {
      const active = link.getAttribute('href').includes(`#${current}`) && current !== '';
      link.classList.toggle('pub-navbar__link--active', active);
    });
  }

  window.addEventListener('scroll', highlightNav, { passive: true });
  highlightNav(); // état initial

  /* ══════════════════════════════════════════════════════════
     ANIMATION HERO — au chargement
  ══════════════════════════════════════════════════════════ */
  const heroContent = document.querySelector('.hero__content');
  if (heroContent) {
    heroContent.style.opacity   = '0';
    heroContent.style.transform = 'translateY(24px)';
    heroContent.style.transition = 'opacity .7s .1s, transform .7s .1s';
    requestAnimationFrame(() => {
      heroContent.style.opacity   = '1';
      heroContent.style.transform = '';
    });
  }

  const heroStats = document.querySelector('.hero__stats');
  if (heroStats) {
    heroStats.style.opacity   = '0';
    heroStats.style.transform = 'translateY(16px)';
    heroStats.style.transition = 'opacity .6s .4s, transform .6s .4s';
    requestAnimationFrame(() => {
      heroStats.style.opacity   = '1';
      heroStats.style.transform = '';
    });
  }

  /* ══════════════════════════════════════════════════════════
     HOVER EFFET LIGNE CARDS (parallaxe légère)
  ══════════════════════════════════════════════════════════ */
  document.querySelectorAll('.ligne-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - .5) * 8;
      const y = ((e.clientY - rect.top)  / rect.height - .5) * 5;
      card.style.transform = `translateY(0) rotateX(${-y}deg) rotateY(${x}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform .4s ease';
    });
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform .1s';
    });
  });

});
