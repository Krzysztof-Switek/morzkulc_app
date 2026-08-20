# Audyt: Role-specific Home Screens — Morzkulc App

**Data:** 2026-04-13  
**Zakres:** Ekrany domowe i funkcjonalności specyficzne dla ról użytkowników  
**Podstawa:** Analiza aktualnego kodu (nie projekcje ani założenia)

---

## 1. STAN AKTUALNY

**Sekwencja po loginie** (`app_shell.js`):
1. `POST /api/register` → zwraca `{ uid, role_key, status_key, screen, profileComplete }`
2. `GET /api/setup` → moduły przefiltrowane przez `filterSetupForUser()` per rola/status
3. `buildModulesFromSetup(setup, role_key)` → lista modułów
4. Routing: jeśli brak hasha → `ctx.modules.find(m => m.id === screenId)` → fallback `#/home/home`

**Skąd rola:** `users_active/{uid}.role_key` czytane przez backend przy każdym `/api/register`

**Skąd widoczność modułów:** Backend filtruje `setup/app.modules` przez `filterSetupForUser()` — działa poprawnie.

**Czy ekran domyślny zależny od roli działa:** **NIE** — szczegóły w sekcji Audyt Luk.

---

## 2. AUDYT LUK

### Tabela luk

| # | Obszar | Co jest | Czego brakuje | Gdzie w kodzie | Ryzyko | Blokuje ekrany domowe? |
|---|---|---|---|---|---|---|
| L1 | Routing startowy | `defaultScreenForRoleKey()` zwraca `screen_board`, `screen_member` itd. | Żaden moduł w setup nie ma takiego ID — find zawsze zwraca null → fallback `#/home/home` | `index.ts:217-227`, `app_shell.js:159-165` | Wysoki | **TAK — KRYTYCZNE** |
| L2 | Setup: pole `Ekran_domyslny` | Sheets ma `ekran_zarzad`, `ekran_czlonek` — sync przez `usersSyncRolesFromSheetTask` | Pole to NIE trafia do `roleMappings` w `SetupApp` i nie jest czytane nigdzie we frontendzie | `index.ts:193-199` (typ `RoleMapping: { label, groups? }`) | Wysoki | TAK |
| L3 | Hardcoded role sets frontend | Działają | Nie konfigurowane przez setup — zmiana roli w setup nie zmienia ich zachowania | `basen_module.js:15-16`, `impreza_module.js:9-10`, `modules_registry.js:117` | Średni | Nie — ale blokuje zero-hardcoding |
| L4 | Backend gating: gear reservation | Brak sprawdzenia roli | Każdy zalogowany user może przez API stworzyć rezerwację niezależnie od roli | `gearReservationCreateHandler.ts` (brak role check), `gearBundleReservationCreateHandler.ts` | **Krytyczny** | Nie — ale luka bezpieczeństwa |
| L5 | Backend gating: godzinki submit | Sprawdza status (zawieszenie), brak check roli | Sympatyk/kandydat/kursant może zgłosić godzinki przez direct API call | `submitGodzinkiHandler.ts:53-63` | Średni | Nie |
| L6 | Dashboard | Jeden `renderHomeDashboard` dla wszystkich ról | Brak sekcji/layoutu/CTA zależnych od roli | `render_shell.js:80-305` | Średni | TAK |
| L7 | CTA per rola | Kafelki Sprzęt/Godzinki/Basen/Imprezy widoczne dla wszystkich | Brak warunkowych CTA, komunikatów i wyjaśnień dla ról z ograniczonym dostępem (sympatyk nie dostanie żadnego feedbacku dlaczego nie może rezerwować) | `render_shell.js:125-143` | Niski UX, Wysoki produkt | Nie — ale kluczowe dla doświadczenia |
| L8 | `my_reservations` i `admin_pending` poza setup | Wstrzykiwane hardcoded w `modules_registry.js` | Nie da się nimi zarządzać przez setup (włączyć/wyłączyć, zmienić access) | `modules_registry.js:101-130` | Niski | Nie |
| L9 | Brak modułu ekran startowy per rola | Jeden `home` dla wszystkich | Nie istnieje żaden moduł `ekran_zarzad` ani analogiczny | cały `public/modules/` | Wysoki | TAK |
| L10 | `getAdminPending` backend gating | Do weryfikacji | Prawdopodobny brak sprawdzenia roli po stronie backendu | `getAdminPendingHandler.ts` | Średni | Nie |

---

