import { getCurrentLanguage } from '../../shared/i18n.js';
import { showToast } from '../../shared/toast.js';
import { addSubscriber } from '../../services/subscriber-service.js';

export function setupNewsletterModal(renderCartDrawerCallback) {
  const newsletterOverlay = document.getElementById('newsletter-modal-overlay');
  const newsletterForm = document.getElementById('newsletter-modal-form');
  const newsletterEmail = document.getElementById('newsletter-modal-email');
  const bottomWidgets = document.querySelector('.bottom-widgets');

  window.openNewsletterModal = () => {
    if (newsletterOverlay) {
      newsletterOverlay.classList.add('open');
      if (bottomWidgets) bottomWidgets.classList.add('hidden');
    }
  };

  window.closeNewsletterModal = () => {
    if (newsletterOverlay) {
      newsletterOverlay.classList.remove('open');
      sessionStorage.setItem('babushka_olga_dismissed_newsletter', 'true');
      if (bottomWidgets) bottomWidgets.classList.remove('hidden');
    }
  };

  if (newsletterOverlay) {
    newsletterOverlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) window.closeNewsletterModal();
    });
  }

  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = newsletterEmail ? newsletterEmail.value.trim() : '';
      if (!email) return;

      try {
        await addSubscriber(email);
        localStorage.setItem('babushka_olga_subscribed_newsletter', 'true');
        const currentLanguage = getCurrentLanguage();
        showToast(
          currentLanguage === 'ru'
            ? 'Спасибо за подписку! Приветственная скидка 5000 ₸ активирована.'
            : 'Thank you for subscribing! Welcome discount of 5,000 ₸ is activated.'
        );
        newsletterOverlay.classList.remove('open');
        if (bottomWidgets) bottomWidgets.classList.remove('hidden');
        if (renderCartDrawerCallback) renderCartDrawerCallback(); // refresh cart breakdown
      } catch (err) {
        console.error('Newsletter subscription error:', err);
        const currentLanguage = getCurrentLanguage();
        showToast(
          currentLanguage === 'ru' ? 'Ошибка подписки' : 'Subscription error'
        );
      }
    });
  }

  // Check initial subscription state and update UI
  const isAlreadySubscribed = localStorage.getItem('babushka_olga_subscribed_newsletter') === 'true';
  updateDropSubscriptionUI(isAlreadySubscribed);

  // Handle the drop subscription form as well since it's related
  const subscribeForm = document.getElementById('drop-subscribe-form');
  if (subscribeForm) {
    subscribeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('subscribe-email');
      const email = emailInput ? emailInput.value.trim() : '';
      if (!email) return;
      try {
        await addSubscriber(email);
        localStorage.setItem('babushka_olga_subscribed_newsletter', 'true');
        const currentLanguage = getCurrentLanguage();
        showToast(
          currentLanguage === 'ru'
            ? 'Вы успешно подписались! Приветственная скидка 5000 ₸ активирована! 🤍'
            : 'You have successfully subscribed! Welcome discount of 5,000 ₸ is activated! 🤍'
        );
        if (emailInput) emailInput.value = '';
        updateDropSubscriptionUI(true);
        if (renderCartDrawerCallback) renderCartDrawerCallback(); // refresh cart drawer
      } catch (err) {
        console.error(err);
        const currentLanguage = getCurrentLanguage();
        showToast(currentLanguage === 'ru' ? 'Ошибка подписки' : 'Subscription error');
      }
    });
  }
}

export function updateDropSubscriptionUI(isSubscribed) {
  const container = document.querySelector('.drop-subscription');
  if (!container) return;
  
  if (isSubscribed) {
    container.style.display = 'none';
  } else {
    container.style.display = 'block';
  }
}
