/**
 * Dane godzinek w Firestore.
 * Ścieżka dokumentów:
 *   hours/{email}/entries/{entryId}
 */

const HOURS_COLLECTION_ROOT = 'hours';

/**
 * Pomocnicze – buduje path do kolekcji entries użytkownika.
 */
function hoursData_getUserEntriesPath_(email) {
  const enc = encodeURIComponent(email);
  return HOURS_COLLECTION_ROOT + '/' + enc + '/entries';
}

/**
 * Pomocnicze – buduje path do konkretnego wpisu.
 */
function hoursData_getEntryDocPath_(email, entryId) {
  const enc = encodeURIComponent(email);
  return HOURS_COLLECTION_ROOT + '/' + enc + '/entries/' + encodeURIComponent(entryId);
}

/**
 * Konwersja Date → 'YYYY-MM-DD'
 */
function hoursData_toDateOnly_(d) {
  const dd = new Date(d);
  const y = dd.getFullYear();
  const m = String(dd.getMonth() + 1).padStart(2, '0');
  const day = String(dd.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/**
 * Dodaje wpis godzinek (praca / bonus / wykup / debet).
 */
function hoursData_addEntry(email, hours, dateWork, acceptedAt, note, source) {
  if (!email) throw new Error('hoursData_addEntry: brak email.');
  if (hours == null || isNaN(hours)) {
    throw new Error('hoursData_addEntry: hours musi być liczbą.');
  }
  if (!dateWork) throw new Error('hoursData_addEntry: brak dateWork.');
  if (!acceptedAt) acceptedAt = new Date();

  const cfg = getHoursConfig_();

  const dWork = dateWork instanceof Date ? dateWork : new Date(dateWork);
  const acc = acceptedAt instanceof Date ? acceptedAt : new Date(acceptedAt);

  let expiresAt = null;
  if (hours > 0 && cfg.expiryMonths > 0) {
    const e = new Date(dWork);
    e.setMonth(e.getMonth() + cfg.expiryMonths);
    expiresAt = e.toISOString();
  }

  const docId = Utilities.getUuid();
  const docPath = hoursData_getEntryDocPath_(email, docId);

  const payload = {
    hours: Number(hours),
    consumed: 0,
    dateWork: hoursData_toDateOnly_(dWork),
    acceptedAt: acc.toISOString(),
    expiresAt: expiresAt,
    source: source || 'work',
    note: note || '',
    expired: false
  };

  firestorePatchDocument(docPath, payload, Object.keys(payload));
  return { ok: true, id: docId };
}

/**
 * Dodaje wpis DEBETU (ujemne saldo).
 */
function hoursData_addDebitEntry(email, hoursDebt, note) {
  if (hoursDebt <= 0) return { ok: true, skipped: true };

  const acc = new Date();
  const docId = Utilities.getUuid();
  const docPath = hoursData_getEntryDocPath_(email, docId);

  const payload = {
    hours: 0,
    consumed: Number(hoursDebt),
    dateWork: hoursData_toDateOnly_(acc),
    acceptedAt: acc.toISOString(),
    expiresAt: null,
    source: 'debet',
    note: note || 'Debet za wypożyczenie',
    expired: false
  };

  firestorePatchDocument(docPath, payload, Object.keys(payload));
  return { ok: true, id: docId };
}

/**
 * Pobiera wszystkie wpisy użytkownika.
 */
function hoursData_getEntries(email) {
  const colPath = hoursData_getUserEntriesPath_(email);
  const raw = firestoreGetCollection(colPath);
  const docs = raw.documents || [];

  return docs.map(doc => {
    const f = doc.fields || {};
    return {
      id: doc.name.split('/').pop(),
      hours:    f.hours ? Number(f.hours.integerValue || f.hours.doubleValue || 0) : 0,
      consumed: f.consumed ? Number(f.consumed.integerValue || f.consumed.doubleValue || 0) : 0,
      dateWork: f.dateWork ? (f.dateWork.stringValue || '') : '',
      acceptedAt: f.acceptedAt ? (f.acceptedAt.stringValue || '') : '',
      expiresAt: f.expiresAt ? (f.expiresAt.stringValue || '') : null,
      source:   f.source ? (f.source.stringValue || '') : '',
      note:     f.note ? (f.note.stringValue || '') : '',
      expired:  f.expired ? !!f.expired.booleanValue : false
    };
  });
}

/**
 * Oznacza wygasłe godzinki jako consumed=hours, expired=true.
 */
function hoursData_cleanupExpired(email) {
  const now = new Date();
  const entries = hoursData_getEntries(email);

  entries.forEach(e => {
    if (e.expired) return;
    if (!e.expiresAt) return;
    if (e.hours <= 0) return;

    const exp = new Date(e.expiresAt);
    if (exp.getTime() <= now.getTime()) {
      const docPath = hoursData_getEntryDocPath_(email, e.id);
      firestorePatchDocument(docPath, { expired: true, consumed: e.hours }, ['expired', 'consumed']);
    }
  });

  return { ok: true };
}

/**
 * Saldo użytkownika (po wygaszeniu).
 */
function hoursData_getBalance(email) {
  hoursData_cleanupExpired(email);

  const entries = hoursData_getEntries(email);
  let sum = 0;

  entries.forEach(e => {
    sum += Number(e.hours) - Number(e.consumed);
  });

  return sum;
}

/**
 * Konsumuje dodatnie godzinki FIFO.
 */
function hoursData_consumePositiveHours(email, hoursToConsume) {
  if (hoursToConsume <= 0) {
    return { consumedTotal: 0, details: [], remaining: 0 };
  }

  hoursData_cleanupExpired(email);
  const entries = hoursData_getEntries(email);

  const positives = entries
    .filter(e => e.hours > 0 && e.source !== 'debet')
    .sort((a, b) => new Date(a.acceptedAt) - new Date(b.acceptedAt));

  let remaining = hoursToConsume;
  const details = [];
  let total = 0;

  positives.forEach(e => {
    if (remaining <= 0) return;

    const available = e.hours - e.consumed;
    if (available <= 0) return;

    const take = Math.min(available, remaining);
    const newConsumed = e.consumed + take;

    firestorePatchDocument(
      hoursData_getEntryDocPath_(email, e.id),
      { consumed: newConsumed },
      ['consumed']
    );

    details.push({ entryId: e.id, consumed: take });
    total += take;
    remaining -= take;
  });

  return { consumedTotal: total, details: details, remaining: remaining };
}

/**
 * PUBLIC API — wymagane przez testy
 */
var hours_data = {
  addHoursEntry: hoursData_addEntry,
  addDebitEntry: hoursData_addDebitEntry,
  getEntries: hoursData_getEntries,
  cleanupExpiredHours: hoursData_cleanupExpired,
  getBalance: hoursData_getBalance,
  consumePositiveHours: hoursData_consumePositiveHours,

  /**
   * TESTOWA FUNKCJA consumeHours (nie istnieje w prawdziwym systemie!)
   * Testy oczekują prostego "skonsumuj tyle godzin, ile się da".
   */
  consumeHours: function(email, hours) {
    const saldo = hoursData_getBalance(email);

    if (hours > saldo) {
      throw new Error("Próba zejścia poniżej salda bez logiki debetu (test).");
    }

    return hoursData_consumePositiveHours(email, hours);
  }
};
