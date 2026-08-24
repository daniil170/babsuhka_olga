import { loginAdmin, logoutAdmin, subscribeAuthState, resetAdminPassword } from '../../services/auth-service.js';
import { subscribeProducts } from '../../services/product-service.js';
import { subscribeOrders } from '../../services/order-service.js';
import { subscribeDropSettings, subscribeGlobalSettings, updateGlobalSettings } from '../../services/settings-service.js';
import { subscribeSubscribers } from '../../services/subscriber-service.js';
import { subscribeNewsletters } from '../../services/newsletter-service.js';
import { uploadMedia } from '../../services/cloudinary-service.js';
import { renderAdminProducts, setupFileUploads, getAdminProducts } from './admin-products.js';
import { renderAdminArchive } from './admin-archive.js';
import { renderOrders } from './admin-orders.js';
import { renderSubscribers } from './admin-subscribers.js';
import { initNewslettersFeature, renderNewsletters, updateSubscribersCount, resetNewsletterForm } from './admin-newsletters.js';
import { closeHeroVideoPreviewModal, handleSettingImageUpload } from './admin-settings.js';
import { hidePreloader } from '../hero/preloader.js';
import { playHeroVideo } from '../hero/hero.js';

let currentAdminUser = null;
let currentMaintenanceState = false;
let orderSubscriptionUnsubscribe = null;
let dropSettingsSubscriptionUnsubscribe = null;
let subscribersSubscriptionUnsubscribe = null;
let newslettersSubscriptionUnsubscribe = null;
let authMode = 'login';
let currentGlobalSettings = {};

let elements = {};

