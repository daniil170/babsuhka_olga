// Main Storefront Lifecycle & Routing Module
import { 
  subscribeProducts, subscribeMaintenanceMode, subscribeAuthState, 
  createOrder 
} from './firebase.js';
import { 
  getCart, addToCart, removeFromCart, updateQuantity, 
  clearCart, getCartTotal, getCartCount 
} from './cart.js';
import { initAdminPanel, setupMaintenanceButton } from './admin.js';
import { getOptimizedImageUrl, getOptimizedVideoUrl } from './cloudinary.js';

// Application State
let currentLanguage = 'ru';
let currentCategoryFilter = 'all';
let currentSelectedModalProduct = null;
let activeModalMediaIndex = 0; // 0, 1, 2 = photos; 3 = video
let productsList = [];
let isMaintenanceActive = false;
let isAdminLoggedIn = false;

// DOM Elements cache
let dom = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheDomElements();
  bindCartEvents();
  setupUIEventListeners();
  
  // Initialize Admin Panel Dashboard
  initAdminPanel();

  // ── 1. REAL-TIME SUBSCRIPTIONS ──

  // Subscribe to Authentication State
  subscribeAuthState((user) => {
    isAdminLoggedIn = !!user;
    // Check if maintenance screen should toggle
    toggleMaintenanceOverlay();
  });

  // Subscribe to Maintenance Mode state
  subscribeMaintenanceMode((enabled) => {
    isMaintenanceActive = enabled;
    // Notify admin panel control state
    setupMaintenanceButton(enabled);
    // Refresh storefront view blocking
    toggleMaintenanceOverlay();
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
    // Fade out preloader screen once products loaded
    hidePreloader();
  });

  // Scroll reveal setup
  setupScrollReveal();
  
  // Responsive navbar updater
  updateNavLayout();
  window.addEventListener('resize', updateNavLayout);
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
    
    // Update preloader language text
    const loaderRu = document.querySelector('.preloader-text-ru');
    const loaderEn = document.querySelector('.preloader-text-en');
    if (loaderRu && loaderEn) {
      loaderRu.style.display = lang === 'ru' ? 'block' : 'none';
      loaderEn.style.display = lang === 'en' ? 'block' : 'none';
    }
    
    // Renders
    renderCatalog();
    renderArchiveCatalog();
    if (currentSelectedModalProduct) openModal(currentSelectedModalProduct);
    renderCartDrawer();
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
  };
  
  if (dom.cartCloseBtn) dom.cartCloseBtn.onclick = () => toggleCart(false);
  if (dom.cartOverlay) dom.cartOverlay.onclick = () => toggleCart(false);

  // Checkout Modal
  window.openCheckoutModal = () => {
    if (getCart().length === 0) return;
    toggleCart(false);
    if (dom.checkoutOverlay) dom.checkoutOverlay.classList.add('open');
  };
  window.closeCheckoutModal = () => {
    if (dom.checkoutOverlay) dom.checkoutOverlay.classList.remove('open');
    if (dom.checkoutForm) dom.checkoutForm.reset();
  };

  // Checkout submission
  if (dom.checkoutForm) {
    dom.checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = dom.checkoutName.value.trim();
      const phone = dom.checkoutPhone.value.trim();
      
      if (!name || !phone) {
        showToast('Заполните все поля');
        return;
      }

      try {
        const cartItems = getCart();
        const total = getCartTotal();
        await createOrder(name, phone, cartItems, total);
        
        showToast(
          currentLanguage === 'ru' 
            ? 'Заказ успешно оформлен! Мы свяжемся с вами в ближайшее время.' 
            : 'Order placed successfully! We will contact you soon.'
        );
        
        clearCart();
        closeCheckoutModal();
      } catch (err) {
        console.error(err);
        showToast('Ошибка оформления заказа');
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
}

// ── 2. CATALOG RENDERERS ──

function renderCatalog() {
  if (!dom.productsGrid) return;

  const filtered = productsList.filter(p => {
    if (currentCategoryFilter === 'all') return true;
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
    const imagesHtml = (p.images || []).map((img, i) => {
      const hasRealImg = img && img.startsWith('http');
      const imgStyle = `background: ${p.color || '#c4b49e'}; opacity: ${i === 0 ? '1' : '0'}; position: absolute; inset: 0; transition: opacity 0.4s; display: flex; align-items: center; justify-content: center;`;
      
      if (hasRealImg) {
        // Optimize delivery via Cloudinary helper
        const optimizedUrl = getOptimizedImageUrl(img, 400);
        return `<img class="product-card-img ${i === 0 ? 'active' : ''}" style="${imgStyle} object-fit: cover;" src="${optimizedUrl}" data-index="${i}" />`;
      } else {
        return `<div class="product-img-placeholder" style="${imgStyle} font-size: 80px;" data-index="${i}">${img || p.emoji || '🧶'}</div>`;
      }
    }).join('');

    // Carousel indicator dots
    const dotsHtml = (p.images || []).map((_, i) => `
      <button class="product-img-dot ${i === 0 ? 'active' : ''}" onclick="event.stopPropagation(); window.changeCardImageState('${p.id}', ${i})"></button>
    `).join('');

    // Sizes chips (compact)
    const sizesHtml = (p.sizes || []).map(s => `<div class="size-chip">${s}</div>`).join('');
    const priceText = p.price.toLocaleString('ru-RU');
    const buyButtonLabel = isSold 
      ? (currentLanguage === 'ru' ? 'Продано' : 'Sold')
      : (currentLanguage === 'ru' ? 'Купить' : 'Buy');

    return `
      <div class="product-card ${isSold ? 'sold' : ''}" id="card-${p.id}" onclick="window.openProductDetail('${p.id}')">
        <div class="product-card-images" style="background: ${p.color || '#c4b49e'}">
          ${imagesHtml}
          ${statusLabel ? `<div class="product-status ${statusClass}">${statusLabel}</div>` : ''}
          ${p.images && p.images.length > 1 ? `<div class="product-img-dots">${dotsHtml}</div>` : ''}
        </div>
        <div class="product-card-body">
          <div class="product-card-name">${name}</div>
          <div class="product-card-material">${material}</div>
          <div class="product-card-sizes">${sizesHtml}</div>
          <div class="product-card-footer">
            <div class="product-card-price">${priceText} <span>₸</span></div>
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

function renderArchiveCatalog() {
  if (!dom.archiveGrid) return;

  const soldProducts = productsList.filter(p => p.status === 'sold');
  
  dom.archiveGrid.innerHTML = soldProducts.map(p => {
    const hasRealImg = p.images && p.images[0] && p.images[0].startsWith('http');
    const mediaHtml = hasRealImg
      ? `<img src="${getOptimizedImageUrl(p.images[0], 300)}" style="width:100%;height:100%;object-fit:cover" />`
      : `<div style="font-size:44px">${p.emoji || '🧶'}</div>`;

    return `
      <div class="archive-card">
        <div class="archive-badge">${currentLanguage === 'ru' ? 'Продано' : 'Sold'}</div>
        <div class="archive-card-img" style="background:${p.color || '#c4b49e'}">${mediaHtml}</div>
        <div class="archive-card-name">${p.name[currentLanguage] || p.name.ru}</div>
        <div class="archive-card-meta">${p.material[currentLanguage] || p.material.ru} · ${p.price.toLocaleString('ru-RU')} ₸</div>
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

  // Render thumbnails (up to 3 photos + 1 video if exists)
  let thumbsHtml = (p.images || []).map((img, i) => {
    const isUrl = img && img.startsWith('http');
    const bgStyle = isUrl ? `background-image: url(${getOptimizedImageUrl(img, 100)})` : '';
    const content = isUrl ? '' : img;
    return `
      <div class="modal-thumb ${i === 0 ? 'active' : ''}" onclick="window.setModalMediaIndex(${i})" style="background-color: ${p.color}; ${bgStyle}">
        ${content}
      </div>
    `;
  }).join('');

  if (p.videoUrl) {
    thumbsHtml += `
      <div class="modal-thumb" onclick="window.setModalMediaIndex(3)" style="background-color: ${p.color}; font-size: 24px; display: flex; align-items: center; justify-content: center;">
        🎥
      </div>
    `;
  }
  dom.modalThumbsContainer.innerHTML = thumbsHtml;

  // Render sizes
  dom.modalSizesLabel.textContent = currentLanguage === 'ru' ? 'Размер' : 'Size';
  dom.modalSizesContainer.innerHTML = (p.sizes || []).map((s, i) => `
    <div class="modal-size ${i === 0 ? 'selected' : ''}" onclick="window.selectSizeElement(this)">${s}</div>
  `).join('');

  // Setup buy button
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

  dom.productModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderModalMedia(p) {
  const currentIdx = activeModalMediaIndex;
  dom.modalImageMain.innerHTML = '';
  dom.modalImageMain.style.background = p.color || '#c4b49e';

  if (currentIdx === 3 && p.videoUrl) {
    // Render video player
    const optimizedVideoUrl = getOptimizedVideoUrl(p.videoUrl);
    const videoHtml = `<video controls autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;">
      <source src="${optimizedVideoUrl}" type="video/mp4">
      Your browser does not support the video tag.
    </video>`;
    dom.modalImageMain.innerHTML = videoHtml;
  } else {
    // Render image
    const img = p.images && p.images[currentIdx] ? p.images[currentIdx] : '';
    if (img && img.startsWith('http')) {
      const optimizedUrl = getOptimizedImageUrl(img, 800);
      dom.modalImageMain.innerHTML = `<img src="${optimizedUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`;
    } else {
      dom.modalImageMain.innerHTML = `<div style="font-size: 100px;">${img || p.emoji || '🧶'}</div>`;
    }
  }
}

window.setModalMediaIndex = (idx) => {
  activeModalMediaIndex = idx;
  if (!currentSelectedModalProduct) return;
  renderModalMedia(currentSelectedModalProduct);
  
  // Update active thumbnail borders
  const thumbs = dom.modalThumbsContainer.querySelectorAll('.modal-thumb');
  thumbs.forEach((t, i) => t.classList.toggle('active', i === idx || (idx === 3 && i === thumbs.length - 1)));
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
dom.productModal.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

function hidePreloader() {
  if (dom.preloader && !dom.preloader.classList.contains('fade-out')) {
    setTimeout(() => {
      dom.preloader.classList.add('fade-out');
    }, 450);
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
  if (dom.cartBadge) {
    dom.cartBadge.textContent = count;
    dom.cartBadge.style.display = count > 0 ? 'flex' : 'none';
  }
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
  dom.cartSummaryValue.innerHTML = `${getCartTotal().toLocaleString('ru-RU')} <span>₸</span>`;
  
  dom.cartItemsContainer.innerHTML = items.map(item => {
    const hasMedia = item.emoji && item.emoji.startsWith('http');
    const mediaHtml = hasMedia 
      ? `<img src="${getOptimizedImageUrl(item.emoji, 100)}" style="width:100%;height:100%;object-fit:cover" />`
      : `<span>${item.emoji}</span>`;

    return `
      <div class="cart-item">
        <div class="cart-item-media" style="background: ${item.color}">
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
};

window.closeDrawer = () => {
  dom.mobileDrawer.classList.remove('open');
  dom.burger.classList.remove('open');
  document.body.style.overflow = '';
};

function updateNavLayout() {
  const isMobile = window.innerWidth <= 900;
  if (dom.mobileActions) dom.mobileActions.style.display = isMobile ? 'flex' : 'none';
  if (dom.desktopLinks) dom.desktopLinks.style.display = isMobile ? 'none' : 'flex';
  if (!isMobile) closeDrawer();
}
