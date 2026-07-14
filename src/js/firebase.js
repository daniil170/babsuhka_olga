// Firebase Services and Local Fallback Module
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, collection, addDoc, setDoc, deleteDoc, 
  getDocs, onSnapshot, query, orderBy, limit 
} from 'firebase/firestore';
import { 
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, sendPasswordResetEmail
} from 'firebase/auth';

const isFirebaseConfigured = 
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== 'YOUR_FIREBASE_API_KEY';

let db = null;
let auth = null;

// Mock database storage keys
const MOCK_PRODUCTS_KEY = 'babushka_olga_mock_products';
const MOCK_ORDERS_KEY = 'babushka_olga_mock_orders';
const MOCK_MAINTENANCE_KEY = 'babushka_olga_mock_maintenance';
const MOCK_AUTH_KEY = 'babushka_olga_mock_admin';
const MOCK_DROP_SETTINGS_KEY = 'babushka_olga_mock_drop_settings';
const MOCK_SUBSCRIBERS_KEY = 'babushka_olga_mock_subscribers';

// Initialize Firebase
if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('Firebase successfully initialized.');
  } catch (error) {
    console.error('Firebase initialization failed. Falling back to local mock.', error);
    db = null;
    auth = null;
  }
} else {
  console.warn('Firebase configuration missing in .env. Running in local mock mode.');
}

// ── 1. MOCK DATA INITIALIZER ──
const DEFAULT_PRODUCTS = [];

function initMockData() {
  if (!localStorage.getItem(MOCK_PRODUCTS_KEY)) {
    localStorage.setItem(MOCK_PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem(MOCK_ORDERS_KEY)) {
    localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify([]));
  }
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
  if (!localStorage.getItem(MOCK_SUBSCRIBERS_KEY)) {
    localStorage.setItem(MOCK_SUBSCRIBERS_KEY, JSON.stringify([]));
  }
}
initMockData();

// Mock listeners tracking list
const productsListeners = [];
const maintenanceListeners = [];
const ordersListeners = [];
const dropSettingsListeners = [];
const subscribersListeners = [];

// ── 2. PRODUCT SERVICES ──

let isSeeding = false;

async function seedDefaultProductsToFirestore() {
  if (isSeeding || !db || !auth || !auth.currentUser) return;
  isSeeding = true;
  console.log('Seeding default products to Firestore because database is empty...');
  try {
    for (const p of DEFAULT_PRODUCTS) {
      const { id, ...cleanData } = p;
      cleanData.createdAt = new Date().toISOString();
      cleanData.updatedAt = new Date().toISOString();
      await addDoc(collection(db, 'products'), cleanData);
    }
    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Failed to seed default products:', err);
  } finally {
    isSeeding = false;
  }
}

// Real-time listener for products list
export function subscribeProducts(callback) {
  if (db) {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const products = [];
      snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      // Fallback initializer if Firestore collection is empty
      if (products.length === 0) {
        if (auth && auth.currentUser) {
          seedDefaultProductsToFirestore();
        }
        callback(DEFAULT_PRODUCTS);
      } else {
        callback(products);
      }
    }, (error) => {
      console.error('Firestore products subscription error:', error);
      callback(DEFAULT_PRODUCTS); // fallback to offline mock on error
    });
  } else {
    // Local fallback subscription
    productsListeners.push(callback);
    const getLocalProducts = () => JSON.parse(localStorage.getItem(MOCK_PRODUCTS_KEY)) || DEFAULT_PRODUCTS;
    callback(getLocalProducts());
    return () => {
      const index = productsListeners.indexOf(callback);
      if (index > -1) productsListeners.splice(index, 1);
    };
  }
}

// Save (create or update) product
export async function saveProduct(productData, id = null) {
  const data = {
    ...productData,
    updatedAt: new Date().toISOString()
  };

  if (db) {
    if (id) {
      await setDoc(doc(db, 'products', id), data, { merge: true });
    } else {
      data.createdAt = new Date().toISOString();
      await addDoc(collection(db, 'products'), data);
    }
  } else {
    // Local fallback
    const products = JSON.parse(localStorage.getItem(MOCK_PRODUCTS_KEY)) || DEFAULT_PRODUCTS;
    if (id) {
      const index = products.findIndex(p => p.id === id);
      if (index > -1) {
        products[index] = { ...products[index], ...data };
      }
    } else {
      const newId = 'prod-' + Date.now();
      products.push({
        id: newId,
        createdAt: new Date().toISOString(),
        ...data
      });
    }
    localStorage.setItem(MOCK_PRODUCTS_KEY, JSON.stringify(products));
    // Notify local listeners
    productsListeners.forEach(listener => listener(products));
  }
}

