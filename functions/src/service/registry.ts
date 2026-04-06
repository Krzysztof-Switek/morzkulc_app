import { ServiceTask } from "./types";
import { onUserRegisteredWelcomeTask } from "./tasks/onUserRegisteredWelcome";
import { gearSyncKayaksFromSheetTask } from "./tasks/gearSyncKayaksFromSheet";
import { godzinkiSyncFromSheetTask, godzinkiWriteToSheetTask } from "./tasks/godzinkiSyncFromSheet";
import { eventsSyncFromSheetTask, eventsWriteToSheetTask } from "./tasks/eventsSyncFromSheet";
import { basenNotifySessionCancelledTask } from "./tasks/basenNotifySessionCancelled";
import { gearPrivateStorageTask } from "./tasks/gearPrivateStorage";
import { usersSyncRolesFromSheetTask } from "./tasks/usersSyncRolesFromSheet";
import { membersSyncToSheetTask } from "./tasks/membersSyncToSheet";

const tasks: ServiceTask[] = [
  onUserRegisteredWelcomeTask,
  gearSyncKayaksFromSheetTask,
  godzinkiSyncFromSheetTask,
  godzinkiWriteToSheetTask,
  eventsSyncFromSheetTask,
  eventsWriteToSheetTask,
  basenNotifySessionCancelledTask,
  gearPrivateStorageTask,
  usersSyncRolesFromSheetTask,
  membersSyncToSheetTask,
];

export function getTaskRegistry(): Map<string, ServiceTask> {
  const map = new Map<string, ServiceTask>();
  for (const t of tasks) {
    if (map.has(t.id)) throw new Error(`Duplicate task id: ${t.id}`);
    map.set(t.id, t);
  }
  return map;
}
