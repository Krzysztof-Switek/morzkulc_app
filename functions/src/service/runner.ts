import { getTaskRegistry } from "./registry";
import { getServiceConfig } from "./service_config";
import { GoogleWorkspaceProvider } from "./providers/googleWorkspaceProvider";
import { ServiceTaskContext, ServiceTaskResult } from "./types";
import * as admin from "firebase-admin";

function truncate(v: any, max = 5000) {
  if (v == null) return v;
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.length > max ? s.slice(0, max) + "…(truncated)" : s;
  } catch {
    const s = String(v);
    return s.length > max ? s.slice(0, max) + "…(truncated)" : s;
  }
}

function safeError(err: any): { message: string; code?: string } {
  const msg = typeof err?.message === "string" ? err.message : String(err);
  const code = err?.code || err?.response?.status;
  return { message: msg.slice(0, 500), code: code ? String(code) : undefined };
}

export async function runTaskById(
  taskId: string,
  payload: any,
  opts?: { dryRun?: boolean }
): Promise<ServiceTaskResult> {
  const registry = getTaskRegistry();
  const task = registry.get(taskId);
  if (!task) throw new Error(`Unknown taskId: ${taskId}`);

  task.validate(payload);

  const firestore = admin.firestore();
  const config = getServiceConfig();
  const workspace = new GoogleWorkspaceProvider(config.workspace.delegatedSubject);

  const ctx: ServiceTaskContext = {
    firestore,
    now: new Date(),
    dryRun: Boolean(opts?.dryRun),
    workspace,
    config,
    logger: {
      info: (msg, extra) => console.log(msg, extra || {}),
      warn: (msg, extra) => console.warn(msg, extra || {}),
      error: (msg, extra) => console.error(msg, extra || {}),
    },
  };

  try {
    return await task.run(payload, ctx);
  } catch (err: any) {
    const e = safeError(err);

    // 🔥 kluczowe: pełne detale z googleapis (403 itp.)
    ctx.logger.error("TASK_FAILED_DETAILS", {
      taskId,
      code: e.code,
      message: truncate(err?.message, 2000),
      stack: truncate(err?.stack, 4000),

      // googleapis / axios style
      responseStatus: err?.response?.status,
      responseStatusText: err?.response?.statusText,
      responseData: truncate(err?.response?.data, 5000),
      errors: truncate(err?.errors, 5000),

      // czasem googleapis ma "details"
      details: truncate(err?.details, 5000),
    });

    // zostawiamy też krótki log jak dotąd (żeby było czytelnie w listingu)
    ctx.logger.error("Task failed", { taskId, code: e.code });

    return { ok: false, message: e.message, details: { code: e.code } };
  }
}
