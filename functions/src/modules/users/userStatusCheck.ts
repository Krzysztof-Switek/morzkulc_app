import {logger} from "firebase-functions/v2";

/**
 * Checks whether a user's status_key is blocked according to setup/app.statusMappings.
 * A status is blocked when statusMappings[statusKey].blocksAccess === true.
 *
 * Returns false (not blocked) if setup/app does not exist or has no statusMappings.
 */
export async function isUserStatusBlocked(
  db: FirebaseFirestore.Firestore,
  statusKey: string
): Promise<boolean> {
  if (!statusKey) return false;

  const snap = await db.collection("setup").doc("app").get();
  if (!snap.exists) {
    logger.warn("isUserStatusBlocked: setup/app document does not exist", {statusKey});
    return false;
  }

  const data = snap.data() as any;
  const mappings = data?.statusMappings || {};
  const entry = mappings[statusKey];
  const result = entry?.blocksAccess === true;

  logger.info("isUserStatusBlocked", {
    statusKey,
    docExists: snap.exists,
    setupAppTopLevelKeys: Object.keys(data || {}),
    hasStatusMappings: "statusMappings" in (data || {}),
    mappingKeys: Object.keys(mappings),
    entry: JSON.stringify(entry),
    blocksAccess: entry?.blocksAccess,
    blocksAccessType: typeof entry?.blocksAccess,
    result,
  });

  return result;
}
