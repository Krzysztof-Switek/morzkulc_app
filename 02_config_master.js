/************************************************************
 * 02_config_master.gs — centralny CONFIG projektu (ORKIESTRATOR)
 *
 * WAŻNE:
 * - Ten plik NIE definiuje żadnych ID arkuszy.
 * - Wszystkie ID i stałe pochodzą z 00_config_users.js i 01_config_gear.js.
 ************************************************************/

/** ID projektu Firestore */
const PROJECT_ID = 'sprzet-skk-morzkulc';

/** Podstawowy URL Firestore REST API */
const FIRESTORE_BASE_URL =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/************************************************************
 * COMPAT: alias dla starej nazwy stałej
 * (w projekcie mamy USERS_ARCHIVE_SPREADSHEET_ID z 00_config_users.js)
 ************************************************************/
const USERS_HISTORY_SPREADSHEET_ID = USERS_ARCHIVE_SPREADSHEET_ID;

/************************************************************
 * FINALNY CONFIG eksportowany globalnie
 * (zbiera wartości z config_users + config_gear)
 ************************************************************/
const CONFIG = {
  PROJECT_ID,
  FIRESTORE_BASE_URL,

  /*******************
   * UŻYTKOWNICY
   *******************/
  USERS_SPREADSHEET_ID,

  // compat + czytelność
  USERS_HISTORY_SPREADSHEET_ID,      // alias -> USERS_ARCHIVE_SPREADSHEET_ID
  USERS_ARCHIVE_SPREADSHEET_ID,      // właściwa nazwa z 00_config_users.js

  MEMBERS_MAIN_SHEET_NAME,

  HISTORY_BALANCE_SHEET_NAME,
  HISTORY_ARCH_MEMBERS_SHEET_NAME,
  HISTORY_ARCH_SYMP_SHEET_NAME,

  USER_ROLES,
  USER_STATUSES,
  USERS_SHEET_NAME: MEMBERS_MAIN_SHEET_NAME,

  USERS_ACTIVE_COLLECTION,
  USERS_ARCHIVED_COLLECTION,
  USERS_OPENING_BALANCE_COLLECTION,

  /*******************
   * SPRZĘT
   *******************/
  EQUIPMENT_SPREADSHEET_ID,
  KAYAKS_COLLECTION,
  KAYAKS_SHEET_NAME,
  PADDLES_COLLECTION,
  PADDLES_SHEET_NAME,
  LIFEJACKETS_COLLECTION,
  LIFEJACKETS_SHEET_NAME,
  HELMETS_COLLECTION,
  HELMETS_SHEET_NAME,
  THROWBAGS_COLLECTION,
  THROWBAGS_SHEET_NAME,
  SPRAYSKIRTS_COLLECTION,
  SPRAYSKIRTS_SHEET_NAME
};
