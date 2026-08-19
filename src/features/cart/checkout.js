import { createOrder } from '../../services/order-service.js';
import { getCart, clearCart, getCartTotal } from './cart.js';
import { showToast } from '../../shared/toast.js';
import { renderCartDrawer, updateCartBadge, getQualifyingTotal } from './cart-drawer.js';
import { formatPrice } from '../../shared/format.js';
import { getCurrentLanguage } from '../../shared/i18n.js';
import { toggleCart } from './cart-drawer.js';

export function openCheckoutModal() {
  if (getCart().length === 0) return;
  toggleCart(false);
  const checkoutOverlay = document.getElementById('checkout-modal-overlay');
  const bottomWidgets = document.querySelector('.bottom-widgets');
  
  if (checkoutOverlay) checkoutOverlay.classList.add('open');
  if (bottomWidgets) bottomWidgets.classList.add('hidden');
}

window.openCheckoutModal = openCheckoutModal;

export function closeCheckoutModal() {
  const checkoutOverlay = document.getElementById('checkout-modal-overlay');
  const checkoutForm = document.getElementById('checkout-form');
  const bottomWidgets = document.querySelector('.bottom-widgets');
  
  if (checkoutOverlay) checkoutOverlay.classList.remove('open');
  if (checkoutForm) checkoutForm.reset();
  if (bottomWidgets) bottomWidgets.classList.remove('hidden');
}

window.closeCheckoutModal = closeCheckoutModal;

export function setupCheckoutForm() {
  const checkoutForm = document.getElementById('checkout-form');
  const checkoutName = document.getElementById('checkout-name');
  const checkoutPhone = document.getElementById('checkout-phone');
  const checkoutOverlay = document.getElementById('checkout-modal-overlay');

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = checkoutName ? checkoutName.value.trim() : '';
      const phone = checkoutPhone ? checkoutPhone.value.trim() : '';
      const currentLanguage = getCurrentLanguage();
      
      if (!name || !phone) {
        showToast(currentLanguage === 'ru' ? 'Заполните все поля' : 'Please fill in all fields');
        return;
      }

      try {
        const cartItems = getCart();
        const cartTotal = getCartTotal();
        const qualifyingTotal = getQualifyingTotal(cartItems);
        const isSubscribed = localStorage.getItem('babushka_olga_subscribed_newsletter') === 'true';
        const isDiscountUsed = localStorage.getItem('babushka_olga_welcome_discount_used') === 'true';
        const discountApplies = isSubscribed && !isDiscountUsed && qualifyingTotal >= 35000;
        
        const finalTotal = discountApplies ? cartTotal - 5000 : cartTotal;
        const discountAmount = discountApplies ? 5000 : 0;
        
        await createOrder(name, phone, cartItems, finalTotal, discountAmount);
        
        if (discountApplies) {
          localStorage.setItem('babushka_olga_welcome_discount_used', 'true');
        }
        
        showToast(
          currentLanguage === 'ru' 
            ? 'Заказ успешно оформлен! Мы свяжемся с вами в ближайшее время.' 
            : 'Order placed successfully! We will contact you soon.'
        );
        
        clearCart();
        closeCheckoutModal();
        renderCartDrawer();
        updateCartBadge();
      } catch (err) {
        console.error(err);
        showToast(currentLanguage === 'ru' ? 'Ошибка оформления заказа' : 'Error placing order');
      }
    });
  }

  // Backdrop overlay click closures
  if (checkoutOverlay) {
    checkoutOverlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) window.closeCheckoutModal();
    });
  }
}
