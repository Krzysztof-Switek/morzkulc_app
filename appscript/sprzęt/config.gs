/** config.gs */

/**
 * WAŻNE
 * - DEV  = sprzet-skk-morzkulc
 * - PROD = morzkulc-e9df7
 * - Ten plik wybiera środowisko przez CURRENT_ENV.
 * - W projekcie DEV ustaw CURRENT_ENV = "dev"
 * - W projekcie PROD ustaw CURRENT_ENV = "prod"
 *
 * ZASADA
 * - Nigdy nie zostawiaj PROJECT_ID wpisanego na sztywno bez rozróżnienia env.
 * - Sync z DEV ma pisać tylko do DEV.
 * - Sync z PROD ma pisać tylko do PROD.
 */

const CURRENT_ENV = "prod"; // "dev" | "prod"

function buildGearCategoriesConfig_() {
  return {
    kayaks: {
      key: "kayaks",
      label: "Kajaki",
      collection: "gear_kayaks",
      sheetTab: "kajaki",
      idHeader: "ID",
    },
    paddles: {
      key: "paddles",
      label: "Wiosła",
      collection: "gear_paddles",
      sheetTab: "wiosła",
      idHeader: "ID",
    },
    lifejackets: {
      key: "lifejackets",
      label: "Kamizelki",
      collection: "gear_lifejackets",
      sheetTab: "kamizelki",
      idHeader: "ID",
    },
    helmets: {
      key: "helmets",
      label: "Kaski",
      collection: "gear_helmets",
      sheetTab: "kaski",
      idHeader: "ID",
    },
    throwbags: {
      key: "throwbags",
      label: "Rzutki",
      collection: "gear_throwbags",
      sheetTab: "rzutki",
      idHeader: "ID",
    },
    sprayskirts: {
      key: "sprayskirts",
      label: "Fartuchy",
      collection: "gear_sprayskirts",
      sheetTab: "fartuchy",
      idHeader: "ID",
    },
  };
}

const CONFIG_DEV = {
  ENV_NAME: "dev",
  PROJECT_ID: "sprzet-skk-morzkulc",
  DATABASE_ID: "(default)",

  // Backward compatibility with old kayak-only sync
  KAYAKS_COLLECTION: "gear_kayaks",
  SHEET_TAB_KAYAKS: "kajaki",
  SHEET_ID_HEADER: "ID",

  // New multi-gear config
  GEAR_CATEGORIES: buildGearCategoriesConfig_(),

  // If true, skip rows where "ID" is empty
  SKIP_ROWS_WITHOUT_ID: true,

  // Optional: limit rows for test runs (null = no limit)
  DEFAULT_LIMIT: null,

  // Missing-in-sheet -> scrapped in Firestore
  SCRAP_FIELD_NAME: "gearScrapped",
  SCRAP_AT_FIELD_NAME: "scrappedAt",

  // Firestore list pagination
  FIRESTORE_LIST_PAGE_SIZE: 200,
};

const CONFIG_PROD = {
  ENV_NAME: "prod",
  PROJECT_ID: "morzkulc-e9df7",
  DATABASE_ID: "(default)",

  // Backward compatibility with old kayak-only sync
  KAYAKS_COLLECTION: "gear_kayaks",
  SHEET_TAB_KAYAKS: "kajaki",
  SHEET_ID_HEADER: "ID",

  // New multi-gear config
  GEAR_CATEGORIES: buildGearCategoriesConfig_(),

  // If true, skip rows where "ID" is empty
  SKIP_ROWS_WITHOUT_ID: true,

  // Optional: limit rows for test runs (null = no limit)
  DEFAULT_LIMIT: null,

  // Missing-in-sheet -> scrapped in Firestore
  SCRAP_FIELD_NAME: "gearScrapped",
  SCRAP_AT_FIELD_NAME: "scrappedAt",

  // Firestore list pagination
  FIRESTORE_LIST_PAGE_SIZE: 200,
};

const CONFIG = CURRENT_ENV === "prod" ? CONFIG_PROD : CONFIG_DEV;