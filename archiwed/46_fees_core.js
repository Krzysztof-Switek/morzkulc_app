/********************************************************************
 * fees_core.gs
 * Zarządzanie składkami → kolekcja /fees/{email}
 ********************************************************************/

function fees_getStatus(email) {
  const doc = firestoreGetDocument(`${FEES_COLLECTION}/${encodeURIComponent(email)}`);
  if (!doc || !doc.fields) {
    return { email, active: false, paidUntil: null };
  }

  const f = doc.fields;
  const paidUntil = f.paidUntil ? f.paidUntil.stringValue : null;

  return {
    email: email,
    paidUntil: paidUntil,
    active: paidUntil ? (new Date(paidUntil) >= new Date()) : false
  };
}

function fees_upsertFromOpeningBalance(email, paidUntil) {
  const docPath = `${FEES_COLLECTION}/${encodeURIComponent(email)}`;

  const obj = {
    email: email,
    paidUntil: paidUntil,
    source: "opening_balance_26",
    lastUpdate: new Date().toISOString()
  };

  firestorePatchDocument(docPath, obj, Object.keys(obj));
}
