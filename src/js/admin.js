// admin.js - Admin Dashboard & Inventory Management Control Center

import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getVideoUrl,
  saveVideoUrl
} from './store.js';

let editingProductId = null;
let onDataChangeCallback = null;

export function initAdminPanel(onDataChange) {
  onDataChangeCallback = onDataChange;

  // Select DOM Elements
  const videoUrlInput = document.getElementById('videoUrlInput');
  const btnSaveVideo = document.getElementById('btnSaveVideo');
  const btnOpenAddProduct = document.getElementById('btnOpenAddProduct');
  const productModal = document.getElementById('productModal');
  const productForm = document.getElementById('productForm');
  const btnCancelProduct = document.getElementById('btnCancelProduct');
  const modalHeaderTitle = document.getElementById('modalHeaderTitle');
  const fileInputs = [
    document.getElementById('productImageFile1'),
    document.getElementById('productImageFile2'),
    document.getElementById('productImageFile3')
  ];
  const urlInputs = [
    document.getElementById('productImageUrl1'),
    document.getElementById('productImageUrl2'),
    document.getElementById('productImageUrl3')
  ];

  // Set initial video URL in input
  if (videoUrlInput) {
    videoUrlInput.value = getVideoUrl();
  }

  // Save Video URL handler
  if (btnSaveVideo && videoUrlInput) {
    btnSaveVideo.addEventListener('click', (e) => {
      e.preventDefault();
      const newUrl = videoUrlInput.value.trim();
      if (newUrl) {
        saveVideoUrl(newUrl);
        
        // Show success indicator on button
        const originalText = btnSaveVideo.textContent;
        btnSaveVideo.textContent = 'Сохранено! ✓';
        btnSaveVideo.style.backgroundColor = 'var(--color-success)';
        setTimeout(() => {
          btnSaveVideo.textContent = originalText;
          btnSaveVideo.style.backgroundColor = '';
        }, 1500);

        if (onDataChangeCallback) {
          onDataChangeCallback('video', newUrl);
        }
      }
    });
  }

  // Open modal for Adding Product
  if (btnOpenAddProduct && productModal) {
    btnOpenAddProduct.addEventListener('click', () => {
      editingProductId = null;
      if (modalHeaderTitle) modalHeaderTitle.textContent = 'Добавить новый товар';
      if (productForm) productForm.reset();
      
      // Clear checkbox states
      const checkboxes = productForm.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = false);

      productModal.showModal();
    });
  }

  // Close modal
  if (btnCancelProduct && productModal) {
    btnCancelProduct.addEventListener('click', () => {
      productModal.close();
    });
  }

  // Product Form Submission
  if (productForm && productModal) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Gather form inputs
      const name = document.getElementById('productName').value.trim();
      const price = parseFloat(document.getElementById('productPrice').value) || 0;
      const status = document.getElementById('productStatus').value;
      const description = document.getElementById('productDescription').value.trim();

      // Gather checked sizes
      const checkedSizes = [];
      const sizeElements = productForm.querySelectorAll('input[name="sizes"]:checked');
      sizeElements.forEach(el => checkedSizes.push(el.value));

      if (checkedSizes.length === 0) {
        // Fallback size if none selected
        checkedSizes.push('OS (One Size)');
      }

      // Gather images (URLs or Files converted to Base64)
      const images = [];

      for (let i = 0; i < 3; i++) {
        const fileInput = fileInputs[i];
        const urlInput = urlInputs[i];

        if (fileInput && fileInput.files && fileInput.files[0]) {
          // File selected, convert to Base64
          const base64 = await readFileAsBase64(fileInput.files[0]);
          images.push(base64);
        } else if (urlInput && urlInput.value.trim()) {
          // URL provided
          images.push(urlInput.value.trim());
        }
      }

      // If no new images provided but we are editing, preserve existing images
      let existingImages = [];
      if (editingProductId) {
        const products = getProducts();
        const currentProd = products.find(p => p.id === editingProductId);
        if (currentProd) {
          existingImages = currentProd.images || [];
        }
      }

      // Fill in remaining images
      for (let i = 0; i < 3; i++) {
        if (!images[i]) {
          images[i] = existingImages[i] || (images[0] || '/logo.png');
        }
      }

      const productData = {
        name,
        price,
        status,
        description,
        sizes: checkedSizes,
        images
      };

      if (editingProductId) {
        // Update product
        updateProduct(editingProductId, productData);
      } else {
        // Add product
        addProduct(productData);
      }

      productModal.close();
      productForm.reset();
      editingProductId = null;

      // Refresh data
      refreshAdminPanel();
      if (onDataChangeCallback) {
        onDataChangeCallback('products');
      }
    });
  }

  // Initial render of Admin Panel content
  refreshAdminPanel();
}

