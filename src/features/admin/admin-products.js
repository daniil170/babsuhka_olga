import { saveProduct, deleteProduct } from '../../services/product-service.js';
import { uploadMedia } from '../../services/cloudinary-service.js';
import { switchAdminTab } from './admin-init.js';

let allProducts = [];
export function getAdminProducts() {
  return allProducts;
}

export function renderAdminProducts(products) {
  if (products) {
    allProducts = products;
  } else {
    products = allProducts;
  }
  
  const tbody = document.getElementById('admin-products-tbody');
  if (!tbody) return;

  const activeProducts = products.filter(p => p.status !== 'sold');

  tbody.innerHTML = activeProducts.map(p => {
    const hasMedia = p.images && p.images[0] && p.images[0].startsWith('http');
    const thumbHtml = hasMedia 
      ? `<img src="${p.images[0]}" style="width:36px;height:45px;object-fit:cover;border:1px solid var(--beige-mid)" />`
      : `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:45px;background:var(--beige-mid);margin:0 auto;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4; color: var(--brown);">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>`;

    return `
      <tr>
        <td>${thumbHtml}</td>
        <td><strong>${p.name.ru}</strong><br><small style="color:var(--sold)">${p.name.en}</small></td>
        <td>${p.price.toLocaleString('ru-RU')} ₸</td>
        <td>
          <select class="status-select" onchange="changeStatus('${p.id}', this.value)">
            <option value="available" ${p.status === 'available' ? 'selected' : ''}>В наличии</option>
            <option value="low" ${p.status === 'low' ? 'selected' : ''}>Заканчивается</option>
            <option value="sold" ${p.status === 'sold' ? 'selected' : ''}>Продано</option>
          </select>
        </td>
        <td><small>${(p.sizes || []).join(', ')}</small></td>
        <td>
          <div class="table-actions">
            <button class="btn-edit" onclick="editProduct('${p.id}')">Изменить</button>
            <button class="btn-delete" onclick="deleteProduct('${p.id}')">Удалить</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--sold);padding:32px;font-style:italic">Список пуст</td></tr>`;
}

export function editProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;

  document.getElementById('edit-id').value = p.id;
  document.getElementById('admin-form-title').textContent = 'Редактировать товар';
  
  document.getElementById('f-name-ru').value = p.name.ru || '';
  document.getElementById('f-name-en').value = p.name.en || '';
  document.getElementById('f-material-ru').value = p.material.ru || '';
  document.getElementById('f-material-en').value = p.material.en || '';
  document.getElementById('f-price').value = p.price || '';
  document.getElementById('f-status').value = p.status || 'available';
  document.getElementById('f-sizes').value = (p.sizes || []).join(', ');
  document.getElementById('f-desc-ru').value = p.desc.ru || '';
  document.getElementById('f-desc-en').value = p.desc.en || '';

  // Setup media previews
  for (let i = 1; i <= 3; i++) {
    const slot = document.getElementById(`media-slot-photo-${i}`);
    const previewImg = slot ? slot.querySelector('.media-slot-preview') : null;
    const progress = slot ? slot.querySelector('.media-slot-progress') : null;
    
    if (slot) {
      if (progress) progress.style.width = '0%';
      const imgUrl = p.images && p.images[i-1] ? p.images[i-1] : '';
      
      if (imgUrl && imgUrl.startsWith('http')) {
        slot.dataset.uploadedUrl = imgUrl;
        if (previewImg) {
          previewImg.src = imgUrl;
          previewImg.style.display = 'block';
        }
      } else {
        delete slot.dataset.uploadedUrl;
        if (previewImg) {
          previewImg.src = '';
          previewImg.style.display = 'none';
        }
      }
    }
  }

  switchAdminTab('add');
}
window.editProduct = editProduct;

export async function saveProductSubmit() {
  const nameRu = document.getElementById('f-name-ru').value.trim();
  const nameEn = document.getElementById('f-name-en').value.trim();
  const materialRu = document.getElementById('f-material-ru').value.trim();
  const materialEn = document.getElementById('f-material-en').value.trim();
  const price = parseInt(document.getElementById('f-price').value) || 0;
  const status = document.getElementById('f-status').value;
  const sizes = document.getElementById('f-sizes').value.split(',').map(s => s.trim()).filter(Boolean);
  const descRu = document.getElementById('f-desc-ru').value.trim();
  const descEn = document.getElementById('f-desc-en').value.trim();

  if (!nameRu || !nameEn) {
    window.showToast('Заполните название на обоих языках');
    return;
  }

  // Gather uploaded files
  const images = [];
  for (let i = 1; i <= 3; i++) {
    const slot = document.getElementById(`media-slot-photo-${i}`);
    if (slot && slot.dataset.uploadedUrl) {
      images.push(slot.dataset.uploadedUrl);
    }
  }

  const productData = {
    name: { ru: nameRu, en: nameEn },
    material: { ru: materialRu || '100% шерсть', en: materialEn || '100% wool' },
    desc: { ru: descRu, en: descEn },
    price,
    status,
    sizes,
    images
  };

  const id = document.getElementById('edit-id').value;

  try {
    await saveProduct(productData, id ? id : null);
    window.showToast(id ? 'Товар обновлён' : 'Товар добавлен');
    cancelProductEdit();
    switchAdminTab('products');
  } catch (err) {
    console.error(err);
    window.showToast('Ошибка сохранения');
  }
}
window.saveProduct = saveProductSubmit;

export function cancelProductEdit() {
  document.getElementById('edit-id').value = '';
  document.getElementById('admin-form-title').textContent = 'Добавить новый товар';
  
  document.getElementById('f-name-ru').value = '';
  document.getElementById('f-name-en').value = '';
  document.getElementById('f-material-ru').value = '';
  document.getElementById('f-material-en').value = '';
  document.getElementById('f-price').value = '';
  document.getElementById('f-status').value = 'available';
  document.getElementById('f-sizes').value = '';
  document.getElementById('f-desc-ru').value = '';
  document.getElementById('f-desc-en').value = '';

  // Clear slots
  for (let i = 1; i <= 3; i++) {
    const slot = document.getElementById(`media-slot-photo-${i}`);
    if (slot) {
      delete slot.dataset.uploadedUrl;
      const preview = slot.querySelector('.media-slot-preview');
      if (preview) { preview.src = ''; preview.style.display = 'none'; }
      const progress = slot.querySelector('.media-slot-progress');
      if (progress) progress.style.width = '0%';
      const fileInput = slot.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
    }
  }

  switchAdminTab('products');
}
window.cancelEdit = cancelProductEdit;

export async function deleteProductClick(id) {
  if (!confirm('Удалить товар? Это действие необратимо.')) return;
  try {
    await deleteProduct(id);
    window.showToast('Товар удалён');
  } catch (err) {
    console.error(err);
    window.showToast('Ошибка удаления');
  }
}
window.deleteProduct = deleteProductClick;

export async function changeQuickStatus(id, newStatus) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  try {
    await saveProduct({ ...p, status: newStatus }, id);
    window.showToast('Статус обновлён');
  } catch (err) {
    console.error(err);
    window.showToast('Ошибка обновления статуса');
  }
}
window.changeStatus = changeQuickStatus;

