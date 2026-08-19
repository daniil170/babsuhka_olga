import { db } from '../config/firebase.js';
import { collection, doc, addDoc, setDoc, deleteDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

const MOCK_ORDERS_KEY = 'babushka_olga_mock_orders';
const ordersListeners = [];

function initMockData() {
  if (!localStorage.getItem(MOCK_ORDERS_KEY)) {
    localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify([]));
  }
}
initMockData();

// Create new customer order (from storefront checkout)
export async function createOrder(customerName, customerPhone, cartItems, totalPrice, discountAmount = 0) {
  const orderData = {
    customerName,
    customerPhone,
    items: cartItems,
    totalPrice,
    discountAmount,
    status: 'new', // new, completed
    createdAt: new Date().toISOString()
  };

  if (db) {
    await addDoc(collection(db, 'orders'), orderData);
  } else {
    // Local fallback
    const orders = JSON.parse(localStorage.getItem(MOCK_ORDERS_KEY)) || [];
    const newOrder = {
      id: 'ord-' + Date.now(),
      ...orderData
    };
    orders.push(newOrder);
    localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(orders));
    ordersListeners.forEach(listener => listener(orders));
  }
}

// Real-time listener for orders list (admin dashboard view)
export function subscribeOrders(callback) {
  if (db) {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      const orders = [];
      snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      callback(orders);
    }, (error) => {
      console.error('Firestore orders subscription error:', error);
      callback([]);
    });
  } else {
    // Local fallback
    ordersListeners.push(callback);
    const getLocalOrders = () => JSON.parse(localStorage.getItem(MOCK_ORDERS_KEY)) || [];
    callback(getLocalOrders());
    return () => {
      const index = ordersListeners.indexOf(callback);
      if (index > -1) ordersListeners.splice(index, 1);
    };
  }
}

// Mark order as completed
export async function updateOrderStatus(orderId, status) {
  if (db) {
    await setDoc(doc(db, 'orders', orderId), { status }, { merge: true });
  } else {
    // Local fallback
    const orders = JSON.parse(localStorage.getItem(MOCK_ORDERS_KEY)) || [];
    const index = orders.findIndex(o => o.id === orderId);
    if (index > -1) {
      orders[index].status = status;
      localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(orders));
      ordersListeners.forEach(listener => listener(orders));
    }
  }
}

// Delete customer order (lead)
export async function deleteOrder(orderId) {
  if (db) {
    await deleteDoc(doc(db, 'orders', orderId));
  } else {
    // Local fallback
    let orders = JSON.parse(localStorage.getItem(MOCK_ORDERS_KEY)) || [];
    orders = orders.filter(o => o.id !== orderId);
    localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(orders));
    ordersListeners.forEach(listener => listener(orders));
  }
}
