/**
 * Renders the "AlgoMoney" Inner Sidebar into a specific container.
 * @param {string} activeTab - The key of the active inner tab (e.g., 'dashboard', 'analytics', 'cards')
 */
export function renderMoneySidebar(activeTab) {
    // Find the container where the money app lives
    const container = document.querySelector('.money-app-container');
    if (!container) {
        console.error("Money app container (.money-app-container) not found.");
        return;
    }

    const sidebarHTML = `
      <aside class="hidden lg:flex flex-col bg-slate-50 border-r border-slate-200/60 p-5 z-20 h-full">
        
        <div class="mb-8">
          <button class="money-gradient-btn w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-4 rounded-xl transition-transform hover:scale-[1.02] shadow-lg shadow-green-600/20">
            <i class="fa-solid fa-wallet text-lg"></i>
            <span>AlgoMoney</span>
          </button>
        </div>

        <div class="space-y-6 flex-1 overflow-y-auto">
          
          <div>
            <p class="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Overview</p>
            <div class="space-y-1">
              <a href="/money/dashboard.html" class="money-nav-item ${activeTab === 'dashboard' ? 'active' : ''}">
                <i class="fa-solid fa-chart-simple w-5 text-center"></i>
                <span>Dashboard</span>
              </a>
              <a href="/money/analytics.html" class="money-nav-item ${activeTab === 'analytics' ? 'active' : ''}">
                <i class="fa-solid fa-chart-pie w-5 text-center"></i>
                <span>Analytics</span>
              </a>
            </div>
          </div>

          <div>
            <p class="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Finance</p>
            <div class="space-y-1">
              <a href="/money/transactions.html" class="money-nav-item ${activeTab === 'transactions' ? 'active' : ''}">
                <i class="fa-solid fa-arrow-right-arrow-left w-5 text-center"></i>
                <span>Transactions</span>
              </a>
              <a href="/money/cards.html" class="money-nav-item ${activeTab === 'cards' ? 'active' : ''}">
                <i class="fa-regular fa-credit-card w-5 text-center"></i>
                <span>Cards</span>
              </a>
            </div>
          </div>

        </div>

        <div class="mt-auto pt-4 border-t border-slate-200">
          <div class="flex items-center gap-3 px-2 py-2">
            <div class="h-8 w-8 rounded-full bg-slate-200 grid place-items-center text-xs font-bold text-slate-600">D</div>
            <div class="text-sm font-medium text-slate-700">Demo User</div>
            <i class="fa-solid fa-arrow-right-from-bracket ml-auto text-slate-400 cursor-pointer hover:text-rose-500" title="Sign Out"></i>
          </div>
        </div>
      </aside>
    `;

    // Inject the inner sidebar at the beginning of the Money Container
    container.insertAdjacentHTML('afterbegin', sidebarHTML);
}
