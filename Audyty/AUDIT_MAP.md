# AUDIT_MAP — Mapa systemu godzinkowego i rezerwacji

Data analizy: 2026-04-20  
Środowisko: PROD (`morzkulc-e9df7`)

---

## 1. Moduły frontendowe

| Plik | Odpowiedzialność | Endpointy |
|------|-----------------|-----------|
| `public/modules/gear_module.js` (1983 linie) | Przeglądanie sprzętu po kategoriach, rezerwacje pojedyncze i bundle, dostępność, ulubione | GET /api/gear/kayaks, GET /api/gear/items, GET /api/gear/items/availability, POST /api/gear/reservations/create, POST /api/gear/reservations/create-bundle, GET /api/gear/favorites, POST /api/gear/favorites/toggle, GET /api/gear/kayak-reservations |
| `public/modules/my_reservations_module.js` (602 linie) | Lista moich rezerwacji, edycja dat, anulowanie | GET /api/gear/my-reservations, POST /api/gear/reservations/update, POST /api/gear/reservations/cancel |
| `public/modules/godzinki_module.js` (372 linie) | Historia godzinek, formularz zgłoszenia pracy, widok bilansu | GET /api/godzinki, POST /api/godzinki/submit |
| `public/modules/admin_pending_module.js` (163 linie) | Panel oczekujących zatwierdzeń godzinek i imprez | GET /api/admin/pending |
| `public/core/api_client.js` | Wrapper HTTP z automatycznym tokenem Firebase | — |

---

## 2. Backend — pliki i odpowiedzialności

### Handlery API (`functions/src/api/`)

| Plik | Endpoint | Rola auth | Status blokada |
|------|----------|-----------|----------------|
| `gearReservationCreateHandler.ts` | POST /api/gear/reservations/create | token required, wywołuje createReservation() | TAK |
| `gearBundleReservationCreateHandler.ts` | POST /api/gear/reservations/create-bundle | token required, wywołuje createBundleReservation() | TAK |
| `gearReservationCancelHandler.ts` | POST /api/gear/reservations/cancel | token required, ownership checked | NIE (w handlerze) |
| `gearReservationUpdateHandler.ts` | POST /api/gear/reservations/update | token required | TAK |
| `gearMyReservationsHandler.ts` | GET /api/gear/my-reservations | token required | NIE |
| `getGearKayaksHandler.ts` | GET /api/gear/kayaks | token required | NIE |
| `getGearItemsHandler.ts` | GET /api/gear/items | token required | NIE |
| `getGearItemAvailabilityHandler.ts` | GET /api/gear/items/availability | token required | NIE |
| `getGodzinkiHandler.ts` | GET /api/godzinki | token required | NIE |
| `submitGodzinkiHandler.ts` | POST /api/godzinki/submit | token required | TAK |
| `godzinkiPurchaseHandler.ts` | POST /api/godzinki/purchase | token required | TAK |
| `getAdminPendingHandler.ts` | GET /api/admin/pending | token + adminRoleKeys | N/A |

### Serwisy (`functions/src/modules/`)

| Plik | Funkcje kluczowe |
|------|-----------------|
| `equipment/kayaks/gear_kayaks_service.ts` | `createReservation()`, `cancelReservation()`, `updateReservationDates()` |
| `equipment/bundle/gear_bundle_service.ts` | `createBundleReservation()`, `updateGearReservationDates()`, `findBundleConflicts()`, `getItemsWithAvailability()` |
| `hours/godzinki_service.ts` | `deductHours()`, `refundHoursForReservation()`, `creditReservationAdjustment()`, `processApproval()`, `computeBalance()` |
| `hours/hours_quote.ts` | `quoteKayaksCostHours()` — **TYLKO kajaki są wyceniane** |
| `hours/godzinki_vars.ts` | `getGodzinkiVars()` → setup/vars_godzinki |
| `setup/setup_gear_vars.ts` | `getGearVars()` → setup/vars_gear |
| `calendar/calendar_utils.ts` | `computeBlockIso()`, `overlapsIso()`, `daysOnWaterInclusive()`, `maxEndIsoByWeeks()` |
| `users/userStatusCheck.ts` | `isUserStatusBlocked()` → setup/app.statusMappings |

---

## 3. Kolekcje Firestore (źródła prawdy)

