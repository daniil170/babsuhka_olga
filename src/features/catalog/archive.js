import { getOptimizedImageUrl } from '../../services/cloudinary-service.js';
import { getCurrentLanguage } from '../../shared/i18n.js';

export function renderArchiveCatalog() {
  const grid = document.getElementById('archive-grid');
  if (!grid) return;
  const productsList = window.productsList || [];
  const currentLanguage = getCurrentLanguage();
  const wishlist = window.wishlist || [];

  const soldProducts = productsList.filter(p => p.status === 'sold');
  
  grid.innerHTML = soldProducts.map(p => {
    const name = p.name[currentLanguage] || p.name.ru;
    const material = p.material[currentLanguage] || p.material.ru;
    
    const statusLabel = currentLanguage === 'ru' ? 'Продано' : 'Sold';
    const statusClass = 'status-sold';

    const imagesArray = p.images && p.images.length > 0 ? p.images.filter(Boolean) : [];
    const displayArray = imagesArray.length > 0 ? imagesArray : [''];

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

window.renderArchiveCatalog = renderArchiveCatalog;

export function initArchive() {
  renderArchiveCatalog();
}
