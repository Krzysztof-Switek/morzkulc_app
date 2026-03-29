import { createGenericModule } from "/core/module_stub.js";
import { createGearModule } from "/modules/gear_module.js";
import { createMyReservationsModule } from "/modules/my_reservations_module.js";
import { createGodzinkiModule } from "/modules/godzinki_module.js";
import { createImprezaModule } from "/modules/impreza_module.js";
import { createBasenModule } from "/modules/basen_module.js";

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

    if (id === "modul_2") {
      return createGearModule({
        ...base,
        defaultRoute: base.defaultRoute === "home" ? "kayaks" : base.defaultRoute
      });
    }

    if (id === "modul_3") {
      return createGodzinkiModule({
        ...base,
        defaultRoute: base.defaultRoute === "home" ? "balance" : base.defaultRoute
      });
    }

    if (id === "modul_4") {
      return createImprezaModule({
        ...base,
        defaultRoute: base.defaultRoute === "home" ? "list" : base.defaultRoute
      });
    }

    if (id === "modul_5") {
      return createBasenModule({
        ...base,
        defaultRoute: base.defaultRoute === "home" ? "sessions" : base.defaultRoute
      });
    }

    return createGenericModule(base);
  });

  const gearModule = modules.find((m) => String(m?.id || "") === "modul_2") || null;

  if (gearModule) {
    modules.push(
      createMyReservationsModule({
        id: "my_reservations",
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
