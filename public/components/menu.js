document.addEventListener('DOMContentLoaded', () => {
    const renderIcons = () => {
        if (window.lucide?.createIcons) {
            window.lucide.createIcons();
            return true;
        }
        return false;
    };

    if (!renderIcons()) {
        window.addEventListener('load', renderIcons, { once: true });
    }

    const desktopSidebar = document.getElementById('desktop-sidebar');

    if (desktopSidebar) {
        desktopSidebar.addEventListener('mouseenter', () => {
            desktopSidebar.classList.add('expanded');
        });

        desktopSidebar.addEventListener('mouseleave', () => {
            desktopSidebar.classList.remove('expanded');
        });
    }

    const mobileTrigger = document.getElementById('mobile-menu-trigger');
    const mobileClose = document.getElementById('mobile-menu-close');
    const mobileSidebar = document.getElementById('mobile-sidebar');

    if (mobileTrigger && mobileSidebar) {
        mobileTrigger.addEventListener('click', () => {
            mobileSidebar.classList.add('open');
        });
    }

    if (mobileClose && mobileSidebar) {
        mobileClose.addEventListener('click', () => {
            mobileSidebar.classList.remove('open');
        });
    }
});
