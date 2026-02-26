import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDp8Gyd45RkSS6cdJ32oczHGe6Fb9RrWeo",
  authDomain: "morzkulc-e9df7.firebaseapp.com",
  projectId: "morzkulc-e9df7",
  storageBucket: "morzkulc-e9df7.firebasestorage.app",
  messagingSenderId: "137214816080",
  appId: "1:137214816080:web:e4a1a6a1e25a0c694ac655"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export function authOnChange(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function authLoginPopup() {
  await signInWithPopup(auth, provider);
}

export async function authLogout() {
  await signOut(auth);
}

export async function authGetIdToken(user, forceRefresh = false) {
  return await user.getIdToken(forceRefresh);
}

export function authGetBasicUser(user) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName
  };
}
