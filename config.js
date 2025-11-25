/***************************************************
 *  GLOBALNY CONFIG — ŁADOWANY JAKO PIERWSZY
 *  Ten plik musi być najwcześniej alphabetically, np:
 *  00_config.gs
 ***************************************************/

/** ID głównego arkusza Google Sheets */
const SPREADSHEET_ID = '1eUjW_hyhHBlv4lRTNYS3wcltUarV5G6FiH_b5kujgRI';

/** ID projektu GCP / Firebase */
const PROJECT_ID = 'sprzet-skk-morzkulc';

/** Podstawowy URL Firestore REST API */
const FIRESTORE_BASE_URL =
  'https://firestore.googleapis.com/v1/projects/' +
  PROJECT_ID +
  '/databases/(default)/documents';


/***************************************************
 *  KAJAKI — KONFIGURACJA
 ***************************************************/

/** Nazwa kolekcji z kajakami w Firestore */
const KAYAKS_COLLECTION = 'kayaks';

/** Nazwa zakładki z kajakami w arkuszu */
const KAYAKS_SHEET_NAME = 'kajaki';

/**
 * Mapowanie kolumn arkusza (1-based)
 * (A–P zgodnie z aktualnym układem)
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
  UWAGI:              16,
};

/**
 * Pola, które sync kajaków ma prawo nadpisywać.
 * (Dane dynamiczne NIGDY nie są nadpisywane.)
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


/***************************************************
 *  WIOSŁA (PADDLES) — KONFIGURACJA
 ***************************************************/

/** Kolekcja w Firestore */
const PADDLES_COLLECTION = 'paddles';

/** Nazwa zakładki arkusza */
const PADDLES_SHEET_NAME = 'wiosła';

/**
 * Mapowanie kolumn arkusza (A–J)
 */
const PADDLES_COLUMNS = {
  ID:        1,  // A
  NUMER:     2,  // B
  PRODUCENT: 3,  // C
  MODEL:     4,  // D
  KOLOR:     5,  // E 
  RODZAJ:    6,  // F
  DLUGOSC:   7,  // G
  SKLADANE:  8,  // H
  BASEN:     9,  // I
  UWAGI:     10, // J
};

/**
 * Pola statyczne dla wioseł — sync nadpisuje tylko to.
 * (Spójnie z kajakami: pola stanu NIE są ruszane.)
 */
const PADDLE_STATIC_FIELDS = [
  'id',
  'numer',
  'producent',
  'model',
  'kolor',
  'rodzaj',
  'dlugosc',
  'skladane',
  'basen',
  'uwagi',
];

/***************************************************
 *  KAMIZELKI (LIFEJACKETS) — KONFIGURACJA
 ***************************************************/

/** Kolekcja w Firestore */
const LIFEJACKETS_COLLECTION = 'lifejackets';

/** Nazwa zakładki w arkuszu */
const LIFEJACKETS_SHEET_NAME = 'kamizelki';

/**
 * Mapowanie kolumn arkusza (A–I)
 */
const LIFEJACKETS_COLUMNS = {
  ID:        1,  // A
  NUMER:     2,  // B
  PRODUCENT: 3,  // C
  MODEL:     4,  // D
  KOLOR:     5,  // E
  TYP:       6,  // F
  ROZMIAR:   7,  // G
  BASEN:     8,  // H
  UWAGI:     9,  // I
};

/**
 * Pola statyczne — sync może nadpisywać tylko je.
 */
const LIFEJACKET_STATIC_FIELDS = [
  'id',
  'numer',
  'producent',
  'model',
  'kolor',
  'typ',
  'rozmiar',
  'basen',
  'uwagi',
];

/***************************************************
 *  KASKI (HELMETS) — KONFIGURACJA
 ***************************************************/

/** Kolekcja w Firestore */
const HELMETS_COLLECTION = 'helmets';

/** Nazwa zakładki w arkuszu */
const HELMETS_SHEET_NAME = 'kaski';

/**
 * Mapowanie kolumn arkusza (A–H)
 */
const HELMETS_COLUMNS = {
  ID:        1, // A
  NUMER:     2, // B
  PRODUCENT: 3, // C
  MODEL:     4, // D
  KOLOR:     5, // E
  ROZMIAR:   6, // F
  BASEN:     7, // G
  UWAGI:     8, // H
};

/**
 * Pola statyczne — sync nadpisuje tylko je
 */
const HELMET_STATIC_FIELDS = [
  'id',
  'numer',
  'producent',
  'model',
  'kolor',
  'rozmiar',
  'basen',
  'uwagi',
];

/***************************************************
 *  RZUTKI (THROWBAGS) — KONFIGURACJA
 ***************************************************/

/** Kolekcja w Firestore */
const THROWBAGS_COLLECTION = 'throwbags';

/** Nazwa zakładki w arkuszu */
const THROWBAGS_SHEET_NAME = 'rzutki';

/**
 * Mapowanie kolumn arkusza (A–D)
 */
const THROWBAGS_COLUMNS = {
  ID:        1, // A
  NUMER:     2, // B
  PRODUCENT: 3, // C
  UWAGI:     4, // D
};

/**
 * Pola statyczne — sync nadpisuje tylko je
 */
const THROWBAG_STATIC_FIELDS = [
  'id',
  'numer',
  'producent',
  'uwagi',
];

/***************************************************
 *  FARTUCHY (SPRAYSKIRTS) — KONFIGURACJA
 ***************************************************/

/** Kolekcja w Firestore */
const SPRAYSKIRTS_COLLECTION = 'sprayskirts';

/** Nazwa zakładki w arkuszu */
const SPRAYSKIRTS_SHEET_NAME = 'fartuchy';

/**
 * Mapowanie kolumn arkusza (A–I)
 */
const SPRAYSKIRTS_COLUMNS = {
  ID:            1, // A
  NUMER:         2, // B
  PRODUCENT:     3, // C
  MATERIAL:      4, // D
  ROZMIAR:       5, // E
  ROZMIAR_KOMINA:6, // F
  BASEN:         7, // G
  NIZINY:        8, // H
  UWAGI:         9, // I
};

/**
 * Pola statyczne — sync może nadpisywać tylko je
 */
const SPRAYSKIRT_STATIC_FIELDS = [
  'id',
  'numer',
  'producent',
  'material',
  'rozmiar',
  'rozmiarKomina',
  'basen',
  'niziny',
  'uwagi',
];

