/* assets/header-custom.js */
(() => {
  // -----------------------------
  // Shared helpers
  // -----------------------------
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    if (el.hasAttribute('hidden')) return false;
    return el.offsetParent !== null || cs.position === 'fixed';
  }

  function debounce(fn, wait = 60) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // One global observer (optional), reused via subscriptions
  function observeDocument(onChange) {
    const obs = new MutationObserver(debounce(onChange, 80));
    obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
    return obs;
  }

  // -----------------------------
  // 1) Cart icon "disable for 2s"
  // -----------------------------
  function initCartIconDelay() {
    const cartIcon = qs('a#cart-icon');
    if (!cartIcon) return;

    const originalHref = cartIcon.getAttribute('href');
    if (!originalHref) return;

    cartIcon.removeAttribute('href');
    cartIcon.style.pointerEvents = 'none';
    cartIcon.title = 'Cart loading...';

    setTimeout(() => {
      cartIcon.setAttribute('href', originalHref);
      cartIcon.style.pointerEvents = '';
      cartIcon.removeAttribute('title');
    }, 2000);
  }

  // -----------------------------
  // 2) Mega menu overlay behavior
  // -----------------------------
  function initMegaMenuOverlay() {
    const shopButton = qs('#header-shop-button');
    const megaMenuContainer = qs('.mega-menu-container');
    if (!shopButton || !megaMenuContainer) return;

    let overlay = qs('.dark-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'dark-overlay';
      document.body.appendChild(overlay);
    }

    function showOverlay() {
      overlay.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }

    function hideOverlay() {
      overlay.classList.remove('visible');
      document.body.style.overflow = '';
      const svg = qs('#header-shop-button svg');
      if (svg) svg.style.transform = 'unset';
    }

    shopButton.addEventListener('click', () => {
      if (shopButton.classList.contains('dropdown-selected')) showOverlay();
      else hideOverlay();
    });

    overlay.addEventListener('click', () => {
      megaMenuContainer.style.visibility = 'hidden';
      shopButton.classList.remove('dropdown-selected');
      hideOverlay();
    });
  }

  // -----------------------------
  // 3) Escape closes open dropdown menus
  // -----------------------------
  function initEscapeClosesDropdowns() {
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Escape' && e.keyCode !== 27) return;

        const openMenus = qsa('li.tree-menu.has-dropdown .toggle-menu').filter((menu) => {
          const cs = getComputedStyle(menu);
          const visible =
            menu.offsetParent !== null &&
            cs.display !== 'none' &&
            cs.visibility !== 'hidden' &&
            cs.opacity !== '0';
          const notHiddenClass = !menu.classList.contains('toggle-menu-hidden');
          return visible && notHiddenClass;
        });

        if (!openMenus.length) return;

        e.preventDefault();

        openMenus.forEach((menu) => {
          menu.classList.add('toggle-menu-hidden');

          const li = menu.closest('li.tree-menu.has-dropdown');
          if (!li) return;

          const relativeDiv = li.querySelector('div.relative');
          if (relativeDiv) {
            relativeDiv.style.background = '';
            relativeDiv.style.border = '2px solid transparent';
            relativeDiv.style.borderRadius = '';
          }

          const trigger = li.querySelector('a.tree-menu-item');
          if (trigger) {
            trigger.classList.remove('clicked');
            const svg = trigger.querySelector('svg');
            if (svg) svg.classList.remove('rotated');
            trigger.focus();
          }
        });
      },
      true
    );
  }

  // -----------------------------
  // 4) Mobile drawer focus trap + restore
  //    Assumes:
  //      - trigger:  #mobile-menu-trigger
  //      - drawer:   #mobile-navigation.menu-drawer
  // -----------------------------
  function initMobileDrawerFocus() {
    const getDrawer = () => qs('#mobile-navigation.menu-drawer');
    const getTrigger = () => qs('#mobile-menu-trigger');

    function getFocusable(drawer) {
      return qsa(FOCUSABLE, drawer).filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        if (el.closest('[hidden], [aria-hidden="true"]')) return false;
        return el.offsetParent !== null;
      });
    }

    function focusFirst(drawer) {
      if (!drawer) return;
      if (!drawer.hasAttribute('tabindex')) drawer.setAttribute('tabindex', '-1');

      const closeBtn = qs('button', drawer);
      if (closeBtn) return closeBtn.focus();

      const els = getFocusable(drawer);
      (els[0] || drawer).focus();
    }

    function focusTriggerOrRestore(lastFocused) {
      const t = getTrigger();
      if (t && t.focus) return t.focus();
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function closeDrawer(drawer, state) {
      if (!drawer) return;
      state.isClosing = true;
      const closeBtn = qs('button', drawer);
      if (closeBtn) closeBtn.click();
      setTimeout(() => {
        state.isClosing = false;
      }, 450);
    }

    function install() {
      const drawer = getDrawer();
      const trigger = getTrigger();
      if (!drawer || !trigger) return false;
      if (drawer.__focusTrapInstalled) return true;
      drawer.__focusTrapInstalled = true;

      const state = { lastFocused: null, isClosing: false };

      trigger.addEventListener('click', () => {
        state.lastFocused = document.activeElement;

        const start = Date.now();
        const timer = setInterval(() => {
          const d = getDrawer();
          if (d && isVisible(d)) {
            clearInterval(timer);
            focusFirst(d);
          } else if (Date.now() - start > 1000) {
            clearInterval(timer);
          }
        }, 30);
      });

      const closeBtn = qs('button', drawer);
      if (closeBtn) {
        closeBtn.addEventListener(
          'click',
          () => {
            state.isClosing = true;
            setTimeout(() => focusTriggerOrRestore(state.lastFocused), 0);
            setTimeout(() => (state.isClosing = false), 450);
          },
          true
        );
      }

      document.addEventListener(
        'keydown',
        (e) => {
          const d = getDrawer();
          if (!d || !isVisible(d) || state.isClosing) return;

          if (e.key === 'Escape' || e.keyCode === 27) {
            e.preventDefault();
            e.stopPropagation();
            closeDrawer(d, state);
            setTimeout(() => focusTriggerOrRestore(state.lastFocused), 0);
            return;
          }

          if (e.key !== 'Tab') return;

          const els = getFocusable(d);
          if (!els.length) {
            e.preventDefault();
            d.focus();
            return;
          }

          const first = els[0];
          const last = els[els.length - 1];
          const active = document.activeElement;

          if (!d.contains(active)) {
            e.preventDefault();
            first.focus();
            return;
          }

          if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
            return;
          }

          if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
            return;
          }
        },
        true
      );

      document.addEventListener('focusin', (e) => {
        const d = getDrawer();
        if (!d || !isVisible(d) || state.isClosing) return;
        if (d.contains(e.target)) return;
        const els = getFocusable(d);
        (els[0] || d).focus();
      });

      return true;
    }

    if (!install()) {
      const obs = new MutationObserver(() => {
        if (install()) obs.disconnect();
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  // -----------------------------
  // 5) Mobile accordion: only expanded panels tabbable
  // -----------------------------
  function initMobileAccordionTabbing() {
    const getDrawer = () => qs('#mobile-navigation.menu-drawer');
    const drawer = getDrawer();
    if (!drawer) return;

    const FOCUSABLE2 = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]'
    ].join(',');

    function setPanelFocusable(panel, enabled) {
      qsa(FOCUSABLE2, panel).forEach((el) => {
        if (!el.hasAttribute('data-orig-tabindex')) {
          const orig = el.getAttribute('tabindex');
          el.setAttribute('data-orig-tabindex', orig === null ? '' : orig);
        }

        if (enabled) {
          const orig = el.getAttribute('data-orig-tabindex');
          if (orig === '') el.removeAttribute('tabindex');
          else el.setAttribute('tabindex', orig);
        } else {
          el.setAttribute('tabindex', '-1');
        }
      });
    }

    function syncAccordionItem(item) {
      const btn = item.querySelector(':scope > button[aria-expanded]');
      const panel = item.querySelector(':scope > .accordion-content');
      if (!btn || !panel) return;
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      setPanelFocusable(panel, expanded);
    }

    function syncAll() {
      const d = getDrawer();
      if (!d) return;
      qsa('.accordion-item', d).forEach(syncAccordionItem);
    }

    syncAll();

    const attrObserver = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.type === 'attributes' && m.attributeName === 'aria-expanded')) {
        syncAll();
      }
    });

    qsa('.accordion-item > button[aria-expanded]', drawer).forEach((btn) => {
      attrObserver.observe(btn, { attributes: true });
    });

    const domObserver = new MutationObserver(debounce(syncAll, 50));
    domObserver.observe(drawer, { childList: true, subtree: true });
  }

  // -----------------------------
  // 6) Rebuy: Progress step icons + opacity
  // -----------------------------
  function initRebuyProgressIcons() {
    const customCheckmarkSVG = `
      <svg width="9" height="8" viewBox="0 0 9 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.82415 6.15237L0.726419 4.05464L0.012085 4.76395L2.82415 7.57601L8.86078 1.53938L8.15147 0.830078L2.82415 6.15237Z" fill="currentColor"></path>
      </svg>
    `;

    function updateIcons() {
      qsa('.rebuy-cart__progress-step-icon').forEach((iconDiv) => {
        iconDiv.innerHTML = customCheckmarkSVG;
      });

      qsa('.rebuy-cart__progress-step').forEach((stepDiv) => {
        stepDiv.style.opacity = stepDiv.classList.contains('complete') ? '1' : '0.5';
      });
    }

    function tryAttach() {
      const steps = qsa('.rebuy-cart__progress-step');
      if (!steps.length) return false;

      updateIcons();

      steps.forEach((stepDiv) => {
        const stepObserver = new MutationObserver(updateIcons);
        stepObserver.observe(stepDiv, { attributes: true, attributeFilter: ['class'] });
      });

      return true;
    }

    if (!tryAttach()) {
      const obs = new MutationObserver(() => {
        if (tryAttach()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  // -----------------------------
  // 7) Rebuy widget: focus select after clicking add
  // 8) Rebuy widget: normalize focus + nudge into widget on open
  // -----------------------------
  function initRebuyWidgetAccessibility() {
    const WIDGET_ID = '215185';

    const CART_ROOT_SELECTORS = ['.rebuy-smartcart', '.rebuy-cart', '[data-rebuy-smartcart]', '#rebuy-smartcart'];

    function getWidgetRoot() {
      return qs(`[data-rebuy-id="${WIDGET_ID}"]`);
    }

    function getCartRoot() {
      for (const sel of CART_ROOT_SELECTORS) {
        const el = qs(sel);
        if (el) return el;
      }
      return null;
    }

    function setTabbable(el, tabbable) {
      if (!el) return;
      if (tabbable) {
        if (el.getAttribute('tabindex') === '-1') el.removeAttribute('tabindex');
        if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
      } else {
        el.setAttribute('tabindex', '-1');
      }
    }

    function normalize(root) {
      if (!root) return;

      qsa('.rebuy-money span[tabindex]', root).forEach((el) => el.removeAttribute('tabindex'));

      const slides = qsa('.splide__slide', root);
      slides.forEach((slide) => {
        const isHidden =
          slide.getAttribute('aria-hidden') === 'true' ||
          slide.classList.contains('splide__slide--clone') ||
          slide.classList.contains('is-hidden');

        const focusables = qsa(
          "a[href], button, select, input, textarea, [role='button'], [role='link'], [role='combobox']",
          slide
        );

        focusables.forEach((el) => setTabbable(el, !isHidden));
      });

      qsa('[tabindex="0"]', root).forEach((el) => {
        const tag = el.tagName.toLowerCase();
        const isNative =
          tag === 'button' ||
          (tag === 'a' && el.hasAttribute('href')) ||
          tag === 'select' ||
          tag === 'input' ||
          tag === 'textarea';

        const role = el.getAttribute('role');
        const isRoleInteractive = role === 'button' || role === 'link' || role === 'combobox';

        if (!isNative && !isRoleInteractive) el.removeAttribute('tabindex');
      });
    }

    function focusSelectFromButton(button) {
      const productBlock = button.closest('.rebuy-product-block');
      if (!productBlock) return;

      let tries = 0;
      (function attempt() {
        tries += 1;

        const select = productBlock.querySelector('select.rebuy-select');
        if (select && !select.disabled) {
          const style = window.getComputedStyle(select);
          const hidden = style.display === 'none' || style.visibility === 'hidden';
          if (!hidden) {
            select.focus();
            return;
          }
        }

        if (tries < 12) requestAnimationFrame(attempt);
      })();
    }

    function getFirstFocusableInWidget(widgetRoot) {
      if (!widgetRoot) return null;
      return (
        qs('button.rebuy-button', widgetRoot) ||
        qs('select.rebuy-select', widgetRoot) ||
        qs('a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]):not([type="hidden"]), [tabindex]:not([tabindex="-1"])', widgetRoot)
      );
    }

    function shouldNudgeFocus(cartRoot, widgetRoot) {
      const active = document.activeElement;
      if (!cartRoot || !widgetRoot) return false;
      if (active && widgetRoot.contains(active)) return false;
      if (!active || active === document.body || !cartRoot.contains(active)) return true;

      const tag = active.tagName ? active.tagName.toLowerCase() : '';
      return tag === 'div' || tag === 'section' || tag === 'main';
    }

    function nudgeFocusOncePerOpen() {
      const cartRoot = getCartRoot();
      const widgetRoot = getWidgetRoot();

      if (!isVisible(cartRoot)) {
        if (cartRoot) cartRoot.removeAttribute('data-widget-focus-nudged');
        return;
      }

      if (cartRoot.getAttribute('data-widget-focus-nudged') === 'true') return;

      let tries = 0;
      const attempt = () => {
        tries++;

        const c = getCartRoot();
        const w = getWidgetRoot();

        if (!isVisible(c) || !w || !isVisible(w)) {
          if (tries < 20) return setTimeout(attempt, 50);
          return;
        }

        normalize(w);

        if (shouldNudgeFocus(c, w)) {
          const first = getFirstFocusableInWidget(w);
          if (first) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                try {
                  first.focus();
                } catch (_) {}
              });
            });
          }
        }

        c.setAttribute('data-widget-focus-nudged', 'true');
      };

      attempt();
    }

    // Click/keyboard: focus select after add
    document.addEventListener(
      'click',
      (e) => {
        const btn = e.target.closest('button.rebuy-button');
        if (!btn) return;

        const widgetRoot = btn.closest(`[data-rebuy-id="${WIDGET_ID}"]`);
        if (!widgetRoot) return;

        setTimeout(() => focusSelectFromButton(btn), 0);
      },
      true
    );

    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const btn = e.target.closest('button.rebuy-button');
        if (!btn) return;

        const widgetRoot = btn.closest(`[data-rebuy-id="${WIDGET_ID}"]`);
        if (!widgetRoot) return;

        setTimeout(() => focusSelectFromButton(btn), 0);
      },
      true
    );

    // One observer to keep normalize + nudge in sync with SmartCart re-renders
    if (!window.__rebuyWidgetA11y215185) {
      const obs = observeDocument(() => {
        const root = getWidgetRoot();
        if (root) normalize(root);
        nudgeFocusOncePerOpen();
      });
      window.__rebuyWidgetA11y215185 = obs;

      document.addEventListener(
        'click',
        () => setTimeout(() => nudgeFocusOncePerOpen(), 0),
        true
      );
    }

    // initial attempts (Smart Cart mounts late)
    let tries = 0;
    (function retry() {
      tries++;
      const root = getWidgetRoot();
      if (root) normalize(root);
      nudgeFocusOncePerOpen();
      if (!root && tries < 40) setTimeout(retry, 250);
    })();
  }

  // -----------------------------
  // Boot
  // -----------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initCartIconDelay();
    initMegaMenuOverlay();
    initEscapeClosesDropdowns();
    initMobileDrawerFocus();
    initMobileAccordionTabbing();

    // Rebuy-specific init is safe to run globally (guards handle missing DOM)
    initRebuyProgressIcons();
    initRebuyWidgetAccessibility();
  });
})();
