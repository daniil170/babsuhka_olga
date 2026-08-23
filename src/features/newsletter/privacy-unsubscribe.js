import { removeSubscriber } from '../../services/subscriber-service.js';

export function setupPrivacyAndUnsubscribe() {
  const unsubscribeForm = document.getElementById('unsubscribe-form');
  if (unsubscribeForm) {
    unsubscribeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('unsubscribe-email');
      const submitBtn = document.getElementById('unsubscribe-submit-btn');
      const successBox = document.getElementById('unsubscribe-success-box');
      const formBox = document.getElementById('unsubscribe-form-box');
      
      const email = emailInput?.value.trim() || '';
      if (!email) return;

      const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Отписка...';
      }

      try {
        await removeSubscriber(email);
        
        if (formBox) formBox.style.display = 'none';
        if (successBox) successBox.style.display = 'block';
        
        const successEmailSpan = document.getElementById('unsubscribe-success-email');
        if (successEmailSpan) successEmailSpan.textContent = email;

        window.showToast('Вы успешно отписаны от рассылки');
      } catch (err) {
        console.error('Error unsubscribing:', err);
        window.showToast('Произошла ошибка при отписке. Попробуйте еще раз.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });
  }
}

export function openPrivacyModal() {
  const overlay = document.getElementById('privacy-modal-overlay');
  if (overlay) {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

export function closePrivacyModal() {
  const overlay = document.getElementById('privacy-modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (window.location.pathname.startsWith('/privacy')) {
    history.pushState(null, '', '/');
  }
}

export function openUnsubscribeModal(prefillEmail = null) {
  const overlay = document.getElementById('unsubscribe-modal-overlay');
  const emailInput = document.getElementById('unsubscribe-email');
  const formBox = document.getElementById('unsubscribe-form-box');
  const successBox = document.getElementById('unsubscribe-success-box');

  if (formBox) formBox.style.display = 'block';
  if (successBox) successBox.style.display = 'none';

  const emailParam = prefillEmail || new URLSearchParams(window.location.search).get('email');
  if (emailInput && emailParam) {
    emailInput.value = decodeURIComponent(emailParam);
  }

  if (overlay) {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

export function closeUnsubscribeModal() {
  const overlay = document.getElementById('unsubscribe-modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (window.location.pathname.startsWith('/unsubscribe')) {
    history.pushState(null, '', '/');
  }
}

window.openPrivacyModal = openPrivacyModal;
window.closePrivacyModal = closePrivacyModal;
window.openUnsubscribeModal = openUnsubscribeModal;
window.closeUnsubscribeModal = closeUnsubscribeModal;
