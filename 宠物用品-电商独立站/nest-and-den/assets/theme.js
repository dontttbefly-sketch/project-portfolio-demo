/* NEST & DEN — minimal theme JS
   No frameworks. ES2017+. ~250 lines. */

(() => {
  'use strict';

  /* ---------- 1. Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.dataset.revealed = 'true';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => (el.dataset.revealed = 'true'));
  }

  /* ---------- 2. Sticky header shadow ---------- */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.dataset.scrolled = window.scrollY > 8 ? 'true' : 'false';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 3. Mobile nav ---------- */
  const burger = document.querySelector('[data-nav-toggle]');
  const mobileNav = document.querySelector('.mobile-nav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      const open = mobileNav.dataset.open === 'true';
      mobileNav.dataset.open = open ? 'false' : 'true';
      document.body.style.overflow = open ? '' : 'hidden';
    });
    mobileNav.querySelectorAll('[data-nav-close]').forEach((btn) =>
      btn.addEventListener('click', () => {
        mobileNav.dataset.open = 'false';
        document.body.style.overflow = '';
      })
    );
  }

  /* ---------- 4. Drawer (cart, generic) ---------- */
  document.querySelectorAll('[data-drawer-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const target = document.querySelector(trigger.dataset.drawerOpen);
      if (target) {
        target.dataset.open = 'true';
        document.body.style.overflow = 'hidden';
      }
    });
  });
  document.querySelectorAll('.drawer__overlay, [data-drawer-close]').forEach((el) => {
    el.addEventListener('click', () => {
      const drawer = el.closest('.drawer');
      if (drawer) drawer.dataset.open = 'false';
      document.body.style.overflow = '';
    });
  });

  /* ---------- 5. Accordion ---------- */
  document.querySelectorAll('.accordion__head').forEach((head) => {
    head.addEventListener('click', () => {
      const item = head.closest('.accordion__item');
      const open = item.dataset.open === 'true';
      item.dataset.open = open ? 'false' : 'true';
      head.setAttribute('aria-expanded', !open);
    });
  });

  /* ---------- 6. PDP gallery (thumb to main) ---------- */
  const gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    const main = gallery.querySelector('[data-gallery-main] img');
    gallery.querySelectorAll('[data-gallery-thumbs] img').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        gallery.querySelectorAll('[data-gallery-thumbs] img').forEach((t) =>
          t.removeAttribute('aria-current')
        );
        thumb.setAttribute('aria-current', 'true');
        if (main) main.src = thumb.dataset.full || thumb.src;
      });
    });
  }

  /* ---------- 7. Variant pickers (visual state only — Shopify handles cart) ---------- */
  document.querySelectorAll('[data-variant-group]').forEach((group) => {
    const label = group.querySelector('[data-variant-label]');
    group.querySelectorAll('[data-variant-option]').forEach((opt) => {
      opt.addEventListener('click', () => {
        group.querySelectorAll('[data-variant-option]').forEach((o) =>
          o.setAttribute('aria-checked', 'false')
        );
        opt.setAttribute('aria-checked', 'true');
        if (label) label.textContent = opt.dataset.optionValue || opt.textContent.trim();
      });
    });
  });

  /* ---------- 8. Sticky ATC visibility (mobile PDP) ---------- */
  const atc = document.querySelector('[data-sticky-atc]');
  const trigger = document.querySelector('[data-atc-trigger]');
  if (atc && trigger && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        atc.dataset.visible = e.isIntersecting ? 'false' : 'true';
      });
    }, { threshold: 0 });
    io.observe(trigger);
  }

  /* ---------- 9. Quantity stepper ---------- */
  document.querySelectorAll('.qty').forEach((qty) => {
    const input = qty.querySelector('input');
    const dec = qty.querySelector('[data-qty-dec]');
    const inc = qty.querySelector('[data-qty-inc]');
    const min = parseInt(input.min || '1', 10);
    const max = parseInt(input.max || '99', 10);
    if (dec) dec.addEventListener('click', () => {
      input.value = Math.max(min, (parseInt(input.value, 10) || min) - 1);
    });
    if (inc) inc.addEventListener('click', () => {
      input.value = Math.min(max, (parseInt(input.value, 10) || min) + 1);
    });
  });

  /* ---------- 10. Add to cart (Shopify Cart API) ---------- */
  document.querySelectorAll('[data-add-to-cart]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      // Default Shopify form submission still works; we hijack for AJAX UX.
      if (!window.fetch) return;
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const originalLabel = btn?.textContent;
      if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
      try {
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form),
        });
        if (!res.ok) throw new Error('Cart error');
        if (btn) btn.textContent = 'Added — view cart';
        document.dispatchEvent(new CustomEvent('cart:added'));
        setTimeout(() => {
          if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
        }, 1800);
      } catch (err) {
        console.error(err);
        if (btn) { btn.disabled = false; btn.textContent = 'Try again'; }
      }
    });
  });

  /* ---------- 11. Newsletter (no-op confirmation; wire to Klaviyo/Shopify Mail) ---------- */
  document.querySelectorAll('[data-newsletter]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      // Allow native Shopify submission to pass through
      const input = form.querySelector('input[type="email"]');
      if (input && !input.value) e.preventDefault();
    });
  });
})();
