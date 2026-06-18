/**
 * File: hours_sync.gs
 * Purpose: manual hours sync trigger (menu arkusza → backend)
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 *
 * Cała logika syncu godzinek (zatwierdzenia, korekty pending, backfill wierszy)
 * żyje w backendzie: task "godzinki.syncFromSheet"
 * (functions/src/service/tasks/godzinkiSyncFromSheet.ts).
 *
 * Backend dodatkowo uruchamia ten sync automatycznie codziennie o 05:15
 * (scheduler godzinkiSyncDaily) — menu służy do natychmiastowego odświeżenia.
 *
 * Zasady (egzekwowane przez backend):
 *  - korekty kolumn Godzinki / Data pracy / Opis działają TYLKO dla wierszy
 *    jeszcze niezatwierdzonych; po zatwierdzeniu wartości są zamrożone,
 *  - zatwierdzenie (Zatwierdzone=TAK) jest jednokierunkowe — TAK→NIE jest
 *    ignorowane,
 *  - po zatwierdzeniu backend wypełnia kolumny "Zsynchronizowano"
 *    i "Data zatwierdzenia"; wiersz zatwierdzony BEZ daty w "Zsynchronizowano"
 *    oznacza odmowę (np. przeterminowana data pracy, nieaktualny wykup) —
 *    szczegóły w logach backendu.
 */
function syncHoursToFirestore() {
  runSync_("godzinki.syncFromSheet");
}

/**
 * Import korekt/godzinek z okresu przejściowego (zakładka „Godzinki 2026 i korekty"
 * w arkuszu DEKODER) → godzinki_ledger. Task backendowy godzinki.importTransitionFromSheet
 * czyta arkusz kontem serwisowym (admin@morzkulc.pl musi mieć dostęp z edycją).
 * Zarejestrowani → wpis pod ich uid; niezarejestrowani → hist_{email} (scalany przy rejestracji).
 * Idempotentne: wiersze z wypełnionym „Zsynchronizowano" są pomijane.
 */
function importGodzinkiKorektyToFirestore() {
  runSync_("godzinki.importTransitionFromSheet");
}

/**
 * Punktowe uzupełnienie godzinek z bilansu otwarcia dla JEDNEGO użytkownika (po mailu).
 *
 * Po co: saldo godzinek w aplikacji liczone jest z kolekcji godzinki_ledger. Jeśli
 * użytkownik był już zarejestrowany, a pula „bilans otwarcia" nigdy nie powstała
 * (np. rola nadana przez sync arkusza, bez dopasowania do bilansu), w aplikacji
 * widać 0 mimo godzin w arkuszu. Ta akcja tworzy/poprawia pulę w godzinki_ledger.
 *
 * Dodatkowo: gdy dopasowanie do bilansu nastąpi po imieniu i nazwisku, a mail w
 * bilansie różni się od podanego — backend zaktualizuje mail w bilansie otwarcia
 * (przypadek rejestracji innym adresem niż w bilansie). Roli NIE zmienia.
 *
 * Logika w backendzie: task "opening.reconcile" z payload { email }.
 */
function reconcileOpeningBalanceByEmailPrompt() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt(
    "Uzupełnij godzinki z bilansu otwarcia",
    "Podaj adres e-mail użytkownika (taki, jakim loguje się do aplikacji):",
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  var email = String(resp.getResponseText() || "").trim().toLowerCase();
  if (!email || email.indexOf("@") < 1) {
    ui.alert("❌ Nieprawidłowy adres e-mail.");
    return;
  }

  try {
    var r = callBackendSync_("opening.reconcile", { email: email });
    ui.alert("✅ Gotowe!\n\n" + (r && r.summary ? r.summary : "Operacja zakończona."));
  } catch (e) {
    ui.alert("❌ Nie udało się.\n\n" + (e && e.message ? e.message : String(e)));
  }
}
