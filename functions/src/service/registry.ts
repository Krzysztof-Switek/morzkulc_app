import { ServiceTask } from "./types";
import { onUserRegisteredWelcomeTask } from "./tasks/onUserRegisteredWelcome";
import { godzinkiSyncFromSheetTask, godzinkiWriteToSheetTask } from "./tasks/godzinkiSyncFromSheet";
import { godzinkiImportTransitionFromSheetTask } from "./tasks/godzinkiImportTransitionFromSheet";
import { godzinkiMergeHistoricalUserTask } from "./tasks/godzinkiMergeHistoricalUser";
import { reconcileOpeningBalanceTask } from "./tasks/reconcileOpeningBalance";
import { eventsSyncFromSheetTask, eventsWriteToSheetTask } from "./tasks/eventsSyncFromSheet";
import { eventsSyncCalendarTask } from "./tasks/eventsSyncCalendar";
import { basenNotifySessionCancelledTask } from "./tasks/basenNotifySessionCancelled";
import { basenGrantInstructorRewardsTask } from "./tasks/basenGrantInstructorRewards";
import { gearPrivateStorageTask } from "./tasks/gearPrivateStorage";
import { godzinkiMonthlyBalanceReviewTask } from "./tasks/godzinkiMonthlyBalanceReview";
import { godzinkiArchiveSheetRowsTask } from "./tasks/godzinkiArchiveSheetRows";
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
import { reconcileWorkspaceGroupsTask } from "./tasks/reconcileWorkspaceGroups";
import { eventsNotifyNewTask } from "./tasks/eventsNotifyNew";
import { eventsNotifyUpcomingTask } from "./tasks/eventsNotifyUpcoming";

const tasks: ServiceTask[] = [
  onUserRegisteredWelcomeTask,
  godzinkiSyncFromSheetTask,
  godzinkiWriteToSheetTask,
  godzinkiImportTransitionFromSheetTask,
  godzinkiMergeHistoricalUserTask,
  reconcileOpeningBalanceTask,
  eventsSyncFromSheetTask,
  eventsWriteToSheetTask,
  eventsSyncCalendarTask,
  basenNotifySessionCancelledTask,
  basenGrantInstructorRewardsTask,
  gearPrivateStorageTask,
  godzinkiMonthlyBalanceReviewTask,
  godzinkiArchiveSheetRowsTask,
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
  reconcileWorkspaceGroupsTask,
  eventsNotifyNewTask,
  eventsNotifyUpcomingTask,
];

export function getTaskRegistry(): Map<string, ServiceTask> {
  const map = new Map<string, ServiceTask>();
  for (const t of tasks) {
    if (map.has(t.id)) throw new Error(`Duplicate task id: ${t.id}`);
    map.set(t.id, t);
  }
  return map;
}
