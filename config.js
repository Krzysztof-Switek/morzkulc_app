/** ID głównego arkusza Google Sheets */
const SPREADSHEET_ID = '1eUjW_hyhHBlv4lRTNYS3wcltUarV5G6FiH_b5kujgRI';

/** ID projektu GCP / Firebase */
const PROJECT_ID = 'sprzet-skk-morzkulc';

/** Podstawowy URL Firestore REST API */
const FIRESTORE_BASE_URL =
  'https://firestore.googleapis.com/v1/projects/' +
  PROJECT_ID +
  '/databases/(default)/documents';

/** Nazwa kolekcji z kajakami w Firestore */
const KAYAKS_COLLECTION = 'kayaks';

/** Nazwa zakładki z kajakami w arkuszu */
const KAYAKS_SHEET_NAME = 'kajaki';

/**
 * Mapowanie kolumn arkusza (1-based, jak w Apps Script).
 * Nowy układ kolumn:
 * A: ID
 * B: Numer kajaka
 * C: Producent
 * D: Model
 * E: Zdjęcie URL
 * F: Kolor
 * G: Typ
 * H: Litrów
 * I: Zakres wag
 * J: Kokpit
 * K: Sprawny?
 * L: Basen?
 * M: Prywatny?
 * N: Prywatny do wypożyczenia?
 * O: Kontakt do właściciela
 * P: Uwagi
 */
const KAYAKS_COLUMNS = {
  ID:                 1,
  NUMER_KAJAKA:       2,
  PRODUCENT:          3,
  MODEL:              4,
  ZDJECIE:            5,
  KOLOR:              6,
  TYP:                7,
  LITROW:             8,
  ZAKRES_WAG:         9,
  KOKPIT:             10,
  SPRAWNY:            11,
  BASEN:              12,
  PRYWATNY:           13,
  PRYWATNY_DO_WYPOZ:  14,
  KONTAKT_WLASCICIEL: 15,
  UWAGI:              16
};

/**
 * Lista pól statycznych.
 * Sync NADPISUJE tylko te dane z arkusza.
 * Pola dynamiczne (dostepny, od, do, aktualnyUzytkownik) są nietykalne.
 */
const KAYAK_STATIC_FIELDS = [
  'id',
  'numerKajaka',
  'producent',
  'model',
  'zdjecieUrl',
  'kolor',
  'typ',
  'litrow',
  'zakresWag',
  'kokpit',
  'sprawny',
  'basen',
  'prywatny',
  'privateAvailable',
  'privateOwnerEmail',
  'uwagi',
];
