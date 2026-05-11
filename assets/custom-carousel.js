function waitForFlickityAndInit() {
  if (typeof Flickity === 'undefined') {
    return setTimeout(waitForFlickityAndInit, 50);
  }

  // Track Tab direction to avoid Shift+Tab traps
  let lastTabDirection = 'forward';
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Tab') lastTabDirection = e.shiftKey ? 'backward' : 'forward';
    },
    true
  );

  function initializeCarousels(cellAlign, contain, freeScroll) {
    const carousels = document.querySelectorAll('.custom-carousel');

    carousels.forEach((el, index) => {
      // Prevent double init
      if (el.dataset.customCarouselInitialized === 'true') return;
      el.dataset.customCarouselInitialized = 'true';

      const flkty = new Flickity(el, {
        cellAlign: cellAlign,
        wrapAround: false,
        contain: contain,
        fullscreen: true,
        pageDots: true,
        prevNextButtons: false,
        freeScroll: freeScroll,
      });

      console.log(`Carousel ${index + 1} has ${flkty.slides.length} slides`);

      // ---- Find the correct arrow buttons for THIS carousel (no global fallback) ----
      function findArrowButtonsForCarousel(carouselEl) {
        let node = carouselEl;

        while (node && node !== document.documentElement) {
          if (node.querySelector) {
            const prev = node.querySelector('.custom-carousel-prev');
            const next = node.querySelector('.custom-carousel-next');

            if (prev && next) return { prev, next, scope: node };
          }
          node = node.parentElement;
        }

        return { prev: null, next: null, scope: null };
      }

      const { prev: prevBtn, next: nextBtn } = findArrowButtonsForCarousel(el);

      if (!prevBtn || !nextBtn) {
        console.warn(
          'custom-carousel.js: Could not find scoped prev/next buttons for this carousel. Ensure the carousel and its buttons share a common ancestor wrapper.',
          el
        );
      }

      // ---- Visible window math ----
      let visibleCount = 1;

      function getCellOuterWidth() {
        const firstCell = flkty.cells && flkty.cells[0];
        if (!firstCell || !firstCell.size) return 0;
        return firstCell.size.outerWidth || firstCell.size.width || 0;
      }

      function computeVisibleCount() {
        const viewport = flkty.viewport;
        const cellOuterW = getCellOuterWidth();

        if (!viewport || !cellOuterW) {
          visibleCount = 1;
          return visibleCount;
        }

        const viewportW = viewport.clientWidth || 0;
        visibleCount = Math.max(1, Math.round(viewportW / cellOuterW));
        return visibleCount;
      }

      // CHANGED: allow selecting all cells up to the last one
      function getMaxIndex() {
        const total = flkty.cells ? flkty.cells.length : 0;
        return Math.max(0, total - 1);
      }

      // ---- Keep focus on arrows while using them ----
      let arrowLock = null; // 'prev' | 'next' | null
      let arrowLockTimer = null;

      function lockArrow(which) {
        arrowLock = which;
        if (arrowLockTimer) clearTimeout(arrowLockTimer);
        arrowLockTimer = setTimeout(() => (arrowLock = null), 600);
      }

      function safeFocus(elm) {
        if (!elm) return;
        requestAnimationFrame(() => {
          try {
            elm.focus({ preventScroll: true });
          } catch (e) {}
        });
      }

      // ---- Disabled state (deferred + stable) ----
      function setDisabled(btn, disabled) {
        if (!btn) return;
        btn.disabled = !!disabled;
        btn.classList.toggle('disabled', !!disabled);
        if (disabled && document.activeElement === btn) safeFocus(btn);
      }

      // Determine FULL visibility in the Flickity viewport
      function isCellFullyVisible(cellEl) {
        if (!cellEl || !flkty || !flkty.viewport) return false;

        const vpRect = flkty.viewport.getBoundingClientRect();
        const cellRect = cellEl.getBoundingClientRect();

        const tol = 1; // small tolerance for rounding
        return cellRect.left >= vpRect.left - tol && cellRect.right <= vpRect.right + tol;
      }

      // Disable arrows based on FULL visibility of first/last cell
      function syncArrowDisabledState() {
        if (!prevBtn || !nextBtn) return;

        if (flkty.options.wrapAround) {
          setDisabled(prevBtn, false);
          setDisabled(nextBtn, false);
          return;
        }

        const cellEls = flkty.getCellElements();
        if (!cellEls || !cellEls.length) return;

        const firstCell = cellEls[0];
        const lastCell = cellEls[cellEls.length - 1];

        setDisabled(prevBtn, isCellFullyVisible(firstCell));
        setDisabled(nextBtn, isCellFullyVisible(lastCell));
      }

      // ---- Make only visible items tabbable ----
      function getFocusableIn(elm) {
        if (!elm) return [];

        const selector =
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

        const list = Array.from(elm.querySelectorAll(selector));

        const variantTriggers = Array.from(elm.querySelectorAll('.custom-variant-trigger'));
        variantTriggers.forEach((trigger) => {
          if (!list.includes(trigger)) list.push(trigger);
        });

        try {
          if (
            elm.matches &&
            (elm.matches('a[href]') ||
              elm.matches('button:not([disabled])') ||
              elm.matches('input:not([disabled])') ||
              elm.matches('select:not([disabled])') ||
              elm.matches('textarea:not([disabled])') ||
              (elm.hasAttribute('tabindex') && elm.getAttribute('tabindex') !== '-1'))
          ) {
            list.unshift(elm);
          }
        } catch (e) {}

        const videos = Array.from(elm.querySelectorAll('video'));
        videos.forEach((v) => list.push(v));

        return Array.from(new Set(list));
      }

      function setTabbableState(target, isTabbable) {
        if (!target) return;

        if (target.dataset && target.dataset.origTabindex === undefined) {
          const orig = target.getAttribute('tabindex');
          target.dataset.origTabindex = orig === null ? '__none__' : orig;
        }

        if (isTabbable) {
          const orig = target.dataset ? target.dataset.origTabindex : '__none__';

          if (target.tagName === 'VIDEO' && (orig === '__none__' || orig === null)) {
            target.setAttribute('tabindex', '0');
            return;
          }

          if (orig === '__none__') {
            target.removeAttribute('tabindex');
          } else {
            target.setAttribute('tabindex', orig);
          }
        } else {
          target.setAttribute('tabindex', '-1');
        }
      }

      function updateTabbablesToVisibleWindow() {
        const cellEls = flkty.getCellElements();
        if (!cellEls || !cellEls.length) return;

        cellEls.forEach((cellEl) => {
          const focusables = getFocusableIn(cellEl);
          const fullyVisible = isCellFullyVisible(cellEl);
          focusables.forEach((f) => setTabbableState(f, fullyVisible));
        });
      }

      // ---- Arrow movement (clamped, no overshoot) ----
      function goPrev() {
        const target = Math.max(0, flkty.selectedIndex - 1);
        if (target === flkty.selectedIndex) return;
        flkty.select(target, false, false);
      }

      function goNext() {
        const maxIndex = getMaxIndex();
        const target = Math.min(maxIndex, flkty.selectedIndex + 1);
        if (target === flkty.selectedIndex) return;
        flkty.select(target, false, false);
      }

      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (prevBtn.disabled) {
            safeFocus(prevBtn);
            return;
          }
          lockArrow('prev');
          goPrev();
          safeFocus(prevBtn);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (nextBtn.disabled) {
            safeFocus(nextBtn);
            return;
          }
          lockArrow('next');
          goNext();
          safeFocus(nextBtn);
        });
      }

      // ---- Focus helpers (needed for the Tab-from-container fix) ----
      function focusFirstFocusableInCell(cellEl) {
        if (!cellEl) return;

        const focusables = getFocusableIn(cellEl);
        const first = focusables && focusables[0];
        if (!first) return;

        try {
          first.focus({ preventScroll: true });
        } catch (e) {}
      }

      function focusSelectedCell() {
        const cells = flkty.getCellElements();
        const cellEl = cells && cells[flkty.selectedIndex];
        focusFirstFocusableInCell(cellEl);
      }

      // FIX: when the carousel container has focus, Tab forward should enter the CURRENT selected cell
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) return; // let Shift+Tab behave normally
        if (document.activeElement !== el) return;

        e.preventDefault();
        focusSelectedCell();
      });

      function findCellIndexFromTarget(target) {
        const cellEls = flkty.getCellElements();
        if (!cellEls || !cellEls.length) return -1;

        let idx = cellEls.indexOf(target);
        if (idx !== -1) return idx;

        for (let i = 0; i < cellEls.length; i++) {
          const cell = cellEls[i];
          if (cell && cell.contains && cell.contains(target)) return i;
        }

        return -1;
      }

      el.addEventListener('focusin', (e) => {
        if (arrowLock) return;

        if (
          e.target.closest('.custom-carousel-prev, .custom-carousel-next') ||
          e.target.closest('.flickity-button') ||
          e.target.closest('.flickity-page-dots') ||
          e.target.closest('.dot')
        ) {
          return;
        }

        const focusedIndex = findCellIndexFromTarget(e.target);

        if (focusedIndex === -1) return;

        const cells = flkty.getCellElements();
        const focusedCellEl = cells && cells[focusedIndex];
        if (!focusedCellEl) return;

        if (isCellFullyVisible(focusedCellEl)) return;

        const maxIndex = getMaxIndex();
        const target = Math.max(0, Math.min(maxIndex, focusedIndex));
        flkty.select(target, false, false);
      });

      // ---- Event wiring ----
      function syncOnSettle() {
        syncArrowDisabledState();
        updateTabbablesToVisibleWindow();

        if (arrowLock === 'prev' && prevBtn) safeFocus(prevBtn);
        if (arrowLock === 'next' && nextBtn) safeFocus(nextBtn);
      }

      flkty.on('ready', () => {
        computeVisibleCount();
        syncArrowDisabledState();
        updateTabbablesToVisibleWindow();
      });

      flkty.on('select', () => {
        if (arrowLock === 'prev' && prevBtn) safeFocus(prevBtn);
        if (arrowLock === 'next' && nextBtn) safeFocus(nextBtn);
      });

      flkty.on('settle', syncOnSettle);

      window.addEventListener('resize', () => {
        computeVisibleCount();
        syncArrowDisabledState();
        updateTabbablesToVisibleWindow();
      });

      computeVisibleCount();
      syncArrowDisabledState();
      updateTabbablesToVisibleWindow();
    });
  }

  function initializeOnLoad() {
    const screenWidth = window.innerWidth;
    if (screenWidth >= 1020) {
      initializeCarousels('left', true, false);
    } else {
      initializeCarousels('center', false, true);
    }
  }

  document.addEventListener('DOMContentLoaded', initializeOnLoad);
}

waitForFlickityAndInit();
