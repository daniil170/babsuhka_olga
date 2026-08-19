let currentLanguage = localStorage.getItem('babushka_olga_lang') || 'ru';

export function getCurrentLanguage() {
  return currentLanguage;
}

export function setLang(lang) {
  currentLanguage = lang;
  document.querySelectorAll('.lang-btn').forEach(b => {
    const label = b.textContent.trim().toLowerCase();
    b.classList.toggle('active', label === lang);
  });
  
  // Update translations
  document.querySelectorAll('[data-ru]').forEach(el => {
    const text = el.getAttribute('data-' + lang);
    if (text) el.innerHTML = text;
  });

  // Update placeholders
  document.querySelectorAll('[data-placeholder-ru]').forEach(el => {
    const placeholderText = el.getAttribute('data-placeholder-' + lang);
    if (placeholderText) el.setAttribute('placeholder', placeholderText);
  });
  
  // Save selection
  localStorage.setItem('babushka_olga_lang', lang);
  
  // Trigger custom event for other modules to re-render
  window.dispatchEvent(new CustomEvent('language-changed', { detail: lang }));
}

window.setLang = setLang;
