/**
 * Renders the Master Sidebar into the #layout container.
 * * @param {string} activePage - The ID of the active section: 'home', 'portfolio', 'invest', or 'money'.
 */
export function renderSidebar(activePage) {
    const layout = document.getElementById('layout');
    if (!layout) {
        console.error("Layout container (#layout) not found.");
        return;
    }

    // 1. Define the Sidebar HTML (Exact replica of strategies.html + Money Tab)
    const sidebarHTML = `
    <div id="ah-overlay" class="fixed inset-0 bg-black/40 z-40 hidden md:hidden"></div>

    <aside id="ah-sidebar" data-collapsed="false"
      class="border-r border-slate-200 h-[100vh] bg-white flex flex-col overflow-y-auto fixed md:sticky top-0 z-50 w-[280px] md:w-[var(--sb)] transform -translate-x-full md:translate-x-0 transition-transform duration-300">
      
      <div class="px-4 py-3 flex items-center gap-3 border-b border-slate-200">
        <img src="https://static.wixstatic.com/media/ac771e_af06d86a7a1f4abd87e52e45f3bcbd96~mv2.png"
          alt="AlgoHive Logo" class="w-10 h-10 object-contain" />
        <div class="min-w-0">
          <div class="font-bold text-[15px] text-slate-900 label">AlgoHive</div>
          <div class="text-[11px] text-slate-500 label">Where Smart Capital Gathers</div>
        </div>
      </div>

      <nav id="main-nav" class="p-1 text-[14px]">
        
        <a class="flex items-center gap-3 px-3 py-1 rounded-lg font-medium ${activePage === 'home' ? 'bg-slate-100 text-slate-900' : 'text-slate-900 hover:bg-slate-50'}"
          href="/demo/dashboard.html" title="Home">
          <i class="fa-solid fa-house text-slate-500 w-4 shrink-0"></i><span class="label">Home</span>
        </a>

        <details class="group mt-1" ${activePage === 'portfolio' ? 'open' : ''}>
          <summary
            class="flex items-center justify-between px-3 py-1 rounded-lg hover:bg-slate-50 cursor-pointer font-medium text-slate-900">
            <span class="flex items-center gap-3">
              <i class="fa-regular fa-user w-4 text-slate-500"></i><span class="label">Portfolio</span>
            </span>
            <i class="fa-solid fa-chevron-down text-slate-400 group-open:rotate-180 transition-transform chevron"></i>
          </summary>
          <div class="ml-8 flex flex-col sub">
            <a class="px-3 py-1 rounded-lg hover:bg-slate-50 flex items-center gap-2 ${activePage === 'portfolio' ? 'bg-slate-100 font-semibold' : ''}" href="/demo/dashboard.html">
                <i class="fa-solid fa-chart-pie w-4 text-slate-500"></i><span class="label">My Strategies</span>
            </a>
           </div>
        </details>

        <details class="group mt-1" ${activePage === 'invest' ? 'open' : ''}>
          <summary
            class="flex items-center justify-between px-3 py-1 rounded-lg hover:bg-slate-50 cursor-pointer font-medium text-slate-900">
            <span class="flex items-center gap-3">
              <i class="fa-solid fa-link w-4 text-slate-500"></i><span class="label">Invest</span>
            </span>
            <i class="fa-solid fa-chevron-down text-slate-400 group-open:rotate-180 transition-transform chevron"></i>
          </summary>
          <div class="ml-8 flex flex-col sub">
            <a class="px-3 py-1 rounded-lg hover:bg-slate-50 flex items-center gap-2 ${activePage === 'invest' ? 'bg-slate-100 font-semibold' : ''}" href="/demo/strategies.html">
                <i class="fa-solid fa-chart-line w-4 text-slate-500"></i><span class="label">OpenStrategies</span>
            </a>
          </div>
        </details>

        <a class="mt-1 flex items-center gap-3 px-3 py-1 rounded-lg font-medium ${activePage === 'money' ? 'bg-slate-100 text-slate-900' : 'text-slate-900 hover:bg-slate-50'}"
           href="/money/comingsoon.html" title="Money">
           <i class="fa-solid fa-wallet text-slate-500 w-4 shrink-0"></i><span class="label">Money</span>
        </a>

      </nav>

      <div class="p-2 border-t border-slate-200 footer flex items-center justify-between gap-2 mt-auto">
        <a href="/demo/settings.html" id="ah-settings" aria-current="page"
            class="btn btn-settings h-10 w-10 p-0 rounded-xl border-0 flex items-center justify-center text-slate-500 hover:bg-slate-100" title="Settings">
            <i class="fa-solid fa-gear"></i>
          </a>
      
          <button id="ah-collapse"
            class="btn btn-collapse h-10 w-10 p-0 rounded-xl bg-slate-100 hover:bg-slate-200 border-0 hidden md:flex" title="Collapse">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
      </div>
    </aside>
    `;

    // 2. Inject Sidebar at the top of the Layout div
    layout.insertAdjacentHTML('afterbegin', sidebarHTML);

    // 3. Initialize Sidebar Logic (Collapse, Mobile Menu)
    initSidebarLogic();
}

/**
 * Initializes the interactive logic for the sidebar.
 */
function initSidebarLogic() {
    const layout = document.getElementById('layout');
    const aside = document.getElementById('ah-sidebar');
    const btn = document.getElementById('ah-collapse');
    const mobileBtn = document.getElementById('ah-mobile-menu-btn');
    const overlay = document.getElementById('ah-overlay');

    // --- Desktop Collapse Logic ---
    const saved = localStorage.getItem('ah_collapsed') === 'true';
    if (saved) { 
        aside.setAttribute('data-collapsed', 'true'); 
        layout.classList.add('is-collapsed'); 
    }

    if (btn) {
        btn.addEventListener('click', () => {
            const isCollapsed = aside.getAttribute('data-collapsed') === 'true';
            
            // If expanding, close open accordions (optional preference)
            if (!isCollapsed) {
                aside.querySelectorAll('details[open]').forEach(d => d.removeAttribute('open'));
            }
            
            aside.setAttribute('data-collapsed', String(!isCollapsed));
            layout.classList.toggle('is-collapsed', !isCollapsed);
            localStorage.setItem('ah_collapsed', String(!isCollapsed));
        });
    }

    // --- Mobile Menu Logic ---
    function openMenu() {
        aside.classList.add('is-open');
        // Manually handle transform classes for mobile if using Tailwind classes for state
        aside.classList.remove('-translate-x-full');
        if(overlay) overlay.classList.remove('hidden');
    }

    function closeMenu() {
        aside.classList.remove('is-open');
        aside.classList.add('-translate-x-full');
        if(overlay) overlay.classList.add('hidden');
    }

    if (mobileBtn) mobileBtn.addEventListener('click', openMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    // Close mobile menu when clicking a link
    aside.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) closeMenu();
        });
    });
}
