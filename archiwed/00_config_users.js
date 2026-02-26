/************************************************************
 * 01_config_users.gs — KONFIG UŻYTKOWNIKÓW
 ************************************************************/

/**
 * ID arkusza aktywnych członków i sympatyków
 */
const USERS_SPREADSHEET_ID =
  '1lF5eDF9B6ip4G497qG1QGePXqrXdLPS8kt-3pX-ZBsM';

/**
 * ID arkusza ARCHIWUM:
 * - bilans_otwarcia_26
 * - archiwum członków
 * - archiwum sympatyków
 */
const USERS_ARCHIVE_SPREADSHEET_ID =
  '19Ay1DkcaTX94ph4N1PtitSke6kpeVXMpjcB6XDHLfko';

/***************************************************
 * Zakładka aktywnych użytkowników
 ***************************************************/
const MEMBERS_MAIN_SHEET_NAME = 'członkowie i sympatycy';

/***************************************************
 * Zakładki arkusza ARCHIWUM
 ***************************************************/
const HISTORY_BALANCE_SHEET_NAME      = 'bilans_otwarcia_26';
const HISTORY_ARCH_MEMBERS_SHEET_NAME = 'członkowie archiwum';
const HISTORY_ARCH_SYMP_SHEET_NAME    = 'sympatycy archiwum';

/***************************************************
 * KOLEKCJE FIRESTORE – użytkownicy
 ***************************************************/
const USERS_ACTIVE_COLLECTION       
    = 'users_active';
const USERS_ARCHIVED_COLLECTION         = 'users_archived';
const USERS_OPENING_BALANCE_COLLECTION  = 'users_opening_balance_26';
const USERS_COLLECTION                 = 'users';

/***************************************************
 * Role — wartości startowe
 ***************************************************/
const USER_ROLES = {
  ZARZAD:   'Zarząd',
  KR:       'KR',
  CZLONEK:  'Członek',
  KANDYDAT: 'Kandydat',
  SYMPATYK: 'Sympatyk',
};

/***************************************************
 * Statusy — wartości startowe
 ***************************************************/
const USER_STATUSES = {
  AKTYWNY:     'Aktywny',
  ZAWIESZONY:  'Zawieszony',
  REZYGNACJA:  'Rezygnacja',
  SKRESLONY:   'Skreślony',
  PENDING: 'pending',
};
