export type EventsVarsDoc = {
  vars?: Record<string, { value?: any }>;
};

export type EventsVars = {
  // Liczba dni przed startem imprezy, kiedy wysyłane jest przypomnienie e-mail.
  // Wartość z Firestore: setup/vars_members.vars.powiadomienie_imprezy.value
  reminderDays: number;
};

function getVar(doc: EventsVarsDoc | null, key: string): any {
  return doc?.vars?.[key]?.value;
}

function toNumber(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function getEventsVars(db: FirebaseFirestore.Firestore): Promise<EventsVars> {
  const snap = await db.collection("setup").doc("vars_members").get();
  const raw = (snap.exists ? (snap.data() as EventsVarsDoc) : null) || null;

  const reminderDays = toNumber(getVar(raw, "powiadomienie_imprezy"), 3);

  return {reminderDays};
}
