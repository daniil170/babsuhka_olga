let countdownInterval = null;

function parseTargetTimestamp(dateInput) {
  if (!dateInput) return 0;
  if (typeof dateInput === 'number') return dateInput;
  if (dateInput instanceof Date) return dateInput.getTime();
  
  const str = String(dateInput).trim();
  // Standardize YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm
  const normalized = str.replace(' ', 'T');
  let t = new Date(normalized).getTime();
  
  if (isNaN(t)) {
    // Fallback for Safari if timezone missing
    t = new Date(str.replace(/-/g, '/')).getTime();
  }
  
  return isNaN(t) ? 0 : t;
}

export function toggleCatalogBlur(shouldBlur) {
  const productsSection = document.getElementById('products');
  if (!productsSection) return;

  let blurOverlay = document.getElementById('products-drop-blur-overlay');

  if (shouldBlur) {
    productsSection.classList.add('drop-blurred');
    if (!blurOverlay) {
      blurOverlay = document.createElement('div');
      blurOverlay.id = 'products-drop-blur-overlay';
      blurOverlay.className = 'products-drop-blur-overlay';
      blurOverlay.innerHTML = `
        <div class="blur-overlay-card">
          <div class="blur-lock-icon">🔒</div>
          <h3 class="blur-overlay-title" data-ru="Каталог откроется со стартом дропа" data-en="Catalog will open with the drop launch">Каталог откроется со стартом дропа</h3>
          <p class="blur-overlay-sub" data-ru="Новая коллекция станет доступна для покупки по завершении таймера выше" data-en="The new collection will become available for purchase once the countdown timer above ends">Новая коллекция станет доступна для покупки по завершении таймера выше</p>
          <button class="btn-primary blur-scroll-btn" onclick="document.getElementById('drop-countdown-section')?.scrollIntoView({behavior: 'smooth'})" data-ru="Смотреть таймер" data-en="View Countdown">Смотреть таймер</button>
        </div>
      `;
      productsSection.style.position = 'relative';
      productsSection.appendChild(blurOverlay);
    }
    blurOverlay.style.display = 'flex';
  } else {
    productsSection.classList.remove('drop-blurred');
    if (blurOverlay) {
      blurOverlay.style.display = 'none';
    }
  }
}

export function startCountdown(targetDateInput, shouldBlur = false) {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const targetTime = parseTargetTimestamp(targetDateInput);
  if (!targetTime) return;
  
  const daysEl = document.getElementById('timer-days');
  const hoursEl = document.getElementById('timer-hours');
  const minsEl = document.getElementById('timer-minutes');
  const secsEl = document.getElementById('timer-seconds');
  
  const pad = (num) => String(Math.max(0, num)).padStart(2, '0');

  const updateTimer = () => {
    const now = Date.now();
    const distance = targetTime - now;
    
    if (distance <= 0) {
      if (countdownInterval) clearInterval(countdownInterval);
      const daysEl = document.getElementById('timer-days');
      const hoursEl = document.getElementById('timer-hours');
      const minsEl = document.getElementById('timer-minutes');
      const secsEl = document.getElementById('timer-seconds');
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minsEl) minsEl.textContent = '00';
      if (secsEl) secsEl.textContent = '00';
      return;
    }
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    if (daysEl) daysEl.textContent = pad(days);
    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minsEl) minsEl.textContent = pad(minutes);
    if (secsEl) secsEl.textContent = pad(seconds);
  };
  
  updateTimer();
  countdownInterval = setInterval(updateTimer, 1000);
}

import { updateDropSubscriptionUI } from '../newsletter/newsletter-modal.js';

export function initCountdown(settings, currentLanguage = 'ru') {
  const section = document.getElementById('drop-countdown-section');
  if (!section) return;
  
  const isDropActive = Boolean(settings && settings.active);
  const targetTime = isDropActive ? parseTargetTimestamp(settings.date) : 0;
  
  if (isDropActive && targetTime > 0) {
    section.style.display = 'block';
    
    // Make sure section and containers are visible
    const container = section.querySelector('.drop-countdown-container');
    if (container) {
      container.classList.add('visible');
      container.style.opacity = '1';
      container.style.transform = 'none';
    }
    
    const titleEl = document.getElementById('drop-countdown-title');
    if (titleEl) {
      const title = (settings.title && (settings.title[currentLanguage] || settings.title.ru || settings.title.en)) || (currentLanguage === 'en' ? 'New Collection' : 'Новая коллекция');
      titleEl.textContent = title;
    }
    
    startCountdown(settings.date, Boolean(settings.blurCatalog));
    toggleCatalogBlur(Boolean(settings.blurCatalog));
    
    const isSubscribed = localStorage.getItem('babushka_olga_subscribed_newsletter') === 'true';
    updateDropSubscriptionUI(isSubscribed);
  } else {
    section.style.display = 'none';
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    toggleCatalogBlur(false);
  }
}
