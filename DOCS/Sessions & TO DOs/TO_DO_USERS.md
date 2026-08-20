# TO-DO: Test sprzętowca + dokończenie wdrożenia kont funkcyjnych

Stan na: 2026-06-01 — **pauza, wracamy za parę dni**

Plan kontekstowy: `Audyty/GRUPY_UZYTKOWNICY_PLAN_AND_TO_DO.MD`

---

## Punkt wejścia na powrót

Pierwsza akcja do wykonania po powrocie: **manualne utworzenie joba `lista.enforcePostingPolicy` w Firebase Console** (sekcja niżej). Bez tego sprzętowiec nie wyśle z aliasu na `lista@`.

---

## Działa (zweryfikowane)

- **Kod functions:** build + lint pass, wszystkie korekty K1–K7 z planu już w workdir (niezacommitowane — user commituje samodzielnie).
- **Deploy:** functions + hosting na prod (`morzkulc-e9df7`) wykonany przez usera.
- **Konta funkcyjne w Workspace:** `sprzetowiec@`, `szkoleniowiec@`, `skarbnik@`, `prezes@` utworzone, 2FA + backup codes zrobione (sekcje 10.4–10.5 planu).
- **Domain-wide delegation** z nowymi scopes Gmail (`gmail.settings.basic`, `gmail.settings.sharing`) — założenie z planu (sekcja 10.6).
- **Arkusz setup:** `sprzetowiec` ma wartość, pozostałe 3 funkcje (`szkoleniowiec`/`skarbnik`/`prezes`) puste — celowo, robimy test na 1 koncie.
- **`.env.morzkulc-e9df7`:** bez zmian — apka używa defaultów z `service_config.ts`, które są już prawidłowe. Weryfikacja przez gcloud niepotrzebna.

---

## Bloker do rozwiązania ręcznie: utworzenie joba `lista.enforcePostingPolicy`

Po deployu musimy odpalić jednorazowy job, żeby nowe konta funkcyjne (`sprzetowiec@`, docelowo też pozostałe 3) trafiły jako MANAGER w `lista@morzkulc.pl` — inaczej alias nie wyśle wiadomości na listę dyskusyjną.

