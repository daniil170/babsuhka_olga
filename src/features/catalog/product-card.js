import { getOptimizedImageUrl } from '../../services/cloudinary-service.js';
import { getCurrentLanguage } from '../../shared/i18n.js';

export function renderProductCard(p) {
  const currentLanguage = getCurrentLanguage();
  const wishlist = window.wishlist || []; 

  const name = p.name[currentLanguage] || p.name.ru;
  const material = p.material[currentLanguage] || p.material.ru;
  const isSold = p.status === 'sold';
  
  const statusLabel = {
    available: '', 
    low: currentLanguage === 'ru' ? 'Заканчивается' : 'Low Stock', 
    sold: currentLanguage === 'ru' ? 'Продано' : 'Sold'
  }[p.status];
  const statusClass = { available: '', low: 'status-low', sold: 'status-sold' }[p.status];

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
}

window.changeCardImageState = (id, index) => {
  const card = document.getElementById('card-' + id);
  if (!card) return;
  const imgs = card.querySelectorAll('.product-card-img, .product-img-placeholder');
  const dots = card.querySelectorAll('.product-img-dot');
  imgs.forEach((img, i) => img.style.opacity = i === index ? '1' : '0');
  dots.forEach((d, i) => d.classList.toggle('active', i === index));
};

window.contactForProduct = (id) => {
  const productsList = window.productsList || [];
  const p = productsList.find(x => x.id === id);
  if (!p) return;
  const currentLanguage = getCurrentLanguage();
  const name = p.name[currentLanguage] || p.name.ru;
  const waText = currentLanguage === 'ru'
    ? encodeURIComponent(`Здравствуйте! Я увидел в архиве товар «${name}» и хочу заказать такой же.`)
    : encodeURIComponent(`Hello! I saw the item "${name}" in the archive and want to order a similar one.`);
  window.open(`https://wa.me/77012345678?text=${waText}`, '_blank');
};
