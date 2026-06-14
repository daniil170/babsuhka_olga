/* ====================================
   APP.JS — Babushka Olga
   Main application logic
   ==================================== */

/* ── Override setLang for dynamic re-render ── */
(function() {
  var _origSetLang = window.setLang;
  window.setLang = function(lang) {
    if (_origSetLang) _origSetLang(lang);
    // Re-render all dynamic content
    if (document.getElementById('productsGrid')) renderCatalog();
    if (document.getElementById('galleryMain')) renderProductDetail();
    if (document.getElementById('archiveGrid')) renderArchive();
    if (typeof renderAdminTable === 'function') renderAdminTable();
  };
})();

/* ── Navigation: scroll behavior ── */
function initNavScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav || !nav.classList.contains('nav--hero')) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
  });
}

/* ── Mobile menu toggle ── */
function toggleMobileMenu() {
  const links = document.getElementById('navLinks');
  const burger = document.getElementById('navBurger');
  if (links) {
    links.classList.toggle('nav__links--open');
  }
  if (burger) {
    burger.classList.toggle('nav__burger--active');
  }
}

/* Close mobile menu when clicking a link */
function initMobileMenuClose() {
  const links = document.getElementById('navLinks');
  const burger = document.getElementById('navBurger');
  if (!links) return;
  links.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('nav__links--open');
      if (burger) {
        burger.classList.remove('nav__burger--active');
      }
    });
  });
}

/* ── Toast notification ── */
function showToast(message, type) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast';
  if (type) toast.classList.add('toast--' + type);
  toast.classList.add('toast--visible');
  setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 3000);
}

/* ── Order Modal ── */
function openOrderModal() {
  const modal = document.getElementById('orderModal');
  if (modal) {
    modal.classList.add('modal-overlay--active');
    document.body.style.overflow = 'hidden';
  }
}

function closeOrderModal() {
  const modal = document.getElementById('orderModal');
  if (modal) {
    modal.classList.remove('modal-overlay--active');
    document.body.style.overflow = '';
  }
}

function submitOrder(e) {
  e.preventDefault();
  closeOrderModal();
  showToast(t('modal.order.success'), 'success');
  const form = document.getElementById('orderForm');
  if (form) form.reset();
}

/* Close modal on overlay click */
function initModalOverlayClose() {
  const modal = document.getElementById('orderModal');
  if (!modal) return;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeOrderModal();
  });
}

/* ── Render product card HTML ── */
function renderProductCard(product) {
  const lang = getLang();
  const isSold = product.status === 'sold';
  const hasDiscount = product.discount > 0;
  const finalPrice = getDiscountedPrice(product.price, product.discount);

  let badgeHTML = '';
  if (isSold) {
    badgeHTML = `<span class="product-card__badge product-card__badge--sold">${t('catalog.badge.sold')}</span>`;
  } else if (product.badge === 'new') {
    badgeHTML = `<span class="product-card__badge product-card__badge--new">${t('catalog.badge.new')}</span>`;
  } else if (product.badge === 'sale' || hasDiscount) {
    badgeHTML = `<span class="product-card__badge product-card__badge--sale">${t('catalog.badge.sale')}</span>`;
  }

  let priceHTML = `<span class="product-card__price-current">${formatPrice(finalPrice)}</span>`;
  if (hasDiscount && !isSold) {
    priceHTML += `<span class="product-card__price-old">${formatPrice(product.price)}</span>`;
  }

  const href = isSold ? '#' : `product.html?id=${product.id}`;
  const soldClass = isSold ? ' product-card--sold' : '';

  return `
    <a href="${href}" class="product-card${soldClass} fade-in" ${isSold ? 'style="pointer-events: auto; cursor: default;"' : ''}>
      <div class="product-card__image-wrap">
        ${badgeHTML}
        <img src="${product.images[0]}" alt="${product.name[lang]}" class="product-card__image" loading="lazy">
      </div>
      <div class="product-card__info">
        <h3 class="product-card__name">${product.name[lang]}</h3>
        <p class="product-card__desc">${product.description[lang]}</p>
        <div class="product-card__price">
          ${priceHTML}
        </div>
      </div>
    </a>
  `;
}

/* ── Render catalog grid (index page) ── */
function renderCatalog() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const products = getAvailableProducts();
  grid.innerHTML = products.map(p => renderProductCard(p)).join('');

  // Trigger fade-in animations
  requestAnimationFrame(() => {
    grid.querySelectorAll('.fade-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('fade-in--visible'), i * 100);
    });
  });
}

/* ── Render archive grid ── */
function renderArchive(filterText) {
  const grid = document.getElementById('archiveGrid');
  const emptyMsg = document.getElementById('archiveEmpty');
  if (!grid) return;

  const lang = getLang();
  let products = getSoldProducts();

  if (filterText) {
    const query = filterText.toLowerCase();
    products = products.filter(p =>
      p.name[lang].toLowerCase().includes(query) ||
      p.name.ru.toLowerCase().includes(query) ||
      p.name.en.toLowerCase().includes(query)
    );
  }

  if (products.length === 0) {
    grid.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';
  grid.innerHTML = products.map(p => renderProductCard(p)).join('');

  // Trigger fade-in animations
  requestAnimationFrame(() => {
    grid.querySelectorAll('.fade-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('fade-in--visible'), i * 100);
    });
  });
}

