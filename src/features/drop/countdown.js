let countdownInterval = null;

export function startCountdown(targetDateStr) {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const targetTime = new Date(targetDateStr).getTime();
  
  const updateTimer = () => {
    const now = Date.now();
    const distance = targetTime - now;
    
    if (distance < 0) {
      clearInterval(countdownInterval);
      const section = document.getElementById('drop-countdown-section');
      if (section) section.style.display = 'none';
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
  if (settings && settings.active) {
    const targetTime = new Date(settings.date).getTime();
    if (!isNaN(targetTime) && targetTime > Date.now()) {
      section.style.display = 'block';
      const titleEl = document.getElementById('drop-countdown-title');
      if (titleEl) {
        titleEl.textContent = settings.title[currentLanguage] || settings.title.ru || '';
      }
      startCountdown(settings.date);
    } else {
      section.style.display = 'none';
      if (countdownInterval) clearInterval(countdownInterval);
    }
  } else {
    section.style.display = 'none';
    if (countdownInterval) clearInterval(countdownInterval);
  }
}