export function initAdminPanel() {
  cacheElements();
  setupEventListeners();
  initNewslettersFeature();
  
  subscribeAuthState((user) => {
    currentAdminUser = user;
    updateAdminUIForAuth();
  });

  subscribeProducts((products) => {
    renderAdminProducts(products);
    if (elements.adminPanel && elements.adminPanel.classList.contains('open')) {
      renderAdminProducts(products);
      renderAdminArchive(products);
    }
  });

  subscribeGlobalSettings((settings) => {
    currentGlobalSettings = settings;
    currentMaintenanceState = settings.maintenanceMode || false;
    
    if (elements.maintenanceBtn) {
      elements.maintenanceBtn.textContent = currentMaintenanceState ? 'Выкл. тех-обслуживание' : 'Вкл. тех-обслуживание';
      elements.maintenanceBtn.classList.toggle('active', currentMaintenanceState);
    }
    
    const heroUrl = settings.heroVideoUrl || '';
    if (elements.heroVideoPreviewBtn && elements.heroVideoDeleteBtn) {
      if (heroUrl) {
        elements.heroVideoPreviewBtn.style.display = 'inline-block';
        elements.heroVideoDeleteBtn.style.display = 'inline-block';
      } else {
        elements.heroVideoPreviewBtn.style.display = 'none';
        elements.heroVideoDeleteBtn.style.display = 'none';
      }
    }

    const logoSlot = document.getElementById('media-slot-logo-hero');
    if (logoSlot) {
      const logoPreview = logoSlot.querySelector('.media-slot-preview');
      if (settings.logoHeroImageUrl) {
        logoSlot.dataset.uploadedUrl = settings.logoHeroImageUrl;
        if (logoPreview) {
          logoPreview.src = settings.logoHeroImageUrl;
          logoPreview.style.display = 'block';
        }
      } else {
        delete logoSlot.dataset.uploadedUrl;
        if (logoPreview) {
          logoPreview.src = '';
          logoPreview.style.display = 'none';
        }
      }
    }

    const storySlot = document.getElementById('media-slot-brand-story');
    if (storySlot) {
      const storyPreview = storySlot.querySelector('.media-slot-preview');
      if (settings.brandStoryImageUrl) {
        storySlot.dataset.uploadedUrl = settings.brandStoryImageUrl;
        if (storyPreview) {
          storyPreview.src = settings.brandStoryImageUrl;
          storyPreview.style.display = 'block';
        }
      } else {
        delete storySlot.dataset.uploadedUrl;
        if (storyPreview) {
          storyPreview.src = '';
          storyPreview.style.display = 'none';
        }
      }
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
    
    loginModalTitle: document.getElementById('login-modal-title'),
    loginPasswordGroup: document.getElementById('login-password-group'),
    loginSubmitBtn: document.getElementById('login-submit-btn'),
    linkForgotPassword: document.getElementById('link-forgot-password'),
    linkRegister: document.getElementById('link-register'),
    linkBackToLogin: document.getElementById('link-back-to-login'),
    
    tabButtons: document.querySelectorAll('.admin-tab'),
    sections: document.querySelectorAll('.admin-section'),
    
    maintenanceBtn: document.getElementById('admin-maintenance-toggle'),
    
    heroVideoPreviewBtn: document.getElementById('admin-hero-video-preview-btn'),
    heroVideoDeleteBtn: document.getElementById('admin-hero-video-delete-btn'),
    heroVideoPreviewModal: document.getElementById('hero-video-preview-modal'),
    heroVideoPreviewPlayer: document.getElementById('hero-video-preview-player'),
    
    dropTitleRu: document.getElementById('drop-settings-title-ru'),
    dropTitleEn: document.getElementById('drop-settings-title-en'),
    dropDate: document.getElementById('drop-settings-date'),
    dropActive: document.getElementById('drop-settings-active'),
    dropBlurCatalog: document.getElementById('drop-settings-blur-catalog'),
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
    
    if (elements.linkForgotPassword) elements.linkForgotPassword.style.display = 'block';
    if (elements.linkRegister) elements.linkRegister.style.display = 'none';
    if (elements.linkBackToLogin) elements.linkBackToLogin.style.display = 'none';
  } else if (mode === 'register') {
    elements.loginModalTitle.textContent = 'Регистрация отключена';
    elements.loginPasswordGroup.style.display = 'none';
    elements.loginPassword.required = false;
    if (elements.loginSubmitBtn) elements.loginSubmitBtn.style.display = 'none';
    
    if (elements.linkForgotPassword) elements.linkForgotPassword.style.display = 'none';
    if (elements.linkRegister) elements.linkRegister.style.display = 'none';
    if (elements.linkBackToLogin) elements.linkBackToLogin.style.display = 'block';
  } else if (mode === 'forgot') {
    elements.loginModalTitle.textContent = 'Сброс пароля';
    elements.loginPasswordGroup.style.display = 'none';
    elements.loginPassword.required = false;
    if (elements.loginSubmitBtn) {
      elements.loginSubmitBtn.style.display = 'block';
      elements.loginSubmitBtn.textContent = 'Сбросить пароль';
    }
    
    if (elements.linkForgotPassword) elements.linkForgotPassword.style.display = 'none';
    if (elements.linkRegister) elements.linkRegister.style.display = 'none';
    if (elements.linkBackToLogin) elements.linkBackToLogin.style.display = 'block';
  }
}

function setupEventListeners() {
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
          throw new Error('Регистрация новых администраторов через сайт отключена для безопасности.');
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

  if (elements.linkForgotPassword) {
    elements.linkForgotPassword.onclick = (e) => { e.preventDefault(); switchAuthMode('forgot'); };
  }
  if (elements.linkRegister) {
    elements.linkRegister.onclick = (e) => { e.preventDefault(); switchAuthMode('register'); };
  }
  if (elements.linkBackToLogin) {
    elements.linkBackToLogin.onclick = (e) => { e.preventDefault(); switchAuthMode('login'); };
  }

  setupFileUploads();

  const heroVideoInput = document.getElementById('upload-hero-video');
  if (heroVideoInput) {
    heroVideoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const progressDiv = document.getElementById('hero-video-progress');
      const btn = document.getElementById('admin-hero-video-btn');
      if (progressDiv) {
        progressDiv.style.display = 'block';
        progressDiv.textContent = '0%';
      }
      if (btn) btn.disabled = true;

      try {
        const secureUrl = await uploadMedia(file, 'video', (percent) => {
          if (progressDiv) progressDiv.textContent = `${percent}%`;
        });
        
        await updateGlobalSettings({ heroVideoUrl: secureUrl });
        window.showToast('Hero-видео успешно загружено и обновлено!');
      } catch (err) {
        console.error(err);
        window.showToast('Ошибка загрузки Hero-видео');
      } finally {
        if (progressDiv) {
          progressDiv.style.display = 'none';
          progressDiv.textContent = '0%';
        }
        if (btn) btn.disabled = false;
        heroVideoInput.value = '';
      }
    });
  }

  const logoInput = document.getElementById('upload-logo-hero');
  if (logoInput) {
    logoInput.addEventListener('change', (e) => handleSettingImageUpload(e, 'logoHeroImageUrl', 'media-slot-logo-hero'));
  }

  const storyInput = document.getElementById('upload-brand-story');
  if (storyInput) {
    storyInput.addEventListener('change', (e) => handleSettingImageUpload(e, 'brandStoryImageUrl', 'media-slot-brand-story'));
  }

  if (elements.heroVideoPreviewBtn) {
    elements.heroVideoPreviewBtn.onclick = () => {
      const player = elements.heroVideoPreviewPlayer;
      const videoUrl = currentGlobalSettings.heroVideoUrl;

      if (!videoUrl) {
        window.showToast('Hero-видео еще не загружено');
        return;
      }

      if (elements.heroVideoPreviewModal) {
        elements.heroVideoPreviewModal.classList.add('open');
      }

      if (player) {
        player.muted = true;
        player.defaultMuted = true;
        player.playsInline = true;
        player.setAttribute('muted', '');
        player.setAttribute('playsinline', '');

        const startPlay = () => {
          const p = player.play();
          if (p !== undefined) {
            p.catch(err => {
              console.info('Preview video playback deferred:', err.message);
            });
          }
        };

        if (player.src !== videoUrl) {
          player.src = videoUrl;
          player.addEventListener('loadeddata', startPlay, { once: true });
          player.load();
        } else {
          startPlay();
        }
      }
    };
  }

  if (elements.heroVideoDeleteBtn) {
    elements.heroVideoDeleteBtn.onclick = async () => {
      if (confirm('Вы уверены, что хотите удалить текущее Hero-видео?')) {
        try {
          await updateGlobalSettings({ heroVideoUrl: '' });
          window.showToast('Hero-видео успешно удалено!');
        } catch (err) {
          console.error(err);
          window.showToast('Ошибка при удалении Hero-видео');
        }
      }
    };
  }
}

