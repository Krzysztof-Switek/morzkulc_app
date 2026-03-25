import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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
  authDomain: "sprzet-skk-morzkulc.firebaseapp.com",
  projectId: "sprzet-skk-morzkulc",
  storageBucket: "sprzet-skk-morzkulc.firebasestorage.app",
  messagingSenderId: "867472588411",
  appId: "1:867472588411:web:2f92f3dfe7b34a76e2d5d1"
};

const PROD_CONFIG = {
  apiKey: "AIzaSyDp8Gyd45RkSS6cdJ32oczHGe6Fb9RrWeo",
  authDomain: "morzkulc-e9df7.firebaseapp.com",
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

const storage = getStorage(app);

function kayakStorageNumber(number) {
  const n = String(number || "").trim();
  // Numer katalogu: zawsze 3 cyfry (np. "13" -> "013")
  const padded = /^\d+$/.test(n) && n.length < 3 ? n.padStart(3, "0") : n;
  return { n, padded };
}

// Cover: próbuje thumbnail (mały, szybki), fallback na oryginał
// Thumbnail generowany przez Firebase "Resize Images" extension:
//   GEAR/KAJAKS/013/COVER/13_cover_thumb.jpg
// Oryginał:
//   GEAR/KAJAKS/013/COVER/13_cover.jpg
export async function storageFetchKayakCoverUrl(number) {
  const { n, padded } = kayakStorageNumber(number);
  const thumbPath = `GEAR/KAJAKS/${padded}/COVER/${n}_cover_thumb.jpg`;
  const fullPath = `GEAR/KAJAKS/${padded}/COVER/${n}_cover.jpg`;
  try {
    return await getDownloadURL(ref(storage, thumbPath));
  } catch {
    // brak thumbnailа — fallback na pełne zdjęcie
    try {
      return await getDownloadURL(ref(storage, fullPath));
    } catch {
      return null;
    }
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
