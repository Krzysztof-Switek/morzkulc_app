/**
 * km_vars.ts
 *
 * Czyta konfigurację punktacji modułu Kilometrówka z Firestore (setup/vars_members).
 * Zmienne punktacji wywrotolotek są już w vars_members — nie duplikujemy ich.
 *
 * Używane pola z vars_members:
 *   kabina_punkty    — punkty za kabinę
 *   eskimoska_punkty — punkty za eskimoskę (rolkę)
 *   dziubek_punkty   — punkty za dziubka
 */

export type KmVarsDoc = {
  vars?: Record<string, {value?: any}>;
};

export type KmVars = {
  ptsKabina: number;
  ptsEskimoska: number;
  ptsDziubek: number;
  scoringVersion: string;
};

function getVar(doc: KmVarsDoc | null, key: string): any {
  return doc?.vars?.[key]?.value;
}

function toNumber(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

export async function getKmVars(db: FirebaseFirestore.Firestore): Promise<KmVars> {
  const snap = await db.collection("setup").doc("vars_members").get();
  const raw = (snap.exists ? (snap.data() as KmVarsDoc) : null) || null;

  return {
    ptsKabina: toNumber(getVar(raw, "kabina_punkty"), 1),
    ptsEskimoska: toNumber(getVar(raw, "eskimoska_punkty"), 0.5),
    ptsDziubek: toNumber(getVar(raw, "dziubek_punkty"), 0.25),
    scoringVersion: "v1",
  };
}