function updateAdminUIForAuth() {
  if (elements.adminTrigger) {
    elements.adminTrigger.onclick = () => {
      if (currentAdminUser) {
        openAdminPanel();
      } else {
        openLoginModal();
      }
    };
  }

  const titleSub = document.querySelector('.admin-nav-sub');
  if (titleSub && currentAdminUser) {
    titleSub.textContent = `Админ: ${currentAdminUser.email}`;
  }
}

export function openLoginModal() {
  hidePreloader(true);
  document.querySelector('.bottom-widgets')?.classList.add('hidden');
  if (elements.loginOverlay) elements.loginOverlay.classList.add('open');
}

export function closeLoginModal() {
  if (elements.loginOverlay) elements.loginOverlay.classList.remove('open');
  if (elements.loginForm) elements.loginForm.reset();
  if (elements.loginError) elements.loginError.textContent = '';
  switchAuthMode('login');
  if (!currentAdminUser && window.location.pathname.startsWith('/admin')) {
    history.pushState(null, '', '/');
  }
  if (!elements.adminPanel?.classList.contains('open')) {
    document.querySelector('.bottom-widgets')?.classList.remove('hidden');
  }
}

export function openAdminPanel() {
  hidePreloader(true);
  if (!currentAdminUser) {
    openLoginModal();
    return;
  }
  document.body.classList.add('admin-mode');
  document.querySelector('.bottom-widgets')?.classList.add('hidden');
  if (elements.adminPanel) elements.adminPanel.classList.add('open');
  document.body.style.overflow = 'hidden';
  
  const allProducts = getAdminProducts();
  renderAdminProducts(allProducts);
  renderAdminArchive(allProducts);
  
  if (!orderSubscriptionUnsubscribe) {
    orderSubscriptionUnsubscribe = subscribeOrders((orders) => {
      renderOrders(orders);
    });
  }

  if (!dropSettingsSubscriptionUnsubscribe) {
    dropSettingsSubscriptionUnsubscribe = subscribeDropSettings((settings) => {
      if (settings) {
        if (elements.dropTitleRu) elements.dropTitleRu.value = settings.title?.ru || '';
        if (elements.dropTitleEn) elements.dropTitleEn.value = settings.title?.en || '';
        if (elements.dropDate) elements.dropDate.value = settings.date || '';
        if (elements.dropActive) elements.dropActive.checked = !!settings.active;
        if (elements.dropBlurCatalog) elements.dropBlurCatalog.checked = !!settings.blurCatalog;
      }
    });
  }

  if (!subscribersSubscriptionUnsubscribe) {
    subscribersSubscriptionUnsubscribe = subscribeSubscribers((subs) => {
      renderSubscribers(subs);
      updateSubscribersCount(subs);
    });
  }

  if (!newslettersSubscriptionUnsubscribe) {
    newslettersSubscriptionUnsubscribe = subscribeNewsletters((newsletters) => {
      renderNewsletters(newsletters);
    });
  }
  
  switchAdminTab('products');
}

export function closeAdminPanel() {
  document.body.classList.remove('admin-mode');
  document.querySelector('.bottom-widgets')?.classList.remove('hidden');
  if (elements.adminPanel) elements.adminPanel.classList.remove('open');
  document.body.style.overflow = '';
  
  if (orderSubscriptionUnsubscribe) {
    orderSubscriptionUnsubscribe();
    orderSubscriptionUnsubscribe = null;
  }
  if (dropSettingsSubscriptionUnsubscribe) {
    dropSettingsSubscriptionUnsubscribe();
    dropSettingsSubscriptionUnsubscribe = null;
  }
  if (subscribersSubscriptionUnsubscribe) {
    subscribersSubscriptionUnsubscribe();
    subscribersSubscriptionUnsubscribe = null;
  }
  if (newslettersSubscriptionUnsubscribe) {
    newslettersSubscriptionUnsubscribe();
    newslettersSubscriptionUnsubscribe = null;
  }
  playHeroVideo();
}

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

  const allProducts = getAdminProducts();
  if (tab === 'products') renderAdminProducts(allProducts);
  if (tab === 'archive') renderAdminArchive(allProducts);
}

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
        await updateGlobalSettings({ maintenanceMode: nextState });
        window.showToast(nextState ? 'Тех-обслуживание включено' : 'Сайт открыт для пользователей');
      } catch (err) {
        console.error(err);
        window.showToast('Ошибка изменения режима');
      }
    }
  };
}

window.openAdmin = openAdminPanel;
window.closeAdmin = closeAdminPanel;
window.closeLoginModal = closeLoginModal;
window.logoutAdmin = () => {
  logoutAdmin();
  closeAdminPanel();
};
window.switchAdminTab = switchAdminTab;
window.resetNewsletterForm = resetNewsletterForm;
