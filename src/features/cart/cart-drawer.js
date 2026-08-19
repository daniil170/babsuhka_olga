import { getCart, removeFromCart, updateQuantity, getCartTotal, getCartCount } from './cart.js';
import { formatPrice } from '../../shared/format.js';
import { getCurrentLanguage } from '../../shared/i18n.js';
import { getOptimizedImageUrl } from '../../services/cloudinary-service.js';
import { showToast } from '../../shared/toast.js';
import { getProductsList } from '../catalog/product-grid.js';

export function toggleCart(state = null) {
  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.getElementById('cart-overlay');
  const bottomWidgets = document.querySelector('.bottom-widgets');
  
  if (!cartDrawer || !cartOverlay) return;

  const isCurrentlyOpen = cartDrawer.classList.contains('open');
  const nextState = state !== null ? state : !isCurrentlyOpen;
  
  cartDrawer.classList.toggle('open', nextState);
  cartOverlay.classList.toggle('open', nextState);
  if (nextState) renderCartDrawer();
  if (bottomWidgets) bottomWidgets.classList.toggle('hidden', nextState);
}

window.toggleCart = toggleCart;

export function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll('.cart-badge-count').forEach(el => {
    el.textContent = `(${count})`;
  });
  
  const cartBadge = document.getElementById('cart-badge');
  if (cartBadge) {
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? 'flex' : 'none';
  }
}

export function bindCartEvents() {
  window.addEventListener('cart-updated', (e) => {
    updateCartBadge();
    const cartDrawer = document.getElementById('cart-drawer');
    if (cartDrawer && cartDrawer.classList.contains('open')) {
      renderCartDrawer();
    }
  });
  updateCartBadge();
  
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartOverlay = document.getElementById('cart-overlay');
  if (cartCloseBtn) cartCloseBtn.onclick = () => toggleCart(false);
  if (cartOverlay) cartOverlay.onclick = () => toggleCart(false);
}

export function getQualifyingTotal(cartItems) {
  const productsList = getProductsList();
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

export function renderCartDrawer() {
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartSummaryValue = document.getElementById('cart-summary-value');
  const checkoutBtn = document.getElementById('cart-checkout-btn');
  const cartDrawer = document.getElementById('cart-drawer');
  
  if (!cartItemsContainer) return;
  const items = getCart();
  const currentLanguage = getCurrentLanguage();
  
  if (items.length === 0) {
    cartItemsContainer.innerHTML = `<p class="cart-empty">${currentLanguage === 'ru' ? 'Ваша корзина пуста' : 'Your cart is empty'}</p>`;
    if (cartSummaryValue) cartSummaryValue.innerHTML = `0 <span>₸</span>`;
    if (checkoutBtn) checkoutBtn.style.display = 'none';
    return;
  }

  if (checkoutBtn) checkoutBtn.style.display = 'block';

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
        <span style="color: var(--brown);">${currentLanguage === 'ru' ? 'Сумма:' : 'Subtotal:'} ${formatPrice ? formatPrice(cartTotal) : cartTotal.toLocaleString('ru-RU')} ₸</span>
        <span style="color: #27ae60; font-weight: 500;">${currentLanguage === 'ru' ? 'Приветственная скидка:' : 'Welcome Discount:'} -5 000 ₸</span>
      </div>
      ${formatPrice ? formatPrice(finalTotal) : finalTotal.toLocaleString('ru-RU')} <span>₸</span>
    `;
  } else {
    priceDetailsHtml = `${formatPrice ? formatPrice(cartTotal) : cartTotal.toLocaleString('ru-RU')} <span>₸</span>`;
  }

  if (cartSummaryValue) cartSummaryValue.innerHTML = priceDetailsHtml;

  // Render discount hint text
  let eligibilityMessage = '';
  if (isSubscribed && !isDiscountUsed) {
    if (qualifyingTotal < 35000) {
      const remaining = 35000 - qualifyingTotal;
      eligibilityMessage = currentLanguage === 'ru'
        ? `<div class="discount-hint" style="font-size: 11px; color: var(--sold); text-align: center; margin-top: 12px; line-height: 1.4; width: 100%;">Добавьте еще ${(formatPrice ? formatPrice(remaining) : remaining.toLocaleString('ru-RU'))} ₸ подходящих товаров для скидки 5 000 ₸</div>`
        : `<div class="discount-hint" style="font-size: 11px; color: var(--sold); text-align: center; margin-top: 12px; line-height: 1.4; width: 100%;">Add ${(formatPrice ? formatPrice(remaining) : remaining.toLocaleString('ru-RU'))} ₸ more of qualifying items to get a 5,000 ₸ discount</div>`;
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

  if (cartDrawer) {
    const existingHint = cartDrawer.querySelector('.discount-hint');
    if (existingHint) existingHint.remove();
    if (eligibilityMessage && checkoutBtn) {
      checkoutBtn.insertAdjacentHTML('beforebegin', eligibilityMessage);
    }
  }
  
  cartItemsContainer.innerHTML = items.map(item => {
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
          <div class="cart-item-price">${formatPrice ? formatPrice(item.price * item.quantity) : (item.price * item.quantity).toLocaleString('ru-RU')} ₸</div>
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
