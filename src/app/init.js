import { setupScrollReveal } from '../shared/scroll-animations.js';
import { setLang, getCurrentLanguage } from '../shared/i18n.js';
import { toggleMaintenanceOverlay } from '../shared/maintenance.js';
import { setupRouting, handleRoute } from '../shared/router.js';
import { initProductGrid, setProductsList, renderCatalog } from '../features/catalog/product-grid.js';
import { bindCartEvents, updateCartBadge } from '../features/cart/cart-drawer.js';
import { setupCheckoutForm } from '../features/cart/checkout.js';
import { loadWishlist, updateWishlistUI } from '../features/favorites/favorites-drawer.js';
import { updateHeroVideoElement } from '../features/hero/hero.js';
import { initPreloader, hidePreloader } from '../features/hero/preloader.js';
import { updateBrandImages } from '../features/brand/brand-story.js';
import { initCountdown } from '../features/drop/countdown.js';
import { setupNewsletterModal } from '../features/newsletter/newsletter-modal.js';
import { setupPrivacyAndUnsubscribe } from '../features/newsletter/privacy-unsubscribe.js';
import { initAdminPanel, openLoginModal, openAdminPanel, setupMaintenanceButton } from '../features/admin/admin-init.js';
import { subscribeProducts } from '../services/product-service.js';
import { subscribeGlobalSettings } from '../services/settings-service.js';
import { subscribeAuthState } from '../services/auth-service.js';
import { subscribeDropSettings } from '../services/settings-service.js';

function updateNavLayout() {
  const isMobile = window.innerWidth <= 900;
  const mobileActions = document.querySelector('.nav-mobile-actions');
  const desktopLinks = document.querySelector('.nav-links');
  
  if (mobileActions) mobileActions.style.display = isMobile ? 'flex' : 'none';
  if (desktopLinks) desktopLinks.style.display = isMobile ? 'none' : 'flex';
  
  if (!isMobile && window.closeDrawer) {
    window.closeDrawer();
  }
}

export function initApp() {
  document.addEventListener('DOMContentLoaded', () => {
    // Make language setter available globally
    window.setLang = setLang;
    
    // Initialize components
    bindCartEvents();
    setupCheckoutForm();
    if (typeof setupNewsletterModal === 'function') setupNewsletterModal();
    if (typeof setupPrivacyAndUnsubscribe === 'function') setupPrivacyAndUnsubscribe();
    if (typeof initPreloader === 'function') initPreloader();
    setupScrollReveal();
    setupRouting();
    initAdminPanel();
    loadWishlist();

    let isMaintenanceActive = false;
    let isAdminLoggedIn = false;

    // Subscriptions
    subscribeAuthState((user) => {
      isAdminLoggedIn = !!user;
      toggleMaintenanceOverlay(isMaintenanceActive, isAdminLoggedIn);

      if (window.location.pathname.startsWith('/admin')) {
        if (isAdminLoggedIn) {
          const modal = document.getElementById('login-modal');
          if (modal) modal.classList.remove('open');
          openAdminPanel();
        } else {
          openLoginModal();
        }
      }
    });

    subscribeGlobalSettings((settings) => {
      isMaintenanceActive = settings.maintenanceMode || false;
      setupMaintenanceButton(isMaintenanceActive);
      toggleMaintenanceOverlay(isMaintenanceActive, isAdminLoggedIn);

      if (settings.heroVideoUrl !== undefined) {
        updateHeroVideoElement(settings.heroVideoUrl || '');
      }

      updateBrandImages(settings);
    });

    subscribeProducts((products) => {
      setProductsList(products);
      renderCatalog();
      if (typeof initProductGrid === 'function') {
        initProductGrid();
      }
      updateWishlistUI();
      if (typeof hidePreloader === 'function') {
        hidePreloader();
      }
    });

    let latestDropSettings = null;

    subscribeDropSettings((settings) => {
      latestDropSettings = settings;
      if (typeof initCountdown === 'function') {
        initCountdown(settings, getCurrentLanguage());
      }
    });

    window.addEventListener('language-changed', (e) => {
      if (latestDropSettings && typeof initCountdown === 'function') {
        initCountdown(latestDropSettings, e.detail || getCurrentLanguage());
      }
    });

    // Responsive navbar updater
    updateNavLayout();
    window.addEventListener('resize', updateNavLayout);

    // Route initial path on load
    if (typeof handleRoute === 'function') {
      handleRoute(window.location.pathname, false);
    }

    // Trigger welcome newsletter modal after 4 seconds (only on customer pages, not on /admin)
    setTimeout(() => {
      const isSubscribed = localStorage.getItem('babushka_olga_subscribed_newsletter') === 'true';
      const isDismissed = sessionStorage.getItem('babushka_olga_dismissed_newsletter') === 'true';
      const newsletterOverlay = document.getElementById('newsletter-modal-overlay');
      const isAdminRoute = window.location.pathname.startsWith('/admin') || document.getElementById('admin-panel')?.classList.contains('open');
      
      if (!isSubscribed && !isDismissed && newsletterOverlay && !isAdminRoute) {
        if (typeof window.openNewsletterModal === 'function') {
          window.openNewsletterModal();
        }
      }
    }, 4000);
  });
}
