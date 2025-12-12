(function () {
  function wireSidebar() {
    const sidebar = document.getElementById('ah-sidebar');
    const overlay = document.getElementById('ah-overlay');
    const mobileBtn = document.getElementById('ah-mobile-menu-btn');
    const collapseBtn = document.getElementById('ah-collapse');
    const mobileIslands = document.querySelectorAll('[data-mobile-island]');

    const openSidebar = () => {
      sidebar?.classList.add('is-open');
      overlay?.classList.remove('hidden');
    };

    mobileBtn?.addEventListener('click', openSidebar);
    mobileIslands.forEach(btn => btn.addEventListener('click', openSidebar));

    overlay?.addEventListener('click', () => {
      sidebar?.classList.remove('is-open');
      overlay?.classList.add('hidden');
    });

    collapseBtn?.addEventListener('click', () => {
      const layout = document.getElementById('layout');
      const isCollapsed = sidebar?.dataset.collapsed === 'true';
      const next = !isCollapsed;
      sidebar.dataset.collapsed = String(next);
      layout?.classList.toggle('is-collapsed', next);
    });
  }

  function wireCardStack() {
    const stack = document.querySelector('[data-card-stack]');
    const cards = stack ? Array.from(stack.querySelectorAll('[data-card]')) : [];
    const sheet = document.getElementById('bank-sheet');
    const overlay = sheet?.querySelector('[data-bank-overlay]');
    const closeButtons = sheet ? Array.from(sheet.querySelectorAll('[data-bank-close]')) : [];
    let hideTimeout;

    if (!stack || !cards.length) return;

    let activeCard = cards.find((card) => card.dataset.cardActive === 'true') || cards[0];

    const setActiveCard = (nextCard) => {
      if (!nextCard || nextCard === activeCard) return;
      activeCard = nextCard;

      cards.forEach((card) => {
        const isActive = card === activeCard;
        card.classList.toggle('stack-front', isActive);
        card.classList.toggle('stack-back', !isActive);
        card.dataset.cardActive = String(isActive);
        card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    };

    const openSheet = () => {
      if (!sheet) return;
      window.clearTimeout(hideTimeout);
      sheet.classList.remove('hidden');
      requestAnimationFrame(() => sheet.classList.add('is-open'));
    };

    const closeSheet = () => {
      if (!sheet) return;
      sheet.classList.remove('is-open');
      hideTimeout = window.setTimeout(() => sheet.classList.add('hidden'), 220);
    };

    cards.forEach((card) => {
      card.addEventListener('click', () => {
        setActiveCard(card);
      });
    });

    overlay?.addEventListener('click', closeSheet);
    closeButtons.forEach((btn) => btn.addEventListener('click', closeSheet));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeSheet();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      wireSidebar();
      wireCardStack();
    });
  } else {
    wireSidebar();
    wireCardStack();
  }
})();
