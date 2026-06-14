/* ====================================
   ADMIN.JS — Babushka Olga
   Admin panel logic (admin.html only)
   ==================================== */

/* ── State for discount modal ── */
var currentDiscountProductId = null;

/* ──────────────────────────────────
   RENDER ADMIN TABLE
   ────────────────────────────────── */
function renderAdminTable() {
  var tbody = document.getElementById('adminTableBody');
  if (!tbody) return;

  var lang = getLang();
  var products = getProducts();

  if (!products.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-secondary);">' +
      (lang === 'ru' ? 'Нет товаров' : 'No products') +
      '</td></tr>';
    return;
  }

  var html = '';
  products.forEach(function(p) {
    // Price display
    var priceHtml = '';
    if (p.discount > 0) {
      var discounted = getDiscountedPrice(p.price, p.discount);
      priceHtml =
        '<span style="font-weight:600;">' + formatPrice(discounted) + '</span><br>' +
        '<span style="text-decoration:line-through;color:var(--color-text-light);font-size:0.8rem;">' + formatPrice(p.price) + '</span>';
    } else {
      priceHtml = formatPrice(p.price);
    }

    // Discount display
    var discountHtml = p.discount > 0
      ? '<span style="color:var(--color-danger);font-weight:500;">-' + p.discount + '%</span>'
      : '—';

    // Status badge
    var statusClass = p.status === 'available' ? 'admin-table__status--available' : 'admin-table__status--sold';
    var statusKey = p.status === 'available' ? 'admin.status.available' : 'admin.status.sold';
    var statusBadge = '<span class="admin-table__status ' + statusClass + '">' + t(statusKey) + '</span>';

    html +=
      '<tr>' +
        '<td><img src="' + p.images[0] + '" alt="" class="admin-table__img" width="56" height="56"></td>' +
        '<td class="admin-table__name">' + p.name[lang] + '</td>' +
        '<td>' + priceHtml + '</td>' +
        '<td>' + discountHtml + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' +
          '<div class="admin-actions">' +
            '<button class="admin-btn admin-btn--status" onclick="toggleStatus(\'' + p.id + '\')">' + t('admin.btn.status') + '</button>' +
            '<button class="admin-btn admin-btn--discount" onclick="openDiscountModal(\'' + p.id + '\')">' + t('admin.btn.discount') + '</button>' +
            '<button class="admin-btn admin-btn--delete" onclick="deleteProduct(\'' + p.id + '\')">' + t('admin.btn.delete') + '</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
  });

  tbody.innerHTML = html;
}

/* ──────────────────────────────────
   TOGGLE PRODUCT STATUS
   ────────────────────────────────── */
function toggleStatus(productId) {
  var products = getProducts();
  var product = products.find(function(p) { return p.id === productId; });
  if (!product) return;

  product.status = product.status === 'available' ? 'sold' : 'available';
  saveProducts(products);
  renderAdminTable();
  showToast(t('admin.toast.status'), 'success');
}

/* ──────────────────────────────────
   DELETE PRODUCT
   ────────────────────────────────── */
function deleteProduct(productId) {
  if (!confirm(t('admin.confirm.delete'))) return;

  var products = getProducts();
  products = products.filter(function(p) { return p.id !== productId; });
  saveProducts(products);
  renderAdminTable();
  showToast(t('admin.toast.deleted'));
}

/* ──────────────────────────────────
   DISCOUNT MODAL
   ────────────────────────────────── */
function openDiscountModal(productId) {
  currentDiscountProductId = productId;
  var modal = document.getElementById('discountModal');
  if (!modal) return;

  // Pre-fill current discount value
  var product = getProductById(productId);
  var input = document.getElementById('fieldDiscount');
  if (input && product) {
    input.value = product.discount || 0;
  }

  // Also set the hidden field
  var hiddenId = document.getElementById('discountProductId');
  if (hiddenId) hiddenId.value = productId;

  modal.classList.add('modal-overlay--active');
}

