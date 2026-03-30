export type GodzinkiVarsDoc = {
  vars?: Record<string, { value?: any }>;
};

export type GodzinkiVars = {
  /** Maksymalne saldo ujemne (wartość bezwzględna, np. 20 oznacza limit -20) */
  negativeBalanceLimit: number;
  /** Liczba lat ważności godzinek od daty przyznania */
  expiryYears: number;
};

function getVar(doc: GodzinkiVarsDoc | null, key: string): any {
  return doc?.vars?.[key]?.value;
}

function toNumber(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

export async function getGodzinkiVars(db: FirebaseFirestore.Firestore): Promise<GodzinkiVars> {
  const snap = await db.collection("setup").doc("vars_godzinki").get();
  const raw = (snap.exists ? (snap.data() as GodzinkiVarsDoc) : null) || null;

  return {
    negativeBalanceLimit: toNumber(getVar(raw, "limit_ujemnego_salda"), 20),
    expiryYears: toNumber(getVar(raw, "lata_waznosci"), 4),
  };
}
