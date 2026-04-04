import { createGenericModule } from "/core/module_stub.js";
import { createGearModule } from "/modules/gear_module.js";
import { createMyReservationsModule } from "/modules/my_reservations_module.js";
import { createGodzinkiModule } from "/modules/godzinki_module.js";
import { createImprezaModule } from "/modules/impreza_module.js";
import { createBasenModule } from "/modules/basen_module.js";

/**
 * Resolves the module component type from setup config.
 *
 * Priority: explicit `type` field → derived from PL label (backwards compatibility).
 * Returns a stable lowercase type string or null for unknown/generic modules.
 *
 * Known types: "gear" | "godzinki" | "imprezy" | "basen"
 */
function resolveModuleType(cfg) {
  if (cfg?.type) return String(cfg.type).trim().toLowerCase();

  // Backwards compatibility: derive type from PL label
  const label = String(cfg?.label || "").trim().toLowerCase();
  if (label === "sprzęt") return "gear";
  if (label === "godzinki") return "godzinki";
  if (label === "imprezy") return "imprezy";
  if (label === "basen") return "basen";
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
export function buildModulesFromSetup(setup) {
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

  modules.sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));

  return modules;
}
