export function parseHash() {
  const raw = String(location.hash || "");
  const h = raw.startsWith("#") ? raw.slice(1) : raw;
  const parts = h.split("/").filter(Boolean);
  const moduleId = parts[0] || "home";
  const routeId = parts[1] || "home";
  return { moduleId, routeId };
}

export function setHash(moduleId, routeId = "home") {
  location.hash = `#/${moduleId}/${routeId}`;
}
