// Admin Panel Controller Module
import { 
  saveProduct, deleteProduct, setMaintenanceMode, 
  subscribeOrders, updateOrderStatus, subscribeProducts,
  loginAdmin, logoutAdmin, subscribeAuthState,
  registerAdmin, resetAdminPassword
} from './firebase.js';
import { uploadMedia } from './cloudinary.js';

let allProducts = [];
let currentAdminUser = null;
let currentMaintenanceState = false;
let orderSubscriptionUnsubscribe = null;
let authMode = 'login';

// DOM Elements cache
let elements = {};

export function initAdminPanel() {
  cacheElements();
  setupEventListeners();
  
  // Subscribe to Auth State
  subscribeAuthState((user) => {
    currentAdminUser = user;
    updateAdminUIForAuth();
  });

  // Subscribe to Products for Admin view
  subscribeProducts((products) => {
    allProducts = products;
    if (elements.adminPanel && elements.adminPanel.classList.contains('open')) {
      renderAdminProducts();
      renderAdminArchive();
    }
  });
}

function cacheElements() {
  elements = {
    adminPanel: document.getElementById('admin-panel'),
    adminTrigger: document.querySelector('.admin-trigger'),
    loginOverlay: document.getElementById('login-modal-overlay'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    loginError: document.getElementById('login-error'),
    
    // Auth links and controls
    loginModalTitle: document.getElementById('login-modal-title'),
    loginPasswordGroup: document.getElementById('login-password-group'),
    loginSubmitBtn: document.getElementById('login-submit-btn'),
    linkForgotPassword: document.getElementById('link-forgot-password'),
    linkRegister: document.getElementById('link-register'),
    linkBackToLogin: document.getElementById('link-back-to-login'),
    
    // Tabs
    tabButtons: document.querySelectorAll('.admin-tab'),
    sections: document.querySelectorAll('.admin-section'),
    
    // Product List
    productsTbody: document.getElementById('admin-products-tbody'),
    archiveTbody: document.getElementById('admin-archive-tbody'),
    
    // Form fields
    editId: document.getElementById('edit-id'),
    formTitle: document.getElementById('admin-form-title'),
    fNameRu: document.getElementById('f-name-ru'),
    fNameEn: document.getElementById('f-name-en'),
    fMaterialRu: document.getElementById('f-material-ru'),
    fMaterialEn: document.getElementById('f-material-en'),
    fPrice: document.getElementById('f-price'),
    fStatus: document.getElementById('f-status'),
    fSizes: document.getElementById('f-sizes'),
    fEmoji: document.getElementById('f-emoji'),
    fDescRu: document.getElementById('f-desc-ru'),
    fDescEn: document.getElementById('f-desc-en'),
    fColor: document.getElementById('f-color'),
    
    // Maintenance
    maintenanceBtn: document.getElementById('admin-maintenance-toggle'),
    
    // Orders
    ordersTbody: document.getElementById('admin-orders-tbody')
  };
}

function switchAuthMode(mode) {
  authMode = mode;
  if (!elements.loginError) return;
  elements.loginError.textContent = '';
  
  if (mode === 'login') {
    elements.loginModalTitle.textContent = 'Вход в панель';
    elements.loginPasswordGroup.style.display = 'block';
    elements.loginPassword.required = true;
    elements.loginSubmitBtn.textContent = 'Войти';
    
    elements.linkForgotPassword.style.display = 'block';
    elements.linkRegister.style.display = 'block';
    elements.linkBackToLogin.style.display = 'none';
  } else if (mode === 'register') {
    elements.loginModalTitle.textContent = 'Регистрация';
    elements.loginPasswordGroup.style.display = 'block';
    elements.loginPassword.required = true;
    elements.loginSubmitBtn.textContent = 'Зарегистрироваться';
    
    elements.linkForgotPassword.style.display = 'none';
    elements.linkRegister.style.display = 'none';
    elements.linkBackToLogin.style.display = 'block';
  } else if (mode === 'forgot') {
    elements.loginModalTitle.textContent = 'Сброс пароля';
    elements.loginPasswordGroup.style.display = 'none';
    elements.loginPassword.required = false;
    elements.loginSubmitBtn.textContent = 'Сбросить пароль';
    
    elements.linkForgotPassword.style.display = 'none';
    elements.linkRegister.style.display = 'none';
    elements.linkBackToLogin.style.display = 'block';
  }
}

function setupEventListeners() {
  // Login/Register/Forgot Form Submission
  if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = elements.loginEmail.value.trim();
      const password = elements.loginPassword.value;
      elements.loginError.textContent = '';
      
      try {
        if (authMode === 'login') {
          await loginAdmin(email, password);
          closeLoginModal();
          openAdminPanel();
        } else if (authMode === 'register') {
          await registerAdmin(email, password);
          window.showToast('Регистрация успешна! Теперь вы можете войти.');
          switchAuthMode('login');
        } else if (authMode === 'forgot') {
          await resetAdminPassword(email);
          window.showToast('Ссылка для сброса пароля отправлена (или сымитирована)');
          switchAuthMode('login');
        }
      } catch (err) {
        elements.loginError.textContent = err.message || 'Произошла ошибка';
      }
    });
  }

  // Auth Mode links
  if (elements.linkForgotPassword) {
    elements.linkForgotPassword.onclick = (e) => { e.preventDefault(); switchAuthMode('forgot'); };
  }
  if (elements.linkRegister) {
    elements.linkRegister.onclick = (e) => { e.preventDefault(); switchAuthMode('register'); };
  }
  if (elements.linkBackToLogin) {
    elements.linkBackToLogin.onclick = (e) => { e.preventDefault(); switchAuthMode('login'); };
  }

  // File Upload Handlers for Product Form
  setupFileUploads();
}

