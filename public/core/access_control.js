export function canSeeModule({ ctx, module }) {
  const access = module?.access || {};

  // testUserGranted jest ustawiane przez backend gdy testUsersAllow nadpisało
  // disabled lub mode=off — frontend musi to respektować
  const testUserGranted = access.testUserGranted === true;

  if (!module?.enabled && !testUserGranted) return false;

  const mode = String(access.mode || "prod"); // off | prod | test

  const uid = String(ctx?.session?.uid || "");
  const email = String(ctx?.session?.email || "");
  const roleKey = ctx?.kursPreviewMode
    ? "rola_kursant"
    : String(ctx?.session?.role_key || "rola_sympatyk");
  const statusKey = String(ctx?.session?.status_key || "");

  const usersBlock = Array.isArray(access.usersBlock) ? access.usersBlock.map(String) : [];
  const rolesAllowed = Array.isArray(access.rolesAllowed) ? access.rolesAllowed.map(String) : [];

  // status zawieszenia blokuje dostęp do wszystkich modułów
  const statusMappings = ctx?.setup?.statusMappings || {};
  if (statusMappings[statusKey]?.blocksAccess === true) return false;

  // blocklist zawsze wygrywa, nawet nad testUserGranted
  if (usersBlock.includes(uid) || usersBlock.includes(email)) return false;

  if (mode === "off" && !testUserGranted) return false;

  if (mode === "test" || mode === "off") {
    // Backend już zweryfikował obecność na liście testowej i ustawił testUserGranted
    return testUserGranted;
  }

  // prod
  if (rolesAllowed.length === 0) return false; // bezpieczeństwo: jak nie ustawione → nie pokazuj
  return rolesAllowed.includes(roleKey);
}
