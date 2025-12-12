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
    if (!stack) return;

    const slides = Array.from(stack.querySelectorAll('[data-card-slide]'));
    const pips = Array.from(stack.querySelectorAll('.card-pips .pip'));
    if (!slides.length) return;

    let index = 0;
    let startX = 0;
    let dragging = false;

    const setState = () => {
      slides.forEach((slide, i) => {
        const state = i === index ? 'active' : i < index ? 'left' : 'right';
        slide.dataset.state = state;
      });

      pips.forEach((pip, i) => pip.classList.toggle('is-active', i === index));
    };

    const go = (delta) => {
      index = (index + delta + slides.length) % slides.length;
      setState();
    };

    stack.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      dragging = true;
    });

    stack.addEventListener('touchend', (e) => {
      if (!dragging || !e.changedTouches.length) return;
      const delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 40) {
        go(delta < 0 ? 1 : -1);
      }
      dragging = false;
    });

    stack.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      dragging = true;
    });

    stack.addEventListener('mouseup', (e) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 40) {
        go(delta < 0 ? 1 : -1);
      }
      dragging = false;
    });

    pips.forEach((pip, i) => pip.addEventListener('click', () => {
      index = i;
      setState();
    }));

    setState();
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
