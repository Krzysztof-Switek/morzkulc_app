/**
 * Rozwiązywanie e-maila aktualnego operatora "konta funkcyjnego" (prezes/skarbnik/
 * sprzętowiec/szkoleniowiec itd.) — źródło: service_state/function_roles.<key>.email,
 * z fallbackiem na setup/vars_members.vars.<key>.value. Ten sam mechanizm, którym
 * getKlubInfoHandler.ts ustala operatorów funkcji na potrzeby boksu "Klub" w profilu;
 * tu wydzielony jako pojedyncze, tanie zapytanie dla jednej funkcji naraz (np. do bramki
 * uprawnień "opiekun basenowy" w registerUserHandler.ts).
 */

function singleEmail(raw: any): string {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  if (!s || s.includes(",") || s.includes(";")) return "";
  if (!s.includes("@") || s.startsWith("@") || s.endsWith("@")) return "";
  return s;
}

export async function resolveFunctionRoleEmail(
  db: FirebaseFirestore.Firestore,
  key: string
): Promise<string> {
  const [stateSnap, varsSnap] = await Promise.all([
    db.collection("service_state").doc("function_roles").get(),
    db.collection("setup").doc("vars_members").get(),
  ]);

  const state = stateSnap.exists ? (stateSnap.data() as any) : null;
  const vars = varsSnap.exists ? (varsSnap.data() as any)?.vars : null;

  const fromState = singleEmail(state?.[key]?.email);
  if (fromState) return fromState;

  return singleEmail(vars?.[key]?.value);
}