### L1 — szczegół krytyczny

```javascript
// index.ts:217-227
function defaultScreenForRoleKey(roleKey: string): string {
  const map: Record<string, string> = {
    rola_zarzad:  "screen_board",     // ← żaden moduł nie ma id = "screen_board"
    rola_czlonek: "screen_member",    // ← żaden moduł nie ma id = "screen_member"
    // ...
  };
  return map[roleKey] || "screen_supporter";
}

// app_shell.js:159-165
const screenId = String(ctx.session?.screen || "");         // = "screen_board"
const targetModule = screenId
  ? ctx.modules.find(m => m.id === screenId)                // zawsze null
  : null;
location.hash = targetModule
  ? `#/${targetModule.id}/...`
  : "#/home/home";                                           // ← zawsze tu ląduje
```

Moduły w setup mają id `modul_1`, `modul_2`, `modul_km` itd. — nigdy `screen_board`.

---

### L4 — szczegół krytyczny

```typescript
// gearReservationCreateHandler.ts — brak jakiejkolwiek roli check
const tokenCheck = await requireIdToken(req);  // weryfikuje tylko UID
// ... walidacja dat i kayakIds ...
const out = await createReservation(db, { uid, startDate, endDate, kayakIds });
```

Dla porównania `basenEnrollHandler.ts` robi to poprawnie:

```typescript
if (!deps.memberRoleKeys.includes(roleKey)) {
  res.status(403).json({error: "Brak uprawnień."});
}
```

---

## 3. MACIERZ ROLA → EKRAN → MODUŁY → AKCJE

Na podstawie aktualnego kodu (nie projekcji):

| Rola | Screen z backend | Moduł o tym ID | **Faktyczny start** | Widoczność modułów | Akcje zablokowane backend | Akcje zablokowane frontend | Hardcoded |
|---|---|---|---|---|---|---|---|
| rola_zarzad | screen_board | brak | `#/home/home` | przez setup.rolesAllowed + admin_pending (auto) | — | — | admin_pending inject |
| rola_kr | screen_kr | brak | `#/home/home` | przez setup.rolesAllowed + admin_pending (auto) | — | — | admin_pending inject |
| rola_czlonek | screen_member | brak | `#/home/home` | przez setup.rolesAllowed | — | — | — |
| rola_kandydat | screen_candidate | brak | `#/home/home` | przez setup.rolesAllowed | basen enroll, impreza submit | basen enroll, impreza submit tab | ENROLL_ROLES, SUBMIT_ROLES |
| rola_sympatyk | screen_supporter | brak | `#/home/home` | przez setup.rolesAllowed | basen enroll, impreza submit; **NIE: gear reservation** | basen enroll, impreza submit tab; **NIE: gear reserve** | ENROLL_ROLES, SUBMIT_ROLES |
| rola_kursant | screen_trainee | brak | `#/home/home` | przez setup.rolesAllowed | basen enroll, impreza submit; **NIE: gear reservation** | basen enroll, impreza submit tab; **NIE: gear reserve** | ENROLL_ROLES, SUBMIT_ROLES |

### Co powinno pochodzić z setup (obecnie nie pochodzi)

- `roleMappings.{rola}.defaultHomeModuleId` → ID modułu/ekranu startowego
- `roleMappings.{rola}.allowedActions` → lista dozwolonych akcji per rola (np. `gear.reserve`, `godzinki.submit`)
- `roleMappings.{rola}.dashboardSections` → sekcje dashboardu widoczne per rola
- `roleMappings.{rola}.showOnboarding` → czy pokazywać treści onboardingowe

### Minimalny stabilny model rozszerzenia `RoleMapping`

```typescript
type RoleMapping = {
  label: string;
  groups?: string[];
  // DO DODANIA:
  defaultHomeModuleId?: string;    // ID modułu startowego, np. "modul_1" albo "home"
  allowedActions?: string[];       // np. ["gear.reserve", "godzinki.submit"]
  dashboardSections?: string[];    // np. ["reservations", "events", "admin"]
  showOnboarding?: boolean;        // czy pokazywać treści onboardingowe
};
```

---

## 4. PLAN WDROŻENIA

### Krok 0: Naprawienie L4 — backend gating gear reservation (priorytet)

