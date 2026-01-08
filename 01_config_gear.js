/************************************************************
 * CONFIG SPRZĘTU 
 ************************************************************/

/** ID arkusza sprzętowego */
const EQUIPMENT_SPREADSHEET_ID =
  '1eUjW_hyhHBlv4lRTNYS3wcltUarV5G6FiH_b5kujgRI';

/***************************************************
 * KAJAKI
 ***************************************************/
const KAYAKS_COLLECTION = 'kayaks';
const KAYAKS_SHEET_NAME = 'kajaki';

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
 * WIOSŁA
 ***************************************************/
const PADDLES_COLLECTION = 'paddles';
const PADDLES_SHEET_NAME = 'wiosła';

const PADDLES_COLUMNS = {
  ID:        1,
  NUMER:     2,
  PRODUCENT: 3,
  MODEL:     4,
  KOLOR:     5,
  RODZAJ:    6,
  DLUGOSC:   7,
  SKLADANE:  8,
  BASEN:     9,
  UWAGI:     10,
};

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
 * KAMIZELKI
 ***************************************************/
const LIFEJACKETS_COLLECTION = 'lifejackets';
const LIFEJACKETS_SHEET_NAME = 'kamizelki';

const LIFEJACKETS_COLUMNS = {
  ID:        1,
  NUMER:     2,
  PRODUCENT: 3,
  MODEL:     4,
  KOLOR:     5,
  TYP:       6,
  ROZMIAR:   7,
  BASEN:     8,
  UWAGI:     9,
};

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
 * KASKI
 ***************************************************/
const HELMETS_COLLECTION = 'helmets';
const HELMETS_SHEET_NAME = 'kaski';

const HELMETS_COLUMNS = {
  ID:        1,
  NUMER:     2,
  PRODUCENT: 3,
  MODEL:     4,
  KOLOR:     5,
  ROZMIAR:   6,
  BASEN:     7,
  UWAGI:     8,
};

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
 * RZUTKI
 ***************************************************/
const THROWBAGS_COLLECTION = 'throwbags';
const THROWBAGS_SHEET_NAME = 'rzutki';

const THROWBAGS_COLUMNS = {
  ID:        1,
  NUMER:     2,
  PRODUCENT: 3,
  UWAGI:     4,
};

const THROWBAG_STATIC_FIELDS = [
  'id',
  'numer',
  'producent',
  'uwagi',
];

/***************************************************
 * FARTUCHY
 ***************************************************/
const SPRAYSKIRTS_COLLECTION = 'sprayskirts';
const SPRAYSKIRTS_SHEET_NAME = 'fartuchy';

const SPRAYSKIRTS_COLUMNS = {
  ID:             1,
  NUMER:          2,
  PRODUCENT:      3,
  MATERIAL:       4,
  ROZMIAR:        5,
  ROZMIAR_KOMINA: 6,
  BASEN:          7,
  NIZINY:         8,
  UWAGI:          9,
};

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