function updateAdminUIForAuth() {
  // If authenticated as admin, clicking admin trigger opens panel directly.
  // Otherwise, it opens the login modal.
  if (elements.adminTrigger) {
    elements.adminTrigger.onclick = () => {
      if (currentAdminUser) {
        openAdminPanel();
      } else {
        openLoginModal();
      }
    };
  }

  // Update navbar title or elements based on auth status
  const titleSub = document.querySelector('.admin-nav-sub');
  if (titleSub && currentAdminUser) {
    titleSub.textContent = `Админ: ${currentAdminUser.email}`;
  }
}

// ── 1. MODAL/PANEL TOGGLES ──

export function openLoginModal() {
  if (elements.loginOverlay) elements.loginOverlay.classList.add('open');
}

export function closeLoginModal() {
  if (elements.loginOverlay) elements.loginOverlay.classList.remove('open');
  if (elements.loginForm) elements.loginForm.reset();
  if (elements.loginError) elements.loginError.textContent = '';
  switchAuthMode('login');
}

export function openAdminPanel() {
  if (!currentAdminUser) {
    openLoginModal();
    return;
  }
  if (elements.adminPanel) elements.adminPanel.classList.add('open');
  document.body.style.overflow = 'hidden';
  
  // Load real-time lists
  renderAdminProducts();
  renderAdminArchive();
  
  // Subscribe to real-time Orders
  if (!orderSubscriptionUnsubscribe) {
    orderSubscriptionUnsubscribe = subscribeOrders((orders) => {
      renderOrders(orders);
    });
  }
  
  switchAdminTab('products');
}

export function closeAdminPanel() {
  if (elements.adminPanel) elements.adminPanel.classList.remove('open');
  document.body.style.overflow = '';
  
  // Unsubscribe orders to save connection count
  if (orderSubscriptionUnsubscribe) {
    orderSubscriptionUnsubscribe();
    orderSubscriptionUnsubscribe = null;
  }
}

window.openAdmin = openAdminPanel;
window.closeAdmin = closeAdminPanel;
window.closeLoginModal = closeLoginModal;
window.logoutAdmin = () => {
  logoutAdmin();
  closeAdminPanel();
};

// ── 2. TABS MANAGEMENT ──

export function switchAdminTab(tab) {
  if (!elements.tabButtons || !elements.sections) return;

  elements.tabButtons.forEach(btn => {
    const isTarget = btn.getAttribute('onclick').includes(tab);
    btn.classList.toggle('active', isTarget);
  });

  elements.sections.forEach(sec => {
    const id = sec.getAttribute('id');
    sec.classList.toggle('active', id === `admin-${tab}`);
  });

  if (tab === 'products') renderAdminProducts();
  if (tab === 'archive') renderAdminArchive();
}
window.switchAdminTab = switchAdminTab;

// ── 3. PRODUCT FORM & FILE UPLOADS ──

function setupFileUploads() {
  // Setup slots for 3 photos and 1 video
  for (let i = 1; i <= 3; i++) {
    const slot = document.getElementById(`upload-photo-${i}`);
    if (slot) {
      slot.addEventListener('change', (e) => handleFileSelect(e, 'photo', i));
    }
  }
  const videoSlot = document.getElementById('upload-video');
  if (videoSlot) {
    videoSlot.addEventListener('change', (e) => handleFileSelect(e, 'video'));
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
      type === 'video' ? 'video' : 'image',
      (percent) => {
        if (progressBar) progressBar.style.width = `${percent}%`;
      }
    );
    
    // Store uploaded URL on slot dataset
    slotElement.dataset.uploadedUrl = secureUrl;
    
    // Update visual preview
    if (previewImg) {
      if (type === 'video') {
        // Show video thumbnail or simple label
        previewImg.src = '';
        const icon = slotElement.querySelector('.media-slot-icon');
        if (icon) icon.textContent = '🎥';
        const label = slotElement.querySelector('.media-slot-label');
        if (label) label.textContent = 'Видео загружено';
      } else {
        previewImg.src = secureUrl;
        previewImg.style.display = 'block';
      }
    }
    
    window.showToast(type === 'video' ? 'Видео загружено' : `Фото ${index} загружено`);
  } catch (err) {
    console.error(err);
    window.showToast('Ошибка загрузки медиа');
    if (progressBar) progressBar.style.width = '0%';
  }
}

