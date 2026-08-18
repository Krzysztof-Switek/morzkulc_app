export type GodzinkiVarsDoc = {
  vars?: Record<string, { value?: any }>;
};

export type GodzinkiVars = {
  /** Maksymalne saldo ujemne (wartość bezwzględna, np. 20 oznacza limit -20) */
  negativeBalanceLimit: number;
  /** Liczba miesięcy ważności godzinek od daty przyznania (arkusz: okres_wygasania_godzinek_mce) */
  expiryMonths: number;
  /** Ile dni wstecz można zgłosić godzinki (formularz odrzuca starsze daty pracy) */
  reportWindowDays: number;
  /** Po ilu dniach zatwierdzone/rozliczone wiersze są usuwane z arkusza Google (nie z Firestore) */
  archiveAfterDays: number;
  /** Cena PLN za 1 godzinę przy wykupie salda ujemnego */
  buybackPricePln: number;
  /** Automatyczny miesięczny bonus godzin dla roli zarząd/KR */
  boardMonthlyBonusHours: number;
  /** Data wygaśnięcia godzinek z bilansu otwarcia (wymóg biznesowy, domyślnie 30.06.2029) */
  obHoursExpiresAt: Date;
};

function getVar(doc: GodzinkiVarsDoc | null, key: string): any {
  return doc?.vars?.[key]?.value;
}

function toNumber(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

/** Parsuje datę w formacie YYYY-MM-DD (UTC) — fallback gdy pole puste/nieparsowalne. */
function toDateUtc(v: any, fallback: Date): Date {
  const m = String(v ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return fallback;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export async function getGodzinkiVars(db: FirebaseFirestore.Firestore): Promise<GodzinkiVars> {
  const snap = await db.collection("setup").doc("vars_godzinki").get();
  const raw = (snap.exists ? (snap.data() as GodzinkiVarsDoc) : null) || null;

  return {
    negativeBalanceLimit: toNumber(getVar(raw, "limit_debetu_godzinek"), 20),
    expiryMonths: toNumber(getVar(raw, "okres_wygasania_godzinek_mce"), 48),
    reportWindowDays: toNumber(getVar(raw, "ile_dni_na_zgloszenie_godzinek"), 14),
    archiveAfterDays: toNumber(getVar(raw, "okres_do_archiwizacji_godzinek_dni"), 30),
    buybackPricePln: toNumber(getVar(raw, "cena_wykupu_godzinki"), 25),
    boardMonthlyBonusHours: toNumber(getVar(raw, "bonus_miesieczny_zarzad"), 10),
    obHoursExpiresAt: toDateUtc(getVar(raw, "data_wygasniecia_bilansu_otwarcia"), new Date(Date.UTC(2029, 5, 30))),
  };
}
