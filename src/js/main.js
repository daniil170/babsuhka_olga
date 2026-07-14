import { 
  subscribeProducts, subscribeAuthState, 
  createOrder, subscribeDropSettings, addSubscriber,
  subscribeGlobalSettings
} from './firebase.js';
import { 
  getCart, addToCart, removeFromCart, updateQuantity, 
  clearCart, getCartTotal, getCartCount 
} from './cart.js';
import { initAdminPanel, setupMaintenanceButton, openLoginModal, openAdminPanel } from './admin.js';
import { getOptimizedImageUrl, getOptimizedVideoUrl } from './cloudinary.js';

// Application State
let currentLanguage = localStorage.getItem('babushka_olga_lang') || 'ru';
let currentCategoryFilter = 'all';
let currentSelectedModalProduct = null;
let activeModalMediaIndex = 0; // 0, 1, 2 = photos; 3 = video
let productsList = [];
let isMaintenanceActive = false;
let isAdminLoggedIn = false;
let wishlist = [];
let countdownInterval = null;

// DOM Elements cache
let dom = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheDomElements();
  bindCartEvents();
  setupUIEventListeners();
  
  // Initialize Admin Panel Dashboard
  initAdminPanel();

  // Initialize client-side routing
  setupRouting();

  // Load wishlist
  loadWishlist();

  // ── 1. REAL-TIME SUBSCRIPTIONS ──

  // Subscribe to Authentication State
  subscribeAuthState((user) => {
    isAdminLoggedIn = !!user;
    // Check if maintenance screen should toggle
    toggleMaintenanceOverlay();

    // Auto-open panel if logged in admin is visiting /admin
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

  // Subscribe to Global Settings
  subscribeGlobalSettings((settings) => {
    isMaintenanceActive = settings.maintenanceMode || false;
    setupMaintenanceButton(isMaintenanceActive);
    toggleMaintenanceOverlay();

    if (settings.heroVideoUrl !== undefined) {
      updateHeroVideoElement(settings.heroVideoUrl || '');
    }

    // Update Hero Logo dynamically
    const logoEl = document.querySelector('.hero-logo-img');
    if (logoEl) {
      logoEl.src = settings.logoHeroImageUrl 
        ? getOptimizedImageUrl(settings.logoHeroImageUrl, 300) 
        : '/logo_hero.png';
    }

    // Update Brand Story image dynamically
    const storyEl = document.querySelector('.story-img');
    if (storyEl) {
      storyEl.src = settings.brandStoryImageUrl 
        ? getOptimizedImageUrl(settings.brandStoryImageUrl, 800) 
        : '/brand_story.png';
    }
  });

  // Subscribe to Products catalog
  subscribeProducts((products) => {
    productsList = products;
    renderCatalog();
    renderArchiveCatalog();
    // Re-render open modal if product details changed in DB
    if (currentSelectedModalProduct) {
      const updatedP = productsList.find(x => x.id === currentSelectedModalProduct.id);
      if (updatedP) openModal(updatedP);
    }
    // Update wishlist items if display details changed
    updateWishlistUI();
    // Fade out preloader screen once products loaded
    hidePreloader();
  });

  // Subscribe to Drop Settings
  subscribeDropSettings((settings) => {
    const section = document.getElementById('drop-countdown-section');
    if (!section) return;
    if (settings && settings.active) {
      const targetTime = new Date(settings.date).getTime();
      if (!isNaN(targetTime) && targetTime > Date.now()) {
        section.style.display = 'block';
        const titleEl = document.getElementById('drop-countdown-title');
        if (titleEl) {
          titleEl.textContent = settings.title[currentLanguage] || settings.title.ru || '';
        }
        startCountdown(settings.date);
      } else {
        section.style.display = 'none';
        if (countdownInterval) clearInterval(countdownInterval);
      }
    } else {
      section.style.display = 'none';
      if (countdownInterval) clearInterval(countdownInterval);
    }
  });

  // Subscribe Form Handler
  const subscribeForm = document.getElementById('drop-subscribe-form');
  if (subscribeForm) {
    subscribeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('subscribe-email');
      const email = emailInput ? emailInput.value.trim() : '';
      if (!email) return;
      try {
        await addSubscriber(email);
        localStorage.setItem('babushka_olga_subscribed_newsletter', 'true');
        window.showToast(
          currentLanguage === 'ru'
            ? 'Вы успешно подписались! Приветственная скидка 5000 ₸ активирована! 🤍'
            : 'You have successfully subscribed! Welcome discount of 5,000 ₸ is activated! 🤍'
        );
        if (emailInput) emailInput.value = '';
        renderCartDrawer(); // refresh cart drawer
      } catch (err) {
        console.error(err);
        window.showToast(currentLanguage === 'ru' ? 'Ошибка подписки' : 'Subscription error');
      }
    });
  }

  // Scroll reveal setup
  setupScrollReveal();

  // Responsive navbar updater
  updateNavLayout();
  window.addEventListener('resize', updateNavLayout);

  // Route initial path on load
  handleRoute(window.location.pathname, false);

  // Trigger welcome newsletter modal after 4 seconds
  setTimeout(() => {
    const isSubscribed = localStorage.getItem('babushka_olga_subscribed_newsletter') === 'true';
    const isDismissed = sessionStorage.getItem('babushka_olga_dismissed_newsletter') === 'true';
    if (!isSubscribed && !isDismissed && dom.newsletterOverlay) {
      window.openNewsletterModal();
    }
  }, 4000);
});

