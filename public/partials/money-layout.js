export function renderMoneySidebar(activeTab) {
    // Find the container where the money app lives
    const container = document.querySelector('.money-app-container');
    if (!container) {
        console.error("Money app container (.money-app-container) not found.");
        return;
    }

    // --- BRANDING CONFIGURATION ---
    const brandHex = '#31005e'; // The specific hex provided
    const fontPrimary = 'Inter, sans-serif'; 
    
    // Active State: Uses the exact hex for background
    const activeClass = `bg-[#31005e] text-white shadow-md shadow-[#31005e]/20`;
    
    // Inactive State: Standard Slate
    const inactiveClass = 'text-slate-500 hover:bg-slate-50 hover:text-slate-900';

    const sidebarHTML = `
      <aside class="hidden lg:flex flex-col bg-white border-r border-slate-200/60 p-5 z-20 h-full" 
             style="font-family: ${fontPrimary};">
        
        <div class="mb-8">
          <button class="w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-4 rounded-xl transition-transform hover:scale-[1.02] shadow-lg shadow-[#31005e]/25"
                  style="background: linear-gradient(135deg, ${brandHex} 0%, #5b0085 100%);">
            <i class="fa-solid fa-wallet text-lg"></i>
            <span>AlgoMoney</span>
          </button>
        </div>

        <div class="space-y-8 flex-1 overflow-y-auto">
          
          <div>
            <p class="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Overview</p>
            <div class="space-y-1">
              <a href="/money/dashboard.html" 
                 class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'dashboard' ? activeClass : inactiveClass}">
                <i class="fa-solid fa-chart-simple w-5 text-center"></i>
                <span>Dashboard</span>
              </a>
              <a href="/money/analytics.html" 
                 class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'analytics' ? activeClass : inactiveClass}">
                <i class="fa-solid fa-chart-pie w-5 text-center"></i>
                <span>Analytics</span>
              </a>
            </div>
          </div>

          <div>
            <p class="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Finance</p>
            <div class="space-y-1">
              <a href="/money/transactions.html" 
                 class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'transactions' ? activeClass : inactiveClass}">
                <i class="fa-solid fa-arrow-right-arrow-left w-5 text-center"></i>
                <span>Transactions</span>
              </a>
              <a href="/money/cards.html" 
                 class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'cards' ? activeClass : inactiveClass}">
                <i class="fa-regular fa-credit-card w-5 text-center"></i>
                <span>Cards</span>
              </a>
            </div>
          </div>

        </div>

        <div class="mt-auto pt-4 border-t border-slate-100">
          <div class="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
            <div class="h-9 w-9 rounded-full bg-slate-50 border border-slate-200 grid place-items-center text-xs font-bold text-slate-600 group-hover:border-[#31005e] group-hover:text-[#31005e] transition-colors">
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
