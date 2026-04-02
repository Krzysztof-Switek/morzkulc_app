import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getStorage,
  ref,
  listAll,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const DEV_CONFIG = {
  apiKey: "AIzaSyCzWcAgskiyp1AyibbiPLeAfCUfr7e3gtg",
  authDomain: "sprzet-skk-morzkulc.web.app",
  projectId: "sprzet-skk-morzkulc",
  storageBucket: "sprzet-skk-morzkulc.firebasestorage.app",
  messagingSenderId: "867472588411",
  appId: "1:867472588411:web:2f92f3dfe7b34a76e2d5d1"
};

const PROD_CONFIG = {
  apiKey: "AIzaSyDp8Gyd45RkSS6cdJ32oczHGe6Fb9RrWeo",
  authDomain: "morzkulc-e9df7.web.app",
  projectId: "morzkulc-e9df7",
  storageBucket: "morzkulc-e9df7.firebasestorage.app",
  messagingSenderId: "137214816080",
  appId: "1:137214816080:web:e4a1a6a1e25a0c694ac655"
};

function getFirebaseConfig() {
  const host = String(window.location.hostname || "").trim().toLowerCase();

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "sprzet-skk-morzkulc.web.app" ||
    host === "sprzet-skk-morzkulc.firebaseapp.com"
  ) {
    return DEV_CONFIG;
  }

  if (
    host === "morzkulc-e9df7.web.app" ||
    host === "morzkulc-e9df7.firebaseapp.com"
  ) {
    return PROD_CONFIG;
  }

  console.warn("Unknown host for Firebase config, fallback to DEV:", host);
  return DEV_CONFIG;
}

const firebaseConfig = getFirebaseConfig();
export const isDev = firebaseConfig === DEV_CONFIG;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// getRedirectResult jest wywoływane przez app_shell.js w starcie (authHandleRedirectResult),
// PRZED rejestracją onAuthStateChanged — dzięki temu stan auth jest ustawiony
// zanim listener po raz pierwszy się odpali.

export function authOnChange(cb) {
  return onAuthStateChanged(auth, cb);
}

// Przetwarza wynik redirect po powrocie ze strony OAuth Google.
// Musi być wywołane i oczekiwane PRZED rejestracją onAuthStateChanged,
// żeby stan auth był już ustawiony gdy listener odpali się po raz pierwszy.
// Zwraca user lub null. Rzuca wyjątek tylko przy realnym błędzie auth.
export async function authHandleRedirectResult() {
  const result = await getRedirectResult(auth);
  return result?.user ?? null;
}

function needsRedirectAuth() {
  const ua = navigator.userAgent;
  // Wszystkie przeglądarki na iOS (Safari, Chrome/CriOS, Firefox/FxiOS, Edge/EdgiOS)
  // wymagają redirect — popup otwiera się jako osobna karta bez window.opener,
  // więc Firebase nie może przekazać wyniku auth z powrotem do oryginalnej karty.
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches;
  return isIOS || isStandalone;
}

export async function authLoginPopup() {
  if (needsRedirectAuth()) {
    await signInWithRedirect(auth, provider);
  } else {
    await signInWithPopup(auth, provider);
  }
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

const storage = getStorage(app);

function kayakStorageNumber(number) {
  const n = String(number || "").trim();
  // Numer katalogu: zawsze 3 cyfry (np. "13" -> "013")
  const padded = /^\d+$/.test(n) && n.length < 3 ? n.padStart(3, "0") : n;
  return { n, padded };
}

// Cover: listuje katalog COVER i pobiera URL pierwszego pliku.
// Preferuje thumbnail (plik z "_thumb" w nazwie), fallback na pierwszy dostępny.
// Działa niezależnie od rozszerzenia (.jpg, .webp, .png itp.).
//   GEAR/KAJAKS/013/COVER/
export async function storageFetchKayakCoverUrl(number) {
  const { padded } = kayakStorageNumber(number);
  try {
    const coverRef = ref(storage, `GEAR/KAJAKS/${padded}/COVER`);
    const listing = await listAll(coverRef);
    if (!listing.items.length) return null;
    const thumb = listing.items.find((item) => item.name.includes("_thumb"));
    const target = thumb || listing.items[0];
    return await getDownloadURL(target);
  } catch {
    return null;
  }
}

// Galeria: wszystkie pliki z GEAR/KAJAKS/013/GALLERY/
export async function storageFetchKayakGalleryUrls(number) {
  const { padded } = kayakStorageNumber(number);
  const galleryRef = ref(storage, `GEAR/KAJAKS/${padded}/GALLERY`);
  const result = await listAll(galleryRef);
  if (!result.items.length) return [];
  return Promise.all(result.items.map((item) => getDownloadURL(item)));
}