function cacheDomElements() {
  dom = {
    // Navigation
    desktopLinks: document.querySelector('.nav-links'),
    mobileActions: document.querySelector('.nav-mobile-actions'),
    burger: document.getElementById('burger'),
    mobileDrawer: document.getElementById('mobile-drawer'),
    cartBadge: document.getElementById('cart-badge'),
    
    // Storefront Catalog
    productsGrid: document.getElementById('products-grid'),
    archiveGrid: document.getElementById('archive-grid'),
    
    // Cart Drawer
    cartOverlay: document.getElementById('cart-overlay'),
    cartDrawer: document.getElementById('cart-drawer'),
    cartItemsContainer: document.getElementById('cart-items-container'),
    cartSummaryValue: document.getElementById('cart-summary-value'),
    cartCloseBtn: document.getElementById('cart-close-btn'),
    checkoutBtn: document.getElementById('cart-checkout-btn'),
    
    // Favorites Drawer
    favoritesOverlay: document.getElementById('favorites-overlay'),
    favoritesDrawer: document.getElementById('favorites-drawer'),
    favoritesItemsContainer: document.getElementById('favorites-items-container'),
    favBadgeCount: document.getElementById('fav-badge-count'),
    favBadgeCountMobile: document.getElementById('fav-badge-count-mobile'),
    
    // Checkout Modal
    checkoutOverlay: document.getElementById('checkout-modal-overlay'),
    checkoutForm: document.getElementById('checkout-form'),
    checkoutName: document.getElementById('checkout-name'),
    checkoutPhone: document.getElementById('checkout-phone'),
    
    // Product Detail Modal
    productModal: document.getElementById('product-modal'),
    modalTag: document.getElementById('modal-tag'),
    modalName: document.getElementById('modal-name'),
    modalMaterial: document.getElementById('modal-material'),
    modalPrice: document.getElementById('modal-price'),
    modalSizesLabel: document.getElementById('modal-size-label'),
    modalSizesContainer: document.getElementById('modal-sizes'),
    modalDesc: document.getElementById('modal-desc'),
    modalBuyBtn: document.getElementById('modal-buy-btn'),
    modalImageMain: document.getElementById('modal-img-main'),
    modalThumbsContainer: document.getElementById('modal-thumbs'),
    
    // Maintenance Overlay
    maintenanceOverlay: document.getElementById('maintenance-overlay'),
    
    // Preloader Overlay
    preloader: document.getElementById('preloader'),
    
    // Size Selection Modal
    sizeOverlay: document.getElementById('size-modal-overlay'),
    sizeModalProductName: document.getElementById('size-modal-product-name'),
    sizeModalSizesContainer: document.getElementById('size-modal-sizes-container'),
    sizeModalConfirmBtn: document.getElementById('size-modal-confirm-btn'),
    
    // Bottom Widgets
    bottomWidgets: document.querySelector('.bottom-widgets'),

    // Newsletter Modal
    newsletterOverlay: document.getElementById('newsletter-modal-overlay'),
    newsletterForm: document.getElementById('newsletter-modal-form'),
    newsletterEmail: document.getElementById('newsletter-modal-email'),

    // Toast
    toast: document.getElementById('toast')
  };
}