export async function saveProductSubmit() {
  const nameRu = elements.fNameRu.value.trim();
  const nameEn = elements.fNameEn.value.trim();
  const materialRu = elements.fMaterialRu.value.trim();
  const materialEn = elements.fMaterialEn.value.trim();
  const price = parseInt(elements.fPrice.value) || 0;
  const status = elements.fStatus.value;
  const sizes = elements.fSizes.value.split(',').map(s => s.trim()).filter(Boolean);
  const emoji = elements.fEmoji.value.trim() || '🧶';
  const color = elements.fColor.value.trim() || '#c4b49e';
  const descRu = elements.fDescRu.value.trim();
  const descEn = elements.fDescEn.value.trim();

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
    } else {
      // Fallback default emoji representation if no images uploaded
      images.push(emoji);
    }
  }

  const videoSlot = document.getElementById('media-slot-video');
  const videoUrl = videoSlot ? (videoSlot.dataset.uploadedUrl || '') : '';

  const productData = {
    name: { ru: nameRu, en: nameEn },
    material: { ru: materialRu || '100% шерсть', en: materialEn || '100% wool' },
    desc: { ru: descRu, en: descEn },
    price,
    status,
    sizes,
    emoji,
    color,
    images,
    videoUrl
  };

  const id = elements.editId.value;

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