**Cel:** Zablokować gear reservation na backendzie dla ról bez uprawnień.  
**Pliki:** `functions/src/api/gearReservationCreateHandler.ts`, `functions/src/api/gearBundleReservationCreateHandler.ts`  
**Zmiana:** Dodać check `memberRoleKeys` wzorem `basenEnrollHandler.ts` — wczytaj user z Firestore, sprawdź `role_key`.  
**Zależności:** `memberRoleKeys` jest już w `service_config.ts`, `index.ts` go wstrzykuje.  
**Ryzyko:** Żadne — wymagane.  
**Test:** POST /api/gear/reservations/create z tokenem sympatyka → 403.

---

### Krok 1: Naprawienie L1 — routing startowy

**Cel:** Aby `ctx.session.screen` mógł skutecznie przekierować na właściwy moduł.

**Opcja A (minimalna ingerencja):** Zmienić `defaultScreenForRoleKey()` żeby zwracał `"home"` — wtedy dashboard staje się punktem wejścia per rolę i w Kroku 3 różnicujemy jego zawartość.

**Opcja B (bardziej kompletna):** Dodać `defaultHomeModuleId` do `roleMappings` w setup, wczytać przez `/api/setup`/`/api/register` i przekazać do frontendu.

**Rekomendacja:** Opcja A teraz, Opcja B po Kroku 2.  
**Pliki:** `functions/src/index.ts:217-227`  
**Ryzyko:** Niskie — zmiana jednej funkcji.  
**Test:** Zaloguj się jako każda rola → sprawdź hash po zalogowaniu.

---

### Krok 2: Rozszerzenie `RoleMapping` w setup

**Cel:** Wprowadzić `defaultHomeModuleId` i `allowedActions` jako pola konfiguracyjne.  
**Pliki:** `functions/src/index.ts` (typ `RoleMapping`), `functions/src/api/registerUserHandler.ts` (odczyt `roleMappings` z setup przy decyzji o `screen`).  
**Zmiana:** Jeśli `setup.roleMappings[roleKey].defaultHomeModuleId` istnieje → użyj tego zamiast hardcoded mapy.  
**Zależności:** Krok 1.  
**Ryzyko:** Średnie — wymaga zmian w registerUserHandler, który jest krytyczną ścieżką.  
**Test:** Ustaw `defaultHomeModuleId = "modul_km"` dla roli czlonek w setup → po loginie hash = `#/modul_km/form`.

---

### Krok 3: Różnicowanie `renderHomeDashboard` per rola

**Cel:** Różne sekcje/kafelki/CTA zależnie od `ctx.session.role_key`.  
**Pliki:** `public/core/render_shell.js:80-305`  
**Zmiana:**
- Wyodrębnić `getDashboardSections(ctx)` → zwraca listę sekcji per rola
- Sekcje: `hero`, `reservations`, `events`, `basen`, `admin`, `onboarding`
- Admin (zarzad/kr): dodać sekcję `admin` z linkiem do `admin_pending`
- Kursant: dodać sekcję `onboarding` z tekstem informacyjnym
- Sympatyk: kafelek Sprzęt z komunikatem "Wymaga roli Członek"

**Zależności:** Krok 1.  
**Ryzyko:** Średnie — duży plik, dużo HTML w JS.  
**Test:** Każda rola → dashboard ma odpowiednie sekcje, brak sekcji z innych ról.

---

### Krok 4: Usunięcie hardcoded role sets z frontendu (L3)

**Cel:** `ADMIN_ROLES`, `ENROLL_ROLES`, `SUBMIT_ROLES` z setup lub z `ctx.session`.  
**Pliki:** `public/modules/basen_module.js:15-16`, `public/modules/impreza_module.js:9-10`, `public/core/modules_registry.js:117`  
**Opcja:** Przekazywać `allowedActions` jako część `ctx.session` → moduły sprawdzają `ctx.session.allowedActions?.includes("basen.enroll")`.  
**Zależności:** Krok 2.  
**Ryzyko:** Niskie jeśli backend gating jest poprawny (po Kroku 0).  
**Test:** Dodaj/usuń rolę z allowed actions w setup → bez deployu frontendu zmiana widoczna.

---

### Krok 5: Naprawienie L5 — godzinki backend gating

**Cel:** Ustalić i wdrożyć kto może zgłaszać godzinki.  
**Pliki:** `functions/src/api/submitGodzinkiHandler.ts:53-63`  
**Pytanie do wyjaśnienia:** Czy sympatyk/kursant może zgłaszać godzinki? Jeśli nie — dodać check wzorem `submitEventHandler.ts`.  
**Zależności:** Decyzja biznesowa.  
**Ryzyko:** Niskie.  
**Test:** POST /api/godzinki/submit z tokenem sympatyka → oczekiwany status.

