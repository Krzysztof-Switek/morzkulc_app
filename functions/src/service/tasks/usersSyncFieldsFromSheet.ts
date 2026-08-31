import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";
import {parseSchoolYear} from "../../modules/equipment/bundle/gear_bundle_service";

/**
 * Task: users.syncFieldsFromSheet
 *
 * Port appscriptowego syncUsersToFirestore() w części „pola" (NIE role/status — te robi users.syncRolesFromSheet).
 * Czyta zakładkę members, znajduje users_active po memberId (== kolumna ID),
 * patchuje TYLKO zmienione pola: email, profile.*, admin.*.
 * Jeśli wykryje zmianę roli/statusu (po stronie arkusza) → kolejkuje users.syncRolesFromSheet.
 *
 * Dodatkowo, dla KAŻDEGO wiersza (niezależnie od tego, czy users_active już istnieje),
 * mirroruje rolę/status/rok szkoleniówki do members_roster/{email} — jedyne miejsce
 * po którym registerUserHandler.ts sprawdza uprawnienie do samodzielnej deklaracji
 * "jestem kursantem" PRZED pierwszym zalogowaniem. Zastępuje dawną kolekcję
 * kurs_uczestnicy (arkusz "Szkoleniówka", wygaszony — patrz Audyty/17.08_*).
 */

type Payload = {
  dry?: boolean;
  requestedBy?: string;
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}

function normalizeHeader(h: string): string {
  return String(h == null ? "" : h).trim().toLowerCase()
    .split(" ").join("_").split("-").join("_")
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e").replace(/ł/g, "l")
    .replace(/ń/g, "n").replace(/ó/g, "o").replace(/ś/g, "s").replace(/ż/g, "z").replace(/ź/g, "z")
    .replace(/[^a-z0-9_]/g, "");
}

function normalizeBoolish(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = norm(v).toLowerCase();
  if (!s) return false;
  if (s === "true" || s === "tak" || s === "yes" || s === "1") return true;
  return false;
}

/**
 * Tolerancyjne parsowanie liczby z komórki arkusza. Sheets API (`values.get` bez
 * `valueRenderOption`) zwraca domyślnie FORMATTED_VALUE — czyli DOKŁADNIE to, co
 * widać w komórce, nie surową liczbę. Komórka z formatowaniem walutowym (np. opłata
 * za kurs wpisana jako 2300 z formatem PLN) przychodzi więc jako string typu
 * "2 300,00 zł", nie "2300". Usuwamy wszystko poza cyframi/przecinkiem/kropką/minusem
 * (waluta, spacje tysięcy — zwykłe i twarde), a przecinek dziesiętny (notacja PL)
 * zamieniamy na kropkę.
 */
