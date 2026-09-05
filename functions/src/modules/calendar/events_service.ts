import {todayIsoUTC, isIsoDateYYYYMMDD} from "./calendar_utils";
import {isUserStatusBlocked} from "../users/userStatusCheck";

const COLLECTION = "events";

// Zamknięta lista organizatorów imprez — Morzkulc + 4 zaprzyjaźnione kluby.
// "Impreza klubowa" (uprawniająca do bezpłatnej rezerwacji sprzętu przez
// kierownika) to WYŁĄCZNIE organizer==="morzkulc" z co najmniej jednym
// rozwiązanym kierownikiem (kierownikUids niepuste).
export const EVENT_ORGANIZER_KEYS = ["morzkulc", "bystrze", "panta_rei", "habazie", "przewrotka"] as const;
export type EventOrganizerKey = typeof EVENT_ORGANIZER_KEYS[number];

export function isValidOrganizerKey(v: string): boolean {
  return (EVENT_ORGANIZER_KEYS as readonly string[]).includes(v);
}

function norm(s: any): string {
  return String(s || "").trim();
}

// Pole "Miejsce" ma być nazwą miejsca, nie linkiem — użytkownicy notorycznie
// wklejają tam cały link do mapy zamiast nazwy, co brzydko wygląda na liście.
// Do tego celu jest osobne, opcjonalne pole "Link do mapy" (mapLink).
function isUrlOnly(text: string): boolean {
  const t = norm(text);
  if (!t) return false;
  return /^(https?:\/\/|www\.)\S+$/i.test(t);
}

export type EventRecord = {
  id: string;
  startDate: string;
  endDate: string;
  name: string;
  location: string;
  description: string;
  contact: string;
  link: string;
  mapLink: string;
  approved: boolean;
  rejected?: boolean;
  source: "app" | "sheet";
  userUid?: string;
  userEmail?: string;
  createdAt: any;
  updatedAt: any;
  sheetRowNumber?: number | null;
  sheetSyncedAt?: any;
  calendarEventId?: string;
  // Organizator + kierownik — patrz EVENT_ORGANIZER_KEYS. Opcjonalne (undefined
  // na starych dokumentach sprzed tej funkcji) — traktować jak "" / null.
  organizer?: string;
  // Impreza klubowa może mieć WIELU kierowników naraz (arkusz: kolumna "Kierownik"
  // dopuszcza kilka e-maili oddzielonych przecinkiem — zarząd nadaje uprawnienia
  // z poziomu arkusza, bez zmian w aplikacji). `kierownicy` to pełna, zdenormalizowana
  // lista (także wpisy nierozwiązane — uid:null — do wglądu w panelu/arkuszu).
  // `kierownikUids` to jej pochodna (tylko uid!=null) trzymana jako osobne pole
  // WYŁĄCZNIE po to, by dało się zapytać Firestore (`array-contains`) — nie
  // aktualizować ręcznie, zawsze przeliczać z `kierownicy` (patrz `kierownikUidsOf`).
  kierownicy?: KierownikEntry[];
  kierownikUids?: string[];
};

export type KierownikEntry = {
  email: string;
  uid: string | null;
  displayName: string;
};

/** Pochodna `kierownicy` → same rozwiązane uid, do zapisu w `kierownikUids`. */
export function kierownikUidsOf(entries: KierownikEntry[] | undefined | null): string[] {
  return (entries || []).filter((e) => !!e.uid).map((e) => e.uid as string);
}

export async function listUpcomingEvents(db: FirebaseFirestore.Firestore): Promise<EventRecord[]> {
  const todayIso = todayIsoUTC();

  const snap = await db
    .collection(COLLECTION)
    .where("approved", "==", true)
    .where("endDate", ">=", todayIso)
    .orderBy("endDate", "asc")
    .get();

  return snap.docs
    .map((d) => d.data() as EventRecord)
    .filter((e) => e.rejected !== true)
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
}

/**
 * Zwraca imprezy które się zaczęły (startDate <= dziś) i nie zakończyły dawniej niż 30 dni temu.
 * Używane przez dropdown w formularzu km — krótka lista, tylko bieżące i niedawne.
 */
export async function listRecentEvents(db: FirebaseFirestore.Firestore): Promise<EventRecord[]> {
  const todayIso = todayIsoUTC();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const snap = await db
    .collection(COLLECTION)
    .where("approved", "==", true)
    .where("endDate", ">=", thirtyDaysAgo)
    .orderBy("endDate", "asc")
    .get();

  return snap.docs
    .map((d) => d.data() as EventRecord)
    .filter((e) => e.rejected !== true && String(e.startDate) <= todayIso)
    .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))
    .slice(0, 5);
}

/**
 * Zwraca wszystkie zatwierdzone imprezy bez filtra daty, posortowane startDate DESC.
 * Używane przez zakładkę „Imprezy" w km module.
 */
