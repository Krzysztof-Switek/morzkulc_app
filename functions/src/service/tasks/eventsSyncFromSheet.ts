import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {GoogleSheetsProvider, buildLooseRowGetter} from "../providers/googleSheetsProvider";
import {GoogleCalendarProvider, CalendarEventData} from "../providers/googleCalendarProvider";
import {getServiceConfig} from "../service_config";
import {norm} from "../../modules/shared/text_utils";

/**
 * Task: events.syncFromSheet
 *
 * Czyta zakładkę "imprezy" z arkusza Google i synchronizuje imprezy do Firestore (kolekcja `events`).
 * Kolumny arkusza:
 *   ID | data rozpoczęcia | data zakończenia | nazwa imprezy | miejsce | opis | kontakt | link do strony / zgłoszeń | Zatwierdzona | ranking? | kursowa?
 *
 * Pole "Zatwierdzona" = TAK ustawia approved=true w Firestore.
 * Pole "ID" to Firestore document ID (upsert).
 *
 * Dodatkowo:
 *  - nowe dokumenty (wiersze dodane bezpośrednio w arkuszu) dostają createdAt —
 *    bez tego pola panel zarządu (orderBy createdAt) ich NIE pokazywał,
 *  - BACKFILL: imprezy zgłoszone w aplikacji, które nigdy nie trafiły do arkusza
 *    (sheetSyncedAt == null — np. po martwym jobie events.writeToSheet),
 *    są dopisywane do arkusza przy każdym syncu.
 */

type Payload = {
  dry?: boolean;
};

/** Eksport dla testów jednostkowych (vitest). */
export function isApproved(v: any): boolean {
  const s = norm(v).toLowerCase();
  return ["tak", "t", "yes", "true", "1", "✓"].includes(s);
}

