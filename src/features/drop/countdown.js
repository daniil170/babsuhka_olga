let countdownInterval = null;

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

export function startCountdown(targetDateStr, shouldBlur = false) {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const targetTime = new Date(targetDateStr).getTime();
  
  const updateTimer = () => {
    const now = Date.now();
    const distance = targetTime - now;
    
    if (distance < 0) {
      clearInterval(countdownInterval);
      const section = document.getElementById('drop-countdown-section');
      if (section) section.style.display = 'none';
      toggleCatalogBlur(false);
      return;
    }
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    const pad = (num) => String(num).padStart(2, '0');
    
    const daysEl = document.getElementById('timer-days');
    const hoursEl = document.getElementById('timer-hours');
    const minsEl = document.getElementById('timer-minutes');
    const secsEl = document.getElementById('timer-seconds');
    
    if (daysEl) daysEl.textContent = pad(days);
    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minsEl) minsEl.textContent = pad(minutes);
    if (secsEl) secsEl.textContent = pad(seconds);
  };
  
  updateTimer();
  countdownInterval = setInterval(updateTimer, 1000);
}

export function initCountdown(settings, currentLanguage) {
  const section = document.getElementById('drop-countdown-section');
  if (!section) return;
  
  const isDropActive = settings && settings.active;
  const targetTime = isDropActive ? new Date(settings.date).getTime() : 0;
  const hasTimeRemaining = !isNaN(targetTime) && targetTime > Date.now();

  if (isDropActive && hasTimeRemaining) {
    section.style.display = 'block';
    const titleEl = document.getElementById('drop-countdown-title');
    if (titleEl) {
      titleEl.textContent = (settings.title && (settings.title[currentLanguage] || settings.title.ru)) || '';
    }
    startCountdown(settings.date, !!settings.blurCatalog);
    toggleCatalogBlur(!!settings.blurCatalog);
  } else {
    section.style.display = 'none';
    if (countdownInterval) clearInterval(countdownInterval);
    toggleCatalogBlur(false);
  }
}
