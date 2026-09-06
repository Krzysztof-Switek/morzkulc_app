export type AppVarsDoc = {
  vars?: Record<string, { value?: any }>;
};

export type AppVars = {
  /** Link do aplikacji pokazywany w mailach (setup/vars_members.link_aplikacji) */
  appUrl: string;
  /** Adresat digestu zaległych zatwierdzeń (setup/vars_members.admin_notify_email) */
  adminNotifyEmail: string;
  /** Próg wieku (dni) digestu zaległych zatwierdzeń (setup/vars_members.admin_notify_dni_progu) */
  adminNotifyAgeDays: number;
  /** Adresat maili AKCJA dla admina — app password itp. (setup/vars_members.admin_action_email) */
  adminActionEmail: string;
};

function getVar(doc: AppVarsDoc | null, key: string): any {
  return doc?.vars?.[key]?.value;
}

function toStr(v: any, fallback: string): string {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function toNumber(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function getAppVars(db: FirebaseFirestore.Firestore): Promise<AppVars> {
  const snap = await db.collection("setup").doc("vars_members").get();
  const raw = (snap.exists ? (snap.data() as AppVarsDoc) : null) || null;

  return {
    appUrl: toStr(getVar(raw, "link_aplikacji"), "https://app.morzkulc.pl/"),
    adminNotifyEmail: toStr(getVar(raw, "admin_notify_email"), "zarzad@morzkulc.pl"),
    adminNotifyAgeDays: toNumber(getVar(raw, "admin_notify_dni_progu"), 3),
    adminActionEmail: toStr(getVar(raw, "admin_action_email"), "zarzad@morzkulc.pl"),
  };
}
