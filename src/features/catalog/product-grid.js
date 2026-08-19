import { renderProductCard } from './product-card.js';
import { getCurrentLanguage } from '../../shared/i18n.js';

let productsList = [];
let currentCategoryFilter = 'all';

export function getProductsList() {
  return productsList;
}

export function setProductsList(products) {
  productsList = products;
  window.productsList = products;
}

export function setCategoryFilter(filter) {
  currentCategoryFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.remove('active');
    if (b.getAttribute('data-filter') === filter) {
      b.classList.add('active');
    }
  });
}

export function renderCatalog() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  const currentLanguage = getCurrentLanguage();

  const filtered = productsList.filter(p => {
    if (p.status === 'sold') return false;
    if (currentCategoryFilter === 'all') return true;
    if (currentCategoryFilter === 'sale') return p.oldPrice && p.oldPrice > p.price;
    return p.status === currentCategoryFilter;
  });

  grid.innerHTML = filtered.map(p => renderProductCard(p)).join('') || 
    `<p style="grid-column: 1/-1; text-align: center; color: var(--sold); padding: 48px 0; font-style: italic">${currentLanguage === 'ru' ? 'Нет товаров' : 'No items found'}</p>`;
}

window.renderCatalog = renderCatalog;
window.setCategoryFilter = setCategoryFilter;

export function initProductGrid() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setCategoryFilter(btn.getAttribute('data-filter'));
      renderCatalog();
    });
  });
}