export function editProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;

  elements.editId.value = p.id;
  elements.formTitle.textContent = 'Редактировать товар';
  
  elements.fNameRu.value = p.name.ru || '';
  elements.fNameEn.value = p.name.en || '';
  elements.fMaterialRu.value = p.material.ru || '';
  elements.fMaterialEn.value = p.material.en || '';
  elements.fPrice.value = p.price || '';
  elements.fStatus.value = p.status || 'available';
  elements.fSizes.value = (p.sizes || []).join(', ');
  elements.fEmoji.value = p.emoji || '🧶';
  elements.fColor.value = p.color || '';
  elements.fDescRu.value = p.desc.ru || '';
  elements.fDescEn.value = p.desc.en || '';

  // Setup media previews
  for (let i = 1; i <= 3; i++) {
    const slot = document.getElementById(`media-slot-photo-${i}`);
    const previewImg = slot ? slot.querySelector('.media-slot-preview') : null;
    const progress = slot ? slot.querySelector('.media-slot-progress') : null;
    
    if (slot) {
      if (progress) progress.style.width = '0%';
      const imgUrl = p.images && p.images[i-1] ? p.images[i-1] : '';
      
      // If image is a valid URL (not just emoji placeholder)
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

  const videoSlot = document.getElementById('media-slot-video');
  const videoPreview = videoSlot ? videoSlot.querySelector('.media-slot-preview') : null;
  const videoProgress = videoSlot ? videoSlot.querySelector('.media-slot-progress') : null;
  
  if (videoSlot) {
    if (videoProgress) videoProgress.style.width = '0%';
    const videoLabel = videoSlot.querySelector('.media-slot-label');
    const videoIcon = videoSlot.querySelector('.media-slot-icon');

    if (p.videoUrl) {
      videoSlot.dataset.uploadedUrl = p.videoUrl;
      if (videoIcon) videoIcon.textContent = '🎥';
      if (videoLabel) videoLabel.textContent = 'Видео загружено';
    } else {
      delete videoSlot.dataset.uploadedUrl;
      if (videoIcon) videoIcon.textContent = '➕';
      if (videoLabel) videoLabel.textContent = 'Загрузить видео';
    }
  }

  switchAdminTab('add');
}
window.editProduct = editProduct;

export function cancelProductEdit() {
  elements.editId.value = '';
  elements.formTitle.textContent = 'Добавить новый товар';
  
  elements.fNameRu.value = '';
  elements.fNameEn.value = '';
  elements.fMaterialRu.value = '';
  elements.fMaterialEn.value = '';
  elements.fPrice.value = '';
  elements.fStatus.value = 'available';
  elements.fSizes.value = '';
  elements.fEmoji.value = '';
  elements.fColor.value = '';
  elements.fDescRu.value = '';
  elements.fDescEn.value = '';

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

  const videoSlot = document.getElementById('media-slot-video');
  if (videoSlot) {
    delete videoSlot.dataset.uploadedUrl;
    const progress = videoSlot.querySelector('.media-slot-progress');
    if (progress) progress.style.width = '0%';
    const label = videoSlot.querySelector('.media-slot-label');
    if (label) label.textContent = 'Загрузить видео';
    const icon = videoSlot.querySelector('.media-slot-icon');
    if (icon) icon.textContent = '➕';
    const fileInput = videoSlot.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
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

// Quick status change from products grid
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

// ── 4. RENDERERS ──

function renderAdminProducts() {
  if (!elements.productsTbody) return;

  elements.productsTbody.innerHTML = allProducts.map(p => {
    // Determine thumbnail (either first image url or emoji representation)
    const hasMedia = p.images && p.images[0] && p.images[0].startsWith('http');
    const thumbHtml = hasMedia 
      ? `<img src="${p.images[0]}" style="width:36px;height:45px;object-fit:cover;border:1px solid var(--beige-mid)" />`
      : `<span class="admin-product-emoji">${p.emoji}</span>`;

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

function renderAdminArchive() {
  if (!elements.archiveTbody) return;

  const soldProducts = allProducts.filter(p => p.status === 'sold');

  elements.archiveTbody.innerHTML = soldProducts.map(p => {
    const hasMedia = p.images && p.images[0] && p.images[0].startsWith('http');
    const thumbHtml = hasMedia 
      ? `<img src="${p.images[0]}" style="width:36px;height:45px;object-fit:cover" />`
      : `<span class="admin-product-emoji">${p.emoji}</span>`;

    return `
      <tr>
        <td>${thumbHtml}</td>
        <td><strong>${p.name.ru}</strong><br><small style="color:var(--sold)">${p.name.en}</small></td>
        <td>${p.price.toLocaleString('ru-RU')} ₸</td>
        <td><span style="background:var(--dark);color:white;padding:3px 10px;font-size:11px;letter-spacing:0.1em">ПРОДАНО</span></td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--sold);padding:32px;font-style:italic">Архив пуст</td></tr>`;
}

function renderOrders(orders) {
  if (!elements.ordersTbody) return;

  elements.ordersTbody.innerHTML = orders.map(o => {
    const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString('ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }) : '—';

    // Build items breakdown html
    const itemsHtml = (o.items || []).map(item => 
      `• ${item.name.ru} (Размер: <strong>${item.size}</strong>) × ${item.quantity}`
    ).join('<br>');

    // Status styling
    const statusSelect = `
      <select class="status-select" onchange="window.updateOrderState('${o.id}', this.value)">
        <option value="new" ${o.status === 'new' ? 'selected' : ''}>Новый</option>
        <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Обработан</option>
      </select>
    `;

    return `
      <tr style="${o.status === 'completed' ? 'opacity: 0.6' : ''}">
        <td><strong>${o.customerName}</strong><br><a href="tel:${o.customerPhone}" style="color:var(--brown);font-size:12px;text-decoration:none">${o.customerPhone}</a></td>
        <td><div style="font-size:13px;line-height:1.4">${itemsHtml}</div></td>
        <td><strong>${o.totalPrice.toLocaleString('ru-RU')} ₸</strong></td>
        <td>${statusSelect}</td>
        <td><small style="color:var(--sold)">${dateStr}</small></td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--sold);padding:48px;font-style:italic">Новых заказов нет</td></tr>`;
}

export async function updateOrderState(orderId, newStatus) {
  try {
    await updateOrderStatus(orderId, newStatus);
    window.showToast('Статус заказа обновлен');
  } catch (err) {
    console.error(err);
    window.showToast('Ошибка обновления заказа');
  }
}
window.updateOrderState = updateOrderState;

// ── 5. MAINTENANCE MODE CONTROL ──

export function setupMaintenanceButton(state) {
  currentMaintenanceState = state;
  if (!elements.maintenanceBtn) return;
  
  elements.maintenanceBtn.textContent = state ? 'Выкл. тех-обслуживание' : 'Вкл. тех-обслуживание';
  elements.maintenanceBtn.classList.toggle('active', state);
  
  elements.maintenanceBtn.onclick = async () => {
    const nextState = !currentMaintenanceState;
    const confirmMsg = nextState 
      ? 'Включить техническое обслуживание? Сайт будет скрыт для обычных пользователей.'
      : 'Выключить техническое обслуживание и открыть сайт?';
      
    if (confirm(confirmMsg)) {
      try {
        await setMaintenanceMode(nextState);
        window.showToast('Техническое обслуживание обновлено');
      } catch (err) {
        console.error(err);
        window.showToast('Ошибка изменения режима обслуживания');
      }
    }
  };
}
