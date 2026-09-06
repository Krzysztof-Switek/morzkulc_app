// READ-ONLY: sprawdza, czy istnieją imprezy klubowe (organizer=="morzkulc",
// approved==true, rejected!=true) bez pola kierownikUids (ryzyko powtórki
// incydentu z 05.09 przy kolejnym syncu — patrz feedback_field_rename_trigger_refire)
// oraz krzyżuje aktualnych kierowników z istniejącymi jobami events.notifyKierownik.
// node --use-system-ca functions/scripts/checkKierownikUidsExposure.js
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

(async () => {
  const eventsSnap = await db.collection("events").get();
  const clubEvents = [];
  eventsSnap.forEach((d) => {
    const x = d.data() || {};
    if (x.organizer === "morzkulc" && x.approved === true && x.rejected !== true) {
      clubEvents.push({ id: d.id, data: x });
    }
  });

  console.log(`Imprezy klubowe aktywne (organizer=morzkulc, approved=true, rejected!=true): ${clubEvents.length}\n`);

  let missingField = 0;
  const allUids = new Set();

  for (const ev of clubEvents) {
    const hasField = "kierownikUids" in ev.data;
    const uids = Array.isArray(ev.data.kierownikUids) ? ev.data.kierownikUids : [];
    if (!hasField) missingField++;
    uids.forEach((u) => allUids.add(`${ev.id}:${u}`));
    console.log(JSON.stringify({
      id: ev.id,
      name: ev.data.name,
      startDate: ev.data.startDate,
      endDate: ev.data.endDate,
      hasKierownikUidsField: hasField,
      kierownikUids: uids,
      kierownicyEmails: (ev.data.kierownicy || []).map((k) => k.email),
    }, null, 2));
  }

  console.log(`\nImprezy klubowe BEZ pola kierownikUids: ${missingField}`);

  // Krzyżówka: dla każdego (eventId, uid) sprawdź czy istnieje job events.notifyKierownik
  console.log(`\n=== Sprawdzam service_jobs dla ${allUids.size} par (eventId, uid) ===`);
  let missingJob = 0;
  for (const pair of allUids) {
    const [eventId, uid] = pair.split(":");
    const jobId = `events-notify-kierownik:${eventId}:${uid}`;
    const jobSnap = await db.collection("service_jobs").doc(jobId).get();
    if (!jobSnap.exists) {
      missingJob++;
      console.log(`BRAK joba dla ${pair} (jobId=${jobId}) — kolejny sync potraktowałby ten uid jako "nowy"`);
    } else {
      const jd = jobSnap.data() || {};
      console.log(`OK  job istnieje: ${jobId} status=${jd.status}`);
    }
  }
  console.log(`\nPar bez odpowiadającego joba: ${missingJob} / ${allUids.size}`);

  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
