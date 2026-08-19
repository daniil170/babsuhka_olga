import { auth } from '../config/firebase.js';
import { 
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, sendPasswordResetEmail
} from 'firebase/auth';

const MOCK_AUTH_KEY = 'babushka_olga_mock_admin';

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
