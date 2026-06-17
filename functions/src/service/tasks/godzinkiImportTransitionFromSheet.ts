import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";
import {creditApprovedEarn, deductHours} from "../../modules/hours/godzinki_service";
import {getGodzinkiVars} from "../../modules/hours/godzinki_vars";
import {norm} from "../../modules/shared/text_utils";

/**
 * Task: godzinki.importTransitionFromSheet
 *
 * Import tegorocznych godzinek (zgłoszenia + potrącenia) oraz bieżących korekt z arkusza
 * przejściowego "Godzinki 2026 i korekty" do kolekcji godzinki_ledger.
 *
 * Model:
 *   - Każdy wiersz to NOWY rekord (zakładka jest ŹRÓDŁEM, nie lustrem ledgera).
 *   - uid ustalany po e-mailu: zarejestrowany → prawdziwy uid; brak → "hist_{email}"
 *     (scalany na prawdziwy uid przy rejestracji przez godzinki.mergeHistoricalUser).
 *   - "Godzinki" > 0 → zatwierdzony earn (FIFO/remaining poprawne od razu).
 *     "Godzinki" < 0 → potrącenie (spend) przez deductHours(force) — poprawna konsumpcja FIFO.
 *   - Wiersze danej osoby przetwarzane CHRONOLOGICZNIE (po "Data pracy"): earny przed
 *     potrąceniami, które je konsumują.
 *
 * Bramki / idempotencja:
 *   - przetwarzamy tylko wiersze z "Zatwierdzone" = TAK (admin oznacza gotowe do importu),
 *   - wiersz z wypełnionym "Zsynchronizowano" jest pomijany (już zaimportowany),
 *   - po imporcie wypełniamy "Zsynchronizowano" (+ "ID"/"UID" dla earnów) — ponowny przebieg
 *     nie tworzy duplikatów.
 *
 * Arkusz musi mieć kolumny:
 *   ID | UID | Imię | Nazwisko | E-mail | Godzinki | Data pracy | Opis | Zatwierdzone | Zsynchronizowano | Data zatwierdzenia
 */

type Payload = {
  dry?: boolean;
  spreadsheetId?: string;
  tabName?: string;
};

function isApproved(v: any): boolean {
  const s = norm(v).toLowerCase();
  return ["tak", "t", "yes", "true", "1", "✓"].includes(s);
}

function isIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** Parsuje liczbę godzin z komórki (akceptuje przecinek dziesiętny i znak minus). */
function parseHours(v: any): number {
  const s = norm(v).replace(",", ".").replace(/\s+/g, "");
  if (!s) return NaN;
  return Number(s);
}

type PendingRow = {
  rowNumber: number;
  email: string;
  amount: number;
  dateIso: string;
  reason: string;
};

