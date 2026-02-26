import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { getServiceConfig } from "../service_config";
import { runTaskById } from "../runner";

async function verifyIdToken(req: any): Promise<{ uid: string }> {
  const auth = String(req.headers.authorization || "");
  const m = /^Bearer (.+)$/.exec(auth);
  if (!m) throw new Error("Missing Authorization Bearer token");
  const decoded = await admin.auth().verifyIdToken(m[1]);
  return { uid: decoded.uid };
}

export const adminRunServiceTask = onRequest(
  { invoker: "private", timeoutSeconds: 30 },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Method not allowed" });
        return;
      }

      const { uid } = await verifyIdToken(req);

      const cfg = getServiceConfig();
      const callerSnap = await admin.firestore().collection("users_active").doc(uid).get();
      const roleKey = String((callerSnap.data() as any)?.role_key || "");

      if (!roleKey || !cfg.adminRoleKeys.includes(roleKey)) {
        res.status(403).json({ ok: false, error: "Forbidden" });
        return;
      }

      const body = (req.body || {}) as any;
      const taskId = String(body.taskId || "");
      const payload = body.payload || null;
      const dryRun = Boolean(body.dryRun);

      if (!taskId) {
        res.status(400).json({ ok: false, error: "Missing taskId" });
        return;
      }

      const result = await runTaskById(taskId, payload, { dryRun });
      res.json({ ok: true, result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: String(e?.message || e) });
    }
  }
);
