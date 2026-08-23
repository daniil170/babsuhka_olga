import { db } from '../config/firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

const MOCK_SUBSCRIBERS_KEY = 'babushka_olga_mock_subscribers';
const subscribersListeners = [];

function initMockData() {
  if (!localStorage.getItem(MOCK_SUBSCRIBERS_KEY)) {
    localStorage.setItem(MOCK_SUBSCRIBERS_KEY, JSON.stringify([]));
  }
}
initMockData();

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

export async function removeSubscriber(email) {
  if (!email) return;
  const normalized = email.trim().toLowerCase();
  
  localStorage.setItem('babushka_olga_subscribed_newsletter', 'false');

  if (db) {
    try {
      const q = query(collection(db, 'subscribers'), where('email', '==', normalized));
      const snapshot = await getDocs(q);
      const deletePromises = [];
      snapshot.forEach((docSnap) => {
        deletePromises.push(deleteDoc(doc(db, 'subscribers', docSnap.id)));
      });
      await Promise.all(deletePromises);
    } catch (err) {
      console.warn('Firestore remove subscriber notice, attempting API fallback:', err);
      try {
        await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalized })
        });
      } catch (apiErr) {
        console.error('API unsubscribe fallback error:', apiErr);
      }
    }
  } else {
    let subscribers = JSON.parse(localStorage.getItem(MOCK_SUBSCRIBERS_KEY)) || [];
    subscribers = subscribers.filter(s => s.email !== normalized);
    localStorage.setItem(MOCK_SUBSCRIBERS_KEY, JSON.stringify(subscribers));
    subscribersListeners.forEach(listener => listener(subscribers));
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
