import { ServiceTask } from "./types";
import { onUserRegisteredWelcomeTask } from "./tasks/onUserRegisteredWelcome";
import { gearSyncKayaksFromSheetTask } from "./tasks/gearSyncKayaksFromSheet";
import { godzinkiSyncFromSheetTask, godzinkiWriteToSheetTask } from "./tasks/godzinkiSyncFromSheet";
import { godzinkiImportTransitionFromSheetTask } from "./tasks/godzinkiImportTransitionFromSheet";
import { godzinkiMergeHistoricalUserTask } from "./tasks/godzinkiMergeHistoricalUser";
import { reconcileOpeningBalanceTask } from "./tasks/reconcileOpeningBalance";
import { eventsSyncFromSheetTask, eventsWriteToSheetTask } from "./tasks/eventsSyncFromSheet";
import { eventsSyncCalendarTask } from "./tasks/eventsSyncCalendar";
import { basenNotifySessionCancelledTask } from "./tasks/basenNotifySessionCancelled";
import { gearPrivateStorageTask } from "./tasks/gearPrivateStorage";
import { godzinkiMonthlyBalanceReviewTask } from "./tasks/godzinkiMonthlyBalanceReview";
import { usersSyncRolesFromSheetTask } from "./tasks/usersSyncRolesFromSheet";
import { membersSyncToSheetTask } from "./tasks/membersSyncToSheet";
import { kmRebuildUserStatsTask } from "./tasks/kmRebuildUserStats";
import { kmRebuildRankingsTask } from "./tasks/kmRebuildRankings";
import { kmMergeHistoricalUserTask } from "./tasks/kmMergeHistoricalUser";
import { kmRebuildMapDataTask } from "./tasks/kmRebuildMapData";
import { kursSyncFromSheetTask } from "./tasks/kursSyncFromSheet";
import { listaEnforcePostingPolicyTask } from "./tasks/listaEnforcePostingPolicy";
import { usersSyncFunctionRolesFromSetupTask } from "./tasks/usersSyncFunctionRolesFromSetup";
import { groupsDiagnoseTask } from "./tasks/groupsDiagnose";
import { setupSyncFromSheetTask } from "./tasks/setupSyncFromSheet";
import { usersSyncFieldsFromSheetTask } from "./tasks/usersSyncFieldsFromSheet";
import { usersNotifyAkademikAccessChangedTask } from "./tasks/usersNotifyAkademikAccessChanged";
import { gearSyncAllFromSheetTask } from "./tasks/gearSyncAllFromSheet";
import { adminNotifyPendingApprovalsTask } from "./tasks/adminNotifyPendingApprovals";
import { adminApprovalWriteBackTask } from "./tasks/adminApprovalWriteBack";
import { gearNotifyReservationCancelledByAdminTask } from "./tasks/gearNotifyReservationCancelledByAdmin";

const tasks: ServiceTask[] = [
  onUserRegisteredWelcomeTask,
  gearSyncKayaksFromSheetTask,
  godzinkiSyncFromSheetTask,
  godzinkiWriteToSheetTask,
  godzinkiImportTransitionFromSheetTask,
  godzinkiMergeHistoricalUserTask,
  reconcileOpeningBalanceTask,
  eventsSyncFromSheetTask,
  eventsWriteToSheetTask,
  eventsSyncCalendarTask,
  basenNotifySessionCancelledTask,
  gearPrivateStorageTask,
  godzinkiMonthlyBalanceReviewTask,
  usersSyncRolesFromSheetTask,
  membersSyncToSheetTask,
  kmRebuildUserStatsTask,
  kmRebuildRankingsTask,
  kmMergeHistoricalUserTask,
  kmRebuildMapDataTask,
  kursSyncFromSheetTask,
  listaEnforcePostingPolicyTask,
  usersSyncFunctionRolesFromSetupTask,
  groupsDiagnoseTask,
  setupSyncFromSheetTask,
  usersSyncFieldsFromSheetTask,
  usersNotifyAkademikAccessChangedTask,
  gearSyncAllFromSheetTask,
  adminNotifyPendingApprovalsTask,
  adminApprovalWriteBackTask,
  gearNotifyReservationCancelledByAdminTask,
];

export function getTaskRegistry(): Map<string, ServiceTask> {
  const map = new Map<string, ServiceTask>();
  for (const t of tasks) {
    if (map.has(t.id)) throw new Error(`Duplicate task id: ${t.id}`);
    map.set(t.id, t);
  }
  return map;
}