export const godzinkiImportTransitionFromSheetTask: ServiceTask<Payload> = {
  id: "godzinki.importTransitionFromSheet",
  description: "Import tegorocznych godzinek/korekt z arkusza przejściowego do godzinki_ledger (earn/spend, hist_{email}).",

  validate: (_payload) => {
    // brak wymaganych pól — spreadsheetId może pochodzić z configu
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;
    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    const spreadsheetId = norm(payload?.spreadsheetId) || cfg.godzinkiTransition.spreadsheetId;
    const tabName = norm(payload?.tabName) || cfg.godzinkiTransition.tabName;

    if (!spreadsheetId) {
      return {ok: false, message: "Missing transition spreadsheetId (payload.spreadsheetId or SVC_GODZINKI_TRANSITION_SHEET_ID)"};
    }

    ctx.logger.info("godzinki.importTransitionFromSheet: start", {spreadsheetId, tabName, dryRun});

    const sheets = new GoogleSheetsProvider(delegated);
    const vars = await getGodzinkiVars(ctx.firestore);

    let table;
    try {
      table = await sheets.readTableAsObjects({spreadsheetId, tabName});
    } catch (e: any) {
      ctx.logger.error("godzinki.importTransitionFromSheet: cannot read sheet", {message: e?.message});
      return {ok: false, message: "Cannot read sheet: " + e?.message};
    }

    let alreadySynced = 0;
    let pending = 0;
    let skippedNoEmail = 0;
    let skippedBadAmount = 0;
    let skippedBadDate = 0;

    // 1) Zbierz prawidłowe wiersze gotowe do importu (Zatwierdzone=TAK, bez Zsynchronizowano)
    const byEmail = new Map<string, PendingRow[]>();

    for (const row of table.rows) {
      if (norm(row["Zsynchronizowano"])) {
        alreadySynced++;
        continue;
      }
      if (!isApproved(row["Zatwierdzone"])) {
        pending++;
        continue;
      }
      const email = norm(row["E-mail"]).toLowerCase();
      if (!email || !email.includes("@")) {
        skippedNoEmail++;
        ctx.logger.warn("godzinki.importTransitionFromSheet: row without e-mail — skipped", {rowNumber: row["_rowNumber"]});
        continue;
      }
      const amount = parseHours(row["Godzinki"]);
      if (!Number.isFinite(amount) || amount === 0) {
        skippedBadAmount++;
        ctx.logger.warn("godzinki.importTransitionFromSheet: invalid Godzinki — skipped", {rowNumber: row["_rowNumber"], raw: row["Godzinki"]});
        continue;
      }
      const dateIso = norm(row["Data pracy"]).slice(0, 10);
      if (!isIsoDate(dateIso)) {
        skippedBadDate++;
        ctx.logger.warn("godzinki.importTransitionFromSheet: invalid Data pracy — skipped", {rowNumber: row["_rowNumber"], raw: row["Data pracy"]});
        continue;
      }
      const entry: PendingRow = {
        rowNumber: Number(row["_rowNumber"]),
        email,
        amount,
        dateIso,
        reason: norm(row["Opis"]),
      };
      const arr = byEmail.get(email) || [];
      arr.push(entry);
      byEmail.set(email, arr);
    }

    let createdEarn = 0;
    let createdSpend = 0;
    let errors = 0;
    const cellCfg = {spreadsheetId, tabName};

    // 2) Dla każdej osoby: ustal uid, przetwarzaj chronologicznie
    for (const [email, rows] of byEmail.entries()) {
      // Ustal uid: zarejestrowany → prawdziwy uid; brak → hist_{email}
      let uid = `hist_${email}`;
      try {
        const userSnap = await ctx.firestore.collection("users_active").where("email", "==", email).limit(1).get();
        if (!userSnap.empty) uid = userSnap.docs[0].id;
      } catch (e: any) {
        ctx.logger.error("godzinki.importTransitionFromSheet: user lookup failed", {email, message: e?.message});
      }

      rows.sort((a, b) => (a.dateIso < b.dateIso ? -1 : a.dateIso > b.dateIso ? 1 : a.rowNumber - b.rowNumber));

      for (const r of rows) {
        if (dryRun) {
          ctx.logger.info("godzinki.importTransitionFromSheet: [DRY RUN] would import", {uid, ...r});
          if (r.amount > 0) createdEarn++; else createdSpend++;
          continue;
        }

        try {
          const syncDate = ctx.now.toISOString().slice(0, 10);

          if (r.amount > 0) {
            const grantedAt = new Date(r.dateIso + "T00:00:00Z");
            const expiresAt = new Date(grantedAt.getTime());
            expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + vars.expiryYears);

            const {id} = await creditApprovedEarn(ctx.firestore, uid, r.amount, grantedAt, expiresAt, {
              reason: r.reason || "Godziny 2026 (import)",
              approvedBy: "transition_import",
              submittedBy: "system",
            });
            createdEarn++;

            // Write-back po utworzeniu rekordu → idempotencja przy ponownym przebiegu (skip po Zsynchronizowano).
            await sheets.writeRowCells(cellCfg, r.rowNumber, {
              "ID": id,
              "UID": uid,
              "Zsynchronizowano": syncDate,
              "Data zatwierdzenia": syncDate,
            });
          } else {
            const result = await deductHours(
              ctx.firestore,
              uid,
              {amount: Math.abs(r.amount), reason: r.reason || "Potrącenie 2026 (import)", force: true},
              vars,
              ctx.now
            );
            if (!result.ok) {
              errors++;
              ctx.logger.error("godzinki.importTransitionFromSheet: deductHours failed", {uid, rowNumber: r.rowNumber, code: result.code, message: result.message});
              continue;
            }
            createdSpend++;

            await sheets.writeRowCells(cellCfg, r.rowNumber, {
              "UID": uid,
              "Zsynchronizowano": syncDate,
            });
          }
        } catch (e: any) {
          errors++;
          ctx.logger.error("godzinki.importTransitionFromSheet: import row failed", {uid, rowNumber: r.rowNumber, message: e?.message});
        }
      }
    }

    const summary = {createdEarn, createdSpend, alreadySynced, pending, skippedNoEmail, skippedBadAmount, skippedBadDate, errors};
    ctx.logger.info("godzinki.importTransitionFromSheet: done", summary);

    return {
      ok: errors === 0,
      message: `import: +${createdEarn} earn, +${createdSpend} spend, pending=${pending}, alreadySynced=${alreadySynced}, errors=${errors}`,
      details: summary,
    };
  },
};
