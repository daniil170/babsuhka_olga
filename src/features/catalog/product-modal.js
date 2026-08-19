import { getOptimizedImageUrl } from '../../services/cloudinary-service.js';
import { getCurrentLanguage } from '../../shared/i18n.js';
import { addToCart } from '../cart/cart.js';
import { showToast } from '../../shared/toast.js';

let currentSelectedModalProduct = null;
let activeModalMediaIndex = 0;

export function getCurrentSelectedModalProduct() {
  return currentSelectedModalProduct;
}

export function openProductDetail(id) {
  const productsList = window.productsList || [];
  const p = productsList.find(x => x.id === id);
  if (!p) return;
  currentSelectedModalProduct = p;
  activeModalMediaIndex = 0;
  
  openModal(p);
}

export function openModal(p) {
  const currentLanguage = getCurrentLanguage();
  
  const modalTag = document.getElementById('modal-tag');
  const modalName = document.getElementById('modal-name');
  const modalMaterial = document.getElementById('modal-material');
  const modalPrice = document.getElementById('modal-price');
  const modalDesc = document.getElementById('modal-desc');
  const modalThumbsContainer = document.getElementById('modal-thumbs');
  const modalSizesLabel = document.getElementById('modal-size-label');
  const modalSizesContainer = document.getElementById('modal-sizes');
  const modalBuyBtn = document.getElementById('modal-buy-btn');
  const productModal = document.getElementById('product-modal');
  
  if (modalTag) modalTag.textContent = currentLanguage === 'ru' ? 'Бабушка Ольга · Ручная работа' : 'Grandma Olga · Handmade';
  if (modalName) modalName.textContent = p.name[currentLanguage] || p.name.ru;
  if (modalMaterial) modalMaterial.textContent = p.material[currentLanguage] || p.material.ru;
  if (modalPrice) modalPrice.innerHTML = `${p.price.toLocaleString('ru-RU')} <span>₸</span>`;
  if (modalDesc) modalDesc.textContent = p.desc[currentLanguage] || p.desc.ru || '';
  
  renderModalMedia(p);

  const validImages = (p.images || []).filter(img => img && img.startsWith('http'));
  let thumbsHtml = validImages.map((img, i) => {
    const bgStyle = `background-image: url(${getOptimizedImageUrl(img, 100)})`;
    return `
      <div class="modal-thumb ${i === 0 ? 'active' : ''}" onclick="window.setModalMediaIndex(${i})" style="background-color: var(--beige-mid); ${bgStyle}">
      </div>
    `;
  }).join('');

  if (modalThumbsContainer) modalThumbsContainer.innerHTML = thumbsHtml;

  if (p.status === 'sold') {
    if (modalSizesLabel) modalSizesLabel.style.display = 'none';
    if (modalSizesContainer) modalSizesContainer.style.display = 'none';
    
    if (modalBuyBtn) {
      modalBuyBtn.textContent = currentLanguage === 'ru' ? 'Хочу такой же' : 'Order Similar';
      modalBuyBtn.onclick = () => {
        window.contactForProduct(p.id);
      };
    }
  } else {
    if (modalSizesLabel) {
      modalSizesLabel.style.display = 'block';
      modalSizesLabel.textContent = currentLanguage === 'ru' ? 'Размер' : 'Size';
    }
    if (modalSizesContainer) {
      modalSizesContainer.style.display = 'flex';
      modalSizesContainer.innerHTML = (p.sizes || []).map((s, i) => `
        <div class="modal-size ${i === 0 ? 'selected' : ''}" onclick="window.selectSizeElement(this)">${s}</div>
      `).join('');
    }
    
    if (modalBuyBtn) {
      modalBuyBtn.textContent = currentLanguage === 'ru' ? 'Добавить в корзину' : 'Add to Cart';
      modalBuyBtn.onclick = () => {
        const selectedSizeEl = modalSizesContainer ? modalSizesContainer.querySelector('.modal-size.selected') : null;
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
  }

  if (productModal) {
    productModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

export function renderModalMedia(p) {
  const modalImageMain = document.getElementById('modal-img-main');
  if (!modalImageMain) return;
  
  const currentIdx = activeModalMediaIndex;
  modalImageMain.innerHTML = '';
  modalImageMain.style.background = 'var(--beige-mid)';

  const validImages = (p.images || []).filter(img => img && img.startsWith('http'));
  const img = validImages[currentIdx] || '';
  if (img && img.startsWith('http')) {
    const optimizedUrl = getOptimizedImageUrl(img, 800);
    modalImageMain.innerHTML = `<img src="${optimizedUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`;
  } else {
    modalImageMain.innerHTML = `<div class="product-img-placeholder" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
      <svg viewBox="0 0 24 24" width="80" height="80" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.35; color: var(--brown);">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    </div>`;
  }
}

export function setModalMediaIndex(idx) {
  activeModalMediaIndex = idx;
  if (!currentSelectedModalProduct) return;
  renderModalMedia(currentSelectedModalProduct);
  
  const modalThumbsContainer = document.getElementById('modal-thumbs');
  if (modalThumbsContainer) {
    const thumbs = modalThumbsContainer.querySelectorAll('.modal-thumb');
    thumbs.forEach((t, i) => t.classList.toggle('active', i === idx));
  }
}

export function selectSizeElement(el) {
  const modalSizesContainer = document.getElementById('modal-sizes');
  if (modalSizesContainer) {
    modalSizesContainer.querySelectorAll('.modal-size').forEach(x => x.classList.remove('selected'));
  }
  el.classList.add('selected');
}

export function closeModal() {
  const productModal = document.getElementById('product-modal');
  if (productModal) productModal.classList.remove('open');
  document.body.style.overflow = '';
  currentSelectedModalProduct = null;
}

window.openProductDetail = openProductDetail;
window.openModal = openModal;
window.setModalMediaIndex = setModalMediaIndex;
window.selectSizeElement = selectSizeElement;
window.closeModal = closeModal;