// Helper to convert File to Base64 Data URL
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Refresh stats and inventory list
export function refreshAdminPanel() {
  updateAdminStats();
  renderInventoryTable();
}

function updateAdminStats() {
  const products = getProducts();
  
  const total = products.length;
  const active = products.filter(p => p.status === 'in_stock' || p.status === 'running_low').length;
  const sold = products.filter(p => p.status === 'sold').length;

  const totalEl = document.getElementById('statTotalProducts');
  const activeEl = document.getElementById('statActiveProducts');
  const soldEl = document.getElementById('statSoldProducts');

  if (totalEl) totalEl.textContent = total;
  if (activeEl) activeEl.textContent = active;
  if (soldEl) soldEl.textContent = sold;
}

function renderInventoryTable() {
  const tableBody = document.getElementById('adminInventoryTableBody');
  if (!tableBody) return;

  const products = getProducts();
  tableBody.innerHTML = '';

  if (products.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          Нет товаров в списке. Нажмите кнопку «Добавить товар» выше.
        </td>
      </tr>
    `;
    return;
  }

  products.forEach(product => {
    const tr = document.createElement('tr');

    const formattedPrice = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(product.price);

    const mainImg = (product.images && product.images[0]) ? product.images[0] : '/logo.png';
    const sizesText = product.sizes ? product.sizes.join(', ') : '';

    tr.innerHTML = `
      <td>
        <div class="table-product-cell">
          <img class="table-product-thumb" src="${mainImg}" alt="${product.name}">
          <div class="table-product-info">
            <h4>${product.name}</h4>
            <p>Размеры: ${sizesText}</p>
          </div>
        </div>
      </td>
      <td>
        <div class="table-price">${formattedPrice}</div>
      </td>
      <td>
        <div class="status-select-wrapper">
          <select class="admin-status-dropdown" data-id="${product.id}">
            <option value="in_stock" ${product.status === 'in_stock' ? 'selected' : ''}>В наличии</option>
            <option value="running_low" ${product.status === 'running_low' ? 'selected' : ''}>Скоро закончится</option>
            <option value="sold" ${product.status === 'sold' ? 'selected' : ''}>Продано (Архив)</option>
          </select>
        </div>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-icon btn-edit-product" data-id="${product.id}" title="Редактировать">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="btn-icon delete btn-delete-product" data-id="${product.id}" title="Удалить">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </td>
    `;

    // Dropdown Status Change Handler
    const dropdown = tr.querySelector('.admin-status-dropdown');
    dropdown.addEventListener('change', (e) => {
      const newStatus = e.target.value;
      updateProduct(product.id, { status: newStatus });
      refreshAdminPanel();
      
      if (onDataChangeCallback) {
        onDataChangeCallback('products');
      }
    });

    // Edit Product Handler
    const editBtn = tr.querySelector('.btn-edit-product');
    editBtn.addEventListener('click', () => {
      editingProductId = product.id;
      const modal = document.getElementById('productModal');
      const headerTitle = document.getElementById('modalHeaderTitle');
      
      if (headerTitle) headerTitle.textContent = 'Редактировать товар';

      // Pre-fill fields
      document.getElementById('productName').value = product.name;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productStatus').value = product.status;
      document.getElementById('productDescription').value = product.description || '';

      // Set sizes checkboxes
      const checkboxes = document.querySelectorAll('input[name="sizes"]');
      checkboxes.forEach(cb => {
        cb.checked = product.sizes ? product.sizes.includes(cb.value) : false;
      });

      // Show URLs inputs if present
      const urls = product.images || [];
      for (let i = 0; i < 3; i++) {
        const urlInput = document.getElementById(`productImageUrl${i+1}`);
        if (urlInput) {
          urlInput.value = urls[i] && !urls[i].startsWith('data:') ? urls[i] : '';
        }
        // Clear files input
        const fileInput = document.getElementById(`productImageFile${i+1}`);
        if (fileInput) fileInput.value = '';
      }

      if (modal) modal.showModal();
    });

    // Delete Product Handler
    const deleteBtn = tr.querySelector('.btn-delete-product');
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Вы уверены, что хотите удалить товар "${product.name}"?`)) {
        deleteProduct(product.id);
        refreshAdminPanel();
        
        if (onDataChangeCallback) {
          onDataChangeCallback('products');
        }
      }
    });

    tableBody.appendChild(tr);
  });
}
