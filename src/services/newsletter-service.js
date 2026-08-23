import { db, auth } from '../config/firebase.js';
import { collection, doc, addDoc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

const MOCK_NEWSLETTERS_KEY = 'babushka_olga_mock_newsletters';
const newslettersListeners = [];

function initMockData() {
  if (!localStorage.getItem(MOCK_NEWSLETTERS_KEY)) {
    localStorage.setItem(MOCK_NEWSLETTERS_KEY, JSON.stringify([]));
  }
}
initMockData();

// Real-time listener for newsletters collection
export function subscribeNewsletters(callback) {
  if (db && auth && auth.currentUser) {
    const q = query(collection(db, 'newsletters'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const newsletters = [];
      snapshot.forEach((doc) => {
        newsletters.push({ id: doc.id, ...doc.data() });
      });
      callback(newsletters);
    }, (error) => {
      console.warn('Firestore newsletters real-time listener notice:', error.message);
      const getLocal = () => JSON.parse(localStorage.getItem(MOCK_NEWSLETTERS_KEY)) || [];
      callback(getLocal());
    });
  } else {
    newslettersListeners.push(callback);
    const getLocal = () => JSON.parse(localStorage.getItem(MOCK_NEWSLETTERS_KEY)) || [];
    callback(getLocal());
    return () => {
      const index = newslettersListeners.indexOf(callback);
      if (index > -1) newslettersListeners.splice(index, 1);
    };
  }
}

// Save or update newsletter (Draft or Sent)
export async function saveNewsletter(newsletterData, id = null) {
  const data = {
    ...newsletterData,
    updatedAt: new Date().toISOString()
  };

  if (!id && !data.createdAt) {
    data.createdAt = new Date().toISOString();
  }

  if (db) {
    if (id) {
      await setDoc(doc(db, 'newsletters', id), data, { merge: true });
      return id;
    } else {
      const docRef = await addDoc(collection(db, 'newsletters'), data);
      return docRef.id;
    }
  } else {
    // Local fallback
    const items = JSON.parse(localStorage.getItem(MOCK_NEWSLETTERS_KEY)) || [];
    let savedId = id;
    if (id) {
      const index = items.findIndex(n => n.id === id);
      if (index > -1) {
        items[index] = { ...items[index], ...data };
      } else {
        items.unshift({ id, ...data });
      }
    } else {
      savedId = 'news-' + Date.now();
      items.unshift({
        id: savedId,
        createdAt: new Date().toISOString(),
        ...data
      });
    }
    localStorage.setItem(MOCK_NEWSLETTERS_KEY, JSON.stringify(items));
    newslettersListeners.forEach(listener => listener(items));
    return savedId;
  }
}

// Delete newsletter
export async function deleteNewsletter(id) {
  if (db) {
    await deleteDoc(doc(db, 'newsletters', id));
  } else {
    let items = JSON.parse(localStorage.getItem(MOCK_NEWSLETTERS_KEY)) || [];
    items = items.filter(n => n.id !== id);
    localStorage.setItem(MOCK_NEWSLETTERS_KEY, JSON.stringify(items));
    newslettersListeners.forEach(listener => listener(items));
  }
}

// Send newsletter campaign via backend API and persist result in Firestore
export async function sendNewsletterCampaign({ id = null, title, subject, content, recipientEmails }) {
  if (!recipientEmails || recipientEmails.length === 0) {
    throw new Error('Нет адресов получателей для отправки рассылки.');
  }

  // 1. Ensure a draft doc exists or save preliminary state
  let campaignId = id;
  const initialData = {
    title: title || 'Без названия',
    subject: subject || '',
    content: content || '',
    status: 'sending',
    recipientCount: recipientEmails.length,
    sentTo: recipientEmails
  };

  campaignId = await saveNewsletter(initialData, campaignId);

  // 2. Call Vercel API endpoint
  const apiUrl = import.meta.env.VITE_NEWSLETTER_API_URL || '/api/sendNewsletter';
  
  let responseData = null;
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        campaignId,
        subject,
        content,
        recipientEmails
      })
    });

    const rawText = await response.text();
    try {
      responseData = rawText ? JSON.parse(rawText) : {};
    } catch (parseErr) {
      responseData = null;
    }

    if (!response.ok) {
      if (response.status === 405 || response.status === 404) {
        throw new Error(`Ошибка ${response.status}: API рассылки не найден по адресу ${apiUrl}. Если сайт на Firebase Hosting, укажите полный URL функции Vercel в VITE_NEWSLETTER_API_URL (например: https://ваш-проект.vercel.app/api/sendNewsletter).`);
      }
      const apiErrMsg = (responseData && responseData.errors && responseData.errors.join(', ')) || `Ошибка сервера (${response.status}): ${rawText || response.statusText}`;
      throw new Error(apiErrMsg);
    }

    if (!responseData) {
      throw new Error('Пустой или некорректный ответ от API рассылки.');
    }
  } catch (apiError) {
    console.error('Newsletter API request failed:', apiError);
    // Mark as failed/draft
    await saveNewsletter({
      status: 'draft',
      errors: [apiError.message || 'Ошибка подключения к серверу отправки писем']
    }, campaignId);
    throw new Error(apiError.message || 'Не удалось отправить запрос к почтовому серверу.');
  }

  if (!responseData.success && responseData.sentCount === 0) {
    const errorMsg = (responseData.errors && responseData.errors.join(', ')) || 'Ошибка отправки рассылки.';
    await saveNewsletter({
      status: 'draft',
      errors: responseData.errors || [errorMsg]
    }, campaignId);
    throw new Error(errorMsg);
  }

  // 3. Mark as sent and record timestamps & counts
  await saveNewsletter({
    status: 'sent',
    sentAt: new Date().toISOString(),
    recipientCount: responseData.sentCount,
    failedCount: responseData.failedCount || 0,
    errors: responseData.errors || []
  }, campaignId);

  return responseData;
}