function toNumberOrNull(v: any): number | null {
  const raw = norm(v);
  if (!raw) return null;
  let s = raw.replace(/[^\d,.-]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function normalizeDateString(v: any): string {
  const s = norm(v);
  if (!s) return "";
  // DD.MM.YYYY → YYYY-MM-DD (FORMATTED_VALUE z arkusza)
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

function mapRoleDisplayToKey(label: string): string {
  const s = norm(label).toLowerCase();
  if (s === "zarząd" || s === "zarzad") return "rola_zarzad";
  if (s === "kr") return "rola_kr";
  if (s === "członek" || s === "czlonek") return "rola_czlonek";
  if (s === "kandydat") return "rola_kandydat";
  if (s === "sympatyk") return "rola_sympatyk";
  if (s === "kursant") return "rola_kursant";
  return "";
}

function mapStatusDisplayToKey(label: string): string {
  const s = norm(label).toLowerCase();
  if (s === "aktywny") return "status_aktywny";
  if (s === "zawieszony") return "status_zawieszony";
  if (s === "skreślony" || s === "skreslony") return "status_skreslony";
  if (s === "oczekujący" || s === "oczekujacy") return "status_pending";
  return "";
}

function headerMap(headers: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const raw of headers) m[normalizeHeader(raw)] = raw;
  return m;
}

function getPath(obj: any, path: string): any {
  let cur = obj;
  for (const p of path.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function valuesEqual(next: any, current: any): boolean {
  if (typeof next === "boolean" || typeof current === "boolean") {
    return Boolean(next) === Boolean(current);
  }
  const a = next === null || next === undefined ? "" : String(next).trim();
  const b = current === null || current === undefined ? "" : String(current).trim();
  return a === b;
}

export const usersSyncFieldsFromSheetTask: ServiceTask<Payload> = {
  id: "users.syncFieldsFromSheet",
  description: "Sync pól profilu/admin z arkusza members → users_active (po memberId). Nie rusza roli/statusu; kolejkuje users.syncRolesFromSheet przy ich zmianie.",

  validate: (_payload) => {
    // no required fields
  },

  run: async (payload, ctx) => {
    const {firestore, logger} = ctx;
    const cfg = getServiceConfig();
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    const who = norm(payload?.requestedBy).toLowerCase();

    const spreadsheetId = cfg.sheets.membersSpreadsheetId;
    const tabName = cfg.sheets.membersTabName;

    logger.info("usersSyncFieldsFromSheet: start", {spreadsheetId, tabName, dryRun, who});

    const sheets = new GoogleSheetsProvider(cfg.workspace.delegatedSubject);
    const table = await sheets.readTableAsObjects({spreadsheetId, tabName});
    const hmap = headerMap(table.headers);

    const required = [
      "id", "ksywa", "imie", "nazwisko", "telefon", "e_mail", "data_urodzenia",
      "rok_szkoleniowki", "wpisowe_rok", "klucze_do_siedziby", "rola", "status",
      "blacha", "uwagi", "zgody_rodo", "skladki", "godzinki",
    ];
    const missing = required.filter((h) => !(h in hmap));
    if (missing.length) {
      throw new Error(`Users sheet headers mismatch. Missing: ${JSON.stringify(missing)} Found: ${JSON.stringify(Object.keys(hmap))}`);
    }
    const g = (row: Record<string, string>, normKey: string): string => norm(row[hmap[normKey]] ?? "");

    // ── WYMUSZENIE KOMPLETU DANYCH: każdy kandydat musi mieć opiekuna stażu ──
    // Walidacja pre-flight (przed jakimkolwiek zapisem). Jeśli choć jeden kandydat
    // w arkuszu ma puste pole „opiekun stażu" → sync PRZERWANY (zero zapisów),
    // z czytelną listą braków. Cel: zmusić zarząd do uzupełnienia kompletu informacji.
    // Działa tylko gdy kolumna „opiekun stażu" istnieje (po jej dodaniu przez zarząd);
    // jej brak nie blokuje pozostałych synców.
    if ("opiekun_stazu" in hmap) {
      const missingMentor: string[] = [];
      for (const row of table.rows) {
        if (mapRoleDisplayToKey(g(row, "rola")) !== "rola_kandydat") continue;
        const memberIdRaw = g(row, "id");
        if (!memberIdRaw) continue; // wiersz bez ID — pomijany też w głównej pętli
        if (g(row, "opiekun_stazu")) continue; // ma opiekuna — ok
        const name = g(row, "ksywa") ||
          `${g(row, "imie")} ${g(row, "nazwisko")}`.trim() ||
          g(row, "e_mail") || "(bez nazwy)";
        missingMentor.push(`#${memberIdRaw} ${name}`);
      }

      if (missingMentor.length) {
        const MAX_LIST = 20;
        const shown = missingMentor.slice(0, MAX_LIST);
        const extra = missingMentor.length - shown.length;
        const lines = shown.map((s) => `• ${s}`).join("\n") +
          (extra > 0 ? `\n• …i ${extra} więcej` : "");
        const message =
          "Synchronizacja przerwana — uzupełnij kolumnę „opiekun stażu\".\n" +
          `Kandydaci bez opiekuna stażu (${missingMentor.length}):\n${lines}\n` +
          "Wpisz opiekuna stażu dla każdego kandydata i ponów synchronizację.";
        logger.error("usersSyncFieldsFromSheet: ABORT — kandydaci bez opiekuna stażu", {count: missingMentor.length});
        return {
          ok: false,
          message,
          details: {validationError: true, missingMentorCount: missingMentor.length, missingMentor},
        };
      }
    }

    // ── WYMUSZENIE KOMPLETU DANYCH KURSANTA: rok szkoleniówki, PESEL, waga, wzrost,
    // opłata za kurs muszą być wypełnione i poprawne dla KAŻDEGO wiersza z rolą
    // "Kursant". Walidacja pre-flight (przed jakimkolwiek zapisem) — sync PRZERWANY
    // (zero zapisów), jeśli choć jeden kursant ma brakujące/błędne dane, z czytelną
    // listą KTÓRE kolumny są błędne dla KTÓREJ osoby. Kolumny pesel/waga/wzrost/
    // oplata_za_kurs są sprawdzane TYLKO gdy istnieją w arkuszu (opcjonalne, wzorem
    // „opiekun stażu" powyżej); rok_szkoleniowki jest zawsze wymagana kolumna
    // (patrz `required` powyżej), więc sprawdzamy tu tylko czy WARTOŚĆ w komórce jest
    // poprawna dla kursanta.
    {
      const kursantIssues: string[] = [];
      for (const row of table.rows) {
        if (mapRoleDisplayToKey(g(row, "rola")) !== "rola_kursant") continue;
        const memberIdRaw = g(row, "id");
        if (!memberIdRaw) continue; // wiersz bez ID — pomijany też w głównej pętli

        const problems: string[] = [];

        if (parseSchoolYear(g(row, "rok_szkoleniowki")) === null) {
          problems.push("rok szkoleniówki (puste albo nie da się rozpoznać roku)");
        }

        if ("pesel" in hmap) {
          const pesel = g(row, "pesel");
          if (!/^\d{11}$/.test(pesel)) {
            problems.push(
              pesel ?
                "PESEL (musi mieć dokładnie 11 cyfr — sprawdź, czy komórka nie jest sformatowana jako liczba, bo traci wiodące zero)" :
                "PESEL (puste)"
            );
          }
        }

        if ("waga" in hmap) {
          const waga = toNumberOrNull(g(row, "waga"));
          if (waga === null || waga < 30 || waga > 250) {
            problems.push("waga (puste albo poza zakresem 30–250 kg)");
          }
        }

        if ("wzrost" in hmap) {
          const wzrost = toNumberOrNull(g(row, "wzrost"));
          if (wzrost === null || wzrost < 100 || wzrost > 230) {
            problems.push("wzrost (puste albo poza zakresem 100–230 cm)");
          }
        }

        if ("oplata_za_kurs" in hmap) {
          const oplata = toNumberOrNull(g(row, "oplata_za_kurs"));
          if (oplata === null || oplata <= 0) {
            problems.push("opłata za kurs (puste albo niedodatnie)");
          }
        }

        if (problems.length) {
          const name = g(row, "ksywa") ||
            `${g(row, "imie")} ${g(row, "nazwisko")}`.trim() ||
            g(row, "e_mail") || "(bez nazwy)";
          kursantIssues.push(`#${memberIdRaw} ${name}: ${problems.join("; ")}`);
        }
      }

      if (kursantIssues.length) {
        const MAX_LIST = 20;
        const shown = kursantIssues.slice(0, MAX_LIST);
        const extra = kursantIssues.length - shown.length;
        const lines = shown.map((s) => `• ${s}`).join("\n") +
          (extra > 0 ? `\n• …i ${extra} więcej` : "");
        const message =
          "Synchronizacja przerwana — kursanci z brakującymi lub błędnymi danymi.\n" +
          `Wiersze z problemami (${kursantIssues.length}):\n${lines}\n` +
          "Popraw wskazane kolumny dla każdej osoby i ponów synchronizację.";
        logger.error("usersSyncFieldsFromSheet: ABORT — kursanci z niekompletnymi/błędnymi danymi", {count: kursantIssues.length});
        return {
          ok: false,
          message,
          details: {validationError: true, kursantIssuesCount: kursantIssues.length, kursantIssues},
        };
      }
    }

    // ── WYMUSZENIE UNIKALNOŚCI KSYWY: sync przerywany, jeśli arkusz zawiera dwie
    // osoby z tą samą ksywą (porównanie case-insensitive). Spójne z walidacją
    // unikalności przy rejestracji w aplikacji (patrz registerUserHandler.ts,
    // profile.nicknameLower). Puste ksywy są pomijane — pole jest opcjonalne.
    {
      const byNicknameLower = new Map<string, string[]>();
      for (const row of table.rows) {
        const memberIdRaw = g(row, "id");
        if (!memberIdRaw) continue;
        const nicknameRaw = g(row, "ksywa");
        if (!nicknameRaw) continue;
        const nicknameLower = nicknameRaw.toLowerCase();
        const list = byNicknameLower.get(nicknameLower) || [];
        list.push(`#${memberIdRaw} ${nicknameRaw}`);
        byNicknameLower.set(nicknameLower, list);
      }

      const duplicates = [...byNicknameLower.entries()].filter(([, list]) => list.length > 1);
      if (duplicates.length) {
        const MAX_LIST = 20;
        const shown = duplicates.slice(0, MAX_LIST);
        const extra = duplicates.length - shown.length;
        const lines = shown.map(([, list]) => `• ${list.join(" ↔ ")}`).join("\n") +
          (extra > 0 ? `\n• …i ${extra} więcej` : "");
        const message =
          "Synchronizacja przerwana — w arkuszu są duplikaty ksywy.\n" +
          `Zduplikowane ksywy (${duplicates.length}):\n${lines}\n` +
          "Popraw ksywy tak, aby każda była unikalna, i ponów synchronizację.";
        logger.error("usersSyncFieldsFromSheet: ABORT — zduplikowane ksywy w arkuszu", {duplicateCount: duplicates.length});
        return {
          ok: false,
          message,
          details: {
            validationError: true,
            duplicateNicknameCount: duplicates.length,
            duplicateNicknames: duplicates.map(([nicknameLower, list]) => ({nicknameLower, rows: list})),
          },
        };
      }
    }

    let found = 0;
    let patched = 0;
    let unchanged = 0;
    let notFound = 0;
    let skipped = 0;
    let roleStatusChanged = 0;
    let rosterUpserted = 0;
    const now = new Date().toISOString();

    for (const row of table.rows) {
      const memberIdRaw = g(row, "id");
      if (!memberIdRaw) {
        skipped++;
        continue;
      }
      const memberId = Number(memberIdRaw);
      if (!isFinite(memberId)) {
        logger.warn("usersSyncFieldsFromSheet: invalid memberId — skip", {memberIdRaw});
        skipped++;
        continue;
      }

      const roleKey = mapRoleDisplayToKey(g(row, "rola"));
      const statusKey = mapStatusDisplayToKey(g(row, "status"));
      if (!roleKey || !statusKey) {
        logger.warn("usersSyncFieldsFromSheet: unknown role/status — skip row", {memberId, rola: g(row, "rola"), status: g(row, "status")});
        skipped++;
        continue;
      }

      const rowEmail = g(row, "e_mail").toLowerCase();

      // Mirror KAŻDEGO wiersza (niezależnie od tego, czy users_active już istnieje) do
      // members_roster/{email} — jedyne źródło, po którym registerUserHandler.ts sprawdza
      // uprawnienie do samodzielnej deklaracji "jestem kursantem" PRZED pierwszym
      // zalogowaniem (gdy users_active jeszcze nie istnieje, więc dopasowanie po memberId
      // poniżej by tego wiersza nie objęło). Zastępuje dawną kolekcję kurs_uczestnicy.
      if (rowEmail && !dryRun) {
        await firestore.collection("members_roster").doc(rowEmail).set({
          email: rowEmail,
          rola: roleKey,
          status: statusKey,
          rokSzkoleniowki: parseSchoolYear(g(row, "rok_szkoleniowki")),
          memberId,
          updatedAt: now,
        });
        rosterUpserted++;
      }

      const sheetUser = {
        email: rowEmail,
        profile: {
          nickname: g(row, "ksywa"),
          firstName: g(row, "imie"),
          lastName: g(row, "nazwisko"),
          phone: g(row, "telefon"),
          dateOfBirth: normalizeDateString(g(row, "data_urodzenia")),
          consentRodo: normalizeBoolish(g(row, "zgody_rodo")),
        },
        admin: {
          schoolYear: g(row, "rok_szkoleniowki"),
          entryFeeYear: g(row, "wpisowe_rok"),
          hasClubKeys: normalizeBoolish(g(row, "klucze_do_siedziby")),
          badge: g(row, "blacha"),
          notes: g(row, "uwagi"),
          contributions: g(row, "skladki"),
          hours: g(row, "godzinki"),
        },
      };

      const snap = await firestore.collection("users_active").where("memberId", "==", memberId).limit(1).get();
      if (snap.empty) {
        notFound++;
        continue;
      }
      found++;
      const doc = snap.docs[0];
      const data = doc.data() as any;

      // Diff pól (bez role_key/status_key)
      const candidates: Array<[string, any]> = [
        ["email", sheetUser.email],
        ["profile.nickname", sheetUser.profile.nickname],
        ["profile.firstName", sheetUser.profile.firstName],
        ["profile.lastName", sheetUser.profile.lastName],
        ["profile.phone", sheetUser.profile.phone],
        ["profile.dateOfBirth", sheetUser.profile.dateOfBirth],
        ["profile.consentRodo", sheetUser.profile.consentRodo],
        ["admin.schoolYear", sheetUser.admin.schoolYear],
        ["admin.entryFeeYear", sheetUser.admin.entryFeeYear],
        ["admin.hasClubKeys", sheetUser.admin.hasClubKeys],
        ["admin.badge", sheetUser.admin.badge],
        ["admin.notes", sheetUser.admin.notes],
        ["admin.contributions", sheetUser.admin.contributions],
        ["admin.hours", sheetUser.admin.hours],
      ];

      // Opiekun stażu — OPCJONALNA kolumna „opiekun stażu" (nagłówek znormalizowany
      // „opiekun_stazu"). Patchujemy admin.mentor TYLKO gdy kolumna istnieje w arkuszu;
      // jej brak nie może nadpisać istniejącej wartości pustym stringiem.
      if ("opiekun_stazu" in hmap) {
        candidates.push(["admin.mentor", g(row, "opiekun_stazu")]);
      }

      // Dostęp akademik — OPCJONALNA kolumna (moduł Klub, klucze). Wzorem „opiekun stażu":
      // patchujemy TYLKO gdy kolumna istnieje w arkuszu; jej brak nie może nadpisać wartości.
      if ("dostep_akademik" in hmap) {
        candidates.push(["admin.hasAkademikAccess", normalizeBoolish(g(row, "dostep_akademik"))]);
      }

      // Instruktor basenowy — OPCJONALNA kolumna „Instruktor (kadra)" (moduł Basen).
      // Wzorem „opiekun stażu": patchujemy TYLKO gdy kolumna istnieje w arkuszu.
      if ("instruktor_kadra" in hmap) {
        candidates.push(["admin.basenInstructor", normalizeBoolish(g(row, "instruktor_kadra"))]);
      }

      // Dane kursowe (PESEL/waga/wzrost/opłata) — OPCJONALNE kolumny przejęte z dawnego
      // arkusza "Szkoleniówka" (kolekcja kurs_uczestnicy, wygaszona). Wzorem powyższych:
      // patchujemy TYLKO gdy kolumna istnieje w arkuszu.
      if ("pesel" in hmap) {
        candidates.push(["admin.pesel", g(row, "pesel")]);
      }
      if ("waga" in hmap) {
        candidates.push(["admin.weight", toNumberOrNull(g(row, "waga"))]);
      }
      if ("wzrost" in hmap) {
        candidates.push(["admin.height", toNumberOrNull(g(row, "wzrost"))]);
      }
      if ("oplata_za_kurs" in hmap) {
        candidates.push(["admin.courseFee", toNumberOrNull(g(row, "oplata_za_kurs"))]);
      }

      const patch: Record<string, any> = {};
      for (const [path, nextVal] of candidates) {
        if (!valuesEqual(nextVal, getPath(data, path))) {
          patch[path] = nextVal;
        }
      }

      // Data wpłaty wpisowego (rok+miesiąc) — z daty syncu, przy PIERWSZYM pojawieniu
      // się wpisowego oraz przy ZMIANIE wartości kolumny (odnowienie po 12 mc).
      // Niezmieniona wartość → nie ruszamy (istniejące konta uzupełnia jednorazowy backfill,
      // żeby nie nadpisać daty wpłaty bieżącym miesiącem).
      const incomingFee = norm(sheetUser.admin.entryFeeYear);
      const existingFee = norm(getPath(data, "admin.entryFeeYear"));
      if (incomingFee && existingFee !== incomingFee) {
        patch["admin.entryFeePaidAt"] = now.slice(0, 7); // YYYY-MM
      }

      // Wykryj zmianę roli/statusu (faktyczny sync robi users.syncRolesFromSheet)
      const roleChanged = roleKey !== norm(data?.role_key);
      const statusChanged = statusKey !== norm(data?.status_key);
      if (roleChanged || statusChanged) roleStatusChanged++;

      const changedPaths = Object.keys(patch);
      if (!changedPaths.length) {
        unchanged++;
        continue;
      }

      if (dryRun) {
        logger.info("usersSyncFieldsFromSheet: [DRY RUN] would patch", {memberId, changedPaths});
        patched++;
        continue;
      }

      patch.updatedAt = now;
      patch.updatedBy = who;
      await doc.ref.update(patch);
      patched++;
      logger.info("usersSyncFieldsFromSheet: patched", {memberId, changedPaths});

      // Zmiana „Dostęp akademik" (nadanie lub cofnięcie) → e-mail do użytkownika.
      // Kolejkowane (service_jobs), nie wysyłane inline — błąd wysyłki nie może
      // przerwać ani spowolnić reszty synchronizacji członków.
      if ("admin.hasAkademikAccess" in patch) {
        const granted = Boolean(patch["admin.hasAkademikAccess"]);
        const name = sheetUser.profile.nickname ||
          [sheetUser.profile.firstName, sheetUser.profile.lastName].filter(Boolean).join(" ").trim();
        const targetEmail = sheetUser.email || norm(data?.email);
        if (targetEmail) {
          const jobRef = firestore.collection("service_jobs").doc();
          await jobRef.set({
            id: jobRef.id,
            taskId: "users.notifyAkademikAccessChanged",
            payload: {uid: doc.id, email: targetEmail, name, granted},
            status: "queued",
            attempts: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          logger.info("usersSyncFieldsFromSheet: enqueued akademik access notify", {memberId, granted});
        }
      }
    }

    // Zmiana roli/statusu → wyzwól sync ról (rekonsyliacja grup itd.)
    if (roleStatusChanged > 0 && !dryRun) {
      const jobId = `users-role-sync:${Date.now()}`;
      await firestore.collection("service_jobs").doc(jobId).set({
        id: jobId,
        taskId: "users.syncRolesFromSheet",
        payload: {},
        status: "queued",
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info("usersSyncFieldsFromSheet: enqueued users.syncRolesFromSheet", {roleStatusChanged});
    }

    const details = {found, patched, unchanged, notFound, skipped, roleStatusChanged, rosterUpserted, dryRun};
    logger.info("usersSyncFieldsFromSheet: done", details);

    return {
      ok: true,
      message: `Users fields synced: found=${found}, patched=${patched}, unchanged=${unchanged}, notFound=${notFound}, skipped=${skipped}, roleStatusChanged=${roleStatusChanged}, rosterUpserted=${rosterUpserted}`,
      details,
    };
  },
};
