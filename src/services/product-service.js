import { db, auth, isFirebaseConfigured } from '../config/firebase.js';
import { collection, doc, addDoc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

const MOCK_PRODUCTS_KEY = 'babushka_olga_mock_products';
const DEFAULT_PRODUCTS = [];

function initMockData() {
  if (!localStorage.getItem(MOCK_PRODUCTS_KEY)) {
    localStorage.setItem(MOCK_PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
  }
}
initMockData();

const productsListeners = [];
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