function setupUIEventListeners() {
  // Lang buttons Russian/English
  window.setLang = (lang) => {
    currentLanguage = lang;
    document.querySelectorAll('.lang-btn').forEach(b => {
      const label = b.textContent.trim().toLowerCase();
      b.classList.toggle('active', label === lang);
    });
    
    // Update translations
    document.querySelectorAll('[data-ru]').forEach(el => {
      const text = el.getAttribute('data-' + lang);
      if (text) el.innerHTML = text;
    });

    // Update placeholders
    document.querySelectorAll('[data-placeholder-ru]').forEach(el => {
      const placeholderText = el.getAttribute('data-placeholder-' + lang);
      if (placeholderText) el.setAttribute('placeholder', placeholderText);
    });
    
    // Save selection
    localStorage.setItem('babushka_olga_lang', lang);
    
    // Renders
    renderCatalog();
    renderArchiveCatalog();
    if (currentSelectedModalProduct) openModal(currentSelectedModalProduct);
    renderCartDrawer();
    renderFavoritesDrawer();
  };

  // Products grid filter buttons (All, Available, Low Stock, Sold)
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategoryFilter = btn.getAttribute('data-filter');
      renderCatalog();
    });
  });

  // Cart Drawer open/close
  window.toggleCart = (state = null) => {
    const isCurrentlyOpen = dom.cartDrawer.classList.contains('open');
    const nextState = state !== null ? state : !isCurrentlyOpen;
    
    dom.cartDrawer.classList.toggle('open', nextState);
    dom.cartOverlay.classList.toggle('open', nextState);
    if (nextState) renderCartDrawer();
    if (dom.bottomWidgets) dom.bottomWidgets.classList.toggle('hidden', nextState);
  };
  
  if (dom.cartCloseBtn) dom.cartCloseBtn.onclick = () => toggleCart(false);
  if (dom.cartOverlay) dom.cartOverlay.onclick = () => toggleCart(false);

  // Favorites Drawer open/close
  window.toggleFavorites = (state = null) => {
    const isCurrentlyOpen = dom.favoritesDrawer.classList.contains('open');
    const nextState = state !== null ? state : !isCurrentlyOpen;
    
    dom.favoritesDrawer.classList.toggle('open', nextState);
    dom.favoritesOverlay.classList.toggle('open', nextState);
    if (nextState) renderFavoritesDrawer();
    if (dom.bottomWidgets) dom.bottomWidgets.classList.toggle('hidden', nextState);
  };
  
  const favCloseBtn = document.getElementById('favorites-close-btn');
  if (favCloseBtn) favCloseBtn.onclick = () => toggleFavorites(false);
  if (dom.favoritesOverlay) dom.favoritesOverlay.onclick = () => toggleFavorites(false);

  // Checkout Modal
  window.openCheckoutModal = () => {
    if (getCart().length === 0) return;
    toggleCart(false);
    if (dom.checkoutOverlay) dom.checkoutOverlay.classList.add('open');
    if (dom.bottomWidgets) dom.bottomWidgets.classList.add('hidden');
  };
  window.closeCheckoutModal = () => {
    if (dom.checkoutOverlay) dom.checkoutOverlay.classList.remove('open');
    if (dom.checkoutForm) dom.checkoutForm.reset();
    if (dom.bottomWidgets) dom.bottomWidgets.classList.remove('hidden');
  };

  // Checkout submission
  if (dom.checkoutForm) {
    dom.checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = dom.checkoutName.value.trim();
      const phone = dom.checkoutPhone.value.trim();
      
      if (!name || !phone) {
        showToast(currentLanguage === 'ru' ? 'Заполните все поля' : 'Please fill in all fields');
        return;
      }

      try {
        const cartItems = getCart();
        const cartTotal = getCartTotal();
        const qualifyingTotal = getQualifyingTotal(cartItems);
        const isSubscribed = localStorage.getItem('babushka_olga_subscribed_newsletter') === 'true';
        const isDiscountUsed = localStorage.getItem('babushka_olga_welcome_discount_used') === 'true';
        const discountApplies = isSubscribed && !isDiscountUsed && qualifyingTotal >= 35000;
        
        const finalTotal = discountApplies ? cartTotal - 5000 : cartTotal;
        const discountAmount = discountApplies ? 5000 : 0;
        
        await createOrder(name, phone, cartItems, finalTotal, discountAmount);
        
        if (discountApplies) {
          localStorage.setItem('babushka_olga_welcome_discount_used', 'true');
        }
        
        showToast(
          currentLanguage === 'ru' 
            ? 'Заказ успешно оформлен! Мы свяжемся с вами в ближайшее время.' 
            : 'Order placed successfully! We will contact you soon.'
        );
        
        clearCart();
        closeCheckoutModal();
      } catch (err) {
        console.error(err);
        showToast(currentLanguage === 'ru' ? 'Ошибка оформления заказа' : 'Error placing order');
      }
    });
  }

  // Toast helper globalized
  window.showToast = (msg) => {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.classList.add('show');
    setTimeout(() => dom.toast.classList.remove('show'), 3000);
  };

  // Backdrop overlay click closures
  if (dom.checkoutOverlay) {
    dom.checkoutOverlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) window.closeCheckoutModal();
    });
  }
  if (dom.sizeOverlay) {
    dom.sizeOverlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) window.closeSizeModal();
    });
  }
  if (dom.productModal) {
    dom.productModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) window.closeModal();
    });
  }

  // Welcome Newsletter Modal
  window.openNewsletterModal = () => {
    if (dom.newsletterOverlay) {
      dom.newsletterOverlay.classList.add('open');
      if (dom.bottomWidgets) dom.bottomWidgets.classList.add('hidden');
    }
  };

  window.closeNewsletterModal = () => {
    if (dom.newsletterOverlay) {
      dom.newsletterOverlay.classList.remove('open');
      sessionStorage.setItem('babushka_olga_dismissed_newsletter', 'true');
      if (dom.bottomWidgets) dom.bottomWidgets.classList.remove('hidden');
    }
  };

  if (dom.newsletterOverlay) {
    dom.newsletterOverlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) window.closeNewsletterModal();
    });
  }

  if (dom.newsletterForm) {
    dom.newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = dom.newsletterEmail.value.trim();
      if (!email) return;

      try {
        await addSubscriber(email);
        localStorage.setItem('babushka_olga_subscribed_newsletter', 'true');
        window.showToast(
          currentLanguage === 'ru'
            ? 'Спасибо за подписку! Приветственная скидка 5000 ₸ активирована.'
            : 'Thank you for subscribing! Welcome discount of 5,000 ₸ is activated.'
        );
        dom.newsletterOverlay.classList.remove('open');
        if (dom.bottomWidgets) dom.bottomWidgets.classList.remove('hidden');
        renderCartDrawer(); // refresh cart breakdown
      } catch (err) {
        console.error('Newsletter subscription error:', err);
        window.showToast(
          currentLanguage === 'ru' ? 'Ошибка подписки' : 'Subscription error'
        );
      }
    });
  }
}

// ── 2. CATALOG RENDERERS ──