**Decyzja:** ścieżka manualna w Firebase Console (próby przez gcloud i Node + ADC odbiły się od corporate SSL / wygasłej reauth — szczegóły niżej w „Co próbowane").

### Instrukcja (do wykonania samodzielnie)

1. Otwórz **Firebase Console** dla projektu `morzkulc-e9df7`.
2. Wejdź w **Firestore** → kolekcja `service_jobs` → **Add document**.
3. **Document ID:** `manual-lista-policy-post-rolemailbox-1`
4. Pola:

   | Field | Type | Value |
   |---|---|---|
   | `taskId` | string | `lista.enforcePostingPolicy` |
   | `payload` | map | (pusta — kliknij „add field" w mapie i nic nie dodawaj) |
   | `status` | string | `queued` |
   | `attempts` | number | `0` |
   | `createdAt` | timestamp | `now` |
   | `updatedAt` | timestamp | `now` |

5. **Save**.
6. Trigger `onServiceJobCreated` od razu podejmie joba. Po ~10–30 s w dokumencie zmieni się `status`:
   - `done` → sukces, ruszamy dalej z `sync setup` z arkusza
   - `dead` lub `queued` z polem `lastError` → coś poszło źle, do diagnozy

### Co próbowane (dla referencji technicznej)

1. **Firestore REST API z PowerShell** + `gcloud auth print-access-token` →
   gcloud (zarówno z WSL jak i natywny Windows w `C:\Program Files (x86)\Google\Cloud SDK\...`) rzuca:
   ```
   SSLError(SSLCertVerificationError(1, '[SSL: CERTIFICATE_VERIFY_FAILED] unable to get local issuer certificate'))
   ```
   Corporate proxy / Zscaler robi MITM SSL inspection, Python (gcloud) nie ma dodanego CA bundle.

2. **Node skrypt `functions/scripts/enqueueListaPolicy.js`** używający `firebase-admin` + ADC z `%APPDATA%\gcloud\application_default_credentials.json` (plik istnieje):
   - **Bez `--use-system-ca`**: Node ma identyczny SSL error co gcloud (`unable to verify the first certificate`).
   - **Z `--use-system-ca`**: SSL OK, ale ADC token zwraca `invalid_grant` / `invalid_rapt` — Workspace tenant wymaga periodycznej reauth ADC, token wygasł.

### Co trzeba zrobić żeby ścieżki B/C (automatyczne) zadziałały w przyszłości

Jeśli kiedyś będziemy chcieli to robić przez skrypt:

1. **Naprawa SSL dla gcloud:** wyeksportować Zscaler CA z Windows cert store (`certmgr.msc` → Trusted Root → eksport `.cer`/`.pem`) i ustawić `gcloud config set core/custom_ca_certs_file <path>`.
2. **Reauth ADC:** `gcloud auth application-default login --no-launch-browser` (po naprawie SSL z punktu 1) — login w przeglądarce.
3. Po obu krokach `node --use-system-ca functions/scripts/enqueueListaPolicy.js` powinien zadziałać.

---

## Do zrobienia w testowym flow (sprzętowiec)

Kolejność po rozwiązaniu blokera powyżej:

1. **`lista.enforcePostingPolicy` job** — `sprzetowiec@` zostaje MANAGER w `lista@`.
2. **`sync setup` z arkusza** (menu „Morzkulc" → „sync setup"):
   - apka ustawia auto-forward na `sprzetowiec@` → `switek.k@gmail.com`
   - wysyła mail `[Morzkulc][AKCJA]` na `zarzad@` (dla admina — instrukcja utworzenia app password)
   - wysyła mail „przygotowujemy dostęp" do `switek.k@gmail.com`
3. **Akcje admina** (user wykonuje ręcznie z maila AKCJA):
   - login na `sprzetowiec@` (2FA z telefonu admina)
   - utworzenie app password `switek-k-smtp`
   - wysłanie sobie maila z hasłem (z gotowego szablonu w mailu AKCJA)
4. **Konfiguracja „Wyślij jako"** w prywatnym Gmailu `switek.k@gmail.com`:
   - Ustawienia → Konta i import → „Dodaj inny adres"
   - Adres: `sprzetowiec@morzkulc.pl`, „Traktuj jako alias"
   - SMTP: `smtp.gmail.com:587`, login = `sprzetowiec@morzkulc.pl`, hasło = z maila admina
   - kod weryfikacyjny dochodzi przez forward → wpisać → gotowe
5. **Test wysyłki + reply:**
   - mail z `From: sprzetowiec@morzkulc.pl` na `lista@morzkulc.pl` (sprawdza policy)
   - reply ktoś inny → ma trafić z powrotem na `switek.k@gmail.com` przez forward

---

## Po pomyślnym teście (pozostałe 3 funkcje)

Powtórzyć kroki 2–5 z przyporządkowaniem:

| Funkcja | Operator (prywatny mail) |
|---|---|
| `szkoleniowiec@` | `zwirowski@gmail.com` |
| `skarbnik@` | (do uzupełnienia w arkuszu setup) |
| `prezes@` | (do uzupełnienia w arkuszu setup) |

Procedura: dopisać wartość w arkuszu setup → „sync setup" → akcje admina → konfiguracja operatora → test.

---

## Otwarte porządki (osobno, nie blokujące)

- Commity (user robi sam): zmiany kodu functions (4 pliki), nowy plan `GRUPY_UZYTKOWNICY_PLAN_AND_TO_DO.MD`, usunięty stary plan, dokumentacja `instrukcje/konta_funkcyjne_i_grupy.md`, pliki `appscript/*/env_config.gs`, czyszczenie `zrzuty ekranu/`.
- Skrypt jednorazowy `functions/scripts/enqueueListaPolicy.js` — do decyzji: zostawić jako narzędzie operacyjne czy usunąć po teście.