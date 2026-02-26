export function canSeeModule({ ctx, module }) {
  if (!module?.enabled) return false;

  const access = module.access || {};
  const mode = String(access.mode || "prod"); // off | prod | test

  const uid = String(ctx?.session?.uid || "");
  const email = String(ctx?.session?.email || "");
  const roleKey = String(ctx?.session?.role_key || "rola_sympatyk");

  const testAllow = Array.isArray(access.testUsersAllow) ? access.testUsersAllow.map(String) : [];
  const usersBlock = Array.isArray(access.usersBlock) ? access.usersBlock.map(String) : [];
  const rolesAllowed = Array.isArray(access.rolesAllowed) ? access.rolesAllowed.map(String) : [];

  // blocklist zawsze wygrywa
  if (usersBlock.includes(uid) || usersBlock.includes(email)) return false;

  if (mode === "off") return false;

  if (mode === "test") {
    return testAllow.includes(uid) || testAllow.includes(email);
  }

  // prod
  if (rolesAllowed.length === 0) return false; // bezpieczeństwo: jak nie ustawione → nie pokazuj
  return rolesAllowed.includes(roleKey);
}