export async function listAllEvents(db: FirebaseFirestore.Firestore): Promise<EventRecord[]> {
  const snap = await db
    .collection(COLLECTION)
    .where("approved", "==", true)
    .get();

  return snap.docs
    .map((d) => d.data() as EventRecord)
    .filter((e) => e.rejected !== true)
    .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
}

export type KierownikResolution =
  | {ok: true; uid: string; displayName: string}
  | {ok: false; code: "kierownik_not_found"; message: string};

/**
 * Rozwiązuje e-mail kierownika imprezy klubowej na uid + nazwę wyświetlaną.
 * Wymaga roli z memberRoleKeys (członek/kandydat/zarząd/KR) i braku blokady
 * statusu (zawieszony). Współdzielone przez createEvent (formularz w aplikacji)
 * i eventsSyncFromSheet (korekta w arkuszu).
 */
export async function resolveKierownikCandidate(
  db: FirebaseFirestore.Firestore,
  email: string,
  memberRoleKeys: string[]
): Promise<KierownikResolution> {
  const emailLower = norm(email).toLowerCase();
  if (!emailLower || !emailLower.includes("@")) {
    return {ok: false, code: "kierownik_not_found", message: "Nie podano prawidłowego e-maila kierownika."};
  }

  const snap = await db.collection("users_active").where("email", "==", emailLower).limit(1).get();
  if (snap.empty) {
    return {
      ok: false,
      code: "kierownik_not_found",
      message: `Nie znaleziono zarejestrowanego użytkownika o e-mailu ${emailLower}.`,
    };
  }

  const doc = snap.docs[0];
  const data = doc.data() as any;
  const roleKey = norm(data?.role_key);
  if (!memberRoleKeys.includes(roleKey)) {
    return {
      ok: false,
      code: "kierownik_not_found",
      message: `Użytkownik ${emailLower} nie ma roli członka klubu ani kandydata i nie może być kierownikiem imprezy.`,
    };
  }

  const statusKey = norm(data?.status_key);
  if (await isUserStatusBlocked(db, statusKey)) {
    return {
      ok: false,
      code: "kierownik_not_found",
      message: `Konto ${emailLower} jest zawieszone i nie może być kierownikiem imprezy.`,
    };
  }

  const firstName = norm(data?.profile?.firstName);
  const lastName = norm(data?.profile?.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const displayName = fullName || emailLower;

  return {ok: true, uid: doc.id, displayName};
}

/**
 * Rozwiązuje LISTĘ kierowników z jednej komórki arkusza/pola formularza —
 * e-maile oddzielone przecinkiem, duplikaty pomijane (pierwsze wystąpienie
 * wygrywa kolejność). Każdy e-mail przechodzi przez `resolveKierownikCandidate`
 * niezależnie — błąd jednego (literówka, brak konta, zawieszenie) NIE blokuje
 * pozostałych: wpis trafia do `entries` z `uid:null` (widoczny w panelu/arkuszu
 * do wglądu), a jego komunikat błędu trafia do `failures`.
 */
export async function resolveKierownicyList(
  db: FirebaseFirestore.Firestore,
  emailsCsv: string,
  memberRoleKeys: string[]
): Promise<{entries: KierownikEntry[]; failures: {email: string; message: string}[]}> {
  const seen = new Set<string>();
  const emails = norm(emailsCsv)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && !seen.has(e) && (seen.add(e), true));

  const entries: KierownikEntry[] = [];
  const failures: {email: string; message: string}[] = [];

  for (const email of emails) {
    const resolved = await resolveKierownikCandidate(db, email, memberRoleKeys);
    if (resolved.ok) {
      entries.push({email, uid: resolved.uid, displayName: resolved.displayName});
    } else {
      entries.push({email, uid: null, displayName: ""});
      failures.push({email, message: resolved.message});
    }
  }

  return {entries, failures};
}

/**
 * Aktywna impreza klubowa, dla której `uid` jest kierownikiem: zatwierdzona,
 * nieodrzucona, jeszcze niezakończona. Z założenia co najwyżej jedna naraz
 * (wymuszane przy zatwierdzaniu i przy syncu z arkusza) — jeśli mimo to
 * znalazłoby się więcej, zwracana jest ta kończąca się najwcześniej.
 */
export async function findActiveKierownikEvent(
  db: FirebaseFirestore.Firestore,
  uid: string,
  todayIso: string = todayIsoUTC()
): Promise<EventRecord | null> {
  if (!uid) return null;

  const snap = await db
    .collection(COLLECTION)
    .where("kierownikUids", "array-contains", uid)
    .where("approved", "==", true)
    .where("endDate", ">=", todayIso)
    .orderBy("endDate", "asc")
    .get();

  const candidates = snap.docs
    .map((d) => d.data() as EventRecord)
    .filter((e) => e.rejected !== true);

  return candidates[0] || null;
}

