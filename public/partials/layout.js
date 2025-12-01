import { supabase } from '/js/supabase.js';

const appShell = document.getElementById('app-shell');
let userProfile = null;

// ========================================== 
// INITIALIZATION
// ==========================================
export async function initLayout(activePageKey = 'home') {
  // 1. Auth Guard
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('/auth.html'); 
    return null; 
  }

  // 2. Fetch Profile & Check Account Type
  // We perform a parallel fetch for efficiency
  const [profileRes, userRes] = await Promise.all([
    supabase.from('demo_profiles').select('*').eq('id', session.user.id).maybeSingle(),
    supabase.auth.getUser()
  ]);

  const profile = profileRes.data || {};
  const meta = userRes.data.user?.user_metadata || {};

  // Guard: Ensure it's a paper account
  if (meta.account_type !== 'paper') {
    window.location.replace('/home.html');
    return null;
  }

  userProfile = { ...meta, ...profile };

  // 3. Render the Shell
  renderAppShell(userProfile, activePageKey);
  
  // 4. Attach Logic
  attachEventListeners();
  initSidebarState(); // Check localStorage for collapsed state

  return userProfile;
}

export function getProfile() { return userProfile; }

// ==========================================
// RENDER APP SHELL
// ==========================================
function renderAppShell(profile, activePageKey) {
  if (!appShell) return;

  const displayName = profile.first_name || profile.full_name || 'Trader';
  const avatarUrl = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f1f5f9&color=64748b`;
  
  // We use the CSS Grid structure specific to AlgoHive here
  appShell.innerHTML = `
    <div id="layout-grid" class="grid min-h-screen transition-all duration-300 grid-cols-1 md:grid-cols-[260px_1fr]">
      
      <div id="ah-overlay" class="fixed inset-0 bg-black/40 z-40 hidden md:hidden"></div>

      <aside id="ah-sidebar" class="fixed md:sticky top-0 z-50 h-screen w-[280px] md:w-auto bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 -translate-x-full md:translate-x-0">
        
        <div class="px-5 py-4 flex items-center gap-3 border-b border-slate-200 h-[65px]">
          <img src="https://static.wixstatic.com/media/ac771e_af06d86a7a1f4abd87e52e45f3bcbd96~mv2.png" alt="AlgoHive" class="w-9 h-9 object-contain" />
          <div class="min-w-0 nav-label transition-opacity duration-200">
            <div class="font-bold text-[15px] text-slate-900 leading-tight">AlgoHive</div>
            <div class="text-[11px] text-slate-500">Demo Workspace</div>
          </div>
        </div>

        <nav class="flex-1 overflow-y-auto p-3 space-y-1">
          ${renderSidebarNav(activePageKey)}
        </nav>

        <div class="p-3 border-t border-slate-200 flex items-center justify-between gap-2 bg-slate-50/50">
           <a href="/demo/settings.html" class="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 transition-all" title="Settings">
             <i class="fa-solid fa-gear"></i>
           </a>
           <button id="sidebar-collapse-btn" class="hidden md:flex items-center justify-center h-10 w-10 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 transition-all" title="Collapse">
             <i class="fa-solid fa-arrow-left"></i>
           </button>
           <button id="sign-out-btn" class="md:hidden flex items-center justify-center h-10 w-10 rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all" title="Sign Out">
             <i class="fa-solid fa-right-from-bracket"></i>
           </button>
        </div>
      </aside>

      <div class="flex flex-col min-w-0 bg-white relative">
        
        <header class="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 h-[60px] flex items-center justify-between">
           <div class="flex items-center gap-3">
             <button id="mobile-menu-btn" class="p-2 -ml-2 text-slate-600">
               <i class="fa-solid fa-bars text-lg"></i>
             </button>
             <span class="font-bold text-slate-900">AlgoHive</span>
           </div>
           <img src="${avatarUrl}" class="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 object-cover">
        </header>

        <main id="main-content" class="flex-1 relative min-h-[calc(100vh-60px)] md:min-h-screen">
            </main>

      </div>
    </div>
  `;
}

// ==========================================
// RENDER NAV LINKS
// ==========================================
function renderSidebarNav(activeKey) {
  // Helper to generate classes
  const getClasses = (key) => {
    const isActive = activeKey === key;
    const base = "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200 group";
    const state = isActive 
      ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
    const icon = isActive ? "text-slate-300" : "text-slate-400 group-hover:text-slate-600";
    return { container: `${base} ${state}`, icon };
  };

  const navItems = [
    { key: 'home', label: 'Home', icon: 'fa-house', href: '/demo/dashboard.html' },
    { key: 'portfolio', label: 'Portfolio', icon: 'fa-chart-pie', href: '/demo/dashboard.html#portfolio' }, // Example anchor
    { key: 'invest', label: 'Invest', icon: 'fa-chart-line', href: '/demo/strategies.html' },
    { key: 'money', label: 'Money', icon: 'fa-wallet', href: '/money/comingsoon.html' }, // <-- NEW TAB
  ];

  return navItems.map(item => {
    const style = getClasses(item.key);
    return `
      <a href="${item.href}" class="${style.container}">
        <i class="fa-solid ${item.icon} w-5 text-center ${style.icon} transition-colors"></i>
        <span class="nav-label whitespace-nowrap opacity-100 transition-opacity duration-200">${item.label}</span>
      </a>
    `;
  }).join('');
}

// ==========================================
// EVENT LISTENERS & LOGIC
// ==========================================
function attachEventListeners() {
  // 1. Sign Out
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.replace('/auth.html');
    });
  }

  // 2. Mobile Menu
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const overlay = document.getElementById('ah-overlay');
  const sidebar = document.getElementById('ah-sidebar');
  
  const toggleMobileMenu = (show) => {
    if (show) {
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
    } else {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    }
  };

  if (mobileBtn) mobileBtn.addEventListener('click', () => toggleMobileMenu(true));
  if (overlay) overlay.addEventListener('click', () => toggleMobileMenu(false));

  // 3. Desktop Collapse
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const layoutGrid = document.getElementById('layout-grid');
  
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      const isCollapsed = layoutGrid.classList.contains('md:grid-cols-[80px_1fr]');
      setSidebarState(!isCollapsed);
    });
  }
}

// ==========================================
// STATE MANAGEMENT (COLLAPSE)
// ==========================================
function setSidebarState(collapsed) {
  const layoutGrid = document.getElementById('layout-grid');
  const sidebar = document.getElementById('ah-sidebar');
  const labels = document.querySelectorAll('.nav-label');
  const collapseIcon = document.querySelector('#sidebar-collapse-btn i');

  if (collapsed) {
    // Collapse
    layoutGrid.classList.replace('md:grid-cols-[260px_1fr]', 'md:grid-cols-[80px_1fr]');
    sidebar.classList.replace('w-[280px]', 'w-[80px]'); // Base width adjustment
    labels.forEach(el => el.classList.add('opacity-0', 'w-0', 'overflow-hidden'));
    collapseIcon.classList.add('rotate-180');
    localStorage.setItem('ah_sidebar_collapsed', 'true');
  } else {
    // Expand
    layoutGrid.classList.replace('md:grid-cols-[80px_1fr]', 'md:grid-cols-[260px_1fr]');
    sidebar.classList.replace('w-[80px]', 'w-[280px]');
    labels.forEach(el => el.classList.remove('opacity-0', 'w-0', 'overflow-hidden'));
    collapseIcon.classList.remove('rotate-180');
    localStorage.setItem('ah_sidebar_collapsed', 'false');
  }
}

function initSidebarState() {
  const isCollapsed = localStorage.getItem('ah_sidebar_collapsed') === 'true';
  if (isCollapsed) {
    // We apply it immediately to avoid flicker, though strictly it happens after render
    setSidebarState(true);
  }
}

// ==========================================
// HELPER: INJECT PAGE CONTENT
// ==========================================
// Use this if your HTML file defines the content inside a template or hidden div
export function setPageContent(htmlContent) {
  const main = document.getElementById('main-content');
  if (main) main.innerHTML = htmlContent;
}
