import { ServiceTask } from "./types";
import { onUserRegisteredWelcomeTask } from "./tasks/onUserRegisteredWelcome";
import { gearSyncKayaksFromSheetTask } from "./tasks/gearSyncKayaksFromSheet";

const tasks: ServiceTask[] = [
  onUserRegisteredWelcomeTask,
  gearSyncKayaksFromSheetTask,
];

export function getTaskRegistry(): Map<string, ServiceTask> {
  const map = new Map<string, ServiceTask>();
  for (const t of tasks) {
    if (map.has(t.id)) throw new Error(`Duplicate task id: ${t.id}`);
    map.set(t.id, t);
  }
  return map;
}
