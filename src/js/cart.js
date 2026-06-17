// Persistent Shopping Cart Module

let cart = [];

// Load cart from localStorage on init
export function loadCart() {
  try {
    const data = localStorage.getItem('babushka_olga_cart');
    cart = data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load cart from localStorage:', e);
    cart = [];
  }
  dispatchCartUpdate();
}

// Save cart to localStorage
function saveCart() {
  try {
    localStorage.setItem('babushka_olga_cart', JSON.stringify(cart));
  } catch (e) {
    console.error('Failed to save cart to localStorage:', e);
  }
  dispatchCartUpdate();
}

// Get raw cart array
export function getCart() {
  return cart;
}

// Add item to cart
export function addToCart(product, size) {
  if (!size) {
    throw new Error('Size is required to add product to cart');
  }

  const existingItem = cart.find(
    item => String(item.productId) === String(product.id) && item.size === size
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      productId: product.id,
      name: product.name, // { ru, en }
      emoji: product.emoji || '🧶',
      color: product.color || '#c4b49e',
      price: product.price,
      size: size,
      quantity: 1
    });
  }
  saveCart();
}

// Remove item from cart
export function removeFromCart(productId, size) {
  cart = cart.filter(item => !(String(item.productId) === String(productId) && item.size === size));
  saveCart();
}

// Update quantity of a item
export function updateQuantity(productId, size, change) {
  const item = cart.find(item => String(item.productId) === String(productId) && item.size === size);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    removeFromCart(productId, size);
  } else {
    saveCart();
  }
}

// Clear cart completely
export function clearCart() {
  cart = [];
  saveCart();
}

// Calculate total price
export function getCartTotal() {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Calculate total items count
export function getCartCount() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

// Broadcast cart update custom event
function dispatchCartUpdate() {
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart } }));
}

// Initialize on import
loadCart();