function closeDiscountModal() {
  var modal = document.getElementById('discountModal');
  if (modal) {
    modal.classList.remove('modal-overlay--active');
  }
  currentDiscountProductId = null;
}

function saveDiscount() {
  if (!currentDiscountProductId) return;

  var input = document.getElementById('fieldDiscount');
  var discountValue = parseInt(input ? input.value : 0, 10);

  // Clamp between 0 and 99
  if (isNaN(discountValue) || discountValue < 0) discountValue = 0;
  if (discountValue > 99) discountValue = 99;

  var products = getProducts();
  var product = products.find(function(p) { return p.id === currentDiscountProductId; });
  if (!product) return;

  product.discount = discountValue;

  // Update badge: set to 'sale' if discount > 0, remove sale badge if discount is 0
  if (discountValue > 0) {
    product.badge = 'sale';
  } else if (product.badge === 'sale') {
    product.badge = null;
  }

  saveProducts(products);
  renderAdminTable();
  closeDiscountModal();
  showToast(t('admin.toast.discount'), 'success');
}

/* ──────────────────────────────────
   ADD PRODUCT MODAL
   ────────────────────────────────── */
function openAddModal() {
  var modal = document.getElementById('addProductModal');
  if (modal) {
    modal.classList.add('modal-overlay--active');
  }
}

function closeAddModal() {
  var modal = document.getElementById('addProductModal');
  if (modal) {
    modal.classList.remove('modal-overlay--active');
  }
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function addProduct() {
  var nameInput = document.getElementById('fieldName');
  var descInput = document.getElementById('fieldDesc');
  var priceInput = document.getElementById('fieldPrice');
  var compositionInput = document.getElementById('fieldComposition');
  var categoryInput = document.getElementById('fieldCategory');

  var name = nameInput ? nameInput.value.trim() : '';
  var desc = descInput ? descInput.value.trim() : '';
  var price = priceInput ? parseInt(priceInput.value, 10) : 0;
  var composition = compositionInput ? compositionInput.value.trim() : '';
  var category = categoryInput ? categoryInput.value.trim() : 'sweater';

  // Gather checked sizes
  var sizeCheckboxes = document.querySelectorAll('input[name="sizes"]:checked');
  var sizes = [];
  sizeCheckboxes.forEach(function(cb) { sizes.push(cb.value); });
  if (sizes.length === 0) sizes = ['S', 'M', 'L', 'XL'];

  if (!name || !price) {
    showToast(getLang() === 'ru' ? 'Заполните обязательные поля' : 'Fill in required fields', 'error');
    return;
  }

  var id = slugify(name) || 'product-' + Date.now();

  // Check for duplicate IDs
  var products = getProducts();
  if (products.find(function(p) { return p.id === id; })) {
    id = id + '-' + Date.now();
  }

  var newProduct = {
    id: id,
    name: { ru: name, en: name },
    description: { ru: desc, en: desc },
    composition: { ru: composition, en: composition },
    price: price,
    discount: 0,
    sizes: sizes,
    images: [
      'assets/products/sweater-gray-1.jpg',
      'assets/products/sweater-gray-1.jpg',
      'assets/products/sweater-gray-1.jpg'
    ],
    status: 'available',
    badge: 'new',
    category: category
  };

  products.push(newProduct);
  saveProducts(products);
  renderAdminTable();
  closeAddModal();
  showToast(t('admin.toast.added'), 'success');

  // Reset form
  var form = document.getElementById('addProductForm');
  if (form) form.reset();
}

/* ── Form submit handlers (called from HTML onsubmit) ── */
function handleAddProduct(e) {
  e.preventDefault();
  addProduct();
}

function handleSetDiscount(e) {
  e.preventDefault();
  saveDiscount();
}

/* ──────────────────────────────────
   DOMContentLoaded — ADMIN INIT
   ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  renderAdminTable();

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.classList.remove('modal-overlay--active');
        currentDiscountProductId = null;
      }
    });
  });
});