function initArchiveSearch() {
  const input = document.getElementById('archiveSearch');
  if (!input) return;

  input.addEventListener('input', (e) => {
    renderArchive(e.target.value.trim());
  });
}

/* ── Product detail page ── */
function renderProductDetail() {
  const nameEl = document.getElementById('productName');
  if (!nameEl) return; // Not on product page

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;

  const product = getProductById(id);
  if (!product) {
    nameEl.textContent = '404';
    return;
  }

  const lang = getLang();
  const isSold = product.status === 'sold';
  const hasDiscount = product.discount > 0;
  const finalPrice = getDiscountedPrice(product.price, product.discount);

  // Update page title
  document.title = `${product.name[lang]} — Babushka Olga`;

  // Breadcrumb
  const breadcrumbName = document.getElementById('breadcrumbName');
  if (breadcrumbName) breadcrumbName.textContent = product.name[lang];

  // Product name
  nameEl.textContent = product.name[lang];

  // Price
  const priceEl = document.getElementById('productPrice');
  if (priceEl) {
    let html = `<span class="product-info__price-current">${formatPrice(finalPrice)}</span>`;
    if (hasDiscount) {
      html += `<span class="product-info__price-old">${formatPrice(product.price)}</span>`;
      html += `<span class="product-info__price-badge">-${product.discount}%</span>`;
    }
    if (isSold) {
      html = `<span class="product-info__price-current">${t('product.sold')}</span>`;
    }
    priceEl.innerHTML = html;
  }

  // Description
  const descEl = document.getElementById('productDesc');
  if (descEl) descEl.textContent = product.description[lang];

  // Sizes
  const sizeOptions = document.getElementById('sizeOptions');
  if (sizeOptions) {
    sizeOptions.innerHTML = product.sizes.map((size, i) =>
      `<button class="size-btn${i === 0 ? ' size-btn--active' : ''}" onclick="selectSize(this)">${size}</button>`
    ).join('');
  }

  // Gallery
  const galleryMain = document.getElementById('galleryMain');
  const galleryThumbs = document.getElementById('galleryThumbs');
  if (galleryMain && product.images.length > 0) {
    galleryMain.innerHTML = `<img src="${product.images[0]}" alt="${product.name[lang]}">`;
  }
  if (galleryThumbs) {
    galleryThumbs.innerHTML = product.images.map((img, i) =>
      `<div class="gallery__thumb${i === 0 ? ' gallery__thumb--active' : ''}" onclick="switchGalleryImage('${img}', this)">
        <img src="${img}" alt="${product.name[lang]} - ${i + 1}" loading="lazy">
      </div>`
    ).join('');
  }

  // Details
  const compEl = document.getElementById('detailComposition');
  if (compEl) compEl.textContent = product.composition[lang];

  const catEl = document.getElementById('detailCategory');
  if (catEl) catEl.textContent = t('category.' + product.category);

  // Update order modal sizes
  const orderSize = document.getElementById('orderSize');
  if (orderSize) {
    orderSize.innerHTML = product.sizes.map(s =>
      `<option value="${s}">${s}</option>`
    ).join('');
  }

  // Hide buy buttons if sold
  if (isSold) {
    const btnBuy = document.getElementById('btnBuy');
    const btnWa = document.getElementById('btnWhatsapp');
    if (btnBuy) {
      btnBuy.textContent = t('product.sold');
      btnBuy.disabled = true;
      btnBuy.style.opacity = '0.5';
      btnBuy.style.cursor = 'default';
      btnBuy.onclick = null;
    }
    if (btnWa) btnWa.style.display = 'none';
  }
}

/* ── Gallery image switch ── */
function switchGalleryImage(src, thumbEl) {
  const main = document.getElementById('galleryMain');
  if (main) {
    const img = main.querySelector('img');
    if (img) {
      img.style.opacity = '0';
      setTimeout(() => {
        img.src = src;
        img.style.opacity = '1';
      }, 200);
    }
  }

  // Update active thumb
  document.querySelectorAll('.gallery__thumb').forEach(t => t.classList.remove('gallery__thumb--active'));
  if (thumbEl) thumbEl.classList.add('gallery__thumb--active');
}

/* ── Size selection ── */
function selectSize(btn) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('size-btn--active'));
  btn.classList.add('size-btn--active');
}

/* ── Scroll-triggered fade-in animations ── */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in--visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
  });
}

/* ── Hero video fallback ── */
function initHeroVideo() {
  const video = document.querySelector('.hero__video');
  const placeholder = document.querySelector('.hero__placeholder');
  if (!video || !placeholder) return;

  video.addEventListener('canplay', () => {
    placeholder.style.display = 'none';
  });

  video.addEventListener('error', () => {
    video.style.display = 'none';
  });
}

/* ── Initialize everything on DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initMobileMenuClose();
  initModalOverlayClose();
  initScrollAnimations();
  initHeroVideo();

  // Page-specific rendering
  renderCatalog();
  renderProductDetail();
  renderArchive();
  initArchiveSearch();
});