/**
 * Zwraca aktywną imprezę klubową danego kierownika (jeśli istnieje), z
 * pominięciem `excludeEventId` — do sprawdzenia reguły "jeden kierownik
 * naraz" przy zatwierdzaniu innej imprezy lub korekcie kierownika w arkuszu.
 */
export async function findActiveKierownikConflict(
  db: FirebaseFirestore.Firestore,
  kierownikUid: string,
  excludeEventId?: string,
  todayIso?: string
): Promise<EventRecord | null> {
  const found = await findActiveKierownikEvent(db, kierownikUid, todayIso);
  if (!found) return null;
  if (excludeEventId && found.id === excludeEventId) return null;
  return found;
}

export async function createEvent(
  db: FirebaseFirestore.Firestore,
  args: {
    uid: string;
    email: string;
    startDate: string;
    endDate: string;
    name: string;
    location: string;
    description: string;
    contact: string;
    link: string;
    mapLink: string;
    // Organizator/kierownik — opcjonalne, żeby wywołania sprzed tej funkcji
    // (bez tych pól) nadal kompilowały się i działały jak dotąd (organizer="").
    organizer?: string;
    kierownikEmail?: string;
    // Wymagane tylko gdy organizer==="morzkulc" — lista ról uprawnionych do
    // bycia kierownikiem (rola_czlonek/kandydat/zarzad/kr), z deps.memberRoleKeys.
    memberRoleKeys?: string[];
  }
): Promise<{ok: true; eventId: string} | {ok: false; code: string; message: string}> {
  if (!isIsoDateYYYYMMDD(args.startDate) || !isIsoDateYYYYMMDD(args.endDate)) {
    return {ok: false, code: "validation_failed", message: "Invalid dates"};
  }
  if (args.startDate > args.endDate) {
    return {ok: false, code: "validation_failed", message: "startDate must be <= endDate"};
  }
  if (!norm(args.name)) {
    return {ok: false, code: "validation_failed", message: "Missing name"};
  }
  if (!norm(args.location)) {
    return {ok: false, code: "validation_failed", message: "Missing location"};
  }
  if (isUrlOnly(args.location)) {
    return {ok: false, code: "validation_failed", message: "Pole „Miejsce” nie może być samym linkiem — wpisz nazwę miejsca, a link do mapy podaj w polu „Link do mapy”."};
  }

  const organizer = norm(args.organizer).toLowerCase();
  if (organizer && !isValidOrganizerKey(organizer)) {
    return {ok: false, code: "validation_failed", message: "Nieprawidłowy organizator."};
  }

  // Kierownik dotyczy WYŁĄCZNIE organizatora "morzkulc" — dla pozostałych
  // klubów/pustego wyboru lista kierowników zostaje pusta, nawet jeśli klient
  // coś przysłał (impreza klubowa to ściśle organizer==="morzkulc" + co
  // najmniej jeden rozwiązany kierownik, nic więcej). Formularz w aplikacji
  // przysyła dziś jeden e-mail, ale pole obsługuje też listę oddzieloną
  // przecinkiem (jak arkusz) — bez dodatkowego kosztu, ten sam resolver.
  let kierownicy: KierownikEntry[] = [];

  if (organizer === "morzkulc") {
    const emailInput = norm(args.kierownikEmail);
    if (!emailInput) {
      return {ok: false, code: "validation_failed", message: "Podaj e-mail kierownika imprezy klubowej."};
    }
    const {entries, failures} = await resolveKierownicyList(db, emailInput, args.memberRoleKeys || []);
    if (kierownikUidsOf(entries).length === 0) {
      return {ok: false, code: "kierownik_not_found", message: failures[0]?.message || "Nie znaleziono zarejestrowanego użytkownika kierownika."};
    }
    kierownicy = entries;
  }

  const ref = db.collection(COLLECTION).doc();
  const now = new Date();

  const doc: EventRecord = {
    id: ref.id,
    startDate: args.startDate,
    endDate: args.endDate,
    name: norm(args.name),
    location: norm(args.location),
    description: norm(args.description),
    contact: norm(args.contact),
    link: norm(args.link),
    mapLink: norm(args.mapLink),
    organizer,
    kierownicy,
    kierownikUids: kierownikUidsOf(kierownicy),
    approved: false,
    source: "app",
    userUid: args.uid,
    userEmail: args.email,
    createdAt: now,
    updatedAt: now,
    // Jawny null (nie brak pola!) — umożliwia zapytanie where("sheetSyncedAt","==",null)
    // w backfillu syncu: imprezy, które nigdy nie trafiły do arkusza (np. po martwym
    // jobie events.writeToSheet), są dopisywane przy każdym syncu.
    sheetSyncedAt: null,
    sheetRowNumber: null,
  };

  await ref.set(doc);
  return {ok: true, eventId: ref.id};
}
