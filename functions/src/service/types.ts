export type ServiceTaskId = string;

export type ServiceJobStatus = "queued" | "running" | "done" | "failed" | "dead";

export interface ServiceTaskContext {
  firestore: FirebaseFirestore.Firestore;
  now: Date;
  dryRun: boolean;
  workspace: import("./providers/googleWorkspaceProvider").GoogleWorkspaceProvider;
  config: import("./service_config").ServiceConfig;
  logger: {
    info: (msg: string, extra?: Record<string, unknown>) => void;
    warn: (msg: string, extra?: Record<string, unknown>) => void;
    error: (msg: string, extra?: Record<string, unknown>) => void;
  };
}

export interface ServiceTaskResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface ServiceTask<TPayload = any> {
  id: ServiceTaskId;
  description: string;
  validate: (payload: TPayload) => void;
  run: (payload: TPayload, ctx: ServiceTaskContext) => Promise<ServiceTaskResult>;
}
