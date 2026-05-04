export function canSeeModule({ ctx, module }) {
  const access = module?.access || {};
  const testUserGranted = access.testUserGranted === true;

  // Czytamy mode i rolesAllowed przed sprawdzeniem enabled —
  // mode=test z pasującą rolą może ominąć blokadę enabled:false
  const mode = String(access.mode || "prod");
  const rolesAllowed = Array.isArray(access.rolesAllowed) ? access.rolesAllowed.map(String) : [];

  const uid = String(ctx?.session?.uid || "");
  const email = String(ctx?.session?.email || "");
  const roleKey = ctx?.kursPreviewMode
    ? "rola_kursant"
    : String(ctx?.session?.role_key || "rola_sympatyk");
  const statusKey = String(ctx?.session?.status_key || "");

  const isRoleAllowed = rolesAllowed.includes(roleKey);

  // mode=test z pasującą rolą, lub testUserGranted, omijają blokadę enabled:false
  const canBypassEnabled = testUserGranted || (mode === "test" && isRoleAllowed);
  if (!module?.enabled && !canBypassEnabled) return false;

  // status zawieszenia blokuje dostęp do wszystkich modułów
  const statusMappings = ctx?.setup?.statusMappings || {};
  if (statusMappings[statusKey]?.blocksAccess === true) return false;

  // blocklist zawsze wygrywa, nawet nad testUserGranted
  const usersBlock = Array.isArray(access.usersBlock) ? access.usersBlock.map(String) : [];
  if (usersBlock.includes(uid) || usersBlock.includes(email)) return false;

  if (mode === "off") {
    return testUserGranted;
  }
  if (mode === "test") {
    return testUserGranted || isRoleAllowed;
  }

  // prod
  if (rolesAllowed.length === 0) return false;
  return isRoleAllowed;
}