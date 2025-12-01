export function renderMoneySidebar(activeTab) {
    // 1. DOM MANIPULATION: Hide Global Sidebar & Fix Grid
    const globalSidebar = document.getElementById('ah-sidebar');
    const layout = document.getElementById('layout');
    const overlay = document.getElementById('ah-overlay');
    const moneyContainer = document.querySelector('.money-app-container');

    if (globalSidebar) globalSidebar.style.display = 'none'; // Hide global nav
    if (overlay) overlay.style.display = 'none'; 
    

    if (layout) {
        layout.style.display = 'block'; 
        layout.style.height = '100vh';
        layout.style.overflow = 'hidden';
    }

    if (!moneyContainer) {
        console.error("Money app container (.money-app-container) not found.");
        return;
    }

    // 2. STYLES
    const fontPrimary = 'Inter, sans-serif'; 
    
    // The Green Gradient Button Style (Low Opacity Olive/Green)
    const backBtnStyle = `
        background: linear-gradient(135deg, rgba(85, 107, 47, 0.85) 0%, rgba(63, 82, 34, 0.9) 100%);
        box-shadow: 0 4px 12px rgba(85, 107, 47, 0.15);
        backdrop-filter: blur(4px);
    `;

    // Active State (Purple for AlgoMoney Dashboard)
    const activeClass = `bg-[#31005e] text-white shadow-md shadow-[#31005e]/20`;
    
    // Locked State (Grayed out + non-clickable)
    const lockedClass = `text-slate-400 opacity-60 cursor-not-allowed select-none bg-slate-50 border border-transparent`;

    const sidebarHTML = `
      <aside class="hidden lg:flex flex-col bg-white border-r border-slate-200/60 p-5 z-20 h-full w-[260px] flex-shrink-0" 
             style="font-family: ${fontPrimary};">
        
        <div class="mb-8">
          <a href="/demo/dashboard.html" 
             class="w-full flex items-center justify-between text-white font-bold py-3 px-4 rounded-xl transition-all hover:opacity-90 hover:-translate-y-0.5 group"
             style="${backBtnStyle}">
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-chevron-left text-xs opacity-70 group-hover:-translate-x-1 transition-transform"></i>
                <span>AlgoHive</span>
            </div>
            <img src="https://static.wixstatic.com/media/ac771e_af06d86a7a1f4abd87e52e45f3bcbd96~mv2.png" class="w-5 h-5 object-contain opacity-80" />
          </a>
        </div>

        <div class="px-2 mb-6 flex items-center gap-3">
             <img src="https://static.wixstatic.com/media/f82622_8fca267ad9a24716a4de0166215a620f~mv2.png" class="h-8 w-auto" />
             <span class="text-sm font-bold text-[#31005e] tracking-tight">Workspace</span>
        </div>

        <div class="space-y-8 flex-1 overflow-y-auto">
          
          <div>
            <p class="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Overview</p>
            <div class="space-y-1">
              <a href="/money/comingsoon.html" 
                 class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'dashboard' ? activeClass : 'text-slate-500 hover:bg-slate-50'}">
                <i class="fa-solid fa-chart-simple w-5 text-center"></i>
                <span>Dashboard</span>
              </a>
              
              <div class="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${lockedClass}">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-chart-pie w-5 text-center"></i>
                    <span>Analytics</span>
                </div>
                <i class="fa-solid fa-lock text-[10px]"></i>
              </div>
            </div>
          </div>

          <div>
            <p class="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Finance</p>
            <div class="space-y-1">
              
              <div class="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${lockedClass}">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-arrow-right-arrow-left w-5 text-center"></i>
                    <span>Transactions</span>
                </div>
                <i class="fa-solid fa-lock text-[10px]"></i>
              </div>

              <div class="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${lockedClass}">
                <div class="flex items-center gap-3">
                    <i class="fa-regular fa-credit-card w-5 text-center"></i>
                    <span>Cards</span>
                </div>
                <i class="fa-solid fa-lock text-[10px]"></i>
              </div>

            </div>
          </div>

        </div>

        <div class="mt-auto pt-4 border-t border-slate-100">
          <div class="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
            <div class="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 grid place-items-center text-xs font-bold text-slate-600 group-hover:border-[#31005e] group-hover:text-[#31005e] transition-colors">
                D
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Demo User</div>
                <div class="text-[10px] text-slate-400 truncate">user@algohive.io</div>
            </div>
            <i class="fa-solid fa-arrow-right-from-bracket text-slate-300 hover:text-rose-500 transition-colors" title="Sign Out"></i>
          </div>
        </div>
      </aside>
    `;

    // Inject the inner sidebar
    container.insertAdjacentHTML('afterbegin', sidebarHTML);
}
