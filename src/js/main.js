// main.js - Application Router & Main Controller

import { initStore, getProducts, getVideoUrl } from './store.js';
import { renderCatalog } from './catalog.js';
import { initAdminPanel, refreshAdminPanel } from './admin.js';

// DOM Elements
const navLinks = document.querySelectorAll('.nav-links li');
const views = {
  storefront: document.getElementById('viewStorefront'),
  archive: document.getElementById('viewArchive'),
  admin: document.getElementById('viewAdmin')
};

const heroVideo = document.getElementById('heroVideoBg');
const heroVideoSource = document.getElementById('heroVideoSource');
const careModal = document.getElementById('careInstructionsModal');

// Application Entry Point
document.addEventListener('DOMContentLoaded', () => {
  // Initialize LocalStorage Data Store
  initStore();

  // Load and play video background
  loadBackgroundVideo();

  // Initialize Admin Panel Dashboard
  initAdminPanel(handleDataChange);

  // Initial Storefront Render
  refreshStorefrontCatalogs();

  // Set up SPA View Router
  initRouter();

  // Set up Header Scroll effect
  initHeaderScroll();

  // Set up Care Instructions Modal
  initCareModal();
});

// Load background video URL from store and apply to element
function loadBackgroundVideo() {
  if (!heroVideo || !heroVideoSource) return;
  const currentVideoUrl = getVideoUrl();
  
  heroVideoSource.src = currentVideoUrl;
  heroVideo.load();
  
  // Autoplay handling for modern browsers
  const playPromise = heroVideo.play();
  if (playPromise !== undefined) {
    playPromise.catch(error => {
      console.log("Auto-play was prevented. Waiting for interaction.", error);
    });
  }
}

// Coordinate storefront view updates on admin data changes
function handleDataChange(type, data) {
  if (type === 'products') {
    refreshStorefrontCatalogs();
  } else if (type === 'video') {
    loadBackgroundVideo();
  }
}

function refreshStorefrontCatalogs() {
  const products = getProducts();
  
  // Render Active catalog
  const storefrontGrid = document.getElementById('productsGrid');
  renderCatalog(storefrontGrid, products, false);

  // Render Archived catalog
  const archiveGrid = document.getElementById('archiveGrid');
  renderCatalog(archiveGrid, products, true);
}

// Router - Single Page Application View Toggling
function initRouter() {
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      
      // Update nav link active state
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Hide all views, show target view
      Object.keys(views).forEach(viewKey => {
        if (views[viewKey]) {
          if (viewKey === targetView) {
            views[viewKey].style.display = 'block';
            
            // Trigger animation or layout refresh if needed
            if (viewKey === 'admin') {
              refreshAdminPanel();
            } else {
              refreshStorefrontCatalogs();
            }
          } else {
            views[viewKey].style.display = 'none';
          }
        }
      });

      // Scroll to top of the page on view switch
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  });

  // Default route (Storefront visible, others hidden)
  if (views.storefront) views.storefront.style.display = 'block';
  if (views.archive) views.archive.style.display = 'none';
  if (views.admin) views.admin.style.display = 'none';
}

// Add styled background to header when page is scrolled down
function initHeaderScroll() {
  const header = document.querySelector('header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// Set up Care Modal: tab switching and backdrop click closing fallback
function initCareModal() {
  if (!careModal) return;

  // 1. Close Button Handler
  const closeBtn = careModal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      careModal.close();
    });
  }

  // 2. Tab switching logic inside modal
  const tabButtons = careModal.querySelectorAll('.modal-tab-btn');
  const tabContents = careModal.querySelectorAll('.modal-tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      // Update active button state
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show matching content tab
      tabContents.forEach(content => {
        if (content.getAttribute('id') === `care-tab-${targetTab}`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });

  // 3. Fallback for older browsers without declarative <dialog closedby> support
  // Closes modal when user clicks on the backdrop overlay
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    careModal.addEventListener('click', (event) => {
      // Ignore click if event target is inside the dialog content
      if (event.target !== careModal) return;

      const rect = careModal.getBoundingClientRect();
      const isClickInsideDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );

      if (isClickInsideDialogContent) return;

      // Close modal manually since click was on the backdrop area
      careModal.close();
    });
  }
}