// Delete product
export async function deleteProduct(id) {
  if (db) {
    await deleteDoc(doc(db, 'products', id));
  } else {
    // Local fallback
    let products = JSON.parse(localStorage.getItem(MOCK_PRODUCTS_KEY)) || DEFAULT_PRODUCTS;
    products = products.filter(p => p.id !== id);
    localStorage.setItem(MOCK_PRODUCTS_KEY, JSON.stringify(products));
    productsListeners.forEach(listener => listener(products));
  }
}

// ── 3. GLOBAL SETTINGS SERVICES ──

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

// ── 4. ORDER / LEADS SERVICES ──

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

// ── 5. AUTHENTICATION SERVICES ──

export function subscribeAuthState(callback) {
  if (auth) {
    return onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  } else {
    // Local fallback auth listener
    const checkMockAuth = () => {
      const isLoggedIn = localStorage.getItem(MOCK_AUTH_KEY) === 'true';
      const email = localStorage.getItem('mock_active_email') || 'admin@babushkaolga.kz';
      callback(isLoggedIn ? { email, mock: true } : null);
    };
    // Polling simulation or direct call
    checkMockAuth();
    // Wrap listener in custom window event for triggering UI updates
    const handleMockAuthChange = () => checkMockAuth();
    window.addEventListener('mock-auth-changed', handleMockAuthChange);
    return () => {
      window.removeEventListener('mock-auth-changed', handleMockAuthChange);
    };
  }
}

export async function loginAdmin(email, password) {
  if (auth) {
    await signInWithEmailAndPassword(auth, email, password);
  } else {
    // Local fallback simple login
    const registered = JSON.parse(localStorage.getItem('mock_registered_admins') || '[]');
    const isMockRegistered = registered.find(u => u.email === email && u.password === password);
    
    if ((email === 'admin@babushkaolga.kz' && password === 'admin') || isMockRegistered) {
      localStorage.setItem(MOCK_AUTH_KEY, 'true');
      localStorage.setItem('mock_active_email', email);
      window.dispatchEvent(new CustomEvent('mock-auth-changed'));
    } else {
      throw new Error('Неверные учетные данные. Для входа используйте: admin@babushkaolga.kz / admin или зарегистрируйте новый аккаунт.');
    }
  }
}

export async function registerAdmin(email, password) {
  if (auth) {
    await createUserWithEmailAndPassword(auth, email, password);
  } else {
    // Local fallback mock registration
    const registered = JSON.parse(localStorage.getItem('mock_registered_admins') || '[]');
    if (email === 'admin@babushkaolga.kz' || registered.find(u => u.email === email)) {
      throw new Error('Администратор с таким Email уже зарегистрирован');
    }
    registered.push({ email, password });
    localStorage.setItem('mock_registered_admins', JSON.stringify(registered));
  }
}

export async function resetAdminPassword(email) {
  if (auth) {
    await sendPasswordResetEmail(auth, email);
  } else {
    // Local fallback mock reset
    console.log(`Mock reset email sent to: ${email}`);
    // Simulated delay and success
    await new Promise(r => setTimeout(r, 600));
  }
}

export async function logoutAdmin() {
  if (auth) {
    await signOut(auth);
  } else {
    // Local fallback signout
    localStorage.setItem(MOCK_AUTH_KEY, 'false');
    localStorage.removeItem('mock_active_email');
    window.dispatchEvent(new CustomEvent('mock-auth-changed'));
  }
}

// ── 6. DROP SETTINGS AND SUBSCRIBERS SERVICES ──

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

export async function addSubscriber(email) {
  const subscriberData = {
    email: email.trim().toLowerCase(),
    createdAt: new Date().toISOString()
  };
  if (db) {
    await addDoc(collection(db, 'subscribers'), subscriberData);
  } else {
    const subscribers = JSON.parse(localStorage.getItem(MOCK_SUBSCRIBERS_KEY)) || [];
    if (!subscribers.find(s => s.email === subscriberData.email)) {
      subscribers.push(subscriberData);
      localStorage.setItem(MOCK_SUBSCRIBERS_KEY, JSON.stringify(subscribers));
      subscribersListeners.forEach(listener => listener(subscribers));
    }
  }
}

export function subscribeSubscribers(callback) {
  if (db) {
    const q = query(collection(db, 'subscribers'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const subscribers = [];
      snapshot.forEach((doc) => {
        subscribers.push({ id: doc.id, ...doc.data() });
      });
      callback(subscribers);
    }, (error) => {
      console.error('Firestore subscribers subscription error:', error);
      callback([]);
    });
  } else {
    subscribersListeners.push(callback);
    const getLocalSubscribers = () => JSON.parse(localStorage.getItem(MOCK_SUBSCRIBERS_KEY)) || [];
    callback(getLocalSubscribers());
    return () => {
      const index = subscribersListeners.indexOf(callback);
      if (index > -1) subscribersListeners.splice(index, 1);
    };
  }
}
