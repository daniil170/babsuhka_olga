import { db } from '../config/firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

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