| Kolekcja | Zawartość | Indeksowanie |
|----------|-----------|-------------|
| `gear_reservations` | Wszystkie rezerwacje — legacy (`kayakIds[]`) i bundle (`items[]`, `itemIds[]`) | status + blockStartIso + userUid |
| `godzinki_ledger` | Ledger earn/spend/purchase z FIFO trace | uid + type + approved + reservationId |
| `users_active/{uid}` | Profile użytkowników: role_key, status_key, email | email |
| `gear_kayaks` | Katalog kajaków | isActive |
| `gear_paddles` | Katalog wioseł | isActive |
| `gear_lifejackets` | Katalog kamizelek | isActive |
| `gear_helmets` | Katalog kasków | isActive |
| `gear_throwbags` | Katalog rzutek | isActive |
| `gear_sprayskirts` | Katalog fartuchów | isActive |
| `setup/vars_gear` | Konfiguracja sprzętu: cennik kajaków, limity, offset | — |
| `setup/vars_godzinki` | Konfiguracja godzinek: limit ujemny, lata ważności | — |
| `setup/app` | Moduły, role, statusy, dostępy | — |

---

## 4. Przepływ: tworzenie rezerwacji kajaka (legacy)

```
UI: gear_module.js
  POST /api/gear/reservations/create {startDate, endDate, kayakIds}
    ↓ gearReservationCreateHandler.ts
      ↓ createReservation(db, {uid, startDate, endDate, kayakIds})
          1. getUserRole(db, uid)         → users_active/{uid}
          2. isUserStatusBlocked()        → setup/app.statusMappings
          3. roleKey === "rola_sympatyk"? → 403
          4. getGearVars(db)              → setup/vars_gear
          5. roleMaxWeeks(vars, roleKey)  → maxWeeksByRole[role]
          6. roleMaxItems(vars, roleKey)  → maxItemsByRole[role]
          7. endDate > maxEndIso?         → 400 max_time_exceeded
          8. computeBlockIso()            → blockStartIso, blockEndIso
          9. countMyOverlappingItems()    → gear_reservations (query)
         10. already + kayakIds.length > maxItems? → 400
         11. findConflicts()              → gear_reservations (query)
         12. quoteKayaksCostHours()       → days × count × hoursPerKayakPerDay
         13. ref.set(doc)                 ← ZAPIS REZERWACJI [!ATOMOWOŚĆ]
         14. deductHours()                → FIFO transaction (godzinki_ledger)
             ↓ BŁĄD → ref.delete()       ← ROLLBACK (nieatomowy!)
          ← {ok, reservationId, costHours, blockStartIso, blockEndIso}
```

## 5. Przepływ: tworzenie rezerwacji bundle

```
UI: gear_module.js
  POST /api/gear/reservations/create-bundle {startDate, endDate, items[], starterCategory, starterItemId}
    ↓ gearBundleReservationCreateHandler.ts
      ↓ createBundleReservation(db, args)
          1-7. (jak legacy, ale używa createBundleReservation)
          8. fetchItemDetails()  → sprawdza isActive, isOperational, storage≠basen
          9. compositeIds = items.map(compositeId)   ["kayaks/K01", "paddles/P01"]
         10. countMyOverlappingBundleItems()  → liczy items[].length + kayakIds[].length
         11. findBundleConflicts()   → sprawdza itemIds[] ORAZ legacy kayakIds[]
         12. kayakIds = items.filter(c==="kayaks")  → TYLKO kajaki do ceny
         13. quoteKayaksCostHours() → jak legacy (akcesoria BEZPŁATNE)
         14. ref.set(doc)   z items[], itemIds[], kayakIds[] (backward compat)
         15. deductHours() → FIFO transaction
```

## 6. Przepływ: anulowanie rezerwacji

```
UI: my_reservations_module.js
  POST /api/gear/reservations/cancel {reservationId}
    ↓ gearReservationCancelHandler.ts
      ↓ cancelReservation(db, {uid, reservationId})
          1. Fetch gear_reservations/{reservationId}
          2. r.userUid === uid?       → 403 if not
          3. r.status === "active"?   → 400 if not
          4. todayIso < blockStartIso? → 400 cancel_blocked if not
          5. refundHoursForReservation()
             a. Find spend records (reservationId)
             b. Check each earn pool from FIFO: expiresAt > now?
                → 400 "pool_expired" if ANY pool expired
             c. TRANSACTION:
                - restore earn.remaining (FIFO pools)
                - create new earn for overdraft (NEW expiry: now+4y)
                - zero adjustment earns (sourceType="adjustment")
                - mark all spends as refunded=true
          6. ref.set({status: "cancelled"})
```

## 7. Przepływ: FIFO dedukcja godzinek

```
deductHours(db, uid, {amount, reason, reservationId}, vars, now)
  TRANSACTION:
    1. Fetch all earn records (uid, approved=true)
    2. Fetch all spend records (uid)
    3. Fetch all purchase records (uid)
    4. Filter earn: expiresAt > now, remaining > 0
    5. Sort earn by grantedAt ASC (FIFO)
    6. Compute currentBalance (positive - overdraft + purchases)
    7. newBalance = currentBalance - amount
    8. newBalance < -negativeBalanceLimit? → BŁĄD negative_limit_exceeded
    9. Iterate earn records (FIFO):
       - take = min(available, remaining_to_deduct)
       - update earn.remaining -= take
       - record earnDeductions[]
    10. overdraft = remaining_to_deduct (po wyczerpaniu earn)
    11. Create spend record: {amount, fromEarn, overdraft, earnDeductions[], reservationId}
```

