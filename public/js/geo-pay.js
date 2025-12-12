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
    const sheet = document.getElementById('bank-sheet');
    const triggers = Array.from(document.querySelectorAll('[data-bank-trigger]'));
    if (!sheet || !triggers.length) return;

    const overlay = sheet.querySelector('[data-bank-overlay]');
    const closeButtons = Array.from(sheet.querySelectorAll('[data-bank-close]'));
    let hideTimeout;

    const openSheet = () => {
      window.clearTimeout(hideTimeout);
      sheet.classList.remove('hidden');
      requestAnimationFrame(() => sheet.classList.add('is-open'));
    };

    const closeSheet = () => {
      sheet.classList.remove('is-open');
      hideTimeout = window.setTimeout(() => sheet.classList.add('hidden'), 220);
    };

    triggers.forEach((trigger) => trigger.addEventListener('click', openSheet));
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
