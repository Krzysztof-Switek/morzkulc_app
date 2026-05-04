/**
 * File: env_config.gs
 * Purpose: one place for environment selection and shared constants (Kurs)
 *
 * Change ONLY this line when switching environment:
 *   const ACTIVE_ENV = "DEV";
 * or
 *   const ACTIVE_ENV = "PROD";
 */

const ACTIVE_ENV = "PROD"; // "DEV" | "PROD"

const ENV_CONFIG = {
  DEV: {
    PROJECT_ID: "sprzet-skk-morzkulc",
    FIREBASE_API_KEY: "AIzaSyCzWcAgskiyp1AyibbiPLeAfCUfr7e3gtg",
    FIRESTORE_BASE_URL:
      "https://firestore.googleapis.com/v1/projects/sprzet-skk-morzkulc/databases/(default)/documents",
    KURS_SHEET_ID: "<UZUPEŁNIJ_ID_ARKUSZA_DEV>",
  },

  PROD: {
    PROJECT_ID: "morzkulc-e9df7",
    FIREBASE_API_KEY: "AIzaSyDp8Gyd45RkSS6cdJ32oczHGe6Fb9RrWeo",
    FIRESTORE_BASE_URL:
      "https://firestore.googleapis.com/v1/projects/morzkulc-e9df7/databases/(default)/documents",
    KURS_SHEET_ID: "<UZUPEŁNIJ_ID_ARKUSZA_PROD>",
  },
};

const CONFIG = ENV_CONFIG[ACTIVE_ENV];

// Shared constants
const ADMIN_EMAIL = "admin@morzkulc.pl";
const BOARD_GROUP_EMAIL = "zarzad@morzkulc.pl";

// Tab names (must match exact sheet tab names)
const TAB_SETUP = "setup";
const TAB_UCZESTNICY = "uczestnicy";
const TAB_PO_KURSIE = "co po kursie";

// Firestore paths
const DOC_VARS_KURS = "setup/vars_kurs";
const DOC_KURS_PO_KURSIE = "setup/kurs_po_kursie";
const COLLECTION_KURS_UCZESTNICY = "kurs_uczestnicy";
