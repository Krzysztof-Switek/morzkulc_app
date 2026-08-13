// Jednorazowa/powtarzalna rekoncyliacja członkostwa w lista@ i grupach roleMappings
// wg role_key/status_key każdego usera, porównana z żywym stanem Directory API.
// Tworzy job `users.reconcileWorkspaceGroups`, czeka na wynik. Patrz
// Audyty/13.08_NAPRAWA_UPRAWNIEŃ_LISTA.MD.
//
// WYMAGANIA:
//   - funkcje wdrożone (build + `firebase deploy --only functions`) — trigger uruchamia KOD W CHMURZE.
//   - ADC: `gcloud auth application-default login`.
//
// URUCHOMIENIE (z katalogu functions/):
//   node scripts/enqueueReconcileWorkspaceGroups.js [--project dev|prod] [--dry] [--email=x@y.pl] [--notify]
//   (na tej maszynie zwykle: node --use-system-ca scripts/enqueueReconcileWorkspaceGroups.js --dry)
//
// --notify: PO udanej naprawie hurtowej (bez --dry, bez --email) wysyła jednorazowego maila do osób,
//   które ODZYSKAŁY możliwość pisania na lista@ (before!=MANAGER, after=MANAGER na grupie lista@).
//   Nie wysyła nic do osób, którym naprawa ODEBRAŁA nadmiarowe uprawnienia.

const admin = require("firebase-admin");

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const notify = args.includes("--notify");
const projFlagIdx = args.indexOf("--project");
const projArg = (args.find((a) => a.startsWith("--project=")) || "").split("=")[1] ||
  (projFlagIdx !== -1 ? (args[projFlagIdx + 1] || "") : "");
const projectId = projArg === "dev" ? "sprzet-skk-morzkulc" :
  projArg === "prod" || projArg === "" ? "morzkulc-e9df7" : projArg;
const emailFlagIdx = args.indexOf("--email");
const emailArg = (args.find((a) => a.startsWith("--email=")) || "").split("=")[1] ||
  (emailFlagIdx !== -1 ? (args[emailFlagIdx + 1] || "") : "");

admin.initializeApp({ projectId });
const db = admin.firestore();

const NOTIFY_SUBJECT = "Naprawiony dostęp do lista@";
const NOTIFY_BODY = [
  "Cześć, złapaliśmy kolejnego robala w kodzie aplikacji i listy, dzięki za zgłoszenie.",
  "Teraz Twoje maile powinny dochodzić na listę bez problemu — prośba o wysłanie maila na listę",
  "lista@morzkulc.pl dla pewności. Trochę spamu na początku nikomu nie zaszkodzi, a będziemy mieć",
  "pewność, że na przyszłość problem nie wróci.",
  "",
  "Zarząd SKK Morzkulc",
].join("\n");

async function sendNotifyEmails(corrections) {
  // Tylko lista@, tylko "odzyskali dostęp" (before != MANAGER, after == MANAGER).
  const listaGained = corrections.filter(
    (c) => c.group && c.group.startsWith("lista@") && c.after === "MANAGER" && c.before !== "MANAGER"
  );

  if (listaGained.length === 0) {
    console.log("\n--notify: brak osób, które odzyskały MANAGER na lista@ — nic do wysłania.");
    return;
  }

  console.log(`\n--notify: wysyłam powiadomienie do ${listaGained.length} osób:`, listaGained.map((c) => c.email));

  // Wysyłka przez ten sam Gmail API co reszta aplikacji (delegacja admin@morzkulc.pl) —
  // budujemy wiadomość ręcznie (bez importu skompilowanego TS), tak jak sendGenericEmail w
  // googleWorkspaceProvider.ts, żeby skrypt nie zależał od `lib/`.
  const { google } = require("googleapis");

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

  const sa = process.env.SVC_WORKSPACE_SA_EMAIL || "workspace-bot@morzkulc-e9df7.iam.gserviceaccount.com";
  const sub = process.env.SVC_WORKSPACE_DELEGATED_SUBJECT || "admin@morzkulc.pl";
  const scopes = ["https://www.googleapis.com/auth/gmail.send"];
  const iat = Math.floor(Date.now() / 1000);
  const jwtPayload = { iss: sa, sub, scope: scopes.join(" "), aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 };
  const signedJwt = await signJwtWithIamCredentials(sa, jwtPayload);
  const accessToken = await exchangeJwtForAccessToken(signedJwt);
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2 });

  for (const c of listaGained) {
    const messageParts = [
      `From: ${sub}`,
      `To: ${c.email}`,
      `Subject: ${NOTIFY_SUBJECT}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      NOTIFY_BODY,
    ];
    const raw = Buffer.from(messageParts.join("\n")).toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    try {
      await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
      console.log(`  wysłano: ${c.email}`);
    } catch (e) {
      console.error(`  BŁĄD wysyłki do ${c.email}:`, e.message);
    }
  }
}

(async () => {
  const id = `manual-workspace-groups-reconcile-${Date.now()}`;
  const ref = db.collection("service_jobs").doc(id);
  const payload = { dry };
  if (emailArg) payload.email = emailArg;

  await ref.set({
    taskId: "users.reconcileWorkspaceGroups",
    payload,
    status: "queued",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`CREATED job id: ${id} (project=${projectId}, dry=${dry}, email=${emailArg || "(hurtowo)"})`);

  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const snap = await ref.get();
    const data = snap.data() || {};
    console.log(`[t+${(i + 1) * 5}s] status=${data.status} attempts=${data.attempts || 0}`);
    if (data.status === "done" || data.status === "dead") {
      // jobProcessor NIE zapisuje result/details na dokumencie joba (patrz jobProcessor.ts) —
      // dla trybu hurtowego prawdziwy wynik (lista korekt) jest w service_diag/workspaceGroupsReconcile.
      if (data.status === "dead") {
        console.log("\n===== BŁĄD =====\n");
        console.log(JSON.stringify(data.lastError || data, null, 2));
        process.exit(1);
      }

      if (emailArg) {
        // Tryb punktowy — nie pisze do service_diag, sam job doc wystarczy jako potwierdzenie.
        console.log("\n===== DONE (tryb punktowy) =====\n");
        console.log(JSON.stringify({ email: emailArg, dry }, null, 2));
        process.exit(0);
      }

      const diagSnap = await db.collection("service_diag").doc("workspaceGroupsReconcile").get();
      const diag = diagSnap.exists ? diagSnap.data() : null;
      console.log("\n===== RESULT (service_diag/workspaceGroupsReconcile) =====\n");
      console.log(JSON.stringify(diag, null, 2));

      if (notify && !dry) {
        const corrections = (diag && diag.corrections) || [];
        await sendNotifyEmails(corrections);
      }

      process.exit(0);
    }
  }
  console.log("TIMEOUT po 3 minutach — sprawdź service_jobs/" + id);
  process.exit(1);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
