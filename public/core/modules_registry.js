import { createGenericModule } from "/core/module_stub.js";
import { createGearModule } from "/modules/gear_module.js";
import { createMyReservationsModule } from "/modules/my_reservations_module.js";
import { createGodzinkiModule } from "/modules/godzinki_module.js";
import { createImprezaModule } from "/modules/impreza_module.js";
import { createBasenModule } from "/modules/basen_module.js";
import { createAdminPendingModule } from "/modules/admin_pending_module.js";
import { createKmModule } from "/modules/km_module.js";
import { createKursModule } from "/modules/kurs_module.js";
import { createKursGodzinkiModule } from "/modules/kurs_godzinki_module.js";

/**
 * Resolves the module component type from setup config.
 *
 * Priority: explicit `type` field (only if it matches a known type) → derived from PL label.
 * Returns a stable lowercase type string or null for unknown/generic modules.
 *
 * Known types: "gear" | "godzinki" | "imprezy" | "basen" | "km" | "admin_pending" | "kurs"
 */
const KNOWN_MODULE_TYPES = new Set(["gear", "godzinki", "imprezy", "basen", "km", "admin_pending", "kurs", "kurs_godzinki"]);

function resolveModuleType(cfg) {
  const typeField = String(cfg?.type || "").trim().toLowerCase();
  if (typeField && KNOWN_MODULE_TYPES.has(typeField)) return typeField;

  // Fallback: derive type from PL label (backwards compatibility, or when type is missing/unrecognized)
  const label = String(cfg?.label || "").trim().toLowerCase();
  if (label === "sprzęt") return "gear";
  if (label === "godzinki") return "godzinki";
  if (label === "imprezy") return "imprezy";
  if (label === "basen") return "basen";
  if (label === "ranking") return "km";
  if (label === "zarząd") return "admin_pending";
  if (label === "kurs") return "kurs";
  if (label === "kurs_godzinki") return "kurs_godzinki";

  return null;
}

/**
 * NEW FORMAT ONLY
 * setup.modules = {
 *   modul_1: { label, type, order, enabled, access, defaultRoute }
 * }
 *
 * `type` is the preferred field for component resolution.
 * PL `label` is used as fallback when `type` is absent (backwards compatibility).
 */
export function buildModulesFromSetup(setup, allowedActions) {
  const modulesCfg = setup?.modules;

  if (!modulesCfg || typeof modulesCfg !== "object" || Array.isArray(modulesCfg)) {
    return [];
  }

  const modules = Object.entries(modulesCfg).map(([id, cfg]) => {
    const moduleType = resolveModuleType(cfg);
    const base = {
      id,
      type: moduleType,
      label: String(cfg?.label || id),
      defaultRoute: String(cfg?.defaultRoute || "home"),
      order: Number(cfg?.order ?? 9999),
      enabled: Boolean(cfg?.enabled ?? false),
      access: cfg?.access || {}
    };

    if (moduleType === "gear") {
      return createGearModule({
        ...base,
        defaultRoute: base.defaultRoute === "home" ? "kayaks" : base.defaultRoute
      });
    }

    if (moduleType === "godzinki") {
      return createGodzinkiModule({
        ...base,
        defaultRoute: base.defaultRoute === "home" ? "balance" : base.defaultRoute
      });
    }

    if (moduleType === "imprezy") {
      return createImprezaModule({
        ...base,
        defaultRoute: base.defaultRoute === "home" ? "list" : base.defaultRoute
      });
    }

    if (moduleType === "basen") {
      return createBasenModule({
        ...base,
        defaultRoute: base.defaultRoute === "home" ? "sessions" : base.defaultRoute
      });
    }

    if (moduleType === "km") {
      return createKmModule({
        ...base,
        defaultRoute: base.defaultRoute === "home" ? "form" : base.defaultRoute
      });
    }

    if (moduleType === "admin_pending") {
      return createAdminPendingModule({
        ...base,
        defaultRoute: "list"
      });
    }

    if (moduleType === "kurs") {
      return createKursModule({
        ...base,
        label: "Skrypt",
        defaultRoute: base.defaultRoute === "home" ? "skrypt" : base.defaultRoute
      });
    }

    if (moduleType === "kurs_godzinki") {
      return createKursGodzinkiModule({
        ...base,
        defaultRoute: base.defaultRoute === "home" ? "info" : base.defaultRoute
      });
    }

    return createGenericModule(base);
  });

  const gearModule = modules.find((m) => m?.type === "gear") || null;

  if (gearModule) {
    modules.push(
      createMyReservationsModule({
        id: "my_reservations",
        type: "my_reservations",
        label: "Moje rezerwacje",
        defaultRoute: "list",
        order: Number(gearModule.order ?? 9999) + 0.1,
        enabled: true,
        access: gearModule.access || {}
      })
    );
  }

  // Fallback: create admin_pending only when setup/app has no admin_pending type module.
  // When modul_X has label "Zarząd" or type "admin_pending", it already handles this.
  const hasAdminModule = modules.some((m) => m?.type === "admin_pending");
  if (!hasAdminModule && Array.isArray(allowedActions) && allowedActions.includes("admin.pending")) {
    modules.push(
      createAdminPendingModule({
        id: "admin_pending",
        type: "admin_pending",
        label: "Zarząd",
        defaultRoute: "list",
        order: 9998,
        enabled: true,
        access: { mode: "prod", rolesAllowed: ["rola_zarzad", "rola_kr"] }
      })
    );
  }

  modules.sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));

  return modules;
}
