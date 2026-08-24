import { saveDropSettings, updateGlobalSettings } from '../../services/settings-service.js';
import { uploadMedia } from '../../services/cloudinary-service.js';

export function closeHeroVideoPreviewModal() {
  const modal = document.getElementById('hero-video-preview-modal');
  const player = document.getElementById('hero-video-preview-player');
  if (modal) {
    modal.classList.remove('open');
  }
  if (player) {
    player.pause();
    player.removeAttribute('src');
    player.load();
  }
}
window.closeHeroVideoPreviewModal = closeHeroVideoPreviewModal;

export async function saveDropSettingsAdmin() {
  const titleRu = document.getElementById('drop-settings-title-ru').value.trim();
  const titleEn = document.getElementById('drop-settings-title-en').value.trim();
  const dateStr = document.getElementById('drop-settings-date').value;
  const active = document.getElementById('drop-settings-active').checked;
  const blurCatalog = document.getElementById('drop-settings-blur-catalog')?.checked || false;
  
  if (!titleRu || !titleEn || !dateStr) {
    window.showToast('Заполните все параметры таймера');
    return;
  }
  
  try {
    await saveDropSettings(titleRu, titleEn, dateStr, active, blurCatalog);
    window.showToast('Настройки дропа успешно сохранены!');
  } catch (err) {
    console.error(err);
    window.showToast('Ошибка сохранения настроек');
  }
}
window.saveDropSettingsAdmin = saveDropSettingsAdmin;

export async function handleSettingImageUpload(event, settingsKey, slotId) {
  const file = event.target.files[0];
  if (!file) return;

  const slotElement = document.getElementById(slotId);
  if (!slotElement) return;

  const progressBar = slotElement.querySelector('.media-slot-progress');
  
  if (progressBar) progressBar.style.width = '0%';
  
  try {
    const secureUrl = await uploadMedia(file, 'image', (percent) => {
      if (progressBar) progressBar.style.width = `${percent}%`;
    });
    
    await updateGlobalSettings({ [settingsKey]: secureUrl });
    window.showToast('Изображение успешно обновлено!');
  } catch (err) {
    console.error(err);
    window.showToast('Ошибка при загрузке изображения');
  } finally {
    if (progressBar) progressBar.style.width = '0%';
    event.target.value = '';
  }
}
