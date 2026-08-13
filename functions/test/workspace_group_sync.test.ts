/**
 * Testy jednostkowe dla listaRoleForUserRole — mapowanie roli klubowej na uprawnienia
 * w grupie Google lista@. Regresja tego mapowania spowodowała 9/86 błędnych uprawnień
 * na lista@ (patrz Audyty/13.08_NAPRAWA_UPRAWNIEŃ_LISTA.MD) — stąd test.
 *
 * Uruchamianie: npm --prefix functions run test
 */
import {describe, it, expect} from "vitest";
import {listaRoleForUserRole} from "../src/service/workspaceGroupSync";

describe("listaRoleForUserRole", () => {
  it("kursant nie ma dostępu do lista@", () => {
    expect(listaRoleForUserRole("rola_kursant")).toBeNull();
  });

  it("sympatyk ma tylko odczyt (MEMBER)", () => {
    expect(listaRoleForUserRole("rola_sympatyk")).toBe("MEMBER");
  });

  it("kandydat ma pełny dostęp (MANAGER)", () => {
    expect(listaRoleForUserRole("rola_kandydat")).toBe("MANAGER");
  });

  it("członek ma pełny dostęp (MANAGER)", () => {
    expect(listaRoleForUserRole("rola_czlonek")).toBe("MANAGER");
  });

  it("zarząd ma pełny dostęp (MANAGER)", () => {
    expect(listaRoleForUserRole("rola_zarzad")).toBe("MANAGER");
  });

  it("KR ma pełny dostęp (MANAGER)", () => {
    expect(listaRoleForUserRole("rola_kr")).toBe("MANAGER");
  });

  it("nieznana rola domyślnie dostaje MANAGER (fail-open dla nowych ról klubowych)", () => {
    expect(listaRoleForUserRole("rola_nieznana")).toBe("MANAGER");
  });
});
