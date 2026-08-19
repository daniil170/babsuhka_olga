import { getCurrentLanguage } from '../../shared/i18n.js';
import { addToCart } from '../cart/cart.js';
import { showToast } from '../../shared/toast.js';

let currentSelectedSizeProduct = null;

export function closeSizeModal() {
  const sizeOverlay = document.getElementById('size-modal-overlay');
  if (sizeOverlay) sizeOverlay.classList.remove('open');
  currentSelectedSizeProduct = null;
}

export function selectSizeInModal(el) {
  const sizeModalSizesContainer = document.getElementById('size-modal-sizes-container');
  if (sizeModalSizesContainer) {
    sizeModalSizesContainer.querySelectorAll('.modal-size').forEach(x => x.classList.remove('selected'));
  }
  el.classList.add('selected');
}

export function buyProductClick(id) {
  const productsList = window.productsList || [];
  const p = productsList.find(x => x.id === id);
  if (!p) return;
  const currentLanguage = getCurrentLanguage();

  if (!p.sizes || p.sizes.length === 0) {
    addToCart(p, 'M');
    showToast(
      currentLanguage === 'ru'
        ? `«${p.name.ru}» добавлен в корзину ✓`
        : `«${p.name.en}» added to cart ✓`
    );
    if (window.toggleCart) window.toggleCart(true);
    return;
  }

  currentSelectedSizeProduct = p;

  const sizeModalProductName = document.getElementById('size-modal-product-name');
  if (sizeModalProductName) {
    sizeModalProductName.textContent = p.name[currentLanguage] || p.name.ru;
  }

  const sizeModalSizesContainer = document.getElementById('size-modal-sizes-container');
  if (sizeModalSizesContainer) {
    sizeModalSizesContainer.innerHTML = p.sizes.map((s, i) => `
      <div class="modal-size ${i === 0 ? 'selected' : ''}" onclick="window.selectSizeInModal(this)">${s}</div>
    `).join('');
  }

  const sizeModalConfirmBtn = document.getElementById('size-modal-confirm-btn');
  if (sizeModalConfirmBtn) {
    sizeModalConfirmBtn.onclick = () => {
      const selectedEl = sizeModalSizesContainer.querySelector('.modal-size.selected');
      if (!selectedEl) {
        showToast(currentLanguage === 'ru' ? 'Выберите размер' : 'Select size');
        return;
      }
      const size = selectedEl.textContent;
      addToCart(p, size);
      showToast(
        currentLanguage === 'ru'
          ? `«${p.name.ru}» (${size}) добавлен в корзину ✓`
          : `«${p.name.en}» (${size}) added to cart ✓`
      );
      closeSizeModal();
      if (window.toggleCart) window.toggleCart(true);
    };
  }

  const sizeOverlay = document.getElementById('size-modal-overlay');
  if (sizeOverlay) sizeOverlay.classList.add('open');
}

window.closeSizeModal = closeSizeModal;
window.selectSizeInModal = selectSizeInModal;
window.buyProductClick = buyProductClick;
