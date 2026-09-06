// READ-ONLY: podgląd, komu zostałby wysłany mail "jesteś kierownikiem", gdyby
// TERAZ uruchomić events.syncFromSheet. Czyta NAPRAWDĘ zakładkę "imprezy" (ten sam
// arkusz i auth co eventsSyncFromSheet.ts), ale niczego nie zapisuje — ani do
// Firestore, ani do arkusza. Replikuje logikę:
//   - Kierownik dotyczy tylko wierszy Organizator=="Morzkulc" (patrz
//     parseOrganizerFromSheetCell w eventsSyncFromSheet.ts)
//   - email musi się rozwiązać do users_active (rola z SVC_MEMBER_ROLE_KEYS,
//     status nieblokujący wg setup/app.statusMappings) — patrz
//     resolveKierownikCandidate w events_service.ts
//   - "nowy" kierownik = uid NIE jest już w kierownikUids aktualnie zapisanych
//     na tym dokumencie events/{ID} w Firestore
//   - konflikt = uid jest już aktywnym kierownikiem INNEJ, jeszcze niezakończonej
//     imprezy klubowej (findActiveKierownikConflict)
//   - job już istnieje = service_jobs/events-notify-kierownik:{eventId}:{uid}
//     już is created kiedyś -> mail NIE pójdzie ponownie
//
// node --use-system-ca functions/scripts/checkEventsKierownikSyncPreview.js
const admin = require("firebase-admin");
const { google } = require("googleapis");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

const SPREADSHEET_ID = "1lF5eDF9B6ip4G497qG1QGePXqrXdLPS8kt-3pX-ZBsM";
const TAB_NAME = "imprezy";
const MEMBER_ROLE_KEYS = ["rola_czlonek", "rola_zarzad", "rola_kr", "rola_kandydat"];

function canonicalHeader(h) {
  return String(h || "").toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]/g, "");
}

function normalizeOrganizerToken(v) {
  return String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
const ORGANIZER_TOKEN_TO_KEY = {
  morzkulc: "morzkulc", bystrze: "bystrze", pantarei: "panta_rei", habazie: "habazie", przewrotka: "przewrotka",
};
function parseOrganizerFromSheetCell(raw) {
  const token = normalizeOrganizerToken(raw);
  if (!token) return "";
  return ORGANIZER_TOKEN_TO_KEY[token] || "";
}

function isApproved(v) {
  const s = String(v || "").trim().toLowerCase();
  return ["tak", "t", "yes", "true", "1", "✓"].includes(s);
}

async function signJwtWithIamCredentials(serviceAccountEmail, payload) {
  const auth = await google.auth.getClient({ scopes: ["https://www.googleapis.com/auth/iam"] });
  const iam = google.iamcredentials({ version: "v1", auth });
  const res = await iam.projects.serviceAccounts.signJwt({
    name: "projects/-/serviceAccounts/" + serviceAccountEmail,
    requestBody: { payload: JSON.stringify(payload) },
  });
  return res.data.signedJwt;
}
async function exchangeJwtForAccessToken(assertion) {
  const body = new URLSearchParams();
  body.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  body.set("assertion", assertion);
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error("token exchange failed: " + resp.status + " " + text);
  return JSON.parse(text).access_token;
}

async function getDelegatedSheetsClient() {
  const sa = process.env.SVC_WORKSPACE_SA_EMAIL || "workspace-bot@morzkulc-e9df7.iam.gserviceaccount.com";
  const sub = process.env.SVC_WORKSPACE_DELEGATED_SUBJECT || "admin@morzkulc.pl";
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  const iat = Math.floor(Date.now() / 1000);
  const jwtPayload = { iss: sa, sub, scope: scopes.join(" "), aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 };
  const signedJwt = await signJwtWithIamCredentials(sa, jwtPayload);
  const accessToken = await exchangeJwtForAccessToken(signedJwt);
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth: oauth2 });
}

async function isUserStatusBlocked(statusKey) {
  if (!statusKey) return false;
  const snap = await db.collection("setup").doc("app").get();
  if (!snap.exists) return false;
  const mappings = (snap.data() || {}).statusMappings || {};
  return mappings[statusKey]?.blocksAccess === true;
}