export function setupFileUploads() {
  // Setup slots for 3 photos
  for (let i = 1; i <= 3; i++) {
    const slot = document.getElementById(`upload-photo-${i}`);
    if (slot) {
      slot.addEventListener('change', (e) => handleFileSelect(e, 'photo', i));
    }
  }
}

async function handleFileSelect(event, type, index = null) {
  const file = event.target.files[0];
  if (!file) return;

  const slotElement = event.target.closest('.media-slot');
  if (!slotElement) return;

  const progressBar = slotElement.querySelector('.media-slot-progress');
  const previewImg = slotElement.querySelector('.media-slot-preview');
  
  if (progressBar) progressBar.style.width = '0%';
  
  try {
    const secureUrl = await uploadMedia(
      file, 
      'image',
      (percent) => {
        if (progressBar) progressBar.style.width = `${percent}%`;
      }
    );
    
    // Store uploaded URL on slot dataset
    slotElement.dataset.uploadedUrl = secureUrl;
    
    // Update visual preview
    if (previewImg) {
      previewImg.src = secureUrl;
      previewImg.style.display = 'block';
    }
    
    window.showToast(`Фото ${index} загружено`);
  } catch (err) {
    console.error(err);
    window.showToast('Ошибка загрузки медиа');
    if (progressBar) progressBar.style.width = '0%';
  }
}