function renderCatalog() {
  if (!dom.productsGrid) return;

  const filtered = productsList.filter(p => {
    if (p.status === 'sold') return false;
    if (currentCategoryFilter === 'all') return true;
    if (currentCategoryFilter === 'sale') return p.oldPrice && p.oldPrice > p.price;
    return p.status === currentCategoryFilter;
  });

  dom.productsGrid.innerHTML = filtered.map(p => {
    const name = p.name[currentLanguage] || p.name.ru;
    const material = p.material[currentLanguage] || p.material.ru;
    const isSold = p.status === 'sold';
    
    // Status text translation
    const statusLabel = {
      available: '', 
      low: currentLanguage === 'ru' ? 'Заканчивается' : 'Low Stock', 
      sold: currentLanguage === 'ru' ? 'Продано' : 'Sold'
    }[p.status];
    const statusClass = { available: '', low: 'status-low', sold: 'status-sold' }[p.status];

    // Carousel Image layout
    const imagesArray = p.images && p.images.length > 0 ? p.images.filter(Boolean) : [];
    const displayArray = imagesArray.length > 0 ? imagesArray : ['']; // at least one slot for placeholder

    const imagesHtml = displayArray.map((img, i) => {
      const hasRealImg = img && img.startsWith('http');
      const imgStyle = `background: var(--beige-mid); opacity: ${i === 0 ? '1' : '0'}; position: absolute; inset: 0; transition: opacity 0.4s; display: flex; align-items: center; justify-content: center;`;
      
      if (hasRealImg) {
        // Optimize delivery via Cloudinary helper
        const optimizedUrl = getOptimizedImageUrl(img, 400);
        return `<img class="product-card-img ${i === 0 ? 'active' : ''}" style="${imgStyle} object-fit: cover;" src="${optimizedUrl}" data-index="${i}" />`;
      } else {
        return `<div class="product-img-placeholder" style="${imgStyle}" data-index="${i}">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.35; color: var(--brown);">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>`;
      }
    }).join('');

    // Carousel indicator dots
    const dotsHtml = displayArray.map((_, i) => `
      <button class="product-img-dot ${i === 0 ? 'active' : ''}" onclick="event.stopPropagation(); window.changeCardImageState('${p.id}', ${i})"></button>
    `).join('');

    // Sizes chips (compact)
    const sizesHtml = (p.sizes || []).map(s => `<div class="size-chip">${s}</div>`).join('');
    const priceText = p.price.toLocaleString('ru-RU');
    const priceHtml = p.oldPrice && p.oldPrice > p.price
      ? `<div class="product-card-price"><span class="price-old">${p.oldPrice.toLocaleString('ru-RU')} ₸</span>${priceText} <span>₸</span></div>`
      : `<div class="product-card-price">${priceText} <span>₸</span></div>`;
    const buyButtonLabel = isSold 
      ? (currentLanguage === 'ru' ? 'Продано' : 'Sold')
      : (currentLanguage === 'ru' ? 'Купить' : 'Buy');

    return `
      <div class="product-card ${isSold ? 'sold' : ''}" id="card-${p.id}" onclick="window.openProductDetail('${p.id}')">
        <div class="product-card-images" style="background: var(--beige-mid)">
          ${imagesHtml}
          <button class="btn-favorite ${wishlist.includes(p.id) ? 'active' : ''}" data-id="${p.id}" onclick="event.stopPropagation(); window.toggleFavoriteClick('${p.id}')" title="Favorites">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
          ${statusLabel ? `<div class="product-status ${statusClass}">${statusLabel}</div>` : ''}
          ${displayArray.length > 1 ? `<div class="product-img-dots">${dotsHtml}</div>` : ''}
        </div>
        <div class="product-card-body">
          <div class="product-card-name">${name}</div>
          <div class="product-card-material">${material}</div>
          <div class="product-card-sizes">${sizesHtml}</div>
          <div class="product-card-footer">
            ${priceHtml}
            <button class="btn-buy" onclick="event.stopPropagation(); window.buyProductClick('${p.id}')" ${isSold ? 'disabled' : ''}>
              ${buyButtonLabel}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('') || `<p style="grid-column: 1/-1; text-align: center; color: var(--sold); padding: 48px 0; font-style: italic">${currentLanguage === 'ru' ? 'Нет товаров' : 'No items found'}</p>`;
}

// Global hook to toggle visible card image in carousel
window.changeCardImageState = (id, index) => {
  const card = document.getElementById('card-' + id);
  if (!card) return;
  const imgs = card.querySelectorAll('.product-card-img, .product-img-placeholder');
  const dots = card.querySelectorAll('.product-img-dot');
  imgs.forEach((img, i) => img.style.opacity = i === index ? '1' : '0');
  dots.forEach((d, i) => d.classList.toggle('active', i === index));
};

window.contactForProduct = (id) => {
  const p = productsList.find(x => x.id === id);
  if (!p) return;
  const name = p.name[currentLanguage] || p.name.ru;
  const waText = currentLanguage === 'ru'
    ? encodeURIComponent(`Здравствуйте! Я увидел в архиве товар «${name}» и хочу заказать такой же.`)
    : encodeURIComponent(`Hello! I saw the item "${name}" in the archive and want to order a similar one.`);
  window.open(`https://wa.me/77012345678?text=${waText}`, '_blank');
};

function renderArchiveCatalog() {
  if (!dom.archiveGrid) return;

  const soldProducts = productsList.filter(p => p.status === 'sold');
  
  dom.archiveGrid.innerHTML = soldProducts.map(p => {
    const name = p.name[currentLanguage] || p.name.ru;
    const material = p.material[currentLanguage] || p.material.ru;
    
    // Status text translation
    const statusLabel = currentLanguage === 'ru' ? 'Продано' : 'Sold';
    const statusClass = 'status-sold';

    // Carousel Image layout
    const imagesArray = p.images && p.images.length > 0 ? p.images.filter(Boolean) : [];
    const displayArray = imagesArray.length > 0 ? imagesArray : ['']; // at least one slot for placeholder

    const imagesHtml = displayArray.map((img, i) => {
      const hasRealImg = img && img.startsWith('http');
      const imgStyle = `background: var(--beige-mid); opacity: ${i === 0 ? '1' : '0'}; position: absolute; inset: 0; transition: opacity 0.4s; display: flex; align-items: center; justify-content: center;`;
      
      if (hasRealImg) {
        const optimizedUrl = getOptimizedImageUrl(img, 400);
        return `<img class="product-card-img ${i === 0 ? 'active' : ''}" style="${imgStyle} object-fit: cover;" src="${optimizedUrl}" data-index="${i}" />`;
      } else {
        return `<div class="product-img-placeholder" style="${imgStyle}" data-index="${i}">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.35; color: var(--brown);">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>`;
      }
    }).join('');

    // Carousel indicator dots
    const dotsHtml = displayArray.map((_, i) => `
      <button class="product-img-dot ${i === 0 ? 'active' : ''}" onclick="event.stopPropagation(); window.changeCardImageState('${p.id}', ${i})"></button>
    `).join('');

    const priceText = p.price.toLocaleString('ru-RU');

    return `
      <div class="product-card" id="card-${p.id}" onclick="window.openProductDetail('${p.id}')">
        <div class="product-card-images" style="background: var(--beige-mid)">
          ${imagesHtml}
          <button class="btn-favorite ${wishlist.includes(p.id) ? 'active' : ''}" data-id="${p.id}" onclick="event.stopPropagation(); window.toggleFavoriteClick('${p.id}')" title="Favorites">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
          <div class="product-status ${statusClass}">${statusLabel}</div>
          ${displayArray.length > 1 ? `<div class="product-img-dots">${dotsHtml}</div>` : ''}
        </div>
        <div class="product-card-body">
          <div class="product-card-name">${name}</div>
          <div class="product-card-material">${material}</div>
          <div class="product-card-footer">
            <div class="product-card-price">${priceText} <span>₸</span></div>
            <button class="btn-buy" onclick="event.stopPropagation(); window.contactForProduct('${p.id}')">
              ${currentLanguage === 'ru' ? 'Хочу такой же' : 'Order Similar'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('') || `<p style="grid-column: 1/-1; color: var(--sold); font-style: italic; text-align: center; width: 100%;">${currentLanguage === 'ru' ? 'Архив пуст' : 'Archive is empty'}</p>`;
}

// ── 3. PRODUCT DETAIL MODAL ──

window.openProductDetail = (id) => {
  const p = productsList.find(x => x.id === id);
  if (!p) return;
  currentSelectedModalProduct = p;
  activeModalMediaIndex = 0;
  
  openModal(p);
};

function openModal(p) {
  dom.modalTag.textContent = currentLanguage === 'ru' ? 'Бабушка Ольга · Ручная работа' : 'Grandma Olga · Handmade';
  dom.modalName.textContent = p.name[currentLanguage] || p.name.ru;
  dom.modalMaterial.textContent = p.material[currentLanguage] || p.material.ru;
  dom.modalPrice.innerHTML = `${p.price.toLocaleString('ru-RU')} <span>₸</span>`;
  dom.modalDesc.textContent = p.desc[currentLanguage] || p.desc.ru || '';
  
  // Render main media container
  renderModalMedia(p);

  // Render thumbnails (up to 3 photos)
  const validImages = (p.images || []).filter(img => img && img.startsWith('http'));
  let thumbsHtml = validImages.map((img, i) => {
    const bgStyle = `background-image: url(${getOptimizedImageUrl(img, 100)})`;
    return `
      <div class="modal-thumb ${i === 0 ? 'active' : ''}" onclick="window.setModalMediaIndex(${i})" style="background-color: var(--beige-mid); ${bgStyle}">
      </div>
    `;
  }).join('');

  dom.modalThumbsContainer.innerHTML = thumbsHtml;

  // Render sizes and buy button conditionally
  if (p.status === 'sold') {
    if (dom.modalSizesLabel) dom.modalSizesLabel.style.display = 'none';
    if (dom.modalSizesContainer) dom.modalSizesContainer.style.display = 'none';
    
    dom.modalBuyBtn.textContent = currentLanguage === 'ru' ? 'Хочу такой же' : 'Order Similar';
    dom.modalBuyBtn.onclick = () => {
      window.contactForProduct(p.id);
    };
  } else {
    if (dom.modalSizesLabel) {
      dom.modalSizesLabel.style.display = 'block';
      dom.modalSizesLabel.textContent = currentLanguage === 'ru' ? 'Размер' : 'Size';
    }
    if (dom.modalSizesContainer) {
      dom.modalSizesContainer.style.display = 'flex';
      dom.modalSizesContainer.innerHTML = (p.sizes || []).map((s, i) => `
        <div class="modal-size ${i === 0 ? 'selected' : ''}" onclick="window.selectSizeElement(this)">${s}</div>
      `).join('');
    }
    
    dom.modalBuyBtn.textContent = currentLanguage === 'ru' ? 'Добавить в корзину' : 'Add to Cart';
    dom.modalBuyBtn.onclick = () => {
      const selectedSizeEl = dom.modalSizesContainer.querySelector('.modal-size.selected');
      if (!selectedSizeEl) {
        showToast(currentLanguage === 'ru' ? 'Выберите размер' : 'Select a size');
        return;
      }
      const size = selectedSizeEl.textContent;
      addToCart(p, size);
      showToast(
        currentLanguage === 'ru' 
          ? `«${p.name.ru}» (${size}) добавлен в корзину ✓` 
          : `«${p.name.en}» (${size}) added to cart ✓`
      );
      closeModal();
    };
  }

  dom.productModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderModalMedia(p) {
  const currentIdx = activeModalMediaIndex;
  dom.modalImageMain.innerHTML = '';
  dom.modalImageMain.style.background = 'var(--beige-mid)';

  const validImages = (p.images || []).filter(img => img && img.startsWith('http'));
  const img = validImages[currentIdx] || '';
  if (img && img.startsWith('http')) {
    const optimizedUrl = getOptimizedImageUrl(img, 800);
    dom.modalImageMain.innerHTML = `<img src="${optimizedUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`;
  } else {
    dom.modalImageMain.innerHTML = `<div class="product-img-placeholder" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
      <svg viewBox="0 0 24 24" width="80" height="80" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.35; color: var(--brown);">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    </div>`;
  }
}

window.setModalMediaIndex = (idx) => {
  activeModalMediaIndex = idx;
  if (!currentSelectedModalProduct) return;
  renderModalMedia(currentSelectedModalProduct);
  
  // Update active thumbnail borders
  const thumbs = dom.modalThumbsContainer.querySelectorAll('.modal-thumb');
  thumbs.forEach((t, i) => t.classList.toggle('active', i === idx));
};

window.selectSizeElement = (el) => {
  dom.modalSizesContainer.querySelectorAll('.modal-size').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
};

window.closeModal = () => {
  if (dom.productModal) dom.productModal.classList.remove('open');
  document.body.style.overflow = '';
  currentSelectedModalProduct = null;
};

function hidePreloader() {
  window.canHidePreloader = true;
  if (window.preloaderAnimationFinished) {
    if (dom.preloader && !dom.preloader.classList.contains('fade-out')) {
      setTimeout(() => {
        dom.preloader.classList.add('fade-out');
      }, 450);
    }
  }
}

let currentSelectedSizeProduct = null;

window.closeSizeModal = () => {
  if (dom.sizeOverlay) dom.sizeOverlay.classList.remove('open');
  currentSelectedSizeProduct = null;
};

window.selectSizeInModal = (el) => {
  dom.sizeModalSizesContainer.querySelectorAll('.modal-size').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
};

// Shortcut helper buy click on card opens Size selection modal
window.buyProductClick = (id) => {
  const p = productsList.find(x => x.id === id);
  if (!p) return;

  if (!p.sizes || p.sizes.length === 0) {
    addToCart(p, 'M');
    window.showToast(
      currentLanguage === 'ru'
        ? `«${p.name.ru}» добавлен в корзину ✓`
        : `«${p.name.en}» added to cart ✓`
    );
    window.toggleCart(true);
    return;
  }

  currentSelectedSizeProduct = p;

  if (dom.sizeModalProductName) {
    dom.sizeModalProductName.textContent = p.name[currentLanguage] || p.name.ru;
  }

  if (dom.sizeModalSizesContainer) {
    dom.sizeModalSizesContainer.innerHTML = p.sizes.map((s, i) => `
      <div class="modal-size ${i === 0 ? 'selected' : ''}" onclick="window.selectSizeInModal(this)">${s}</div>
    `).join('');
  }

  if (dom.sizeModalConfirmBtn) {
    dom.sizeModalConfirmBtn.onclick = () => {
      const selectedEl = dom.sizeModalSizesContainer.querySelector('.modal-size.selected');
      if (!selectedEl) {
        window.showToast(currentLanguage === 'ru' ? 'Выберите размер' : 'Select size');
        return;
      }
      const size = selectedEl.textContent;
      addToCart(p, size);
      window.showToast(
        currentLanguage === 'ru'
          ? `«${p.name.ru}» (${size}) добавлен в корзину ✓`
          : `«${p.name.en}» (${size}) added to cart ✓`
      );
      window.closeSizeModal();
      window.toggleCart(true);
    };
  }

  if (dom.sizeOverlay) dom.sizeOverlay.classList.add('open');
};

// ── 4. SHOPPING CART RENDERERS ──

function bindCartEvents() {
  window.addEventListener('cart-updated', (e) => {
    updateCartBadge();
    if (dom.cartDrawer.classList.contains('open')) {
      renderCartDrawer();
    }
  });
  updateCartBadge();
}

function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll('.cart-badge-count').forEach(el => {
    el.textContent = `(${count})`;
  });
  if (dom.cartBadge) {
    dom.cartBadge.textContent = count;
    dom.cartBadge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function getQualifyingTotal(cartItems) {
  return cartItems.reduce((sum, item) => {
    const product = productsList.find(p => String(p.id) === String(item.productId));
    if (!product) return sum + (item.price * item.quantity);
    
    const isSale = product.oldPrice && product.oldPrice > product.price;
    
    const nameRu = (product.name?.ru || '').toLowerCase();
    const nameEn = (product.name?.en || '').toLowerCase();
    const materialRu = (product.material?.ru || '').toLowerCase();
    const materialEn = (product.material?.en || '').toLowerCase();
    
    const isArtOrUnderwear = 
      nameRu.includes('арт') || nameEn.includes('art') ||
      nameRu.includes('белье') || nameRu.includes('бельё') || nameEn.includes('underwear') || nameEn.includes('lingerie') ||
      materialRu.includes('арт') || materialEn.includes('art') ||
      materialRu.includes('белье') || materialRu.includes('бельё') || materialEn.includes('underwear') || materialEn.includes('lingerie');
      
    if (isSale || isArtOrUnderwear) return sum;
    
    return sum + (item.price * item.quantity);
  }, 0);
}

function renderCartDrawer() {
  if (!dom.cartItemsContainer) return;
  const items = getCart();
  
  if (items.length === 0) {
    dom.cartItemsContainer.innerHTML = `<p class="cart-empty">${currentLanguage === 'ru' ? 'Ваша корзина пуста' : 'Your cart is empty'}</p>`;
    dom.cartSummaryValue.innerHTML = `0 <span>₸</span>`;
    dom.checkoutBtn.style.display = 'none';
    return;
  }

  dom.checkoutBtn.style.display = 'block';

  const cartTotal = getCartTotal();
  const qualifyingTotal = getQualifyingTotal(items);
  const isSubscribed = localStorage.getItem('babushka_olga_subscribed_newsletter') === 'true';
  const isDiscountUsed = localStorage.getItem('babushka_olga_welcome_discount_used') === 'true';
  const discountApplies = isSubscribed && !isDiscountUsed && qualifyingTotal >= 35000;
  
  let priceDetailsHtml = '';
  if (discountApplies) {
    const finalTotal = cartTotal - 5000;
    priceDetailsHtml = `
      <div class="cart-price-breakdown" style="font-size: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-bottom: 8px;">
        <span style="color: var(--brown);">${currentLanguage === 'ru' ? 'Сумма:' : 'Subtotal:'} ${cartTotal.toLocaleString('ru-RU')} ₸</span>
        <span style="color: #27ae60; font-weight: 500;">${currentLanguage === 'ru' ? 'Приветственная скидка:' : 'Welcome Discount:'} -5 000 ₸</span>
      </div>
      ${finalTotal.toLocaleString('ru-RU')} <span>₸</span>
    `;
  } else {
    priceDetailsHtml = `${cartTotal.toLocaleString('ru-RU')} <span>₸</span>`;
  }

  dom.cartSummaryValue.innerHTML = priceDetailsHtml;

  // Render discount hint text
  let eligibilityMessage = '';
  if (isSubscribed && !isDiscountUsed) {
    if (qualifyingTotal < 35000) {
      eligibilityMessage = currentLanguage === 'ru'
        ? `<div class="discount-hint" style="font-size: 11px; color: var(--sold); text-align: center; margin-top: 12px; line-height: 1.4; width: 100%;">Добавьте еще ${(35000 - qualifyingTotal).toLocaleString('ru-RU')} ₸ подходящих товаров для скидки 5 000 ₸</div>`
        : `<div class="discount-hint" style="font-size: 11px; color: var(--sold); text-align: center; margin-top: 12px; line-height: 1.4; width: 100%;">Add ${(35000 - qualifyingTotal).toLocaleString('ru-RU')} ₸ more of qualifying items to get a 5,000 ₸ discount</div>`;
    } else {
      eligibilityMessage = currentLanguage === 'ru'
        ? `<div class="discount-hint" style="font-size: 11px; color: #27ae60; text-align: center; margin-top: 12px; line-height: 1.4; font-weight: 500; width: 100%;">Приветственная скидка 5 000 ₸ успешно применена! 🎉</div>`
        : `<div class="discount-hint" style="font-size: 11px; color: #27ae60; text-align: center; margin-top: 12px; line-height: 1.4; font-weight: 500; width: 100%;">Welcome discount of 5,000 ₸ applied! 🎉</div>`;
    }
  } else if (!isSubscribed) {
    eligibilityMessage = currentLanguage === 'ru'
      ? `<div class="discount-hint" style="font-size: 11px; color: var(--beige-accent); text-align: center; margin-top: 12px; line-height: 1.4; cursor: pointer; text-decoration: underline; width: 100%;" onclick="window.openNewsletterModal()">Подпишитесь, чтобы получить скидку 5 000 ₸ на первый заказ!</div>`
      : `<div class="discount-hint" style="font-size: 11px; color: var(--beige-accent); text-align: center; margin-top: 12px; line-height: 1.4; cursor: pointer; text-decoration: underline; width: 100%;" onclick="window.openNewsletterModal()">Subscribe to get a 5,000 ₸ discount on your first order!</div>`;
  }

  const existingHint = dom.cartDrawer.querySelector('.discount-hint');
  if (existingHint) existingHint.remove();
  if (eligibilityMessage) {
    dom.checkoutBtn.insertAdjacentHTML('beforebegin', eligibilityMessage);
  }
  
  dom.cartItemsContainer.innerHTML = items.map(item => {
    const hasMedia = item.image && item.image.startsWith('http');
    const mediaHtml = hasMedia 
      ? `<img src="${getOptimizedImageUrl(item.image, 100)}" style="width:100%;height:100%;object-fit:cover" />`
      : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.35; color: var(--brown);">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>`;

    return `
      <div class="cart-item">
        <div class="cart-item-media" style="background: var(--beige-mid)">
          ${mediaHtml}
        </div>
        <div class="cart-item-details">
          <div>
            <div class="cart-item-name">${item.name[currentLanguage] || item.name.ru}</div>
            <div class="cart-item-meta">${currentLanguage === 'ru' ? 'Размер' : 'Size'}: ${item.size}</div>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="window.changeItemQty('${item.productId}', '${item.size}', -1)">−</button>
            <div class="qty-val">${item.quantity}</div>
            <button class="qty-btn" onclick="window.changeItemQty('${item.productId}', '${item.size}', 1)">+</button>
          </div>
        </div>
        <div class="cart-item-price-actions">
          <div class="cart-item-price">${(item.price * item.quantity).toLocaleString('ru-RU')} ₸</div>
          <button class="cart-item-remove" onclick="window.removeItemFromCart('${item.productId}', '${item.size}')">
            ${currentLanguage === 'ru' ? 'Удалить' : 'Remove'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.changeItemQty = (id, size, change) => {
  updateQuantity(id, size, change);
};

window.removeItemFromCart = (id, size) => {
  removeFromCart(id, size);
};

// ── 5. MAINTENANCE OVERLAY TRIGGER ──

function toggleMaintenanceOverlay() {
  if (!dom.maintenanceOverlay) return;
  
  // Show maintenance overlay if:
  // - Maintenance Mode is active in DB AND
  // - User is NOT authenticated as Admin
  const shouldBlock = isMaintenanceActive && !isAdminLoggedIn;
  dom.maintenanceOverlay.classList.toggle('open', shouldBlock);
}

// ── 6. SCROLL REVEAL ANIMATIONS ──

function setupScrollReveal() {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

// ── 7. MOBILE NAVIGATION ──

window.toggleDrawer = () => {
  const drawerOpen = dom.mobileDrawer.classList.toggle('open');
  dom.burger.classList.toggle('open', drawerOpen);
  document.body.style.overflow = drawerOpen ? 'hidden' : '';
  if (dom.bottomWidgets) {
    dom.bottomWidgets.classList.toggle('hidden', drawerOpen);
  }
};

window.closeDrawer = () => {
  dom.mobileDrawer.classList.remove('open');
  dom.burger.classList.remove('open');
  document.body.style.overflow = '';
  if (dom.bottomWidgets) {
    dom.bottomWidgets.classList.remove('hidden');
  }
};

function updateNavLayout() {
  const isMobile = window.innerWidth <= 900;
  if (dom.mobileActions) dom.mobileActions.style.display = isMobile ? 'flex' : 'none';
  if (dom.desktopLinks) dom.desktopLinks.style.display = isMobile ? 'none' : 'flex';
  if (!isMobile) closeDrawer();
}

function updateHeroVideoElement(url) {
  const heroVideo = document.querySelector('.hero-video');
  const heroFallback = document.querySelector('.hero-fallback');
  if (!heroVideo) return;

  if (url) {
    const optimizedVideoUrl = getOptimizedVideoUrl(url);
    const source = heroVideo.querySelector('source');
    if (source && source.getAttribute('src') === optimizedVideoUrl) {
      return;
    }
    heroVideo.innerHTML = `<source src="${optimizedVideoUrl}" type="video/mp4">`;
    heroVideo.style.display = 'block';
    if (heroFallback) heroFallback.style.display = 'flex'; // show fallback while loading
    heroVideo.load();
    heroVideo.play()
      .then(() => {
        if (heroFallback) heroFallback.style.display = 'none'; // hide fallback only if playing successfully
      })
      .catch(err => {
        console.warn('Hero video autoplay blocked or failed:', err);
        heroVideo.style.display = 'none';
        if (heroFallback) heroFallback.style.display = 'flex'; // keep showing fallback
      });
  } else {
    heroVideo.style.display = 'none';
    heroVideo.innerHTML = '';
    if (heroFallback) heroFallback.style.display = 'flex';
  }
}

// ── 8. WISHLIST / FAVORITES SERVICES ──

function loadWishlist() {
  try {
    const data = localStorage.getItem('babushka_olga_wishlist');
    wishlist = data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load wishlist:', e);
    wishlist = [];
  }
  updateWishlistUI();
}

function saveWishlist() {
  try {
    localStorage.setItem('babushka_olga_wishlist', JSON.stringify(wishlist));
  } catch (e) {
    console.error('Failed to save wishlist:', e);
  }
  updateWishlistUI();
}

function updateWishlistUI() {
  const count = wishlist.length;
  document.querySelectorAll('.fav-badge-count').forEach(el => {
    el.textContent = `(${count})`;
  });
  
  // Highlight active hearts
  document.querySelectorAll('.btn-favorite').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.classList.toggle('active', wishlist.includes(id));
  });

  if (dom.favoritesDrawer && dom.favoritesDrawer.classList.contains('open')) {
    renderFavoritesDrawer();
  }
}

function renderFavoritesDrawer() {
  if (!dom.favoritesItemsContainer) return;
  
  const favItems = productsList.filter(p => wishlist.includes(p.id));
  
  if (favItems.length === 0) {
    dom.favoritesItemsContainer.innerHTML = `<p class="cart-empty">${currentLanguage === 'ru' ? 'Ваш список избранного пуст' : 'Your favorites list is empty'}</p>`;
    return;
  }
  
  dom.favoritesItemsContainer.innerHTML = favItems.map(item => {
    const hasMedia = item.images && item.images[0] && item.images[0].startsWith('http');
    const mediaHtml = hasMedia 
      ? `<img src="${getOptimizedImageUrl(item.images[0], 100)}" style="width:100%;height:100%;object-fit:cover" />`
      : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.35; color: var(--brown);">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>`;
        
    const name = item.name[currentLanguage] || item.name.ru;
    const isSold = item.status === 'sold';
    
    let actionButtonHtml = '';
    if (isSold) {
      actionButtonHtml = `<button class="cart-checkout-btn" style="padding: 6px 12px; font-size: 11px; margin: 0; width: auto;" onclick="window.contactForProduct('${item.id}')">${currentLanguage === 'ru' ? 'Хочу такой же' : 'Order Similar'}</button>`;
    } else {
      actionButtonHtml = `<button class="cart-checkout-btn" style="padding: 6px 12px; font-size: 11px; margin: 0; width: auto;" onclick="window.buyProductClick('${item.id}')">${currentLanguage === 'ru' ? 'Купить' : 'Buy'}</button>`;
    }

    return `
      <div class="cart-item">
        <div class="cart-item-media" style="background: var(--beige-mid)">
          ${mediaHtml}
        </div>
        <div class="cart-item-details">
          <div>
            <div class="cart-item-name">${name}</div>
            <div class="cart-item-price">${item.price.toLocaleString('ru-RU')} ₸</div>
          </div>
        </div>
        <div class="cart-item-price-actions" style="gap: 8px; flex-direction: column; align-items: flex-end; justify-content: center;">
          ${actionButtonHtml}
          <button class="cart-item-remove" onclick="window.toggleFavoriteClick('${item.id}')">
            ${currentLanguage === 'ru' ? 'Удалить' : 'Remove'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleFavoriteClick = (productId) => {
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(productId);
  }
  saveWishlist();
};

// ── 9. CLIENT ROUTER (HISTORY API) ──

function setupRouting() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="/"]');
    if (!link) return;
    
    const href = link.getAttribute('href');
    if (href.startsWith('/#') || link.target === '_blank') return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    
    e.preventDefault();
    history.pushState(null, '', href);
    handleRoute(href, true);
    
    if (dom.mobileDrawer && dom.mobileDrawer.classList.contains('open')) {
      window.closeDrawer();
    }
  });
  
  window.addEventListener('popstate', () => {
    handleRoute(window.location.pathname, true);
  });
}

function handleRoute(path, smooth = true) {
  const scrollBehavior = smooth ? 'smooth' : 'auto';
  
  if (path.startsWith('/catalog')) {
    currentCategoryFilter = 'all';
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-filter') === 'all');
    });
    renderCatalog();
    const target = document.getElementById('products');
    if (target) target.scrollIntoView({ behavior: scrollBehavior });
  } else if (path.startsWith('/sale')) {
    currentCategoryFilter = 'sale';
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-filter') === 'sale');
    });
    renderCatalog();
    const target = document.getElementById('products');
    if (target) target.scrollIntoView({ behavior: scrollBehavior });
  } else if (path.startsWith('/brand')) {
    const target = document.getElementById('brand');
    if (target) target.scrollIntoView({ behavior: scrollBehavior });
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

// ── 10. DROP COUNTDOWN SERVICES ──

function startCountdown(targetDateStr) {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const targetTime = new Date(targetDateStr).getTime();
  
  const updateTimer = () => {
    const now = Date.now();
    const distance = targetTime - now;
    
    if (distance < 0) {
      clearInterval(countdownInterval);
      const section = document.getElementById('drop-countdown-section');
      if (section) section.style.display = 'none';
      return;
    }
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    const pad = (num) => String(num).padStart(2, '0');
    
    const daysEl = document.getElementById('timer-days');
    const hoursEl = document.getElementById('timer-hours');
    const minsEl = document.getElementById('timer-minutes');
    const secsEl = document.getElementById('timer-seconds');
    
    if (daysEl) daysEl.textContent = pad(days);
    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minsEl) minsEl.textContent = pad(minutes);
    if (secsEl) secsEl.textContent = pad(seconds);
  };
  
  updateTimer();
  countdownInterval = setInterval(updateTimer, 1000);
}

