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
const DEFAULT_PRODUCTS = [
  {
    id: 'prod-1', status: 'available',
    name: { ru: 'Свитер «Каспий»', en: 'Sweater «Caspian»' },
    material: { ru: '100% мериносовая шерсть', en: '100% merino wool' },
    price: 45000,
    sizes: ['XS','S','M','L','XL'],
    emoji: '🌊',
    color: '#b8ccd4',
    desc: { ru: 'Оверсайз свитер с фактурной вязкой, вдохновлённый волнами Каспийского моря. Широкие рукава, свободный силуэт — создан для уюта.', en: 'Oversized sweater with textured knit inspired by the waves of the Caspian Sea. Wide sleeves, relaxed fit — made for comfort.' },
    images: ['🌊','🧶','✨']
  },
  {
    id: 'prod-2', status: 'low',
    name: { ru: 'Свитер «Степь»', en: 'Sweater «Steppe»' },
    material: { ru: 'Шерсть / альпака 80/20', en: 'Wool / alpaca 80/20' },
    price: 52000,
    sizes: ['S','M','L'],
    emoji: '🌾',
    color: '#c9b99a',
    desc: { ru: 'Нежный бежевый свитер из смеси шерсти и альпаки. Лёгкий, как казахстанский ветер в степи. Идеален для межсезонья.', en: 'Soft beige sweater in a wool-alpaca blend. As light as the Kazakh steppe wind. Perfect for transitional seasons.' },
    images: ['🌾','🤎','🍂']
  },
  {
    id: 'prod-3', status: 'available',
    name: { ru: 'Свитер «Актау»', en: 'Sweater «Aktau»' },
    material: { ru: 'Мериносовая шерсть', en: 'Merino wool' },
    price: 48000,
    sizes: ['XS','S','M','L','XL','XXL'],
    emoji: '🏔',
    color: '#a0b4a8',
    desc: { ru: 'Именной свитер, названный в честь города, где всё началось. Плотная вязка, высокий ворот, долгое тепло.', en: 'A sweater named after the city where it all began. Tight knit, high collar, lasting warmth.' },
    images: ['🏔','❄️','🤍']
  },
  {
    id: 'prod-4', status: 'sold',
    name: { ru: 'Свитер «Зима»', en: 'Sweater «Winter»' },
    material: { ru: '100% шерсть', en: '100% wool' },
    price: 38000,
    sizes: ['S','M'],
    emoji: '❄️',
    color: '#d0d8e0',
    desc: { ru: 'Лаконичный зимний свитер с рельефным узором. Уже нашёл свой дом, но похожий можно заказать.', en: 'Simple winter sweater with textured pattern. Already has a home, but a similar one can be ordered.' },
    images: ['❄️','🌨','🤍']
  },
  {
    id: 'prod-5', status: 'available',
    name: { ru: 'Свитер «Тундра»', en: 'Sweater «Tundra»' },
    material: { ru: 'Шерсть / кашемир 70/30', en: 'Wool / cashmere 70/30' },
    price: 68000,
    sizes: ['XS','S','M','L'],
    emoji: '🍂',
    color: '#c4a882',
    desc: { ru: 'Премиальный свитер с добавлением кашемира. Невесомый и тёплый одновременно. Роскошь ручной работы.', en: 'Premium sweater with cashmere. Weightless and warm at the same time. Handmade luxury.' },
    images: ['🍂','🤎','✨']
  },
  {
    id: 'prod-6', status: 'low',
    name: { ru: 'Свитер «Закат»', en: 'Sweater «Sunset»' },
    material: { ru: 'Мериносовая шерсть', en: 'Merino wool' },
    price: 44000,
    sizes: ['S','M','L','XL'],
    emoji: '🌅',
    color: '#d4a880',
    desc: { ru: 'Тёплый терракотовый оттенок — как закат над Каспием. Мягкая вязка, свободный крой, душевный цвет.', en: 'Warm terracotta shade — like a sunset over the Caspian. Soft knit, relaxed cut, heartfelt color.' },
    images: ['🌅','🔥','🤍']
  }
];

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
}
initMockData();

// Mock listeners tracking list
const productsListeners = [];
const maintenanceListeners = [];
const ordersListeners = [];

// ── 2. PRODUCT SERVICES ──

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

// ── 3. MAINTENANCE MODE SERVICES ──

// Real-time listener for maintenance mode
export function subscribeMaintenanceMode(callback) {
  if (db) {
    return onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().maintenanceMode || false);
      } else {
        callback(false);
      }
    }, (error) => {
      console.error('Firestore maintenance mode subscription error:', error);
      callback(false);
    });
  } else {
    // Local fallback
    maintenanceListeners.push(callback);
    const isMaintenance = localStorage.getItem(MOCK_MAINTENANCE_KEY) === 'true';
    callback(isMaintenance);
    return () => {
      const index = maintenanceListeners.indexOf(callback);
      if (index > -1) maintenanceListeners.splice(index, 1);
    };
  }
}

// Toggle maintenance mode
export async function setMaintenanceMode(enabled) {
  if (db) {
    await setDoc(doc(db, 'settings', 'global'), {
      maintenanceMode: enabled,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } else {
    // Local fallback
    localStorage.setItem(MOCK_MAINTENANCE_KEY, enabled ? 'true' : 'false');
    maintenanceListeners.forEach(listener => listener(enabled));
  }
}

// ── 4. ORDER / LEADS SERVICES ──

// Create new customer order (from storefront checkout)
export async function createOrder(customerName, customerPhone, cartItems, totalPrice) {
  const orderData = {
    customerName,
    customerPhone,
    items: cartItems,
    totalPrice,
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