## 8. Konfiguracja setup

### setup/vars_gear

| Klucz Firestore | Pole GearVars | Fallback | Znaczenie |
|-----------------|---------------|----------|-----------|
| `offset_rezerwacji` | offsetDays | 1 | Dni bufora przed/po rezerwacji |
| `godzinki_za_kajak` | hoursPerKayakPerDay | 10 | Koszt jednego kajaka na dzień |
| `zarzad_nie_płaci_za_sprzet` | boardDoesNotPay | false | Czy zarząd/kr jest zwolniony z opłat |
| `zarząd_max_time` | maxWeeksByRole[zarzad/kr] | 4 | Tygodnie z góry dla zarządu i kr |
| `członek_max_time` | maxWeeksByRole[czlonek] | 2 | Tygodnie z góry dla członka |
| `kandydat_max_time` | maxWeeksByRole[kandydat] | 1 | Tygodnie z góry dla kandydata |
| `zarząd_max_items` | maxItemsByRole[zarzad/kr] | 100 | Max sztuk dla zarządu i kr |
| `członek_max_items` | maxItemsByRole[czlonek] | 3 | Max sztuk dla członka |
| `kandydat_max_items` | maxItemsByRole[kandydat] | 1 | Max sztuk dla kandydata |

**NIEIMPLEMENTOWANE w kodzie (luka K1):** godzinki_za_fartuch, godzinki_za_kask, godzinki_za_wiosło, godzinki_za_rzutkę, godzinki_za_kamizelkę, godzinki_za_odzież, godzinki_za_sprzęt_prywatny (ten ostatni istnieje w kodzie ale tyko dla monthly storage, nie dla rezerwacji).

### setup/vars_godzinki

| Klucz | Pole | Fallback |
|-------|------|----------|
| `limit_ujemnego_salda` | negativeBalanceLimit | 20 |
| `lata_waznosci` | expiryYears | 4 |

---

## 9. Role — mapa dostępu do rezerwacji

| Rola | Rezerwacja | Max weeks | Max items | Koszt |
|------|-----------|-----------|-----------|-------|
| rola_zarzad | TAK | 4 (setup) | 100 (setup) | 0 jeśli boardDoesNotPay=true |
| rola_kr | TAK | 4 (setup) | 100 (setup) | 0 jeśli boardDoesNotPay=true |
| rola_czlonek | TAK | 2 (setup) | 3 (setup) | TAK |
| rola_kandydat | TAK | 1 (setup) | 1 (setup) | TAK |
| rola_sympatyk | **NIE** | — | — | — |
| rola_kursant | **NIE** (0 w maxWeeksByRole) | — | — | — |

---

## 10. Zidentyfikowane ryzyka (podsumowanie)

| # | Priorytet | Opis | Plik:linia |
|---|-----------|------|------------|
| K1 | KRYTYCZNE | Brak cennika akcesoriów (wiosło/kask/fartuch/kamizelka/rzutka) | hours_quote.ts:4 |
| K2 | KRYTYCZNE | Nieatomowość reservation write + hours deduct | gear_kayaks_service.ts:219,238 |
| K3 | KRYTYCZNE | Anulacja trwale blokuje się jeśli pula FIFO wygasła | godzinki_service.ts:506-511 |
| K4 | KRYTYCZNE | Overdraft refund tworzy nową pulę z nową datą (nie oryginalną) | godzinki_service.ts:547-568 |
| K5 | KRYTYCZNE | Brak walidacji startDate >= today | gear_kayaks_service.ts:134 |
| S1 | ŚREDNIE | rola_kursant nie może rezerwować (0 w mapach limitów) | setup_gear_vars.ts:43-55 |
| S2 | ŚREDNIE | max_items liczy WSZYSTKIE przedmioty zestawu łącznie | gear_bundle_service.ts:363-369 |
| S3 | ŚREDNIE | Opening balance expiry hardcoded 2029-12-31 | registerUserHandler.ts:327 |
| S4 | ŚREDNIE | Brak walidacji endDate >= startDate | gear_kayaks_service.ts:134 |
| S5 | ŚREDNIE | Race condition: findConflicts → set (brak transakcji) | gear_kayaks_service.ts:185-219 |
| N1 | NISKIE | Anulacja blokuje się w DZIEŃ startu offsetu (strict <) | gear_kayaks_service.ts:266 |
| N2 | NISKIE | listMyReservations limit 50 (niewidoczne starsze) | gear_kayaks_service.ts:45 |
