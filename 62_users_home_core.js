/********************************************************************
 * 62_users_home_core.js – pobieranie danych do HOME
 *
 * UWAGA: NIE UŻYWAMY Session.getActiveUser(),
 * email musi być przekazywany jawnie.
 ********************************************************************/

function users_getHomeData(email) {
  try {
    if (!email) {
      return { ok: false, error: "Brak email w parametrze users_getHomeData()." };
    }

    const norm = String(email).trim().toLowerCase();

    const doc = user_getActive(norm);
    if (!doc || !doc.fields) {
      return { ok: false, error: "Nie znaleziono użytkownika w Firestore." };
    }

    const f = doc.fields;

    return {
      ok: true,
      email: f.email?.stringValue || norm,
      imie: f.imie?.stringValue || "",
      nazwisko: f.nazwisko?.stringValue || "",
      ksywa: f.ksywa?.stringValue || "",
      telefon: f.telefon?.stringValue || "",
      rola: f.rola?.stringValue || "",
      status: f.status?.stringValue || "",
      joinedAt: f.joinedAt?.stringValue || ""
    };

  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
