(() => {
  if (window.craftmixHalloweenHeroInitialized) return;
  window.craftmixHalloweenHeroInitialized = true;

  const init = (scope = document) => {
    scope.querySelectorAll('[data-halloween-hero]').forEach((hero) => {
      if (hero.dataset.offerInitialized === 'true') return;

      const button = hero.querySelector('[data-halloween-copy]');
      const code = hero.querySelector('[data-halloween-code]');
      const status = hero.querySelector('[data-halloween-copy-status]');
      if (!button || !code || !status) return;

      hero.dataset.offerInitialized = 'true';
      // The native details/summary reveal also works without JavaScript.
      if (!navigator.clipboard || !navigator.clipboard.writeText) return;
      button.hidden = false;

      button.addEventListener('click', async () => {
        button.disabled = true;
        status.textContent = '';
        try {
          await navigator.clipboard.writeText(code.textContent.trim());
          status.textContent = button.dataset.copiedLabel;
        } catch {
          status.textContent = status.dataset.copyFailure;
          const range = document.createRange();
          range.selectNodeContents(code);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } finally {
          button.disabled = false;
        }
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
