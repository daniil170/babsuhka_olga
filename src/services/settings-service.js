import { db } from '../config/firebase.js';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const MOCK_MAINTENANCE_KEY = 'babushka_olga_mock_maintenance';
const MOCK_DROP_SETTINGS_KEY = 'babushka_olga_mock_drop_settings';

const dropSettingsListeners = [];

function initMockData() {
  if (!localStorage.getItem(MOCK_MAINTENANCE_KEY)) {
    localStorage.setItem(MOCK_MAINTENANCE_KEY, 'false');
  }
  if (!localStorage.getItem(MOCK_DROP_SETTINGS_KEY)) {
    localStorage.setItem(MOCK_DROP_SETTINGS_KEY, JSON.stringify({
      title: { ru: 'Коллекция «Горный воздух»', en: 'Mountain Air Collection' },
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      active: true
    }));
  }
}
initMockData();

// Real-time listener for global settings (maintenance mode, video url, background images, etc.)
export function subscribeGlobalSettings(callback) {
  if (db) {
    return onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        callback({});
      }
    }, (error) => {
      console.error('Firestore global settings subscription error:', error);
      callback({});
    });
  } else {
    // Local fallback
    const getLocalGlobalSettings = () => {
      try {
        const stored = localStorage.getItem('babushka_olga_mock_global_settings');
        if (stored) return JSON.parse(stored);
      } catch {}
      // Fallback: migrate from old mock keys
      const maintenance = localStorage.getItem(MOCK_MAINTENANCE_KEY) === 'true';
      const video = localStorage.getItem('babushka_olga_mock_hero_video') || '';
      const brandStory = localStorage.getItem('babushka_olga_mock_brand_story') || '';
      const logoHero = localStorage.getItem('babushka_olga_mock_logo_hero') || '';
      return {
        maintenanceMode: maintenance,
        heroVideoUrl: video,
        brandStoryImageUrl: brandStory,
        logoHeroImageUrl: logoHero
      };
    };
    
    const listener = () => callback(getLocalGlobalSettings());
    window.addEventListener('mock-global-settings-changed', listener);
    callback(getLocalGlobalSettings());
    return () => {
      window.removeEventListener('mock-global-settings-changed', listener);
    };
  }
}

// Update global settings
export async function updateGlobalSettings(data) {
  if (db) {
    await setDoc(doc(db, 'settings', 'global'), {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } else {
    // Local fallback
    let current = {};
    try {
      const stored = localStorage.getItem('babushka_olga_mock_global_settings');
      if (stored) current = JSON.parse(stored);
    } catch {}
    // If not set yet, migrate old keys
    if (Object.keys(current).length === 0) {
      current = {
        maintenanceMode: localStorage.getItem(MOCK_MAINTENANCE_KEY) === 'true',
        heroVideoUrl: localStorage.getItem('babushka_olga_mock_hero_video') || '',
        brandStoryImageUrl: localStorage.getItem('babushka_olga_mock_brand_story') || '',
        logoHeroImageUrl: localStorage.getItem('babushka_olga_mock_logo_hero') || ''
      };
    }
    const updated = { ...current, ...data };
    localStorage.setItem('babushka_olga_mock_global_settings', JSON.stringify(updated));
    // Also save individual keys for legacy compatibility
    if (data.maintenanceMode !== undefined) {
      localStorage.setItem(MOCK_MAINTENANCE_KEY, data.maintenanceMode ? 'true' : 'false');
    }
    if (data.heroVideoUrl !== undefined) {
      localStorage.setItem('babushka_olga_mock_hero_video', data.heroVideoUrl);
    }
    window.dispatchEvent(new CustomEvent('mock-global-settings-changed'));
  }
}

export async function saveDropSettings(titleRu, titleEn, dateStr, active) {
  const data = {
    title: { ru: titleRu, en: titleEn },
    date: dateStr,
    active: active,
    updatedAt: new Date().toISOString()
  };
  if (db) {
    await setDoc(doc(db, 'settings', 'drop'), data);
  } else {
    localStorage.setItem(MOCK_DROP_SETTINGS_KEY, JSON.stringify(data));
    dropSettingsListeners.forEach(listener => listener(data));
  }
}

export function subscribeDropSettings(callback) {
  if (db) {
    return onSnapshot(doc(db, 'settings', 'drop'), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        callback({ title: { ru: '', en: '' }, date: '', active: false });
      }
    }, (error) => {
      console.error('Firestore drop settings subscription error:', error);
      callback({ title: { ru: '', en: '' }, date: '', active: false });
    });
  } else {
    dropSettingsListeners.push(callback);
    const getLocalSettings = () => JSON.parse(localStorage.getItem(MOCK_DROP_SETTINGS_KEY)) || { title: { ru: '', en: '' }, date: '', active: false };
    callback(getLocalSettings());
    return () => {
      const index = dropSettingsListeners.indexOf(callback);
      if (index > -1) dropSettingsListeners.splice(index, 1);
    };
  }
}
