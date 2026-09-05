import {computeBlockIso, overlapsIso, maxStartIsoByWeeks, todayIsoUTC, daysOnWaterInclusive} from "../../calendar/calendar_utils";
import {getGearVars, roleMaxItems, roleMaxWeeks} from "../../setup/setup_gear_vars";
import {quoteKayaksCostHours} from "../../hours/hours_quote";
import {deductHoursInTx, reverseDeductHoursInTx, writeWaivedSpendInTx, refundHoursForReservationInTx} from "../../hours/godzinki_service";
import {getGodzinkiVars} from "../../hours/godzinki_vars";
import {isUserStatusBlocked} from "../../users/userStatusCheck";
import {updateReservationDates} from "../kayaks/gear_kayaks_service";
import {countMyOverlappingItemsByCategory, countItemsByCategory, findCategoryOverLimit} from "../shared/reservation_limits";
import {findActiveKierownikEvent} from "../../calendar/events_service";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type BundleItemInput = {
  itemId: string;
  category: string;
};

export type BundleItemStored = {
  itemId: string;
  category: string;
  itemNumber: string;
  itemLabel: string;
  isPrimary: boolean;
  isKayak: boolean;
};

export type ReservationKind = "kayak_bundle" | "gear_only";

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const CATEGORY_COLLECTIONS: Record<string, string> = {
  kayaks: "gear_kayaks",
  paddles: "gear_paddles",
  lifejackets: "gear_lifejackets",
  helmets: "gear_helmets",
  throwbags: "gear_throwbags",
  sprayskirts: "gear_sprayskirts",
};

// Priority order for computing the primary item in a bundle.
// Lower index = higher priority. A kayak always wins.
const CATEGORY_PRIORITY = ["kayaks", "paddles", "lifejackets", "helmets", "sprayskirts", "throwbags"];

// ──────────────────────────────────────────────────────────────────────────────
// Pure helpers — these are mirrored exactly in test_bundle_reservations.py
// ──────────────────────────────────────────────────────────────────────────────

function norm(s: any): string {
  return String(s || "").trim();
}

/**
 * Composite identifier for an item across all categories.
 * Format: "{category}/{itemId}" — e.g. "kayaks/K01", "paddles/P01"
 */
export function compositeId(category: string, itemId: string): string {
  return `${norm(category)}/${norm(itemId)}`;
}

export function isSupportedBundleCategory(category: string): boolean {
  return Object.prototype.hasOwnProperty.call(CATEGORY_COLLECTIONS, norm(category).toLowerCase());
}

/**
 * Determines reservationKind from an item list.
 * "kayak_bundle" if any item is in the "kayaks" category, "gear_only" otherwise.
 */
export function computeReservationKind(items: BundleItemInput[]): ReservationKind {
  return items.some((i) => norm(i.category).toLowerCase() === "kayaks") ?
    "kayak_bundle" :
    "gear_only";
}

/**
 * Returns the index of the primary item in the stored items array.
 * Primary = item in highest-priority category. If multiple items share the
 * same category, the first one (as provided) is primary.
 */
export function computePrimaryItemIdx(items: BundleItemStored[]): number {
  for (const cat of CATEGORY_PRIORITY) {
    const idx = items.findIndex((i) => norm(i.category).toLowerCase() === cat);
    if (idx !== -1) return idx;
  }
  return 0;
}

function uniqBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const t of arr) {
    const k = key(t);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

// Nazwy kategorii w mianowniku l. poj. — do krótkiego opisu pojedynczej pozycji.
const CATEGORY_NOUN_SINGULAR: Record<string, string> = {
  kayaks: "kajak",
  paddles: "wiosło",
  lifejackets: "kamizelka",
  helmets: "kask",
  sprayskirts: "fartuch",
  throwbags: "rzutka",
};

// Zakres dat skrócony do formatu "dd-mm do dd-mm rr" (czytelny w wąskiej komórce godzinek).
function formatShortRange(startIso: string, endIso: string): string {
  const s = norm(startIso).split("-");
  const e = norm(endIso).split("-");
  if (s.length !== 3 || e.length !== 3) return `${startIso}–${endIso}`;
  const yy = e[0].slice(2);
  return `${s[2]}-${s[1]} do ${e[2]}-${e[1]} ${yy}`;
}

// Krótki opis rezerwacji do historii godzinek: "Rezerwacja {typ}" dla pojedynczej
// pozycji, "Rezerwacja zestaw" dla kompletu. Bez sufiksu o zwolnieniu — informację
// o szkoleniówce niesie znacznik "zwolnienie kurs RRRR" (pole schoolYear na rekordzie).
function buildCostReason(items: BundleItemStored[], startDate: string, endDate: string): string {
  const range = formatShortRange(startDate, endDate);
  if (items.length === 1) {
    const noun = CATEGORY_NOUN_SINGULAR[norm(items[0]?.category).toLowerCase()] || "sprzęt";
    return `Rezerwacja ${noun} ${range}`;
  }
  return `Rezerwacja zestaw ${range}`;
}

function buildNonKayakMeta(d: any, cat: string): Record<string, any> {
  switch (cat) {
  case "paddles":
    return {
      lengthCm: d?.lengthCm ?? null,
      featherAngle: norm(d?.featherAngle),
      isBreakdown: d?.isBreakdown ?? null,
    };
  case "lifejackets":
    return {buoyancy: norm(d?.buoyancy)};
  case "helmets":
    return {};
  case "throwbags":
    return {};
  case "sprayskirts":
    return {
      material: norm(d?.material),
      tunnelSize: norm(d?.tunnelSize),
    };
  default:
    return {};
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Firestore: user auth
// ──────────────────────────────────────────────────────────────────────────────

async function getUserRole(db: FirebaseFirestore.Firestore, uid: string) {
  const snap = await db.collection("users_active").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  return {
    roleKey: norm(data?.role_key) || "rola_sympatyk",
    statusKey: norm(data?.status_key) || "status_aktywny",
    email: norm(data?.email),
  };
}

/**
 * Wyciąga 4-cyfrowy rok ze stringa "rok szkoleniówki"/daty.
 * "2026" / "15.02.2026" / "2026-02-15" → 2026; "wpisowe" / puste / inne → null.
 */
export function parseSchoolYear(raw: any): number | null {
  const m = String(raw ?? "").trim().match(/(\d{4})/);
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) && y >= 2000 && y <= 2100 ? y : null;
}

/**
 * Master-przełącznik zarządu "kursant wypożycza sprzęt" — zmienna `kurs_wypożycza`
 * w zakładce "Vars_KURS" arkusza "App_SETUP", zsynchronizowana zadaniem
 * setup.syncFromSheet do Firestore `setup/vars_kurs.vars.kurs_wypożycza`.
 */
export async function getKursWypozyczaFlag(db: FirebaseFirestore.Firestore): Promise<boolean> {
  const snap = await db.collection("setup").doc("vars_kurs").get();
  const value = snap.exists ? (snap.data() as any)?.vars?.["kurs_wypożycza"]?.value : undefined;
  return value === true;
}

/**
 * Dzień końca okna szkoleniówki (zawsze wrzesień — nikt w projekcie nie przewiduje
 * kursu kończącego się w innym miesiącu; kod historycznie miał zaszyte na sztywno
 * "-09-30" w 4 miejscach zamiast czytać tę wartość). Źródło:
 * setup/vars_kurs.vars.koniec_kursu.value — zakładka "Vars_KURS" arkusza "App_SETUP"
 * (tam samo, gdzie kurs_wypożycza) — liczba 1-30. Tolerancyjne wobec błędów wpisu
 * (np. "30.09" wpisane jako dzień.miesiąc i odczytane jako liczba dziesiętna 30.09 →
 * floor → 30); poza zakresem lub nieodczytywalne → domyślne 30.
 */
export async function getKursWindowEndDay(db: FirebaseFirestore.Firestore): Promise<number> {
  const DEFAULT_DAY = 30;
  const snap = await db.collection("setup").doc("vars_kurs").get();
  const raw = snap.exists ? (snap.data() as any)?.vars?.koniec_kursu?.value : undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_DAY;
  const day = Math.floor(n);
  return day >= 1 && day <= 30 ? day : DEFAULT_DAY;
}

/** Sufiks "MM-DD" końca okna szkoleniówki, do doklejenia po roku: `${rok}-${suffix}`. */
export async function getKursWindowEndSuffix(db: FirebaseFirestore.Firestore): Promise<string> {
  const day = await getKursWindowEndDay(db);
  return `09-${String(day).padStart(2, "0")}`;
}

/**
 * Rok rozpoczęcia kursu (szkoleniówki) użytkownika — kursant i kandydat czytają to
 * samo pole: users_active/{uid}.admin.schoolYear (kolumna arkusza "rok_szkoleniowki",
 * arkusz "członkowie sympatycy SKK" — jedyne źródło od Wariantu C, patrz
 * Audyty/17.08_*; dawna kolekcja kurs_uczestnicy jest wygaszona). Inne role → null.
 */
async function resolveSchoolYear(
  db: FirebaseFirestore.Firestore,
  roleKey: string,
  uid: string,
  _email: string
): Promise<number | null> {
  if (roleKey === "rola_kursant" || roleKey === "rola_kandydat") {
    const snap = await db.collection("users_active").doc(uid).get();
    return parseSchoolYear(snap.exists ? (snap.data() as any)?.admin?.schoolYear : null);
  }
  return null;
}

/**
 * Czy rezerwacja jest zwolniona z opłaty godzinkowej za sprzęt.
 *
 * Reguła (decyzja zarządu): tegoroczna szkoleniówka (rok == bieżący rok kalendarzowy)
 * i rezerwacja składana do końca września tego roku — liczone po DACIE ZŁOŻENIA
 * rezerwacji (now), nie po terminie rezerwacji. Zwolnienie obejmuje kursanta i kandydata.
 */
async function isFreeRentalExempt(
  db: FirebaseFirestore.Firestore,
  schoolYear: number | null,
  now: Date = new Date()
): Promise<boolean> {
  if (!schoolYear) return false;
  if (schoolYear !== now.getUTCFullYear()) return false;
  const endSuffix = await getKursWindowEndSuffix(db);
  return now.toISOString().slice(0, 10) <= `${schoolYear}-${endSuffix}`;
}

/**
 * Bramka rezerwacji dla kursanta (wspólna dla create i update).
 *
 * Kursant rezerwuje na zasadach kandydata (te same limity i bezpłatne wypożyczenie
 * w oknie szkoleniówki), ale TYLKO gdy:
 *   - zarząd włączył wypożyczanie kursantów (setup/vars_members.vars.kurs_wypożycza,
 *     patrz getKursWypozyczaFlag),
 *   - jest w oknie szkoleniówki (zwolnienie obowiązuje — do 30 września roku kursu).
 *
 * Okno 30.09 jest mechanizmem wygaśnięcia roli czasowej: po nim kursant traci dostęp
 * do wypożyczeń. role_key NIE jest zmieniany automatem — docelową rolę nadaje zarząd
 * ręcznie w arkuszu (panel zarządu listuje kursantów po terminie).
 *
 * Zwraca obiekt błędu, gdy rezerwacja niedozwolona, albo null gdy dozwolona.
 */
async function assertKursantRentalAllowed(
  db: FirebaseFirestore.Firestore,
  exempt: boolean,
  schoolYear: number | null
): Promise<{ok: false; code: string; message: string; details?: any} | null> {
  const flagOn = await getKursWypozyczaFlag(db);
  if (!flagOn) {
    return {ok: false, code: "forbidden", message: "Rezerwacje dla kursantów są obecnie wyłączone."};
  }
  if (!exempt) {
    if (!schoolYear) {
      return {ok: false, code: "kursant_no_year", message: "Brak roku szkoleniówki na liście kursantów — skontaktuj się z zarządem: zarzad@morzkulc.pl"};
    }
    const endDay = await getKursWindowEndDay(db);
    return {
      ok: false,
      code: "kursant_window_closed",
      message: `Jako kursant możesz wypożyczać sprzęt tylko do ${endDay} września ${schoolYear}. Po tym terminie zarząd nada Ci rolę docelową.`,
      details: {schoolYear},
    };
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Firestore: item detail fetching + validation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches and validates item details from their respective Firestore collections.
 * Validates that each item:
 *   - exists in its collection
 *   - is active and not scrapped
 *   - passes category-specific reservability checks (kayaks: isOperational, isPrivate)
 */
export async function fetchItemDetails(
  db: FirebaseFirestore.Firestore,
  items: BundleItemInput[]
): Promise<
  | {ok: true; items: BundleItemStored[]}
  | {ok: false; code: string; message: string; details?: any}
> {
  // Group by category for batch fetching
  const byCategory = new Map<string, string[]>();
  for (const item of items) {
    const cat = norm(item.category).toLowerCase();
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    const catList = byCategory.get(cat);
    if (catList) catList.push(norm(item.itemId));
  }

  // Fetch each category and build a map: compositeId → doc data
  const foundDocs = new Map<string, any>();

  for (const [cat] of byCategory.entries()) {
    const collection = CATEGORY_COLLECTIONS[cat];
    if (!collection) {
      return {ok: false, code: "invalid_category", message: `Nieobsługiwana kategoria: ${cat}`};
    }

    const snap = await db.collection(collection).where("isActive", "==", true).get();
    for (const doc of snap.docs) {
      const d = doc.data() as any;
      if (d?.gearScrapped === true) continue;
      const resolvedId = norm(d?.id) || doc.id;
      foundDocs.set(compositeId(cat, resolvedId), {...d, _resolvedId: resolvedId, _category: cat});
    }
  }

  // Validate and build result list
  const result: BundleItemStored[] = [];

  for (const inputItem of items) {
    const cat = norm(inputItem.category).toLowerCase();
    const iid = norm(inputItem.itemId);
    const cid = compositeId(cat, iid);
    const found = foundDocs.get(cid);

    if (!found) {
      return {
        ok: false,
        code: "item_not_found",
        message: `Nie znaleziono przedmiotu: ${iid} (kategoria: ${cat})`,
        details: {itemId: iid, category: cat},
      };
    }

    // Category-specific checks
    if (cat === "kayaks") {
      const storageVal = norm(found?.storage || found?.storedAt).toLowerCase();
      if (storageVal === "basen") {
        return {
          ok: false,
          code: "item_not_reservable",
          message: `Kajak ${iid} jest przypisany do basenu i nie może być rezerwowany w module Sprzęt`,
          details: {itemId: iid, category: cat},
        };
      }
      if (found.isOperational !== true) {
        return {
          ok: false,
          code: "item_not_operational",
          message: `Kajak ${iid} jest niesprawny`,
          details: {itemId: iid, category: cat},
        };
      }
      if (found.isPrivate === true && found.isPrivateRentable !== true) {
        return {
          ok: false,
          code: "item_not_reservable",
          message: `Kajak prywatny ${iid} nie jest dostępny do rezerwacji`,
          details: {itemId: iid, category: cat},
        };
      }
    }

    // Drobny sprzęt przypisany do basenu (wiosła/kamizelki/kaski/fartuchy) — wykluczony
    // z wypożyczenia w module Sprzęt, tak samo jak kajaki ze storedAt="Basen" powyżej.
    if (["paddles", "lifejackets", "helmets", "sprayskirts"].includes(cat) && found?.isPoolAllowed === true) {
      return {
        ok: false,
        code: "item_not_reservable",
        message: `Przedmiot ${iid} jest przypisany do basenu i nie może być rezerwowany w module Sprzęt`,
        details: {itemId: iid, category: cat},
      };
    }

    const isKayak = cat === "kayaks";
    const number = norm(found?.number || found?._resolvedId);
    const brand = norm(found?.brand);
    const model = norm(found?.model);
    const label = [brand, model].filter(Boolean).join(" ") || number || cat;

    result.push({
      itemId: iid,
      category: cat,
      itemNumber: number,
      itemLabel: label,
      isPrimary: false, // set below
      isKayak,
    });
  }

  // Mark primary
  const primaryIdx = computePrimaryItemIdx(result);
  result.forEach((item, idx) => {
    item.isPrimary = idx === primaryIdx;
  });

  return {ok: true, items: result};
}

// ──────────────────────────────────────────────────────────────────────────────
// Firestore: conflict detection
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Finds conflicting composite item IDs for a proposed date range.
 *
 * Checks against both:
 *   - r.itemIds[]  — new bundle format ("kayaks/K01", "paddles/P01")
 *   - r.kayakIds[] — legacy kayak-only format ("K01") for backward compatibility
 *
 * This mirrors find_bundle_conflicts() in test_bundle_reservations.py.
 */
export async function findBundleConflicts(
  db: FirebaseFirestore.Firestore,
  compositeIds: string[],
  blockStartIso: string,
  blockEndIso: string,
  excludeReservationId?: string,
  tx?: FirebaseFirestore.Transaction
): Promise<string[]> {
  const query = db
    .collection("gear_reservations")
    .where("status", "==", "active")
    .where("blockStartIso", "<=", blockEndIso);
  const snap = tx ? await tx.get(query) : await query.get();

  const conflicts = new Set<string>();

  for (const doc of snap.docs) {
    const r = doc.data() as any;
    if (excludeReservationId && norm(r?.id) === excludeReservationId) continue;

    const rStart = norm(r?.blockStartIso);
    const rEnd = norm(r?.blockEndIso);
    if (!rStart || !rEnd) continue;
    if (!overlapsIso(rStart, rEnd, blockStartIso, blockEndIso)) continue;

    const existingItemIds: string[] = Array.isArray(r?.itemIds) ? r.itemIds.map(String) : [];
    const existingKayakIds: string[] = Array.isArray(r?.kayakIds) ? r.kayakIds.map(String) : [];

    for (const cid of compositeIds) {
      // New-format check
      if (existingItemIds.includes(cid)) {
        conflicts.add(cid);
        continue;
      }
      // Legacy kayak check: "kayaks/K01" vs legacy "K01"
      if (cid.startsWith("kayaks/")) {
        const kayakId = cid.slice("kayaks/".length);
        if (existingKayakIds.includes(kayakId)) conflicts.add(cid);
      }
    }
  }

  return Array.from(conflicts);
}

// ──────────────────────────────────────────────────────────────────────────────
// Firestore: reserved composite ID set for a block period
// ──────────────────────────────────────────────────────────────────────────────

async function getReservedCompositeIdsForPeriod(
  db: FirebaseFirestore.Firestore,
  blockStartIso: string,
  blockEndIso: string
): Promise<Set<string>> {
  const snap = await db
    .collection("gear_reservations")
    .where("status", "==", "active")
    .where("blockStartIso", "<=", blockEndIso)
    .get();

  const reserved = new Set<string>();

  for (const doc of snap.docs) {
    const r = doc.data() as any;
    const rStart = norm(r?.blockStartIso);
    const rEnd = norm(r?.blockEndIso);
    if (!rStart || !rEnd) continue;
    if (!overlapsIso(rStart, rEnd, blockStartIso, blockEndIso)) continue;

    // New format: itemIds
    const itemIds: string[] = Array.isArray(r?.itemIds) ? r.itemIds.map(String) : [];
    for (const cid of itemIds) reserved.add(cid);

    // Legacy format: kayakIds → convert to composite
    const kayakIds: string[] = Array.isArray(r?.kayakIds) ? r.kayakIds.map(String) : [];
    for (const kid of kayakIds) {
      if (kid) reserved.add(compositeId("kayaks", kid));
    }
  }

  return reserved;
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC: Create bundle reservation
// ──────────────────────────────────────────────────────────────────────────────

export async function createBundleReservation(
  db: FirebaseFirestore.Firestore,
  args: {
    uid: string;
    startDate: string;
    endDate: string;
    items: BundleItemInput[];
    starterCategory: string;
    starterItemId: string;
    // Tryb "impreza klubowa" (kierownik rezerwuje bezpłatnie, bez limitu ilości,
    // wyłącznie na tę imprezę) — patrz blok niżej. memberRoleKeys wymagane tylko
    // gdy asClubEvent===true (z deps handlera, rola_czlonek/kandydat/zarzad/kr).
    asClubEvent?: boolean;
    memberRoleKeys?: string[];
  }
) {
  const user = await getUserRole(db, args.uid);
  if (!user) return {ok: false, code: "forbidden", message: "User not registered"} as const;

  if (await isUserStatusBlocked(db, user.statusKey)) {
    return {ok: false, code: "forbidden", message: "Access blocked"} as const;
  }

  const roleKey = user.roleKey;
  if (roleKey === "rola_sympatyk") {
    return {ok: false, code: "forbidden", message: "Role not allowed"} as const;
  }

  // ── Tryb "impreza klubowa" ────────────────────────────────────────────────
  // Kierownik zatwierdzonej imprezy klubowej rezerwuje DOWOLNĄ ilość sprzętu
  // bezpłatnie, wyłącznie na tę imprezę. Daty są NADPISANE datami imprezy —
  // klient ich nie wybiera (chroni przed użyciem przywileju na dowolnie długi
  // prywatny termin). Limity ilości/horyzontu/długości są pomijane niżej;
  // konflikt terminów i walidacja przedmiotów (sprawność/basen/zgoda
  // właściciela) NIGDY nie są pomijane — bez wyjątku dla żadnego trybu.
  let clubEvent: {id: string; startDate: string; endDate: string} | null = null;
  if (args.asClubEvent) {
    const memberRoleKeys = args.memberRoleKeys || [];
    if (!memberRoleKeys.includes(roleKey)) {
      return {ok: false, code: "forbidden", message: "Rola nie uprawnia do rezerwacji na imprezę klubową."} as const;
    }
    const found = await findActiveKierownikEvent(db, args.uid);
    if (!found) {
      return {
        ok: false,
        code: "not_a_kierownik",
        message: "Nie jesteś obecnie kierownikiem żadnej zatwierdzonej imprezy klubowej.",
      } as const;
    }
    clubEvent = {id: found.id, startDate: found.startDate, endDate: found.endDate};
  }

  const effectiveStartDate = clubEvent ? clubEvent.startDate : args.startDate;
  const effectiveEndDate = clubEvent ? clubEvent.endDate : args.endDate;

  // Zwolnienie z opłaty: tegoroczna szkoleniówka, rezerwacja składana do końca września.
  const now = new Date();
  const schoolYear = await resolveSchoolYear(db, roleKey, args.uid, user.email);
  const exempt = await isFreeRentalExempt(db, schoolYear, now);

  // Kursant rezerwuje jak kandydat, ale tylko w oknie szkoleniówki + globalny przełącznik zarządu.
  if (roleKey === "rola_kursant") {
    const gate = await assertKursantRentalAllowed(db, exempt, schoolYear);
    if (gate) return gate;
  }

  // Normalise and deduplicate items
  const rawItems: BundleItemInput[] = args.items
    .map((i) => ({itemId: norm(i.itemId), category: norm(i.category).toLowerCase()}))
    .filter((i) => i.itemId && i.category);

  const items = uniqBy(rawItems, (i) => compositeId(i.category, i.itemId));

  if (!items.length) {
    return {ok: false, code: "no_items", message: "Nie wybrano żadnych przedmiotów"} as const;
  }

  // Validate all categories
  for (const item of items) {
    if (!isSupportedBundleCategory(item.category)) {
      return {
        ok: false,
        code: "invalid_category",
        message: `Nieobsługiwana kategoria: ${item.category}`,
      } as const;
    }
  }

  const vars = await getGearVars(db);
  const maxWeeks = roleMaxWeeks(vars, roleKey);
  const maxItems = roleMaxItems(vars, roleKey);

  if (maxWeeks <= 0 || maxItems <= 0) {
    return {ok: false, code: "forbidden", message: "Role not allowed"} as const;
  }

  // Zwolnienie zarządu/KR z opłaty (niezależne od okna szkoleniówki powyżej) —
  // łączymy oba zwolnienia w jedną flagę używaną od tego miejsca w dół, żeby
  // koszt zawsze trafiał do godzinki_ledger jako widoczny "waived", nigdy
  // niewidoczny 0. Impreza klubowa NIE wchodzi w tę flagę — mechanizm
  // godzinkowy jest dla niej pomijany W CAŁOŚCI (patrz niżej), nie "zwalniany".
  const boardFeeExempt = (roleKey === "rola_zarzad" || roleKey === "rola_kr") && vars.boardDoesNotPay;
  const feeExempt = exempt || boardFeeExempt;

  // Horyzont/długość: POMIJANE dla trybu "impreza klubowa" — jedynym realnym
  // ograniczeniem terminu jest wtedy sam zakres dat imprezy (już nadpisany
  // wyżej), nie osobiste limity roli.
  if (!clubEvent) {
    // Horyzont — jak daleko od dziś można ZACZĄĆ rezerwację
    const maxStartIso = maxStartIsoByWeeks(maxWeeks);
    if (effectiveStartDate > maxStartIso) {
      return {ok: false, code: "max_time_exceeded", message: "Start too far in future", details: {maxWeeks}} as const;
    }
    // Długość — maks. liczba dni włącznie (start→end, bez offsetu)
    const maxLenDays = vars.maxReservationLengthDays;
    if (maxLenDays > 0 && daysOnWaterInclusive(effectiveStartDate, effectiveEndDate) > maxLenDays) {
      return {ok: false, code: "max_length_exceeded", message: "Reservation too long", details: {maxDays: maxLenDays}} as const;
    }
  }

  const {blockStartIso, blockEndIso} = computeBlockIso(effectiveStartDate, effectiveEndDate, vars.offsetDays);

  // Fetch and validate items from Firestore
  const itemDetailsResult = await fetchItemDetails(db, items);
  if (!itemDetailsResult.ok) {
    return itemDetailsResult;
  }

  const itemDetails = itemDetailsResult.items;
  const primaryItem = itemDetails.find((i) => i.isPrimary) || itemDetails[0];
  const reservationKind = computeReservationKind(items);

  // Composite IDs for conflict detection
  const compositeIds = items.map((i) => compositeId(i.category, i.itemId));

  // Cost: only kayaks are priced. Impreza klubowa: mechanizm godzinkowy pomijany
  // W CAŁOŚCI (decyzja użytkownika 05.09.2026) — bez tego kierownik dostawał
  // mylący wpis "waived" w historii (wyglądał jak realny koszt/zwrot, którego
  // nigdy nie było) i teoretycznie zależał od stanu pul godzinkowych, których
  // nie musi w ogóle mieć, żeby zarezerwować sprzęt na imprezę.
  const kayakIds = items.filter((i) => i.category === "kayaks").map((i) => i.itemId);
  const costHours = clubEvent ? 0 : quoteKayaksCostHours(vars, roleKey, effectiveStartDate, effectiveEndDate, kayakIds.length);
  // Zwolnieni nie płacą — koszt zapisujemy jako "waived" (saldo bez zmian), więc
  // pula godzinek potrzebna jest tylko dla normalnej dedukcji.
  const godzinkiVars = (!clubEvent && !feeExempt && costHours > 0) ? await getGodzinkiVars(db) : null;

  const ref = db.collection("gear_reservations").doc();

  const doc = {
    id: ref.id,
    status: "active" as const,
    reservationKind,

    userUid: args.uid,
    userEmail: user.email,
    role_key: roleKey,
    status_key: user.statusKey,

    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    offsetDays: vars.offsetDays,
    blockStartIso,
    blockEndIso,

    // Bundle items (full details for display)
    items: itemDetails,
    // Flat composite IDs for Firestore conflict queries
    itemIds: compositeIds,

    // Starter item (where the user initiated the reservation)
    starterCategory: norm(args.starterCategory).toLowerCase(),
    starterItemId: norm(args.starterItemId),

    // Primary item (computed)
    primaryCategory: norm(primaryItem.category),
    primaryItemId: norm(primaryItem.itemId),

    // Backward compat: legacy kayak fields
    kayakIds,
    kayakCount: kayakIds.length,

    costHours,
    waived: !clubEvent && feeExempt && costHours > 0,
    // Rok szkoleniówki uzasadniający zwolnienie — znacznik "zwolnienie kurs RRRR" w Moich rezerwacjach.
    // Dla zwolnienia zarządu/KR schoolYear jest null — front rozróżnia powód
    // zwolnienia po eventId, nie po schoolYear. Impreza klubowa: costHours=0,
    // więc oba pola i tak zostają puste/false (patrz komentarz przy costHours).
    schoolYear: (!clubEvent && feeExempt && costHours > 0) ? schoolYear : null,
    eventId: clubEvent ? clubEvent.id : null,
    createdAt: now,
    updatedAt: now,
  };

  // Jedna transakcja: kontrola limitów + konfliktów + dedukcja godzinek + zapis
  // rezerwacji (eliminuje double-booking i okno awarii między set a deduct).
  const txResult = await db.runTransaction(async (tx) => {
    // Limit PER KATEGORIA (S2) — POMIJANY dla trybu "impreza klubowa" (dowolna
    // ilość sprzętu). Konflikt terminów (niżej) NIGDY nie jest pomijany.
    if (!clubEvent) {
      const already = await countMyOverlappingItemsByCategory(db, args.uid, blockStartIso, blockEndIso, undefined, tx);
      const requested = countItemsByCategory(items);
      const over = findCategoryOverLimit(already, requested, maxItems);
      if (over) {
        return {
          ok: false,
          code: "max_items_exceeded",
          message: "Max items exceeded",
          details: {category: over.category, already: over.already, requested: over.requested, maxItems},
        } as const;
      }
    }

    // Find conflicts with existing reservations
    const conflicts = await findBundleConflicts(db, compositeIds, blockStartIso, blockEndIso, undefined, tx);
    if (conflicts.length) {
      return {
        ok: false,
        code: "conflict",
        message: "Wybrane przedmioty nie są dostępne w tym terminie",
        details: {conflictItemIds: conflicts},
      } as const;
    }

    // Godzinki: impreza klubowa — mechanizm CAŁKOWICIE pomijany, żaden wpis w
    // godzinki_ledger (patrz komentarz przy costHours powyżej). Zwolnieni
    // (szkoleniówka/zarząd) → neutralny rekord "waived" (przekreślony koszt,
    // saldo bez zmian); pozostali → normalna dedukcja FIFO w tej samej transakcji.
    if (!clubEvent && costHours > 0) {
      if (feeExempt) {
        writeWaivedSpendInTx(tx, db, args.uid, {
          amount: costHours,
          reason: buildCostReason(itemDetails, effectiveStartDate, effectiveEndDate),
          reservationId: ref.id,
          schoolYear,
        });
      } else if (godzinkiVars) {
        const deductResult = await deductHoursInTx(
          tx,
          db,
          args.uid,
          {
            amount: costHours,
            reason: buildCostReason(itemDetails, effectiveStartDate, effectiveEndDate),
            reservationId: ref.id,
          },
          godzinkiVars,
          now
        );

        if (!deductResult.ok) {
          return {
            ok: false,
            code: deductResult.code || "hours_deduction_failed",
            message: deductResult.message || "Insufficient hours",
          } as const;
        }
      }
    }

    tx.set(ref, doc);
    return {ok: true} as const;
  });

  if (!txResult.ok) return txResult;

  return {
    ok: true,
    reservationId: ref.id,
    costHours,
    waived: !clubEvent && feeExempt && costHours > 0,
    reservationKind,
    blockStartIso,
    blockEndIso,
    primaryCategory: primaryItem.category,
    primaryItemId: primaryItem.itemId,
    eventId: clubEvent ? clubEvent.id : null,
  } as const;
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC: Update reservation dates (unified — handles both old and new format)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Unified date-update entry point.
 * Routes to the legacy kayak flow for old reservations,
 * or to bundle-specific logic for reservations that have reservationKind set.
 */
export async function updateGearReservationDates(
  db: FirebaseFirestore.Firestore,
  args: {uid: string; reservationId: string; startDate: string; endDate: string}
) {
  const rid = norm(args.reservationId);
  if (!rid) return {ok: false, code: "bad_request", message: "Missing reservationId"} as const;

  const snap = await db.collection("gear_reservations").doc(rid).get();
  if (!snap.exists) return {ok: false, code: "not_found", message: "Not found"} as const;

  const r = snap.data() as any;
  const reservationKind = norm(r?.reservationKind);
  const isBundle = reservationKind === "kayak_bundle" || reservationKind === "gear_only" ||
                   Array.isArray(r?.items);

  if (isBundle) {
    return updateBundleReservationDates(db, args);
  }

  // Legacy kayak-only reservation — delegate unchanged
  return updateReservationDates(db, args);
}

async function updateBundleReservationDates(
  db: FirebaseFirestore.Firestore,
  args: {uid: string; reservationId: string; startDate: string; endDate: string}
) {
  const rid = norm(args.reservationId);

  const user = await getUserRole(db, args.uid);
  if (!user) return {ok: false, code: "forbidden", message: "User not registered"} as const;

  if (await isUserStatusBlocked(db, user.statusKey)) {
    return {ok: false, code: "forbidden", message: "Access blocked"} as const;
  }

  const vars = await getGearVars(db);
  const godzinkiVars = await getGodzinkiVars(db);
  const roleKey = user.roleKey;

  // Zwolnienie z opłaty liczone po dacie tej edycji — spójnie z tworzeniem.
  const updNow = new Date();
  const schoolYear = await resolveSchoolYear(db, roleKey, args.uid, user.email);
  const exempt = await isFreeRentalExempt(db, schoolYear, updNow);
  // Zwolnienie zarządu/KR z opłaty — spójnie z tworzeniem rezerwacji (createBundleReservation).
  const boardFeeExempt = (roleKey === "rola_zarzad" || roleKey === "rola_kr") && vars.boardDoesNotPay;
  const feeExempt = exempt || boardFeeExempt;

  // Kursant: edycja dozwolona na zasadach kandydata, tylko w oknie + przełącznik zarządu.
  if (roleKey === "rola_kursant") {
    const gate = await assertKursantRentalAllowed(db, exempt, schoolYear);
    if (gate) return gate;
  }

  const ref = db.collection("gear_reservations").doc(rid);

  // Jedna transakcja: świeży odczyt rezerwacji + kontrole + korekta godzinek
  // (dodeduktowanie lub cofnięcie FIFO) + zapis nowych dat.
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return {ok: false, code: "not_found", message: "Not found"} as const;
    const r = snap.data() as any;

    if (norm(r?.userUid) !== args.uid) {
      return {ok: false, code: "forbidden", message: "Not yours"} as const;
    }
    if (norm(r?.status) !== "active") {
      return {ok: false, code: "invalid_state", message: "Not active"} as const;
    }

    // Rezerwacja na imprezę klubową — terminy są ustalane automatycznie na
    // podstawie dat imprezy, nie do edycji. Anuluj i zarezerwuj ponownie, jeśli
    // daty imprezy się zmieniły (cancelReservation działa bez zmian).
    if (norm(r?.eventId)) {
      return {
        ok: false,
        code: "club_event_reservation_locked",
        message: "Terminy rezerwacji na imprezę klubową są ustalane automatycznie na podstawie dat imprezy — anuluj i zarezerwuj ponownie, jeśli daty imprezy się zmieniły.",
      } as const;
    }

    const oldStart = norm(r?.startDate);
    const oldBlockStart = norm(r?.blockStartIso);
    const todayIso = todayIsoUTC();

    // After block start: only allow shortening to 1 day (same rule as kayaks)
    if (!(todayIso < oldBlockStart)) {
      if (!(args.startDate === oldStart && args.endDate === oldStart)) {
        return {
          ok: false,
          code: "update_blocked",
          message: "After offset start you can only shorten to 1 day (start=end=original start)",
          details: {requiredStart: oldStart, requiredEnd: oldStart},
        } as const;
      }
    }

    const maxWeeks = roleMaxWeeks(vars, roleKey);
    const maxItems = roleMaxItems(vars, roleKey);
    // Horyzont — jak daleko od dziś można ZACZĄĆ rezerwację
    const maxStartIso = maxStartIsoByWeeks(maxWeeks);
    if (args.startDate > maxStartIso) {
      return {ok: false, code: "max_time_exceeded", message: "Start too far in future", details: {maxWeeks}} as const;
    }
    // Długość — maks. liczba dni włącznie (start→end, bez offsetu)
    const maxLenDays = vars.maxReservationLengthDays;
    if (maxLenDays > 0 && daysOnWaterInclusive(args.startDate, args.endDate) > maxLenDays) {
      return {ok: false, code: "max_length_exceeded", message: "Reservation too long", details: {maxDays: maxLenDays}} as const;
    }

    const {blockStartIso, blockEndIso} = computeBlockIso(args.startDate, args.endDate, vars.offsetDays);

    // Stored items
    const storedItemDetails: BundleItemStored[] = Array.isArray(r?.items) ? r.items : [];
    const compositeIds: string[] = Array.isArray(r?.itemIds) ? r.itemIds.map(String) : [];

    // Limit PER KATEGORIA (exclude self) — spójnie z tworzeniem rezerwacji (S2).
    const already = await countMyOverlappingItemsByCategory(db, args.uid, blockStartIso, blockEndIso, rid, tx);
    const requested = countItemsByCategory(storedItemDetails);
    const over = findCategoryOverLimit(already, requested, maxItems);
    if (over) {
      return {
        ok: false,
        code: "max_items_exceeded",
        message: "Max items exceeded",
        details: {category: over.category, already: over.already, requested: over.requested, maxItems},
      } as const;
    }

    // Conflict check (exclude self)
    const conflicts = await findBundleConflicts(db, compositeIds, blockStartIso, blockEndIso, rid, tx);
    if (conflicts.length) {
      return {
        ok: false,
        code: "conflict",
        message: "Wybrane przedmioty nie są dostępne w tym terminie",
        details: {conflictItemIds: conflicts},
      } as const;
    }

    const kayakCount = Number(r?.kayakCount ?? 0);
    const newCostHours = quoteKayaksCostHours(vars, roleKey, args.startDate, args.endDate, kayakCount);
    const wasWaived = r?.waived === true;
    // Koszt realnie pobrany wcześniej: 0 jeśli rezerwacja była zwolniona (waived).
    const oldCostHours = wasWaived ? 0 : Number(r?.costHours ?? 0);
    const now = new Date();

    if (feeExempt) {
      // Pozostaje/staje się bezpłatne — saldo nie może zostać obciążone.
      if (wasWaived) {
        // Zwolnione → zwolnione: zaktualizuj kwotę istniejącego rekordu "waived",
        // gdy koszt zmienił się wraz z terminem (spójność wyświetlania).
        if (newCostHours !== Number(r?.costHours ?? 0)) {
          const wsnap = await tx.get(
            db.collection("godzinki_ledger")
              .where("uid", "==", args.uid)
              .where("type", "==", "spend")
              .where("reservationId", "==", rid)
          );
          for (const wd of wsnap.docs) {
            const w = wd.data() as any;
            if (w.waived === true && w.refunded !== true) {
              tx.update(wd.ref, {amount: newCostHours, schoolYear, updatedAt: now});
            }
          }
        }
      } else if (oldCostHours > 0) {
        // Płatne → zwolnione: zwróć wcześniejszą opłatę do pul FIFO i zapisz koszt
        // jako "waived" (przekreślony) — spójnie z rezerwacją tworzoną w oknie.
        const refundResult = await refundHoursForReservationInTx(tx, db, args.uid, rid, oldCostHours, now);
        if (!refundResult.ok) {
          return {
            ok: false,
            code: refundResult.code || "hours_refund_failed",
            message: refundResult.message || "Nie udało się zwrócić wcześniejszej opłaty.",
          } as const;
        }
        if (newCostHours > 0) {
          writeWaivedSpendInTx(tx, db, args.uid, {
            amount: newCostHours,
            reason: "Korekta rezerwacji",
            reservationId: rid,
            schoolYear,
          });
        }
      } else if (newCostHours > 0) {
        // Wcześniej brak kosztu (np. bez kajaka) → zapisz "waived".
        writeWaivedSpendInTx(tx, db, args.uid, {
          amount: newCostHours,
          reason: "Korekta rezerwacji",
          reservationId: rid,
          schoolYear,
        });
      }
    } else if (wasWaived && newCostHours > 0) {
      // Było bezpłatne (np. edycja po wrześniu) → pobierz pełny koszt teraz.
      const deductResult = await deductHoursInTx(
        tx,
        db,
        args.uid,
        {
          amount: newCostHours,
          reason: `Korekta rezerwacji ${rid} (zwolnienie wygasło, ${newCostHours}h)`,
          reservationId: rid,
        },
        godzinkiVars,
        now
      );
      if (!deductResult.ok) {
        return {
          ok: false,
          code: deductResult.code || "hours_deduction_failed",
          message: deductResult.message || "Insufficient hours for updated reservation",
        } as const;
      }
    } else {
      const delta = newCostHours - oldCostHours;
      if (delta > 0) {
        const deductResult = await deductHoursInTx(
          tx,
          db,
          args.uid,
          {
            amount: delta,
            reason: `Korekta rezerwacji ${rid} (${oldCostHours}h → ${newCostHours}h)`,
            reservationId: rid,
          },
          godzinkiVars,
          now
        );
        if (!deductResult.ok) {
          return {
            ok: false,
            code: deductResult.code || "hours_deduction_failed",
            message: deductResult.message || "Insufficient hours for updated reservation",
          } as const;
        }
      } else if (delta < 0) {
        // Cofnij dedukcję do oryginalnych pul FIFO (zachowuje oryginalną ważność)
        const reverseResult = await reverseDeductHoursInTx(
          tx,
          db,
          args.uid,
          rid,
          Math.abs(delta),
          godzinkiVars.expiryMonths,
          now
        );
        if (!reverseResult.ok) {
          return {
            ok: false,
            code: reverseResult.code || "hours_reverse_failed",
            message: reverseResult.message || "Cannot reverse hours for updated reservation",
          } as const;
        }
      }
    }

    const oldEnd = norm(r?.endDate);
    tx.set(
      ref,
      {
        startDate: args.startDate,
        endDate: args.endDate,
        blockStartIso,
        blockEndIso,
        costHours: newCostHours,
        waived: feeExempt && newCostHours > 0,
        schoolYear: feeExempt && newCostHours > 0 ? schoolYear : null,
        updatedAt: now,
        modifiedFrom: {startDate: oldStart, endDate: oldEnd},
      },
      {merge: true}
    );

    return {ok: true, costHours: newCostHours, waived: feeExempt && newCostHours > 0, blockStartIso, blockEndIso} as const;
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC: Update item list of an existing club-event reservation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Kierownik może zmieniać potrzeby na imprezę w czasie — ta funkcja podmienia
 * PEŁNĄ listę przedmiotów istniejącej rezerwacji na imprezę klubową (jedna
 * trwała, edytowalna rezerwacja per kierownik per impreza, nie kolejne osobne
 * zapisy). Daty/blockStart/blockEnd NIGDY się tu nie zmieniają (patrz
 * updateBundleReservationDates — te są zablokowane do edycji z innego powodu).
 *
 * Świadomie WYŁĄCZNIE dla rezerwacji z eventId (zwykłe rezerwacje edytują
 * przedmioty przez anuluj+zarezerwuj ponownie — brak potrzeby dla zwykłego
 * użytkownika, u kierownika lista realnie zmienia się wielokrotnie w miarę
 * przygotowań do imprezy). Limit ilości POMIJANY (jak przy tworzeniu), ale
 * konflikt terminów i sprawność/dostępność przedmiotów NIGDY nie są pomijane —
 * sprawdzane na NOWO dla całej listy (także pozycji zostawionych bez zmian).
 */
export async function updateBundleReservationItems(
  db: FirebaseFirestore.Firestore,
  args: {uid: string; reservationId: string; items: BundleItemInput[]}
) {
  const rid = norm(args.reservationId);
  if (!rid) return {ok: false, code: "bad_request", message: "Missing reservationId"} as const;

  const user = await getUserRole(db, args.uid);
  if (!user) return {ok: false, code: "forbidden", message: "User not registered"} as const;
  if (await isUserStatusBlocked(db, user.statusKey)) {
    return {ok: false, code: "forbidden", message: "Access blocked"} as const;
  }

  const rawItems: BundleItemInput[] = args.items
    .map((i) => ({itemId: norm(i.itemId), category: norm(i.category).toLowerCase()}))
    .filter((i) => i.itemId && i.category);
  const items = uniqBy(rawItems, (i) => compositeId(i.category, i.itemId));

  if (!items.length) {
    return {
      ok: false,
      code: "no_items",
      message: "Lista nie może być pusta — jeśli rezygnujesz z całego sprzętu na imprezę, anuluj rezerwację w \"Moje rezerwacje\".",
    } as const;
  }

  for (const item of items) {
    if (!isSupportedBundleCategory(item.category)) {
      return {ok: false, code: "invalid_category", message: `Nieobsługiwana kategoria: ${item.category}`} as const;
    }
  }

  const ref = db.collection("gear_reservations").doc(rid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return {ok: false, code: "not_found", message: "Not found"} as const;
    const r = snap.data() as any;

    if (norm(r?.userUid) !== args.uid) return {ok: false, code: "forbidden", message: "Not yours"} as const;
    if (norm(r?.status) !== "active") return {ok: false, code: "invalid_state", message: "Not active"} as const;

    const eventId = norm(r?.eventId);
    if (!eventId) {
      return {
        ok: false,
        code: "not_club_event_reservation",
        message: "Edycja listy przedmiotów jest dostępna tylko dla rezerwacji na imprezę klubową.",
      } as const;
    }

    // Musisz nadal być aktywnym kierownikiem TEJ SAMEJ imprezy — jeśli impreza
    // się skończyła albo zatwierdzenie cofnięto, edycja listy jest zablokowana
    // (cały czas MOŻNA jeszcze anulować rezerwację, to osobna ścieżka).
    const activeEvent = await findActiveKierownikEvent(db, args.uid);
    if (!activeEvent || activeEvent.id !== eventId) {
      return {
        ok: false,
        code: "not_a_kierownik",
        message: "Nie jesteś już kierownikiem tej imprezy — edycja listy jest niedostępna.",
      } as const;
    }

    const blockStartIso = norm(r?.blockStartIso);
    const blockEndIso = norm(r?.blockEndIso);

    // Sprawność/dostępność/basen/zgoda właściciela — sprawdzane na NOWO dla
    // całej listy (nawet pozycji niezmienionych), spójnie z tworzeniem.
    const itemDetailsResult = await fetchItemDetails(db, items);
    if (!itemDetailsResult.ok) return itemDetailsResult;
    const itemDetails = itemDetailsResult.items;

    const compositeIds = items.map((i) => compositeId(i.category, i.itemId));

    // Konflikt terminów (z wyłączeniem samej siebie) — NIGDY nie pomijany.
    const conflicts = await findBundleConflicts(db, compositeIds, blockStartIso, blockEndIso, rid, tx);
    if (conflicts.length) {
      return {
        ok: false,
        code: "conflict",
        message: "Wybrane przedmioty nie są dostępne w tym terminie",
        details: {conflictItemIds: conflicts},
      } as const;
    }

    const reservationKind = computeReservationKind(items);
    const primaryItem = itemDetails.find((i) => i.isPrimary) || itemDetails[0];
    const kayakIds = items.filter((i) => i.category === "kayaks").map((i) => i.itemId);

    // Impreza klubowa: mechanizm godzinkowy pomijany W CAŁOŚCI (decyzja
    // użytkownika 05.09.2026, patrz createBundleReservation) — edycja listy
    // NIGDY nie dotyka godzinki_ledger, niezależnie od liczby kajaków.
    const now = new Date();

    tx.set(
      ref,
      {
        items: itemDetails,
        itemIds: compositeIds,
        reservationKind,
        primaryCategory: norm(primaryItem.category),
        primaryItemId: norm(primaryItem.itemId),
        kayakIds,
        kayakCount: kayakIds.length,
        updatedAt: now,
      },
      {merge: true}
    );

    return {ok: true, reservationId: rid, items: itemDetails} as const;
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC: Get items with availability for a date range
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns items in a category annotated with isAvailableForRange.
 * Applies category-specific reservability filters (for kayaks: isOperational, !isPrivate).
 * Non-kayak items: active and non-scrapped items are treated as reservable.
 */
export async function getItemsWithAvailability(
  db: FirebaseFirestore.Firestore,
  category: string,
  startDate: string,
  endDate: string,
  offsetDays: number
) {
  const cat = norm(category).toLowerCase();
  const collection = CATEGORY_COLLECTIONS[cat];
  if (!collection) throw new Error(`Unsupported category: ${cat}`);

  const {blockStartIso, blockEndIso} = computeBlockIso(startDate, endDate, offsetDays);
  const reservedCids = await getReservedCompositeIdsForPeriod(db, blockStartIso, blockEndIso);

  const snap = await db.collection(collection).where("isActive", "==", true).limit(500).get();
  const items: any[] = [];

  for (const doc of snap.docs) {
    const d = doc.data() as any;
    if (d?.gearScrapped === true) continue;

    const resolvedId = norm(d?.id) || doc.id;
    const cid = compositeId(cat, resolvedId);

    // Kayak-specific: only show operational, reservable kayaks
    if (cat === "kayaks") {
      if (d?.isOperational !== true) continue;
      if (d?.isPrivate === true && d?.isPrivateRentable !== true) continue;
    }

    const isAvailableForRange = !reservedCids.has(cid);
    const number = norm(d?.number || resolvedId);
    const brand = norm(d?.brand);
    const model = norm(d?.model);
    const label = [brand, model].filter(Boolean).join(" ") || number;

    const item: Record<string, any> = {
      id: resolvedId,
      number,
      brand,
      model,
      type: norm(d?.type),
      color: norm(d?.color),
      size: norm(d?.size),
      status: norm(d?.status),
      label,
      category: cat,
      isAvailableForRange,
    };

    if (cat === "kayaks") {
      item.isOperational = d?.isOperational ?? null;
      item.isPrivate = d?.isPrivate ?? null;
      item.weightRange = norm(d?.weightRange);
      item.liters = d?.liters ?? null;
      item.cockpit = norm(d?.cockpit);
      item.storage = norm(d?.storage || d?.storedAt);
    } else {
      item.meta = buildNonKayakMeta(d, cat);
      // Basen (wiosła/kamizelki/kaski/fartuchy) — top-level, spójnie z item.storage dla
      // kajaków, żeby karty tych 4 kategorii mogły pokazać badge "Basen" wzorem kajaków.
      if (["paddles", "lifejackets", "helmets", "sprayskirts"].includes(cat)) {
        item.isPoolAllowed = d?.isPoolAllowed === true;
      }
    }

    items.push(item);
  }

  items.sort((a, b) =>
    norm(a?.number || a?.id).localeCompare(norm(b?.number || b?.id), "pl")
  );

  return {items, blockStartIso, blockEndIso};
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC: List my reservations (supports both old and new format)
// ──────────────────────────────────────────────────────────────────────────────

export async function listMyBundleReservations(db: FirebaseFirestore.Firestore, uid: string) {
  const snap = await db
    .collection("gear_reservations")
    .where("userUid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return snap.docs.map((d) => d.data());
}
