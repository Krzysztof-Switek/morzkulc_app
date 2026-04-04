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
  if (!snap.exists) return false;

  const data = snap.data() as any;
  const mappings = data?.statusMappings || {};

  return mappings[statusKey]?.blocksAccess === true;
}
