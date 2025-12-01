/**
 * Renders the AlgoHive Sidebar and Overlay
 * @param {string} activePage - The key of the current page (e.g., 'home', 'strategies', 'comingsoon')
 */
export function renderSidebar(activePage) {
  const layoutContainer = document.getElementById('layout');
  
  if (!layoutContainer) {
    console.error("Error: Element with id 'layout' not found.");
    return;
  }

  // 1. Define the HTML Structure
  const sidebarHTML = `
    <div id="ah-overlay" class="fixed inset-0 bg-black/40 z-40 hidden md:hidden"></div>

    <aside id="ah-sidebar" data-collapsed="false" class="border-r border-slate-200 h-[100vh] bg-white flex flex-col overflow-hidden">
      <div class="px-4 py-4 flex items-center gap-3 border-b border-slate-200">
        <img src="https://static.wixstatic.com/media/ac771e_af06d86a7a1f4abd87e52e45f3bcbd96~mv2.png" alt="AlgoHive Logo" class="w-10 h-10 object-contain" />
        <div class="min-w-0">
          <div class="font-bold text-[15px] text-slate-900 label">AlgoHive</div>
          <div class="text-[11px] text-slate-500 label">Demo Workspace</div>
        </div>
      </div>

      <nav id="main-nav" class="p-2 text-[14px] flex-1 overflow-y-auto">
        
        <a class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 font-medium ${activePage === 'home' ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}" 
           href="/demo/dashboard.html" title="Home">
          <i class="fa-solid fa-house ${activePage === 'home' ? 'text-slate-900' : 'text-slate-500'} w-4 shrink-0"></i>
          <span class="label">Home</span>
        </a>

        <details class="group mt-1" ${activePage === 'portfolio' ? 'open' : ''}>
          <summary class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer font-medium text-slate-900">
            <span class="flex items-center gap-3">
              <i class="fa-regular fa-user w-4 text-slate-500"></i>
              <span class="label">Portfolio</span>
            </span>
            <i class="fa-solid fa-chevron-down text-slate-400 group-open:rotate-180 transition-transform chevron"></i>
          </summary>
          <div class="ml-8 mt-1 flex flex-col sub">
            <a class="px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2" href="/demo/dashboard.html">
              <i class="fa-solid fa-chart-pie w-4 text-slate-500"></i>
              <span class="label">My Strategies</span>
            </a>
          </div>
        </details>

        <details class="group mt-1" ${activePage === 'strategies' ? 'open' : ''}>
          <summary class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer font-medium text-slate-900">
            <span class="flex items-center gap-3">
              <i class="fa-solid fa-link w-4 text-slate-500"></i>
              <span class="label">Invest</span>
            </span>
            <i class="fa-solid fa-chevron-down text-slate-400 group-open:rotate-180 transition-transform chevron"></i>
          </summary>
          <div class="ml-8 mt-1 flex flex-col sub">
            <a class="px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 ${activePage === 'strategies' ? 'bg-slate-50 font-semibold' : ''}" href="/demo/strategies.html">
              <i class="fa-solid fa-chart-line w-4 text-slate-500"></i>
              <span class="label">OpenStrategies</span>
            </a>
          </div>
        </details>

        <a class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 font-medium mt-1 ${activePage === 'comingsoon' ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}" 
           href="/money/comingsoon.html" title="Coming Soon">
          <i class="fa-solid fa-rocket ${activePage === 'comingsoon' ? 'text-slate-900' : 'text-slate-500'} w-4 shrink-0"></i>
          <span class="label">Coming Soon</span>
        </a>

      </nav>

      <div class="p-3 border-t border-slate-200 footer flex items-center justify-between gap-2">
        <a href="/demo/settings.html" class="btn h-10 w-10 p-0 rounded-xl bg-slate-100 hover:bg-slate-200 border-0 flex items-center justify-center text-slate-700" title="Settings">
          <i class="fa-solid fa-gear"></i>
        </a>
        <button id="ah-collapse" class="btn btn-collapse h-10 w-10 p-0 rounded-xl bg-slate-100 hover:bg-slate-200 border-0 flex items-center justify-center text-slate-700" title="Collapse">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
      </div>
    </aside>
  `;

  // 2. Inject HTML at the beginning of #layout
  layoutContainer.insertAdjacentHTML('afterbegin', sidebarHTML);

  // 3. Initialize Logic (Collapse & Mobile Menu)
  initSidebarLogic();
}

function initSidebarLogic() {
  const layout = document.getElementById('layout');
  const aside = document.getElementById('ah-sidebar');
  const collapseBtn = document.getElementById('ah-collapse');
  const overlay = document.getElementById('ah-overlay');
  
  // Mobile Menu Triggers (usually found in the Main content, so we look for them globally)
  const mobileMenuBtns = document.querySelectorAll('#ah-mobile-menu-btn'); 

  // --- Logic: Collapse State (Desktop) ---
  const savedState = localStorage.getItem('ah_collapsed') === 'true';
  if (savedState) {
    aside.setAttribute('data-collapsed', 'true');
    layout.classList.add('is-collapsed');
  }

  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      const isCollapsed = aside.getAttribute('data-collapsed') === 'true';
      
      if (!isCollapsed) {
        // Close open accordions when collapsing
        aside.querySelectorAll('details[open]').forEach(d => d.removeAttribute('open'));
      }
      
      aside.setAttribute('data-collapsed', String(!isCollapsed));
      layout.classList.toggle('is-collapsed', !isCollapsed);
      localStorage.setItem('ah_collapsed', String(!isCollapsed));
      
      // Trigger resize event for charts
      window.dispatchEvent(new Event('resize'));
    });
  }

  // --- Logic: Mobile Menu ---
  function openMenu() {
    aside.classList.add('is-open');
    overlay.classList.remove('hidden');
  }

  function closeMenu() {
    aside.classList.remove('is-open');
    overlay.classList.add('hidden');
  }

  // Attach listeners to mobile buttons (if they exist on the page)
  mobileMenuBtns.forEach(btn => btn.addEventListener('click', openMenu));
  
  if (overlay) {
    overlay.addEventListener('click', closeMenu);
  }

  // Close mobile menu when clicking a link
  aside.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}
