import { openAdminPanel, openLoginModal } from '../features/admin/admin-init.js';
import { openPrivacyModal, openUnsubscribeModal } from '../features/newsletter/privacy-unsubscribe.js';

export function setupRouting(isAdminLoggedIn, onFilterChange) {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="/"]');
    if (!link) return;
    
    const href = link.getAttribute('href');
    if (href.startsWith('/#') || link.target === '_blank') return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    
    e.preventDefault();
    history.pushState(null, '', href);
    handleRoute(href, true, isAdminLoggedIn, onFilterChange);
    
    const mobileDrawer = document.getElementById('mobile-drawer');
    if (mobileDrawer && mobileDrawer.classList.contains('open')) {
      if (window.closeDrawer) window.closeDrawer();
    }
  });
  
  window.addEventListener('popstate', () => {
    handleRoute(window.location.pathname, true, isAdminLoggedIn, onFilterChange);
  });
}

export function handleRoute(path, smooth = true, isAdminLoggedIn, onFilterChange) {
  const scrollBehavior = smooth ? 'smooth' : 'auto';
  
  if (path.startsWith('/catalog')) {
    if (onFilterChange) onFilterChange('all');
    else if (window.setCategoryFilter) window.setCategoryFilter('all');
    const target = document.getElementById('products');
    if (target) target.scrollIntoView({ behavior: scrollBehavior });
  } else if (path.startsWith('/sale')) {
    if (onFilterChange) onFilterChange('sale');
    else if (window.setCategoryFilter) window.setCategoryFilter('sale');
    const target = document.getElementById('products');
    if (target) target.scrollIntoView({ behavior: scrollBehavior });
  } else if (path.startsWith('/brand')) {
    const target = document.getElementById('brand');
    if (target) target.scrollIntoView({ behavior: scrollBehavior });
  } else if (path.startsWith('/privacy')) {
    openPrivacyModal();
  } else if (path.startsWith('/unsubscribe')) {
    openUnsubscribeModal();
  } else if (path.startsWith('/admin')) {
    if (isAdminLoggedIn) {
      openAdminPanel();
    } else {
      openLoginModal();
    }
  } else if (path === '/' || path === '') {
    const target = document.getElementById('home');
    if (target) target.scrollIntoView({ behavior: scrollBehavior });
  }
}
