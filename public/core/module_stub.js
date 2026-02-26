export function createGenericModule({ id, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    label,
    defaultRoute,
    order,
    enabled,
    access,
    async render({ viewEl, routeId, ctx }) {
      viewEl.innerHTML = `
        <h2>${escapeHtml(label)}</h2>
        <p>Moduł w budowie (stub).</p>
        <pre>${escapeHtml(JSON.stringify({
          moduleId: id,
          routeId,
          role_key: ctx?.session?.role_key,
          uid: ctx?.session?.uid,
          setupMissing: ctx?.session?.setupMissing
        }, null, 2))}</pre>
      `;
    }
  };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
