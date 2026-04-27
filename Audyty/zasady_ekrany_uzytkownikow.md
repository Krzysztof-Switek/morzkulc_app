# Zasady pracy z ekranami domowymi użytkowników

## Gdzie jest kod

Cały ekran domowy: `public/core/render_shell.js` → funkcja `renderHomeDashboard`.

---

## Skąd wiesz co pokazać

```javascript
const dash = getDashboardConfig(ctx);
// dash.isAdmin, dash.canReserveGear, dash.isKursant, dash.isSympatyk, dash.isKandydat ...
```

`getDashboardConfig` (`render_shell.js:80-93`) buduje flagi z `ctx.session.allowed_actions` i `ctx.session.role_key`. To jest jedyne źródło prawdy we frontendzie.

---

## Schemat pracy

### Dodanie sekcji tylko dla konkretnej roli

```javascript
${dash.isAdmin ? `<section class="dashCard startSection">...</section>` : ""}
```

### Zmiana tekstu / CTA zależnie od uprawnień

```javascript
const gearLabel = dash.canReserveGear ? "Rezerwuj sprzęt" : "Przeglądaj sprzęt";
```

### Dodanie nowej flagi per rola

1. Dodaj flagę w `getDashboardConfig` (`render_shell.js:80-93`):
   ```javascript
   canViewRanking: actions.includes("ranking.view"),
   ```
2. Użyj jej w HTML dashboardu:
   ```javascript
   ${dash.canViewRanking ? `<section>...</section>` : ""}
   ```

### Dodanie nowej dozwolonej akcji

1. Dodaj akcję w `computeAllowedActions` (`functions/src/index.ts:221-234`):
   ```typescript
   if (memberRoleKeys.includes(roleKey)) {
     actions.push("ranking.view");
   }
   ```
2. Odczytaj w `getDashboardConfig` przez `actions.includes("ranking.view")`.
3. Użyj flagi w HTML dashboardu.

---

## Jedna zasada

**Backend decyduje co rola może (`allowed_actions`), frontend tylko to wyświetla.**

Nigdy nie sprawdzaj `role_key` bezpośrednio we frontendzie w celu blokowania/pokazywania akcji — tylko przez `allowed_actions`. Flagi `isKursant`, `isSympatyk` itd. są dopuszczalne wyłącznie do różnicowania komunikatów i layoutu, nie do gating funkcjonalności.

---

## Jak to działa end-to-end

```
login
  → POST /api/register
      → backend: computeAllowedActions(roleKey) → ["gear.reserve", "godzinki.submit", ...]
      → odpowiedź: { role_key, screen: "home", allowed_actions: [...] }
  → ctx.session.allowed_actions zapisane
  → GET /api/setup → moduły przefiltrowane per rola
  → buildModulesFromSetup(setup, allowed_actions) → lista modułów
  → routing: #/home/home
  → renderHomeDashboard → getDashboardConfig(ctx) → flagi → HTML
```

---

## Testowanie

Zmień `role_key` w Firestore dla testowego usera → wyloguj → zaloguj ponownie → sprawdź dashboard.

Każda rola do przetestowania:

| Rola | Oczekiwane sekcje |
|---|---|
| `rola_zarzad` | Panel zarządczy + rezerwacje + imprezy + basen |
| `rola_kr` | Panel zarządczy + rezerwacje + imprezy + basen |
| `rola_czlonek` | Rezerwacje + imprezy + basen |
| `rola_kandydat` | Imprezy + basen + komunikat o ograniczonym dostępie |
| `rola_sympatyk` | Imprezy + basen + komunikat o ograniczonym dostępie |
| `rola_kursant` | Sekcja onboarding + imprezy + basen |