/** Normalizacja daty z arkusza: YYYY-MM-DD lub DD.MM.YYYY. Eksport dla testów. */
export function normDate(v: any): string {
  const s = norm(v);
  // Accept YYYY-MM-DD directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Accept DD.MM.YYYY
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

/**
 * Znajduje faktyczny nagłówek kolumny bez rozróżniania wielkości liter
 * (np. "Zsynchronizowano" vs "zsynchronizowano" — arkusz bywa edytowany ręcznie).
 * Eksport dla testów jednostkowych.
 */
export function findHeaderCaseInsensitive(headers: string[], name: string): string | null {
  const wanted = name.trim().toLowerCase();
  for (const h of headers) {
    if (h.trim().toLowerCase() === wanted) return h;
  }
  return null;
}

/**
 * Czy imprezę nieobecną w arkuszu należy usunąć z aplikacji (reconciliation).
 * Wołane TYLKO dla dokumentów, których ID NIE występuje w bieżącym arkuszu.
 *
 * Bezpieczeństwo (imprezy mają DWA źródła, inaczej niż sprzęt):
 *   - `rejected==true`          → już usunięta/odrzucona, pomiń,
 *   - `sheetSyncedAt===null`    → zgłoszenie z aplikacji CZEKAJĄCE na backfill
 *     (nigdy nie miało wiersza) — NIE usuwać, inaczej skasowalibyśmy świeże
 *     zgłoszenia zanim trafią do arkusza,
 *   - usuwamy tylko, gdy impreza faktycznie BYŁA w arkuszu: `source=="sheet"`
 *     albo `source=="app"` z `sheetSyncedAt` = timestamp (była już zsynchronizowana).
 * Nieznane źródło bez timestampu → zostawiamy (zachowawczo).
 *
 * Eksport dla testów jednostkowych (vitest).
 */
export function shouldScrapAbsentEvent(data: any): boolean {
  if (!data) return false;
  if (data.rejected === true) return false;
  if (data.sheetSyncedAt === null) return false;
  const src = String(data.source || "");
  const syncedIsTimestamp = Boolean(data.sheetSyncedAt && typeof data.sheetSyncedAt.toDate === "function");
  return src === "sheet" || (src === "app" && syncedIsTimestamp);
}

/**
 * Kolumny ustawiane wyłącznie przy TWORZENIU wiersza w arkuszu.
 * Przy aktualizacji (retry joba, backfill na istniejący wiersz) wartości
 * z arkusza są zachowywane — retry nie może cofnąć "Zatwierdzona"=TAK
 * wpisanego przez zarząd (audyt imprez, ryzyko I3).
 */
export const EVENT_ROW_CREATE_ONLY_COLUMNS = ["Zatwierdzona", "ranking?", "kursowa?"];

/**
 * Buduje patch wiersza arkusza dla imprezy z Firestore.
 * Współdzielone przez task events.writeToSheet i backfill w syncu.
 * Eksport dla testów jednostkowych.
 */
export function buildEventRowPatch(eventId: string, data: any): Record<string, any> {
  return {
    "ID": eventId,
    "data rozpoczęcia": norm(data?.startDate),
    "data zakończenia": norm(data?.endDate),
    "nazwa imprezy": norm(data?.name),
    "miejsce": norm(data?.location),
    "opis": norm(data?.description),
    "kontakt": norm(data?.contact),
    "link do strony / zgłoszeń": norm(data?.link),
    "Zatwierdzona": "NIE",
    "ranking?": "NIE",
    "kursowa?": "NIE",
  };
}

export const eventsSyncFromSheetTask: ServiceTask<Payload> = {
  id: "events.syncFromSheet",
  description: "Sync: Google Sheets (imprezy) -> Firestore events (upsert po ID, zatwierdza gdzie Zatwierdzona=TAK) + backfill brakujących wierszy.",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;
    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    const spreadsheetId = cfg.events.spreadsheetId;
    const tabName = cfg.events.tabName;
    const calendarId = cfg.calendar?.calendarId || "";

    if (!spreadsheetId) {
      return {ok: false, message: "Missing events spreadsheetId in config"};
    }

    ctx.logger.info("eventsSyncFromSheet: start", {spreadsheetId, tabName, dryRun, calendarEnabled: Boolean(calendarId)});

    const sheets = new GoogleSheetsProvider(delegated);
    const calendarProvider = calendarId ? new GoogleCalendarProvider(delegated) : null;

    let table;
    try {
      table = await sheets.readTableAsObjects({spreadsheetId, tabName});
    } catch (e: any) {
      ctx.logger.error("eventsSyncFromSheet: cannot read sheet", {message: e?.message});
      return {ok: false, message: "Cannot read sheet: " + e?.message};
    }

    ctx.logger.info("eventsSyncFromSheet: rows loaded", {count: table.rows.length});

    // Kolumna potwierdzenia syncu (opcjonalna; nazwa tolerowana bez względu na
    // wielkość liter). Po udanym upsercie wiersza do Firestore wpisujemy datę —
    // pusta komórka obok imprezy oznaczała dla admina, że sync "nie działa" (I7).
    const zsyncHeader = findHeaderCaseInsensitive(table.headers, "zsynchronizowano");
    const syncDate = ctx.now.toISOString().slice(0, 10);

    // Tolerancyjny odczyt kolumn (Z1/Z2 z planu wdrożenia): rozjazd nagłówków
    // (case/spacje/interpunkcja, np. "Ranking?" vs "ranking?") nie może już
    // po cichu zerować pól — arkusz edytują ludzie i dryf wróci.
    const get = buildLooseRowGetter(table.headers);

    let upserted = 0;
    let skipped = 0;
    let errors = 0;
    let calendarSynced = 0;
    let confirmedInSheet = 0;

    // ID obecne w arkuszu w tym przebiegu — podstawa reconciliation (usuwania
    // imprez skasowanych z arkusza). Zbierane dla KAŻDEGO wiersza z niepustym ID,
    // niezależnie od kompletności pól (wiersz istnieje = nie kasujemy dokumentu).
    const seenSheetIds = new Set<string>();

    for (const row of table.rows) {
      let sheetId = norm(get(row, "ID"));
      const rowNumber = Number(row["_rowNumber"]);

      const startDate = normDate(get(row, "data rozpoczęcia"));
      const endDate = normDate(get(row, "data zakończenia"));
      const name = norm(get(row, "nazwa imprezy"));

      if (!sheetId) {
        if (!startDate || !endDate || !name) {
          skipped++;
          continue;
        }

        // Auto-generate Firestore document ID for rows added directly to sheet
        sheetId = ctx.firestore.collection("events").doc().id;

        if (!dryRun && rowNumber > 0) {
          try {
            await sheets.writeSingleCell({spreadsheetId, tabName}, rowNumber, "ID", sheetId);
            ctx.logger.info("eventsSyncFromSheet: wrote auto-generated ID to sheet", {sheetId, rowNumber});
          } catch (e: any) {
            ctx.logger.error("eventsSyncFromSheet: failed to write ID back to sheet", {sheetId, rowNumber, message: e?.message});
            errors++;
            continue;
          }
        } else {
          ctx.logger.info("eventsSyncFromSheet: [DRY RUN] would auto-generate ID", {sheetId, rowNumber});
        }
      }

      // Wiersz ma ID i jest obecny w arkuszu — chroń jego dokument przed
      // usunięciem w reconciliation (nawet jeśli pola są niekompletne).
      seenSheetIds.add(sheetId);

      if (!startDate || !endDate || !name) {
        ctx.logger.warn("eventsSyncFromSheet: skipping row with missing required fields", {sheetId});
        skipped++;
        continue;
      }

      const approved = isApproved(get(row, "Zatwierdzona"));
      const ranking = isApproved(get(row, "ranking?"));
      const kursowa = isApproved(get(row, "kursowa?"));
      const location = norm(get(row, "miejsce"));
      const description = norm(get(row, "opis"));
      const contact = norm(get(row, "kontakt"));
      const link = norm(get(row, "link do strony / zgłoszeń"));

      // UWAGA: bez "source" — sync nie może nadpisywać pochodzenia zgłoszenia
      // (Z13: imprezy z aplikacji traciły source="app", co psuło backfill).
      // source ustawiamy tylko dla NOWYCH dokumentów (wiersze dodane w arkuszu).
      const doc: Record<string, any> = {
        id: sheetId,
        startDate,
        endDate,
        name,
        location,
        description,
        contact,
        link,
        approved,
        ranking,
        kursowa,
        updatedAt: ctx.now,
        syncedAt: ctx.now,
      };

      if (dryRun) {
        ctx.logger.info("eventsSyncFromSheet: [DRY RUN] would upsert", {sheetId, approved});
        upserted++;
        continue;
      }

      const docRef = ctx.firestore.collection("events").doc(sheetId);
      let existingData: any = null;

      try {
        const existingSnap = await docRef.get();
        existingData = existingSnap.exists ? existingSnap.data() : null;

        // Nowy dokument (wiersz dodany bezpośrednio w arkuszu) MUSI mieć createdAt —
        // panel zarządu sortuje po createdAt i dokumenty bez tego pola pomija.
        if (!existingData) {
          doc.createdAt = ctx.now;
          doc.source = "sheet";
        }

        // Re-dodanie wiersza: impreza usunięta wcześniej automatycznie (reconciliation,
        // rejectedReason="removed_from_sheet") wraca do obiegu, gdy jej wiersz znów
        // jest w arkuszu. NIE dotyczy ręcznych odrzuceń z panelu (inny rejectedReason).
        if (existingData?.rejected === true && existingData?.rejectedReason === "removed_from_sheet") {
          doc.rejected = admin.firestore.FieldValue.delete();
          doc.rejectedReason = admin.firestore.FieldValue.delete();
          doc.removedFromSheetAt = admin.firestore.FieldValue.delete();
        }

        await docRef.set(doc, {merge: true});

        upserted++;
        ctx.logger.info("eventsSyncFromSheet: upserted", {sheetId, approved});
      } catch (e: any) {
        ctx.logger.error("eventsSyncFromSheet: error upserting", {sheetId, message: e?.message});
        errors++;
        continue;
      }

      // Potwierdzenie w arkuszu: data syncu w kolumnie zsynchronizowano
      // (wypełniana raz — gdy pusta; wiersze pomijane przy syncu jej nie dostają,
      // więc pusta komórka pozostaje sygnałem problemu).
      if (zsyncHeader && rowNumber > 0 && !norm(row[zsyncHeader])) {
        try {
          await sheets.writeSingleCell({spreadsheetId, tabName}, rowNumber, zsyncHeader, syncDate);
          confirmedInSheet++;
        } catch (e: any) {
          ctx.logger.warn("eventsSyncFromSheet: cannot write sync confirmation", {
            sheetId, rowNumber, message: e?.message,
          });
        }
      }

      // Sync to Google Calendar for approved events
      if (approved && calendarProvider && calendarId) {
        try {
          const existingCalId = norm(existingData?.calendarEventId);

          const descriptionParts: string[] = [];
          if (description) descriptionParts.push(description);
          if (contact) descriptionParts.push(`Kontakt: ${contact}`);
          if (link) descriptionParts.push(`Link: ${link}`);

          const calData: CalendarEventData = {
            summary: name,
            description: descriptionParts.join("\n"),
            location,
            startDate,
            endDate,
          };

          if (existingCalId) {
            await calendarProvider.updateEvent(calendarId, existingCalId, calData);
            ctx.logger.info("eventsSyncFromSheet: calendar event updated", {sheetId, gcalEventId: existingCalId});
          } else {
            const gcalEventId = await calendarProvider.createEvent(calendarId, calData);
            await docRef.update({calendarEventId: gcalEventId});
            ctx.logger.info("eventsSyncFromSheet: calendar event created", {sheetId, gcalEventId});
          }
          calendarSynced++;
        } catch (e: any) {
          ctx.logger.warn("eventsSyncFromSheet: calendar sync failed (non-fatal)", {sheetId, message: e?.message});
        }
      }
    }

    // ── RECONCILIATION: imprezy USUNIĘTE z arkusza ───────────────────────────
    // Sync był dotąd tylko-upsertem — skasowanie wiersza w arkuszu NIE usuwało
    // imprezy z aplikacji (dokument zostawał approved=true). Tu domykamy lukę:
    // dokumenty, których ID nie ma już w arkuszu, a które stamtąd pochodziły /
    // były zsynchronizowane, oznaczamy jako usunięte (approved=false + rejected
    // — to samo pole co odrzucenie z panelu, więc znikają z panelu/digestu, a
    // pass kalendarza je usuwa). Reużywa infrastruktury Fazy 2.
    //
    // BEZPIECZNIK: pusty odczyt arkusza (0 wierszy — np. zła zakładka, chwilowy
    // błąd) NIE może wywołać masowego usunięcia — pomijamy reconciliation.
    let removed = 0;
    if (table.rows.length === 0) {
      ctx.logger.warn("eventsSyncFromSheet: pusty arkusz — pomijam reconciliation (bezpiecznik)");
    } else {
      try {
        const allSnap = await ctx.firestore.collection("events").get();
        for (const doc of allSnap.docs) {
          if (seenSheetIds.has(doc.id)) continue;
          const data = doc.data() as any;
          if (!shouldScrapAbsentEvent(data)) continue;

          if (dryRun) {
            ctx.logger.info("eventsSyncFromSheet: [DRY RUN] would remove event absent from sheet", {eventId: doc.id});
            removed++;
            continue;
          }

          // Usuń wpis z kalendarza (jeśli był) — inline, natychmiast.
          const calId = norm(data?.calendarEventId);
          if (calId && calendarProvider && calendarId) {
            try {
              await calendarProvider.deleteEvent(calendarId, calId);
            } catch (e: any) {
              ctx.logger.warn("eventsSyncFromSheet: calendar delete (removed event) failed", {eventId: doc.id, message: e?.message});
            }
          }

          try {
            await doc.ref.update({
              approved: false,
              rejected: true,
              rejectedReason: "removed_from_sheet",
              removedFromSheetAt: admin.firestore.FieldValue.serverTimestamp(),
              calendarEventId: admin.firestore.FieldValue.delete(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            removed++;
            ctx.logger.info("eventsSyncFromSheet: removed event absent from sheet", {eventId: doc.id});
          } catch (e: any) {
            ctx.logger.error("eventsSyncFromSheet: reconciliation update failed", {eventId: doc.id, message: e?.message});
            errors++;
          }
        }
      } catch (e: any) {
        ctx.logger.warn("eventsSyncFromSheet: reconciliation query failed", {message: e?.message});
      }
    }

    // ── BACKFILL: imprezy z aplikacji, które nigdy nie trafiły do arkusza ─────
    // (sheetSyncedAt == null — np. job events.writeToSheet umarł po wyczerpaniu
    // prób albo arkusz miał wtedy zły nagłówek/zakładkę). Samonaprawa: po
    // usunięciu przyczyny kolejny sync dopisze zaległe wiersze.
    let backfilled = 0;
    try {
      const missingSnap = await ctx.firestore
        .collection("events")
        .where("sheetSyncedAt", "==", null)
        .limit(25)
        .get();

      for (const doc of missingSnap.docs) {
        const data = doc.data() as any;
        if (String(data?.source || "") !== "app") continue;
        // Nie wskrzeszaj imprez usuniętych/odrzuconych — backfill nie może
        // dopisać do arkusza wiersza dla pozycji, którą świadomie usunięto.
        if (data?.rejected === true) continue;
        if (!norm(data?.name) || !norm(data?.startDate) || !norm(data?.endDate)) continue;

        if (dryRun) {
          ctx.logger.info("eventsSyncFromSheet: [DRY RUN] would backfill", {eventId: doc.id});
          backfilled++;
          continue;
        }

        try {
          const rowPatch = buildEventRowPatch(doc.id, data);
          const result = await sheets.upsertMemberRowById(
            {spreadsheetId, tabName},
            rowPatch,
            {createOnlyColumns: EVENT_ROW_CREATE_ONLY_COLUMNS, looseHeaders: true}
          );
          await doc.ref.update({
            sheetRowNumber: result.rowNumber,
            sheetSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          backfilled++;
          ctx.logger.info("eventsSyncFromSheet: backfilled missing sheet row", {
            eventId: doc.id, rowNumber: result.rowNumber,
          });
        } catch (e: any) {
          ctx.logger.error("eventsSyncFromSheet: backfill failed", {eventId: doc.id, message: e?.message});
          errors++;
        }
      }
    } catch (e: any) {
      ctx.logger.warn("eventsSyncFromSheet: backfill query failed", {message: e?.message});
    }

    const message = `upserted=${upserted}, skipped=${skipped}, removed=${removed}, backfilled=${backfilled}, confirmedInSheet=${confirmedInSheet}, errors=${errors}, calendarSynced=${calendarSynced}`;
    ctx.logger.info("eventsSyncFromSheet: done", {upserted, skipped, removed, backfilled, confirmedInSheet, errors, calendarSynced, dryRun});

    return {
      ok: errors === 0,
      message,
      details: {upserted, skipped, removed, backfilled, confirmedInSheet, errors, calendarSynced, dryRun},
    };
  },
};

/**
 * Task: events.writeToSheet
 *
 * Zapisuje pojedyncze zgłoszenie imprezy (z aplikacji) do zakładki "imprezy" w Google Sheets.
 * Wywoływany jako job serwisowy po każdym submitEvent.
 *
 * Kolumny decyzyjne (Zatwierdzona/ranking?/kursowa?) są ustawiane tylko przy
 * tworzeniu wiersza — retry joba nie nadpisze decyzji admina (ryzyko I3).
 */
type WritePayload = {
  eventId: string;
  uid: string;
};

export const eventsWriteToSheetTask: ServiceTask<WritePayload> = {
  id: "events.writeToSheet",
  description: "Zapisuje zgłoszenie imprezy do zakładki imprezy w Google Sheets.",

  validate: (payload) => {
    if (!payload?.eventId) throw new Error("Missing eventId");
    if (!payload?.uid) throw new Error("Missing uid");
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;

    const spreadsheetId = cfg.events.spreadsheetId;
    const tabName = cfg.events.tabName;

    if (!spreadsheetId) {
      return {ok: false, message: "Missing events spreadsheetId in config"};
    }

    const docRef = ctx.firestore.collection("events").doc(payload.eventId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return {ok: false, message: `Event ${payload.eventId} not found`};
    }

    const data = snap.data() as any;
    const rowPatch = buildEventRowPatch(payload.eventId, data);

    const sheets = new GoogleSheetsProvider(delegated);

    try {
      const result = await sheets.upsertMemberRowById(
        {spreadsheetId, tabName},
        rowPatch,
        {createOnlyColumns: EVENT_ROW_CREATE_ONLY_COLUMNS, looseHeaders: true}
      );

      await docRef.update({
        sheetRowNumber: result.rowNumber,
        sheetSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        ok: true,
        message: `Row ${result.action} at row ${result.rowNumber}`,
        details: {rowNumber: result.rowNumber, action: result.action},
      };
    } catch (e: any) {
      return {ok: false, message: `Sheet write failed (tab "${tabName}"): ` + e?.message};
    }
  },
};
