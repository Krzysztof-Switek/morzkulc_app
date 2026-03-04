import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const CONFIG_PROD = {
  apiKey: "AIzaSyDp8Gyd45RkSS6cdJ32oczHGe6Fb9RrWeo",
  authDomain: "morzkulc-e9df7.firebaseapp.com",
  projectId: "morzkulc-e9df7",
  storageBucket: "morzkulc-e9df7.firebasestorage.app",
  messagingSenderId: "137214816080",
  appId: "1:137214816080:web:e4a1a6a1e25a0c694ac655"
};

const CONFIG_DEV = {
  apiKey: "AIzaSyCzWcAgskiyp1AyibbiPLeAfCUfr7e3gtg",
  authDomain: "sprzet-skk-morzkulc.firebaseapp.com",
  projectId: "sprzet-skk-morzkulc",
  storageBucket: "sprzet-skk-morzkulc.firebasestorage.app",
  messagingSenderId: "273912496654",
  appId: "1:273912496654:web:38246f0f0c6ea5d459b25f"
};

function getFirebaseConfig() {
  const host = window.location.hostname;
  if (host === "morzkulc-e9df7.web.app" || host === "morzkulc-e9df7.firebaseapp.com") {
    return CONFIG_PROD;
  }
  return CONFIG_DEV;
}

const firebaseConfig = getFirebaseConfig();

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
