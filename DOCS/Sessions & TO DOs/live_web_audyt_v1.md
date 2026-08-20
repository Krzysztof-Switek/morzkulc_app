# RAPORT WERYFIKACJI AUDYTU — SKK Morzkulc
**Data weryfikacji:** 2026-04-10
**Wersja audytu:** audyt_v2.md (2026-04-10)
**Metoda:** analiza kodu źródłowego + żywa strona https://morzkulc-e9df7.web.app

---

## 1. CO ZOSTAŁO SPRAWDZONE

Zweryfikowałem wszystkie niezgodności i braki wskazane w audyt_v2.md:

| # | Niezgodność z audytu | Plik |
|---|---------------------|------|
| 3.1 | CORS wildcard | `firebase.json` |
| 3.2 | `session.screen` nieużywany | `app_shell.js` |
| 3.3 | Brak `firestore.rules` | — |
| 3.4 | Brak 5 rewrite'ów | `firebase.json` |
| #11 | Hardcoded etykiety ról/statusów (frontend) | `render_shell.js` |
| #11 | Hardcoded etykiety ról/statusów (backend) | `membersSyncToSheet.ts` |
| #12 | `MEMBER_LEVEL_ROLES` hardcoded | `onUserRegisteredWelcome.ts` |
| #27 | Brak deduplicacji jobów syncToSheet | `index.ts` |

---

## 2. WYNIKI WERYFIKACJI PER NIEZGODNOŚĆ

### ✅ NAPRAWIONE: 3.1 — CORS wildcard

**Audyt stwierdził:** `firebase.json:89-94` zawierał `"Access-Control-Allow-Origin": "*"` dla `/api/**`, anulując backend allowlist.

**Stan dziś:** Nagłówek CORS na `/api/**` zniknął z `firebase.json`. Sekcja `headers` zawiera wyłącznie nagłówki cache-control dla zasobów statycznych (`/sw.js`, `/core/**`, `/modules/**` itd.). Backend CORS allowlist jest teraz aktywny.

**Ocena:** NAPRAWIONE

---

### ✅ NAPRAWIONE: 3.2 — `session.screen` ignorowany w routingu

**Audyt stwierdził:** `app_shell.js:158` zawierał `location.hash = "#/home/home"` zawsze, bez warunku.

**Stan dziś** (`app_shell.js:158-166`):
```js
if (!location.hash) {
  const screenId = String(ctx.session?.screen || "");
  const targetModule = screenId
    ? (ctx.modules || []).find((m) => m.id === screenId)
    : null;
  location.hash = targetModule
    ? `#/${targetModule.id}/${targetModule.defaultRoute || "home"}`
    : "#/home/home";
}
```

Frontend teraz odczytuje `session.screen`, szuka pasującego modułu w liście z setupu i routuje do niego. Fallback do `#/home/home` pozostaje gdy moduł nie istnieje — poprawne zachowanie.

**Uwaga:** `defaultScreenForRoleKey()` w backendzie zwraca wartości jak `screen_board`, `screen_kr`, `screen_member`. Routing zadziała poprawnie tylko jeśli te klucze pokrywają się z rzeczywistymi `module.id` skonfigurowanymi w `setup/app` Firestore. Do weryfikacji na żywych danych po zalogowaniu.

**Ocena:** NAPRAWIONE (routing aktywny)

---

### ✅ NAPRAWIONE: 3.4 — Brak 5 rewrite'ów

**Audyt stwierdził:** 5 endpointów nie miało wpisów w `firebase.json:rewrites` — były niedostępne przez domenę Hosting.

**Stan dziś** — wszystkie 5 jest obecnych w `firebase.json`:
```
/api/godzinki/purchase           → purchaseGodzinki
/api/basen/godziny               → getBasenGodziny
/api/basen/admin/godziny/add     → basenAdminAddGodziny
/api/basen/admin/godziny/correct → basenAdminCorrectGodziny
/api/basen/admin/users           → basenAdminSearchUsers
```

**Ocena:** NAPRAWIONE

---

### ✅ NAPRAWIONE: #11 — Hardcoded etykiety ról/statusów

**Audyt stwierdził:** `roleKeyToLabel()`, `statusKeyToLabel()` w `render_shell.js` oraz `roleLabel()`, `statusLabel()` w `membersSyncToSheet.ts` były hardcoded, ignorując setup.

**Stan dziś:**
- `render_shell.js:729-754` — obie funkcje najpierw czytają z `roleMappings?.[k]?.label` / `statusMappings?.[k]?.label` (z setup), hardcoded wartości są tylko fallbackiem dla istniejących kluczy technicznych.
- `membersSyncToSheet.ts:29-38` — identyczna logika: setup → fallback na stałe wartości.

Nowe role/statusy dodane do `setup.roleMappings` będą poprawnie wyświetlane i zapisywane do arkusza bez zmiany kodu.

**Ocena:** NAPRAWIONE (setup ma priorytet, hardcoded tylko jako fallback)

---

### ✅ NAPRAWIONE: #12 — `MEMBER_LEVEL_ROLES` hardcoded

**Audyt stwierdził:** `onUserRegisteredWelcome.ts:18-22` — decyzja o dodaniu do grupy members opierała się wyłącznie na hardcoded `MEMBER_LEVEL_ROLES`, ignorując `setup.roleMappings`.

