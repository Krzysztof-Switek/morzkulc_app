/**
 * Synchronizacja zakładki "godzinki_zgloszone" z Firestore (FIFO).
 * - reaguje na status accepted / rejected
 * - auto-odrzuca zgłoszenia po 14 dniach od daty pracy
 * - przenosi stare wiersze do "godzinki_archiwum"
 */

function hoursSheet_sync() {
  const cfg = getHoursConfig_();

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(HOURS_SHEET_NAME);
  if (!sheet) {
    Logger.log('hoursSheet_sync: brak arkusza ' + HOURS_SHEET_NAME);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, 1, lastRow - 1, 10);
  const values = range.getValues();

  const now = new Date();

  // Będziemy modyfikować wiersze – bufor na zmiany
  const out = values.map(r => r.slice());

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const status = String(row[HOURS_COLS.STATUS - 1] || '').trim().toLowerCase();
    const processed = !!row[HOURS_COLS.PROCESSED - 1];
    const email = String(row[HOURS_COLS.EMAIL - 1] || '').trim();
    const hours = Number(row[HOURS_COLS.HOURS - 1] || 0);
    const dateWorkRaw = row[HOURS_COLS.DATE_WORK - 1];
    const note = row[HOURS_COLS.NOTE - 1] || '';

    if (!email || !hours || !dateWorkRaw) {
      continue;
    }

    const dateWork = (dateWorkRaw instanceof Date) ? dateWorkRaw : new Date(dateWorkRaw);
    const diffDays = Math.floor((now.getTime() - dateWork.getTime()) / (1000 * 60 * 60 * 24));

    // 1) AUTO-REJECT: zgłaszanie po czasie
    if (status === 'pending') {
      if (diffDays > cfg.maxDaysToReport) {
        out[i][HOURS_COLS.STATUS - 1] = 'auto_rejected';
        out[i][HOURS_COLS.PROCESSED - 1] = true;
      }
      continue;
    }

    // 2) Już przetworzone → skip
    if (processed) continue;

    // 3) accepted → przerzucamy do Firestore
    if (status === 'accepted') {
      const acceptedAt = new Date();
      try {
        hoursData_addEntry(
          email,
          hours,
          dateWork,
          acceptedAt,
          note,
          'work'
        );

        out[i][HOURS_COLS.ACCEPTED - 1] = acceptedAt;
        out[i][HOURS_COLS.PROCESSED - 1] = true;

        // mail do użytkownika
        const saldo = hoursData_getBalance(email);
        const subj = 'Godzinki zaakceptowane';
        const body =
          'Twoje zgłoszone godzinki (' + hours + 'h z dnia ' + dateWork.toDateString() + ') zostały zaakceptowane.\n\n' +
          'Aktualne saldo: ' + saldo + ' godzinek.';
        MailApp.sendEmail(email, subj, body);

      } catch (e) {
        Logger.log('BŁĄD hoursSheet_sync przy przerzucaniu do Firestore: ' + e);
      }
    }

    // 4) rejected / auto_rejected → tylko processed=true
    if (status === 'rejected' || status === 'auto_rejected') {
      out[i][HOURS_COLS.PROCESSED - 1] = true;
    }
  }

  // Wpisujemy zmodyfikowane wiersze
  range.setValues(out);

  // 5) Sprzątanie – przenosimy przetworzone wiersze starsze niż okres_do_archiwizacji_godzinek
  hoursSheet_cleanup_(sheet, cfg.archiveAfterDays);
}

/**
 * Przenosi stare, przetworzone wiersze do arkusza "godzinki_archiwum"
 * i usuwa je z głównego arkusza.
 */
function hoursSheet_cleanup_(sheet, archiveAfterDays) {
  const ss = sheet.getParent();
  let archive = ss.getSheetByName(HOURS_ARCHIVE_SHEET_NAME);
  if (!archive) {
    archive = ss.insertSheet(HOURS_ARCHIVE_SHEET_NAME);
    archive.getRange(1, 1, 1, 10).setValues([[
      'timestamp', 'email', 'name', 'hours', 'dateWork',
      'note', 'boardEmail', 'status', 'acceptedAt', 'processed'
    ]]);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, 1, lastRow - 1, 10);
  const values = range.getValues();
  const now = new Date();

  const rowsToDelete = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const processed = !!row[HOURS_COLS.PROCESSED - 1];
    const ts = row[HOURS_COLS.TIMESTAMP - 1];

    if (!processed) continue;
    if (!(ts instanceof Date)) continue;

    const diffDays = Math.floor((now.getTime() - ts.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= archiveAfterDays) {
      archive.appendRow(row);
      rowsToDelete.push(i + 2); // real row index
    }
  }

  // Usuwamy od dołu
  rowsToDelete.sort((a, b) => b - a).forEach(r => sheet.deleteRow(r));
}
