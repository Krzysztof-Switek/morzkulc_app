import { createGenericModule } from "/core/module_stub.js";
import { createGearModule } from "/modules/gear_module.js";

/**
 * NEW FORMAT ONLY
 * setup.modules = {
 *   modul_1: { label, order, enabled, access, defaultRoute }
 * }
 */
export function buildModulesFromSetup(setup) {
  const modulesCfg = setup?.modules;

  if (!modulesCfg || typeof modulesCfg !== "object" || Array.isArray(modulesCfg)) {
    return [];
  }

  const modules = Object.entries(modulesCfg).map(([id, cfg]) => {
    const base = {
      id,
      label: String(cfg?.label || id),
      defaultRoute: String(cfg?.defaultRoute || "home"),
      order: Number(cfg?.order ?? 9999),
      enabled: Boolean(cfg?.enabled ?? false),
      access: cfg?.access || {}
    };

    // ✅ Legacy mapping: modul_2 = Sprzęt
    if (id === "modul_2") {
      // jeśli setup nie ma defaultRoute → wymuszamy "kayaks" w kodzie
      return createGearModule({
        ...base,
        defaultRoute: base.defaultRoute === "home" ? "kayaks" : base.defaultRoute
      });
    }

    return createGenericModule(base);
  });

  modules.sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));

  return modules;
}
