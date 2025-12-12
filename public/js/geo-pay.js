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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireSidebar);
  } else {
    wireSidebar();
  }
})();
