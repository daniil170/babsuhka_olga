// catalog.js - Renders storefront products and archived items

export function renderCatalog(container, products, isArchive = false) {
  if (!container) return;
  container.innerHTML = '';

  // Filter products by status
  // active items: in_stock or running_low
  // archive items: sold
  const filteredProducts = products.filter(product => {
    if (isArchive) {
      return product.status === 'sold';
    } else {
      return product.status === 'in_stock' || product.status === 'running_low';
    }
  });

  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div class="empty-state animate-fade-in" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
        <p style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 8px;">
          ${isArchive ? 'Архив пуст' : 'В каталоге пока нет доступных товаров'}
        </p>
        <p style="font-size: 0.9rem; color: var(--text-light);">
          ${isArchive ? 'Здесь появятся проданные товары' : 'Добавьте товары в панели управления'}
        </p>
      </div>
    `;
    return;
  }

  filteredProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = `product-card animate-fade-in ${isArchive ? 'archived' : ''}`;
    card.dataset.id = product.id;

    // Format price to Russian Rubles style
    const formattedPrice = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(product.price);

    // Status translations
    let statusText = 'В наличии';
    let statusClass = 'in_stock';
    if (product.status === 'running_low') {
      statusText = 'Скоро закончится';
      statusClass = 'running_low';
    } else if (product.status === 'sold') {
      statusText = 'Продано';
      statusClass = 'sold';
    }

    // Make sure we have 3 images. If not, pad with the first image
    const imgs = [...(product.images || [])];
    while (imgs.length < 3) {
      imgs.push(imgs[0] || '/logo.png');
    }

    // Prepare sizes list
    const sizesText = product.sizes && product.sizes.length > 0
      ? product.sizes.join(', ')
      : 'Без размера';

    // Build the gallery HTML.
    // If the image sources are identical, we apply special detail crops to simulate professional product details.
    const isMockDetail = imgs[0] === imgs[1] && imgs[0] === imgs[2];

    card.innerHTML = `
      <div class="product-image-wrapper">
        <div class="product-image-container" style="transform: translateX(0%);">
          <img class="product-img" src="${imgs[0]}" alt="${product.name}" loading="lazy">
          <img class="product-img ${isMockDetail ? 'zoom-detail' : ''}" src="${imgs[1]}" alt="${product.name} - Деталь" loading="lazy">
          <img class="product-img ${isMockDetail ? 'cozy-detail' : ''}" src="${imgs[2]}" alt="${product.name} - Вблизи" loading="lazy">
        </div>
        <div class="product-badges">
          <span class="badge-status ${statusClass}">${statusText}</span>
          <span class="badge-sizes">${product.sizes[0] === 'OS (One Size)' ? 'OS' : product.sizes[0]}</span>
        </div>
        <div class="product-gallery-dots">
          <button class="gallery-dot active" data-index="0" aria-label="Фото 1"></button>
          <button class="gallery-dot" data-index="1" aria-label="Фото 2"></button>
          <button class="gallery-dot" data-index="2" aria-label="Фото 3"></button>
        </div>
      </div>
      <div class="product-info">
        <h3 class="product-title">${product.name}</h3>
        <div class="product-price">${formattedPrice}</div>
        <p class="product-desc">${product.description}</p>
        <div class="product-actions">
          <div>
            <div class="product-size-label">Размеры:</div>
            <div class="product-size-value">${sizesText}</div>
          </div>
          <button class="btn-secondary btn-care-trigger" style="padding: 8px 14px; font-size: 0.75rem;">Уход</button>
        </div>
      </div>
    `;

    // Add interactivity to the gallery dots
    const dots = card.querySelectorAll('.gallery-dot');
    const imgContainer = card.querySelector('.product-image-container');

    dots.forEach(dot => {
      const handleDotActivation = (e) => {
        e.stopPropagation();
        const index = parseInt(dot.getAttribute('data-index'), 10);
        
        // Update active class on dots
        dots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');

        // Translate the image container
        imgContainer.style.transform = `translateX(-${index * 100}%)`;
      };

      // Support click and hover (desktop preview) for high-end feel
      dot.addEventListener('click', handleDotActivation);
      dot.addEventListener('mouseenter', handleDotActivation);
    });

    // Wire up Care Modal trigger
    const careBtn = card.querySelector('.btn-care-trigger');
    careBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const careModal = document.getElementById('careInstructionsModal');
      if (careModal) {
        careModal.showModal();
      }
    });

    container.appendChild(card);
  });
}
