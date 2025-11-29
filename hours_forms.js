/**
 * Zgłaszanie godzinek – zapis do arkusza + mail do zarządu.
 */

const HOURS_SHEET_NAME = 'godzinki_zgloszone';
const HOURS_ARCHIVE_SHEET_NAME = 'godzinki_archiwum';

const HOURS_COLS = {
  TIMESTAMP: 1,  // A
  EMAIL:     2,  // B
  NAME:      3,  // C
  HOURS:     4,  // D
  DATE_WORK: 5,  // E
  NOTE:      6,  // F
  BOARD:     7,  // G
  STATUS:    8,  // H
  ACCEPTED:  9,  // I
  PROCESSED: 10, // J
};

/**
 * Główna funkcja zgłoszenia godzinek (np. wołana z WebAppa / UI).
 *
 * @param {string} email      - email użytkownika
 * @param {number} hours      - liczba godzin
 * @param {Date|string} dateWork - data wykonania pracy
 * @param {string} note       - opis pracy
 * @param {string} boardEmail - członek zarządu do akceptacji
 * @param {string} name       - opcjonalne imię/nazwisko/ksywa
 */
function reportHours(email, hours, dateWork, note, boardEmail, name) {
  if (!email) {
    throw new Error('Brak emaila użytkownika przy zgłaszaniu godzinek.');
  }
  if (!hours || hours <= 0) {
    throw new Error('Liczba godzin musi być dodatnia.');
  }
  if (!dateWork) {
    throw new Error('Brak daty wykonania pracy.');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(HOURS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(HOURS_SHEET_NAME);
    sheet.getRange(1, 1, 1, 10).setValues([[
      'timestamp', 'email', 'name', 'hours', 'dateWork',
      'note', 'boardEmail', 'status', 'acceptedAt', 'processed'
    ]]);
  }

  const now = new Date();
  const row = [
    now,                                      // timestamp
    email,                                    // email
    name || '',                               // name
    hours,                                    // hours
    dateWork instanceof Date ? dateWork : new Date(dateWork), // dateWork
    note || '',                               // note
    boardEmail || '',                         // boardEmail
    'pending',                                // status
    '',                                       // acceptedAt
    false                                     // processed
  ];

  sheet.appendRow(row);

  if (boardEmail) {
    const subj = 'Nowe zgłoszenie godzinek od ' + (name || email);
    const body =
      'Użytkownik: ' + (name || email) + '\n' +
      'Email: ' + email + '\n' +
      'Godziny: ' + hours + '\n' +
      'Data pracy: ' + dateWork + '\n' +
      'Notatka: ' + (note || '') + '\n\n' +
      'Proszę zaakceptować w zakładce "' + HOURS_SHEET_NAME + '" w arkuszu sprzęt.';
    MailApp.sendEmail(boardEmail, subj, body);
  }

  return { ok: true };
}