async function resolveKierownikCandidate(email) {
  const emailLower = String(email || "").trim().toLowerCase();
  if (!emailLower || !emailLower.includes("@")) return { ok: false, message: "e-mail nieprawidłowy" };
  const snap = await db.collection("users_active").where("email", "==", emailLower).limit(1).get();
  if (snap.empty) return { ok: false, message: `brak konta o e-mailu ${emailLower}` };
  const data = snap.docs[0].data();
  const roleKey = String(data.role_key || "");
  if (!MEMBER_ROLE_KEYS.includes(roleKey)) return { ok: false, message: `rola "${roleKey}" nie kwalifikuje (uid ${snap.docs[0].id})` };
  if (await isUserStatusBlocked(String(data.status_key || ""))) return { ok: false, message: `konto zawieszone (uid ${snap.docs[0].id})` };
  return { ok: true, uid: snap.docs[0].id, roleKey, statusKey: data.status_key };
}

(async () => {
  console.log("Łączę się z arkuszem (Sheets API, delegacja admin@morzkulc.pl)...\n");
  const sheets = await getDelegatedSheetsClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'`,
  });
  const values = resp.data.values || [];
  if (values.length < 2) {
    console.log("Arkusz pusty lub brak nagłówków.");
    process.exit(0);
  }
  const headers = values[0];
  const byCanonical = new Map();
  headers.forEach((h, i) => { const c = canonicalHeader(h); if (c && !byCanonical.has(c)) byCanonical.set(c, i); });
  function cell(row, name) {
    const idx = byCanonical.get(canonicalHeader(name));
    return idx == null ? "" : String(row[idx] || "").trim();
  }

  // WAŻNE: prawdziwy sync przetwarza wiersze PO KOLEI (góra->dół arkusza) i pisze
  // do Firestore wiersz-po-wierszu, a sprawdzenie konfliktu ("jeden kierownik
  // naraz") czyta Firestore NA ŻYWO w danym momencie pętli — więc kandydat, który
  // dopiero co (w tym samym przebiegu, wcześniejszym wierszem) stał się aktywnym
  // kierownikiem innej imprezy, będzie widoczny jako konflikt dla PÓŹNIEJSZEGO
  // wiersza tego samego przebiegu. Symulacja musi więc aktualizować stan
  // przyrostowo, w kolejności wierszy arkusza — nie może to być jedna statyczna
  // migawka Firestore sprzed pętli.
  const rows = values.slice(1).map((row, i) => ({ row, rowNumber: i + 2 }));

  const eventsSnap = await db.collection("events").get();
  const clubEventsByUid = new Map(); // uid -> [{id,name,endDate}]  (stan ŻYWY, aktualizowany w pętli)
  const firestoreEventById = new Map();
  eventsSnap.forEach((d) => {
    const x = d.data() || {};
    firestoreEventById.set(d.id, x);
    if (x.organizer === "morzkulc" && x.approved === true && x.rejected !== true) {
      const uids = Array.isArray(x.kierownikUids) ? x.kierownikUids : [];
      for (const uid of uids) {
        if (!clubEventsByUid.has(uid)) clubEventsByUid.set(uid, []);
        clubEventsByUid.get(uid).push({ id: d.id, name: x.name, endDate: x.endDate });
      }
    }
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  console.log(`Wierszy w arkuszu "imprezy": ${rows.length}\n`);
  console.log("=== Wiersze z Organizator=Morzkulc i niepustą kolumną Kierownik ===\n");

  let anyRelevant = false;

  for (const { row, rowNumber } of rows) {
    const sheetId = cell(row, "ID");
    const name = cell(row, "nazwa imprezy");
    const organizerRaw = cell(row, "Organizator");
    const organizer = parseOrganizerFromSheetCell(organizerRaw);
    const kierownikCsv = cell(row, "Kierownik");
    const zatwierdzona = cell(row, "Zatwierdzona");
    const approvedInSheet = isApproved(zatwierdzona);
    const startDate = cell(row, "data rozpoczęcia");
    const endDate = cell(row, "data zakończenia");

    if (organizer !== "morzkulc" || !kierownikCsv) continue;
    anyRelevant = true;

    console.log(`--- Wiersz ${rowNumber}: "${name}" (ID=${sheetId || "(brak - nowy)"}) ---`);
    console.log(`    Organizator="${organizerRaw}" -> ${organizer} | Zatwierdzona="${zatwierdzona}" -> approved=${approvedInSheet} | ${startDate}–${endDate}`);
    console.log(`    Kolumna Kierownik: "${kierownikCsv}"`);

    if (!approvedInSheet) {
      console.log("    => Zatwierdzona != TAK: nic nie zostanie wysłane niezależnie od reszty (impreza nie jest 'aktywna klubowa').\n");
      continue;
    }

    const existingDoc = sheetId ? firestoreEventById.get(sheetId) : null;
    const prevUids = existingDoc && existingDoc.approved === true && existingDoc.organizer === "morzkulc" && Array.isArray(existingDoc.kierownikUids)
      ? existingDoc.kierownikUids : [];

    const emails = kierownikCsv.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const finalUidsThisRow = []; // do przyrostowej aktualizacji clubEventsByUid po wierszu
    for (const email of emails) {
      const resolved = await resolveKierownikCandidate(email);
      if (!resolved.ok) {
        console.log(`    [${email}] NIE rozwiąże się -> ${resolved.message} => MAIL NIE ZOSTANIE WYSŁANY (błąd resolvowania).`);
        continue;
      }
      const uid = resolved.uid;
      const alreadyHere = prevUids.includes(uid);
      if (alreadyHere) {
        console.log(`    [${email}] uid=${uid} JUŻ jest kierownikiem TEJ imprezy w Firestore => nic nowego, mail NIE zostanie wysłany ponownie.`);
        finalUidsThisRow.push(uid);
        continue;
      }

      // Konflikt: aktywny kierownik innej, jeszcze niezakończonej imprezy klubowej —
      // sprawdzane na ŻYWEJ mapie, uwzględniającej wiersze już przetworzone WCZEŚNIEJ
      // w tym samym przebiegu (patrz komentarz przy budowie clubEventsByUid wyżej).
      const conflicts = (clubEventsByUid.get(uid) || []).filter((e) => e.id !== sheetId && e.endDate >= todayIso);
      if (conflicts.length) {
        console.log(`    [${email}] uid=${uid} MA KONFLIKT — już kierownik "${conflicts[0].name}" (do ${conflicts[0].endDate}, wiersz przetworzony wcześniej w tym samym syncu lub istniejący wcześniej) => zostanie WYKLUCZONY z tej imprezy, mail NIE zostanie wysłany.`);
        continue;
      }

      // Czy job już kiedyś istniał dla (eventId, uid)?
      const jobId = sheetId ? `events-notify-kierownik:${sheetId}:${uid}` : null;
      let jobExists = false;
      if (jobId) {
        const jobSnap = await db.collection("service_jobs").doc(jobId).get();
        jobExists = jobSnap.exists;
      }

      if (jobExists) {
        console.log(`    [${email}] uid=${uid} nowy w Firestore, ALE job ${jobId} już istnieje (nietypowe) => mail NIE zostanie wysłany ponownie.`);
      } else {
        console.log(`    [${email}] uid=${uid} => ===> TAK, DOSTANIE MAILA "jesteś kierownikiem imprezy: ${name}" <===`);
      }
      finalUidsThisRow.push(uid);
    }

    // Przyrostowa aktualizacja żywej mapy — kolejne wiersze w tym samym przebiegu
    // zobaczą tych kierowników jako już aktywnych (dokładnie jak live Firestore
    // read w prawdziwym syncu, patrz findActiveKierownikConflict).
    if (approvedInSheet && sheetId) {
      for (const uid of finalUidsThisRow) {
        if (!clubEventsByUid.has(uid)) clubEventsByUid.set(uid, []);
        const list = clubEventsByUid.get(uid).filter((e) => e.id !== sheetId);
        list.push({ id: sheetId, name, endDate });
        clubEventsByUid.set(uid, list);
      }
    }
    console.log("");
  }

  if (!anyRelevant) {
    console.log("Brak wierszy z Organizator=Morzkulc i niepustą kolumną Kierownik.");
  }

  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message, e.stack);
  process.exit(2);
});
