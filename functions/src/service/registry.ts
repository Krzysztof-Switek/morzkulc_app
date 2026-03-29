import { ServiceTask } from "./types";
import { onUserRegisteredWelcomeTask } from "./tasks/onUserRegisteredWelcome";
import { gearSyncKayaksFromSheetTask } from "./tasks/gearSyncKayaksFromSheet";
import { godzinkiSyncFromSheetTask, godzinkiWriteToSheetTask } from "./tasks/godzinkiSyncFromSheet";
import { eventsSyncFromSheetTask, eventsWriteToSheetTask } from "./tasks/eventsSyncFromSheet";

const tasks: ServiceTask[] = [
  onUserRegisteredWelcomeTask,
  gearSyncKayaksFromSheetTask,
  godzinkiSyncFromSheetTask,
  godzinkiWriteToSheetTask,
  eventsSyncFromSheetTask,
  eventsWriteToSheetTask,
];

export function getTaskRegistry(): Map<string, ServiceTask> {
  const map = new Map<string, ServiceTask>();
  for (const t of tasks) {
    if (map.has(t.id)) throw new Error(`Duplicate task id: ${t.id}`);
    map.set(t.id, t);
  }
  return map;
}