**Stan dziś** (`onUserRegisteredWelcome.ts:108-112`):
```ts
const hasRoleMappings = Object.keys(roleMappings).length > 0;
const shouldAddToMembersGroup = membersGroup && (
  hasRoleMappings ?
    (roleMappings[roleKey]?.groups || []).includes(membersGroup) :
    MEMBER_LEVEL_ROLES.has(roleKey)  // fallback gdy brak setup.roleMappings
);
```

Gdy `setup.roleMappings` jest skonfigurowany — decyzja pochodzi z setupu. `MEMBER_LEVEL_ROLES` jest tylko fallbackiem gdy setup nie zawiera roleMappings.

**Ocena:** NAPRAWIONE

---

### ✅ NAPRAWIONE: #27 — Brak deduplicacji jobów membersSyncToSheet

**Audyt stwierdził:** Każdy POST `/api/register` z kompletnym profilem tworzył nowy job (auto-ID Firestore), możliwe wielokrotne wykonanie syncu.

**Stan dziś** (`index.ts:647-664`):
```ts
async function enqueueMemberSheetSync(uid: string): Promise<void> {
  const jobId = `sheet-sync:${uid}`;  // deterministyczny ID per user
  // ...
  if (status === "queued" || status === "running") return; // skip jeśli aktywny
  tx.set(jobRef, { ... });  // re-enqueue tylko gdy done/failed/dead
}
```

Job ma deterministyczny ID `sheet-sync:{uid}`. Transakcja Firestore sprawdza status — jeśli już `queued` lub `running`, pomija. Wielokrotne wywołania przy kompletnym profilu nie tworzą duplikatów.

**Ocena:** NAPRAWIONE

---

### ❌ NIE NAPRAWIONE: 3.3 — Brak `firestore.rules`

**Audyt stwierdził:** `firestore.rules` nie istnieje w repo, brak wpisu `"rules"` w `firebase.json`.

**Stan dziś:** Plik `firestore.rules` nadal nie istnieje. `firebase.json` nadal nie ma klucza `"rules"` w sekcji `"firestore"`:
```json
"firestore": {
  "indexes": "firestore.indexes.json"
}
```

Reguły Firestore nie są zarządzane przez source control. Stan reguł na produkcji jest nieznany z kodu — możliwe że są domyślnie otwarte lub zamknięte, niemożliwe do zweryfikowania bez dostępu do konsoli Firebase.

**Ocena:** NIENAPRAWIONE — pozostaje ryzyko bezpieczeństwa

---

## 3. ŻYWA STRONA — OBSERWACJE

Aplikacja pod https://morzkulc-e9df7.web.app, sprawdzona przez automatyzację przeglądarki:

| Aspekt | Wynik |
|--------|-------|
| Strona ładuje się poprawnie | ✅ |
| Ekran przed logowaniem | ✅ widoczny tylko przycisk "Zaloguj", `appRoot` ukryty |
| Przycisk zmiany motywu | ✅ działa |
| Wildcard CORS usunięty | ✅ zweryfikowany w `firebase.json` |
| Pełny flow logowania (rejestracja, profil, panel) | ⚠️ Niemożliwy do przetestowania bez kont testowych |
| Routing per rola (`session.screen`) | ⚠️ Kod poprawiony, efekt weryfikowalny tylko po zalogowaniu |

---

## 4. PODSUMOWANIE

| Niezgodność | Status w audyt_v2 | Status dziś |
|---|---|---|
| 3.1 CORS wildcard `/api/**` | WRONG | **✅ NAPRAWIONE** |
| 3.2 `session.screen` ignorowany | WRONG | **✅ NAPRAWIONE** |
| 3.4 Brak 5 rewrite'ów | MISSING | **✅ NAPRAWIONE** |
| #11 Hardcoded etykiety ról/statusów | WRONG | **✅ NAPRAWIONE** (setup ma priorytet) |
| #12 `MEMBER_LEVEL_ROLES` hardcoded | WRONG | **✅ NAPRAWIONE** (setup ma priorytet) |
| #27 Deduplicacja jobów syncToSheet | PARTIAL | **✅ NAPRAWIONE** (deterministyczny ID) |
| 3.3 Brak `firestore.rules` | MISSING | **❌ NIENAPRAWIONE** |

**6 z 7 niezgodności krytycznych wdrożonych.**

---

## 5. REKOMENDACJA — POZOSTAŁE DO ZROBIENIA

### Priorytet 1 — Firestore Rules (bezpieczeństwo)

1. Utwórz plik `firestore.rules` w katalogu głównym projektu
2. Dodaj `"rules": "firestore.rules"` do sekcji `"firestore"` w `firebase.json`:
   ```json
   "firestore": {
     "rules": "firestore.rules",
     "indexes": "firestore.indexes.json"
   }
   ```
3. Wdróż: `firebase deploy --only firestore:rules`

Minimalny zakres reguł: blokada bezpośredniego dostępu do kolekcji `users_active`, `service_jobs`, `setup` dla niezalogowanych użytkowników. Cały dostęp do danych powinien przechodzić przez Cloud Functions (które mają weryfikację ID tokenu).

### Priorytet 2 — Weryfikacja routingu per rola

Po zalogowaniu różnymi kontami (zarząd, członek, sympatyk) sprawdzić czy wartości zwracane przez `defaultScreenForRoleKey()` (`screen_board`, `screen_kr`, `screen_member`) pokrywają się z `module.id` skonfigurowanymi w `setup/app` Firestore. Jeśli nie — routing trafi na fallback `#/home/home` i wymagane będzie dopasowanie kluczy.
