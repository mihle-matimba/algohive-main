// public/partials/layout.js

/**
 * Renders the AlgoHive Sidebar into the #layout container
 * @param {string} activePage - The key of the active page ('home', 'portfolio', 'invest', 'money')
 */
export function renderLayout(activePage) {
    const layout = document.getElementById('layout');
    if (!layout) {
        console.error("Layout container (#layout) not found.");
        return;
    }

    // 1. Inject Sidebar & Overlay HTML
    // We insert this at the beginning of the #layout div
    const sidebarHTML = `
    <div id="ah-overlay" class="fixed inset-0 bg-black/40 z-40 hidden md:hidden"></div>

    <aside id="ah-sidebar" data-collapsed="false"
      class="border-r border-slate-200 h-[100vh] bg-white flex flex-col overflow-y-auto fixed md:sticky top-0 z-50 w-[280px] md:w-[var(--sb)] transform -translate-x-full md:translate-x-0 transition-transform duration-300">
      
      <div class="px-4 py-4 flex items-center gap-3 border-b border-slate-200 h-[65px]">
        <img src="https://static.wixstatic.com/media/ac771e_af06d86a7a1f4abd87e52e45f3bcbd96~mv2.png"
          alt="AlgoHive Logo" class="w-10 h-10 object-contain" />
        <div class="min-w-0 label-container">
          <div class="font-bold text-[15px] text-slate-900 label">AlgoHive</div>
          <div class="text-[11px] text-slate-500 label">Demo Workspace</div>
        </div>
      </div>

      <nav id="main-nav" class="p-2 text-[14px] flex-1 overflow-y-auto space-y-1">
        
        <a class="flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${activePage === 'home' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}"
          href="/demo/dashboard.html">
          <i class="fa-solid fa-house w-4 shrink-0 ${activePage === 'home' ? 'text-slate-900' : 'text-slate-500'}"></i>
          <span class="label">Home</span>
        </a>

        <details class="group">
          <summary
            class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer font-medium text-slate-600">
            <span class="flex items-center gap-3">
              <i class="fa-regular fa-user w-4 text-slate-500"></i><span class="label">Portfolio</span>
            </span>
            <i class="fa-solid fa-chevron-down text-slate-400 group-open:rotate-180 transition-transform chevron"></i>
          </summary>
          <div class="ml-8 flex flex-col sub mt-1">
            <a class="px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600" href="/demo/dashboard.html">
                <i class="fa-solid fa-chart-pie w-4 text-slate-500"></i><span class="label">My Strategies</span>
            </a>
          </div>
        </details>

        <details class="group" ${activePage === 'invest' ? 'open' : ''}>
          <summary
            class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer font-medium text-slate-600">
            <span class="flex items-center gap-3">
              <i class="fa-solid fa-link w-4 text-slate-500"></i><span class="label">Invest</span>
            </span>
            <i class="fa-solid fa-chevron-down text-slate-400 group-open:rotate-180 transition-transform chevron"></i>
          </summary>
          <div class="ml-8 flex flex-col sub mt-1">
            <a class="px-3 py-2 rounded-lg flex items-center gap-2 ${activePage === 'invest' ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50'}" href="/demo/strategies.html">
                <i class="fa-solid fa-chart-line w-4 text-slate-500"></i><span class="label">OpenStrategies</span>
            </a>
          </div>
        </details>

        <a class="flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${activePage === 'money' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}"
           href="/money/comingsoon.html">
           <i class="fa-solid fa-wallet w-4 shrink-0 ${activePage === 'money' ? 'text-slate-900' : 'text-slate-500'}"></i>
           <span class="label">Money</span>
        </a>

      </nav>

      <div class="p-3 border-t border-slate-200 footer flex items-center justify-between gap-2 bg-slate-50/50">
        <a href="/demo/settings.html" class="btn h-10 w-10 p-0 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500" title="Settings">
            <i class="fa-solid fa-gear"></i>
          </a>
      
          <button id="ah-collapse"
            class="hidden md:flex h-10 w-10 p-0 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 items-center justify-center text-slate-500" title="Collapse">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
      </div>
    </aside>
    `;

    layout.insertAdjacentHTML('afterbegin', sidebarHTML);

    // 2. Initialize Logic
    initSidebarLogic();
}

function initSidebarLogic() {
    const layout = document.getElementById('layout');
    const aside = document.getElementById('ah-sidebar');
    const collapseBtn = document.getElementById('ah-collapse');
    const overlay = document.getElementById('ah-overlay');
    const mobileBtns = document.querySelectorAll('.mobile-menu-btn'); // Class for buttons that open menu

    // -- Collapse Logic (Desktop) --
    const saved = localStorage.getItem('ah_collapsed') === 'true';
    if (saved) {
        aside.setAttribute('data-collapsed', 'true');
        layout.classList.add('is-collapsed');
    }

    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            const isCollapsed = aside.getAttribute('data-collapsed') === 'true';
            if (!isCollapsed) aside.querySelectorAll('details[open]').forEach(d => d.removeAttribute('open'));
            aside.setAttribute('data-collapsed', String(!isCollapsed));
            layout.classList.toggle('is-collapsed', !isCollapsed);
            localStorage.setItem('ah_collapsed', String(!isCollapsed));
            
            // Rotate icon
            const icon = collapseBtn.querySelector('i');
            if(icon) icon.style.transform = !isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }

    // -- Mobile Menu Logic --
    function openMenu() {
        aside.classList.remove('-translate-x-full'); // Tailwind class removal to slide in
        aside.classList.add('translate-x-0'); // Add active state if needed, or rely on transform removal
        aside.classList.add('is-open'); // For CSS specific targeting
        overlay.classList.remove('hidden');
    }

    function closeMenu() {
        aside.classList.add('-translate-x-full');
        aside.classList.remove('translate-x-0');
        aside.classList.remove('is-open');
        overlay.classList.add('hidden');
    }

    mobileBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMenu();
    }));

    if (overlay) overlay.addEventListener('click', closeMenu);

    // Close on link click (mobile)
    aside.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) closeMenu();
        });
    });
}