---

## 5. PLAN TESTÓW

### Logowanie i routing

- [ ] Nowy użytkownik (nie w `users_opening_balance_26`) → rola `rola_sympatyk` → hash po loginie zgodny z konfiguracją
- [ ] Użytkownik z bilansem otwarcia (czlonek=true) → rola `rola_czlonek` → hash po loginie
- [ ] Użytkownik zawieszony (`status_zawieszony`) → żaden moduł nie widoczny, moduły z `blocksAccess=true` zablokowane
- [ ] Po zmianie `role_key` w Firestore → wylogowanie + ponowne logowanie → nowa rola i nowy ekran startowy bez deployu

### Widoczność modułów

- [ ] Sympatyk: widzi tylko moduły z `rolesAllowed` zawierającym `rola_sympatyk`
- [ ] Czlonek: widzi moduły z `rola_czlonek`
- [ ] Zarzad/KR: widzi moduły admina + `admin_pending` wstrzykiwany auto
- [ ] Zmiana `rolesAllowed` w setup bez deployu → po kolejnym loginie zmiana widoczna

### Blokady akcji

- [ ] Sympatyk: GET /api/gear/kayaks → 200 (widzi sprzęt)
- [ ] Sympatyk: POST /api/gear/reservations/create → 403 (po Kroku 0)
- [ ] Sympatyk: POST /api/basen/enroll → 403
- [ ] Sympatyk: POST /api/events/submit → 403
- [ ] Kursant: analogiczne testy jak sympatyk
- [ ] Czlonek: POST /api/gear/reservations/create → 200
- [ ] Czlonek: POST /api/basen/enroll → 200 (jeśli ma karnet/jest na liście)

### Dashboard per rola

- [ ] Zarzad: widzi sekcję admin z linkiem do `admin_pending`
- [ ] Kursant: widzi sekcję onboardingową
- [ ] Sympatyk: kafelek "Sprzęt" ma komunikat o braku uprawnień do rezerwacji
- [ ] Czlonek: standardowy dashboard operacyjny bez onboardingu

### Bezpieczeństwo

- [ ] Ręczny `fetch` POST /api/gear/reservations/create z tokenem sympatyka → 403
- [ ] Ręczny `fetch` GET /api/admin/pending z tokenem sympatyka → 403
- [ ] Zmodyfikowany hash w URL `#/admin_pending/list` przez sympatyka → frontend blokuje przez `canSeeModule()`
- [ ] Wygasła sesja (>24h) → `authLogout()` wywoływane, user ląduje na login

### Odporność

- [ ] Brak setup w Firestore → `setupMissing: true` w sesji → app działa w trybie degraded
- [ ] Moduł w URL nieznany → komunikat "Nieznany moduł" zamiast błędu JS
- [ ] Zmiana roli admina w Firestore na czlonek → bez deployu kolejne logowanie nie pokazuje `admin_pending`

---

## Podsumowanie końcowe

**Czy architektura jest gotowa na role-specific home screens?**

Wymaga **lekkiej przebudowy** — nie dużego refaktoru. Fundamenty są solidne:
- Backend filtruje moduły per rola przez setup — działa
- `ctx.session.role_key` dostępne wszędzie we frontendzie — jest
- `screen` per rola zwracany przez backend — jest (ale ID złe — L1)
- Routing do `targetModule` w `app_shell.js` — gotowy mechanizm, tylko zepsute ID

**Bezpieczna kolejność wdrożenia:**

| Kolejność | Krok | Priorytet | Notatka |
|---|---|---|---|
| 1 | Krok 0 — gear reservation backend gating | Krytyczny | Luka bezpieczeństwa |
| 2 | Krok 1 — naprawienie screen_* → home | Wysoki | Odblokowanie routingu |
| 3 | Krok 2 — rozszerzenie RoleMapping w setup | Wysoki | Fundament konfigurowalności |
| 4 | Krok 3 — różnicowanie dashboardu | Średni | Widoczna zmiana dla użytkownika |
| 5 | Krok 4+5 — hardcoded roles + godzinki gating | Niski | Porządki i spójność |

Żaden z kroków nie wymaga przepisywania modułów od zera. Największa zmiana to `render_shell.js` (sekcje dashboardu per rola) — ale to addytywne rozszerzenie istniejącej funkcji, nie refaktor struktury.