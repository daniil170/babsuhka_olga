import { formatPrice } from '../../shared/format.js';
import { getCurrentLanguage } from '../../shared/i18n.js';
import { getOptimizedImageUrl } from '../../services/cloudinary-service.js';
import { showToast } from '../../shared/toast.js';
import { getProductsList } from '../catalog/product-grid.js';

let wishlist = [];

export function loadWishlist() {
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

export function updateWishlistUI() {
  const count = wishlist.length;
  document.querySelectorAll('.fav-badge-count').forEach(el => {
    el.textContent = `(${count})`;
  });
  
  // Highlight active hearts
  document.querySelectorAll('.btn-favorite').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.classList.toggle('active', wishlist.includes(id));
  });

  const favoritesDrawer = document.getElementById('favorites-drawer');
  if (favoritesDrawer && favoritesDrawer.classList.contains('open')) {
    renderFavoritesDrawer();
  }
}

export function toggleFavorites(state = null) {
  const favoritesDrawer = document.getElementById('favorites-drawer');
  const favoritesOverlay = document.getElementById('favorites-overlay');
  const bottomWidgets = document.querySelector('.bottom-widgets');
  
  if (!favoritesDrawer || !favoritesOverlay) return;

  const isCurrentlyOpen = favoritesDrawer.classList.contains('open');
  const nextState = state !== null ? state : !isCurrentlyOpen;
  
  favoritesDrawer.classList.toggle('open', nextState);
  favoritesOverlay.classList.toggle('open', nextState);
  if (nextState) renderFavoritesDrawer();
  if (bottomWidgets) bottomWidgets.classList.toggle('hidden', nextState);
}

window.toggleFavorites = toggleFavorites;

export function renderFavoritesDrawer() {
  const favoritesItemsContainer = document.getElementById('favorites-items-container');
  if (!favoritesItemsContainer) return;
  
  const currentLanguage = getCurrentLanguage();
  const productsList = getProductsList();
  const favItems = productsList.filter(p => wishlist.includes(p.id));
  
  if (favItems.length === 0) {
    favoritesItemsContainer.innerHTML = `<p class="cart-empty">${currentLanguage === 'ru' ? 'Ваш список избранного пуст' : 'Your favorites list is empty'}</p>`;
    return;
  }
  
  favoritesItemsContainer.innerHTML = favItems.map(item => {
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
            <div class="cart-item-price">${formatPrice ? formatPrice(item.price) : item.price.toLocaleString('ru-RU')} ₸</div>
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

export function toggleFavoriteClick(productId) {
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(productId);
  }
  saveWishlist();
}

window.toggleFavoriteClick = toggleFavoriteClick;

export function isInWishlist(productId) {
  return wishlist.includes(productId);
}

// Ensure backdrop click closes the drawer
document.addEventListener('DOMContentLoaded', () => {
  const favCloseBtn = document.getElementById('favorites-close-btn');
  const favoritesOverlay = document.getElementById('favorites-overlay');
  if (favCloseBtn) favCloseBtn.onclick = () => toggleFavorites(false);
  if (favoritesOverlay) favoritesOverlay.onclick = () => toggleFavorites(false);
});
