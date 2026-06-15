import { apiGetJson, apiPostJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";
import { setHash } from "/core/router.js";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

const ADMIN_PENDING_URL = "/api/admin/pending";
const ADMIN_SYNC_CALENDAR_URL = "/api/admin/events/sync-calendar";
const ADMIN_APPROVE_URL = "/api/admin/approve";
const ADMIN_REJECT_URL = "/api/admin/reject";

export function createAdminPendingModule({ id, type, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    type,
    label,
    defaultRoute,
    order,
    enabled,
    access,

    async render({ viewEl, ctx }) {
      if (!ctx?.idToken) {
        viewEl.innerHTML = `
          <div class="card center">
            <h2>${escapeHtml(label)}</h2>
            <p>Brak tokenu sesji. Odśwież stronę.</p>
          </div>
        `;
        return;
      }

      viewEl.innerHTML = `
        <div class="card wide">
          <div class="moduleHeader">
            <h2>${escapeHtml(label)}</h2>
            <div class="moduleNav">
              <button type="button" class="moduleNavBtn" data-mod-back title="Wróć">${NAV_BACK_SVG}</button>
              <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
            </div>
          </div>

          <div class="actions" style="margin-top:12px;display:flex;align-items:center;gap:8px;">
            <button id="adminPendingReloadBtn" type="button" class="moduleNavBtn" title="Odśwież dane"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.79"/></svg></button>
            <button id="adminSyncCalendarBtn" type="button">Synchronizuj zatwierdzenia (arkusze + kalendarz)</button>
            <span style="color:var(--text-muted);cursor:help;display:flex;align-items:center;" title="Zatwierdzanie odbywa się w arkuszu Google — poniżej lista oczekujących pozycji. Zatwierdzenia i korekty z arkuszy są pobierane automatycznie codziennie rano (imprezy ok. 04:45, godzinki ok. 05:15, kalendarz 05:00). Przycisk wymusza natychmiastowy sync godzinek, imprez i kalendarza."><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>
          </div>
          <div id="adminCalendarMsg" class="hint hidden" style="margin-top:8px;"></div>

          <div id="adminPendingErr" class="err hidden" style="margin-top:12px;"></div>
          <div id="adminPendingContent" style="margin-top:16px;"></div>
        </div>
      `;

      viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => setHash("home", "home"));
      viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => setHash("home", "home"));

      const errEl = viewEl.querySelector("#adminPendingErr");
      const contentEl = viewEl.querySelector("#adminPendingContent");
      const reloadBtn = viewEl.querySelector("#adminPendingReloadBtn");

      const setErr = (msg) => {
        errEl.textContent = String(msg || "");
        errEl.classList.toggle("hidden", !errEl.textContent);
      };

      const calendarMsgEl = viewEl.querySelector("#adminCalendarMsg");
      const syncCalendarBtn = viewEl.querySelector("#adminSyncCalendarBtn");
      syncCalendarBtn.addEventListener("click", async () => {
        syncCalendarBtn.disabled = true;
        calendarMsgEl.textContent = "Kolejkuję synchronizację...";
        calendarMsgEl.classList.remove("hidden");
        try {
          await apiPostJson({url: ADMIN_SYNC_CALENDAR_URL, idToken: ctx.idToken, body: {}});
          calendarMsgEl.textContent = "Synchronizacja zakolejkowana (godzinki + imprezy + kalendarz). Odśwież listę za chwilę.";
        } catch (e) {
          calendarMsgEl.textContent = "Błąd: " + mapUserFacingApiError(e, "Nie udało się zakolejkować synchronizacji.");
        } finally {
          syncCalendarBtn.disabled = false;
        }
      });

      const renderContent = (data) => {
        const godzinki = data?.godzinki || { count: 0, items: [] };
        const godzinkiRejected = data?.godzinkiRejected || { count: 0, items: [] };
        const events = data?.events || { count: 0, items: [] };
        const emailIssues = data?.privateKayakEmailIssues || { count: 0, items: [] };
        const unpaidContributions = data?.privateKayakUnpaidContributions || { count: 0, items: [] };
        const deadJobs = data?.deadJobs || { count: 0, items: [] };
        const failedCharges = data?.failedStorageCharges || { count: 0, items: [] };
        const gearSync = data?.gearSync || { hasWarnings: false, perCategory: [], totals: {}, ranAt: null, error: null };
        const godzinkiSheetUrl = data?.meta?.godzinkiSheetUrl || null;

        let html = "";

        // Sekcja: ostrzeżenia synchronizacji sprzętu (duplikaty ID / pominięte wiersze).
        // Widoczna tylko gdy raport sygnalizuje problem — inaczej nie zaśmieca panelu.
        if (gearSync.hasWarnings) {
          const t = gearSync.totals || {};
          const ranStr = gearSync.ranAt ? formatDatePL(gearSync.ranAt.slice(0, 10)) : "—";
          html += `<div style="border:1px solid var(--border);border-left:4px solid #c0392b;border-radius:8px;padding:12px;margin-bottom:20px;background:rgba(192,57,43,0.05);">`;
          html += `<h3 style="margin:0 0 6px;">🛠️ Sprzęt — ostrzeżenia synchronizacji</h3>`;
          html += `<p class="hint" style="margin:0 0 10px;">Ostatni sync sprzętu: ${escapeHtml(ranStr)} · w arkuszu: ${escapeHtml(String(t.sheetRows ?? "—"))} · dodane/zmienione: ${escapeHtml(String(t.upserted ?? "—"))} · zduplikowane ID: ${escapeHtml(String(t.duplicateId ?? 0))}.</p>`;
          for (const cat of (gearSync.perCategory || [])) {
            html += `<div style="margin-bottom:10px;"><strong>${escapeHtml(cat.label || cat.key)}</strong> (${escapeHtml(String(cat.sheetRows))} w arkuszu, ${escapeHtml(String(cat.upserted))} w aplikacji)`;
            if (cat.duplicates?.length) {
              html += `<div class="hint" style="margin:4px 0;">Zduplikowane ID — pominięte (pierwsza sztuka została; nadaj unikalne ID i zsynchronizuj ponownie):</div>`;
              html += `<ul style="margin:0;padding-left:18px;">`;
              for (const d of cat.duplicates) {
                const numModel = [d.number, d.model].filter(Boolean).join(" ");
                html += `<li style="font-size:13px;">ID <strong>${escapeHtml(d.id)}</strong>${numModel ? ` — ${escapeHtml(numModel)}` : ""}${d.rowNumber ? ` (wiersz ${escapeHtml(d.rowNumber)})` : ""}</li>`;
              }
              html += `</ul>`;
            }
            const skips = [];
            if (cat.skippedNoId) skips.push(`bez ID: ${cat.skippedNoId}`);
            if (cat.skippedNotReal) skips.push(`niekompletne (brak numeru/producenta/modelu): ${cat.skippedNotReal}`);
            if (skips.length) html += `<div class="hint" style="margin:4px 0;">Pominięte wiersze — ${escapeHtml(skips.join(" · "))}.</div>`;
            html += `</div>`;
          }
          html += `</div>`;
        } else if (gearSync.error) {
          html += `<p class="err" style="margin-bottom:16px;">Sprzęt — ostrzeżenia synchronizacji: ${escapeHtml(gearSync.error)}</p>`;
        }

        // Sekcja godzinki
        html += `<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:8px;">`;
        html += `<h3 style="margin:0;">Godzinki do zatwierdzenia (${escapeHtml(String(godzinki.count))})</h3>`;
        if (godzinkiSheetUrl) {
          html += `<a href="${escapeHtml(godzinkiSheetUrl)}" target="_blank" rel="noopener" style="font-size:13px;font-weight:600;">→ Otwórz arkusz</a>`;
        }
        html += `</div>`;
        const godzinkiPending = godzinki.pending || [];
        if (godzinki.error) {
          html += `<p class="err" style="margin-bottom:20px;">${escapeHtml(godzinki.error)}</p>`;
        } else if (!godzinkiPending.length) {
          html += `<p class="hint" style="margin-bottom:20px;">Brak oczekujących.</p>`;
        } else {
          html += `<div style="margin:0 0 20px;">`;
          for (const item of godzinkiPending) {
            const label = item.type === "purchase" ? "wykup salda ujemnego" : "godzinki";
            const reason = item.reason ? ` — „${escapeHtml(item.reason)}”` : "";
            html += `
              <div class="gearCard" style="margin-bottom:8px;">
                <div class="gearCardInner">
                  <div class="gearHead" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div class="gearTitleWrap">
                      <div class="gearTitle">${escapeHtml(item.displayName)} — ${escapeHtml(String(item.amount))} h</div>
                      <div class="gearSubtitle">${escapeHtml(label)}${reason}</div>
                    </div>
                    <div style="display:flex;gap:6px;flex-shrink:0;">
                      <button type="button" class="approveBtn" data-approve="godzinki" data-id="${escapeHtml(item.id)}">Zatwierdź</button>
                      <button type="button" class="rejectBtn" data-reject="godzinki" data-id="${escapeHtml(item.id)}">Odrzuć</button>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }
          html += `</div>`;
        }

        // Sekcja: odmowy zatwierdzenia godzinek (sync odmówił mimo TAK w arkuszu)
        if (godzinkiRejected.items?.length) {
          html += `<h3 style="margin:0 0 8px;">Godzinki — odmowy zatwierdzenia (${escapeHtml(String(godzinkiRejected.count))})</h3>`;
          html += `<p class="hint" style="margin:0 0 8px;">Sync nie mógł zatwierdzić poniższych pozycji — popraw dane w arkuszu (np. datę pracy) albo odrzuć zgłoszenie.</p>`;
          html += `<ul style="margin:0 0 20px;padding:0;list-style:none;display:grid;gap:2px;">`;
          for (const item of godzinkiRejected.items) {
            const label = item.type === "purchase" ? "wykup" : "godzinki";
            html += `<li style="font-size:14px;padding:6px 0;border-bottom:1px solid var(--border);"><strong>${escapeHtml(item.displayName)}</strong> — ${escapeHtml(String(item.amount))} h (${escapeHtml(label)}): ${escapeHtml(item.message || item.code || "odmowa")}</li>`;
          }
          html += `</ul>`;
        }

        // Sekcja imprezy
        html += `<h3 style="margin:0 0 8px;">Imprezy do zatwierdzenia (${escapeHtml(String(events.count))})</h3>`;
        if (events.error) {
          html += `<p class="err" style="margin-bottom:20px;">${escapeHtml(events.error)}</p>`;
        } else if (!events.items?.length) {
          html += `<p class="hint" style="margin-bottom:20px;">Brak oczekujących.</p>`;
        } else {
          html += `<div style="margin-bottom:20px;">`;
          for (const item of events.items) {
            const startStr = item.startDate ? formatDatePL(item.startDate) : "—";
            const endStr = item.endDate ? formatDatePL(item.endDate) : "—";
            const dateStr = item.createdAt ? formatDatePL(item.createdAt.slice(0, 10)) : "—";
            html += `
              <div class="gearCard" style="margin-bottom:8px;">
                <div class="gearCardInner">
                  <div class="gearHead" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div class="gearTitleWrap">
                      <div class="gearTitle">${escapeHtml(item.name || "—")}</div>
                      <div class="gearSubtitle">
                        ${escapeHtml(startStr)} – ${escapeHtml(endStr)}
                        · zgłosił: ${escapeHtml(item.userEmail || "—")}
                        · ${escapeHtml(dateStr)}
                      </div>
                    </div>
                    <div style="display:flex;gap:6px;flex-shrink:0;">
                      <button type="button" class="approveBtn" data-approve="event" data-id="${escapeHtml(item.id)}">Zatwierdź</button>
                      <button type="button" class="rejectBtn" data-reject="event" data-id="${escapeHtml(item.id)}">Odrzuć</button>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }
          html += `</div>`;
        }

        // Sekcja: prywatne kajaki — problem z emailem właściciela
        html += `<h3 style="margin:0 0 8px;">Prywatne kajaki — problem z emailem właściciela (${escapeHtml(String(emailIssues.count))})</h3>`;
        if (!emailIssues.items?.length) {
          html += `<p class="hint" style="margin-bottom:20px;">Brak problemów.</p>`;
        } else {
          html += `<div style="margin-bottom:20px;">`;
          for (const item of emailIssues.items) {
            html += `
              <div class="gearCard" style="margin-bottom:8px;">
                <div class="gearCardInner">
                  <div class="gearHead">
                    <div class="gearTitleWrap">
                      <div class="gearTitle">Kajak ${escapeHtml(item.number || item.kayakId || "—")}</div>
                      <div class="gearSubtitle">
                        ${escapeHtml(item.reason)}
                        ${item.ownerContact ? ` · email: ${escapeHtml(item.ownerContact)}` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }
          html += `</div>`;
        }

        // Sekcja: właściciele prywatnych kajaków — możliwe zaległości składkowe
        html += `<h3 style="margin:0 0 8px;">Prywatne kajaki — możliwe zaległości składkowe (${escapeHtml(String(unpaidContributions.count))})</h3>`;
        if (!unpaidContributions.items?.length) {
          html += `<p class="hint">Brak zaległości.</p>`;
        } else {
          html += `<div>`;
          for (const item of unpaidContributions.items) {
            const contributionsLabel = item.contributions ? `składki: ${escapeHtml(item.contributions)}` : "brak danych o składkach";
            html += `
              <div class="gearCard" style="margin-bottom:8px;">
                <div class="gearCardInner">
                  <div class="gearHead">
                    <div class="gearTitleWrap">
                      <div class="gearTitle">Kajak ${escapeHtml(item.number || item.kayakId || "—")} — ${escapeHtml(item.ownerName || item.ownerContact || "—")}</div>
                      <div class="gearSubtitle">
                        ${escapeHtml(item.ownerContact)} · ${contributionsLabel}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }
          html += `</div>`;
        }

        // Sekcja: martwe service joby
        html += `<h3 style="margin:16px 0 8px;">Martwe service joby (${escapeHtml(String(deadJobs.count))})</h3>`;
        if (!deadJobs.items?.length) {
          html += `<p class="hint" style="margin-bottom:20px;">Brak.</p>`;
        } else {
          html += `<div style="margin-bottom:20px;">`;
          for (const item of deadJobs.items) {
            const dateStr = item.updatedAt ? formatDatePL(item.updatedAt.slice(0, 10)) : "—";
            html += `
              <div class="gearCard" style="margin-bottom:8px;">
                <div class="gearCardInner">
                  <div class="gearHead">
                    <div class="gearTitleWrap">
                      <div class="gearTitle">${escapeHtml(item.taskId || item.id || "—")}</div>
                      <div class="gearSubtitle">
                        ${escapeHtml(String(item.attempts))} prób
                        · ${escapeHtml(dateStr)}
                        ${item.lastErrorMessage ? ` · błąd: ${escapeHtml(item.lastErrorMessage)}` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }
          html += `</div>`;
        }

        // Sekcja: nieudane naliczenia za sprzęt prywatny
        html += `<h3 style="margin:0 0 8px;">Nieudane naliczenia za sprzęt prywatny (${escapeHtml(String(failedCharges.count))})</h3>`;
        if (!failedCharges.items?.length) {
          html += `<p class="hint">Brak.</p>`;
        } else {
          html += `<div>`;
          for (const item of failedCharges.items) {
            const dateStr = item.createdAt ? formatDatePL(item.createdAt.slice(0, 10)) : "—";
            html += `
              <div class="gearCard" style="margin-bottom:8px;">
                <div class="gearCardInner">
                  <div class="gearHead">
                    <div class="gearTitleWrap">
                      <div class="gearTitle">${escapeHtml(item.billingMonth || "—")} — kajak ${escapeHtml(item.kayakId || "—")}</div>
                      <div class="gearSubtitle">
                        ${escapeHtml(item.ownerContact || "—")}
                        · ${escapeHtml(item.message || "—")}
                        · ${escapeHtml(dateStr)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }
          html += `</div>`;
        }

        contentEl.innerHTML = html;
      };

      const load = async () => {
        setErr("");
        contentEl.innerHTML = `<p class="hint">Ładuję...</p>`;
        try {
          const data = await apiGetJson({ url: ADMIN_PENDING_URL, idToken: ctx.idToken });
          renderContent(data);
        } catch (e) {
          setErr(mapUserFacingApiError(e, "Nie udało się pobrać danych."));
          contentEl.innerHTML = "";
        }
      };

      // Delegowana obsługa przycisków Zatwierdź/Odrzuć (contentEl trwa między
      // przeładowaniami — podmieniane jest tylko innerHTML).
      const KIND_LABEL = { godzinki: "godzinkę", event: "imprezę" };
      contentEl.addEventListener("click", async (ev) => {
        const approveBtn = ev.target.closest?.("[data-approve]");
        const rejectBtn = ev.target.closest?.("[data-reject]");
        const btn = approveBtn || rejectBtn;
        if (!btn) return;

        const isApprove = Boolean(approveBtn);
        const kind = btn.getAttribute(isApprove ? "data-approve" : "data-reject");
        const id = btn.getAttribute("data-id");
        if (!kind || !id) return;

        if (!isApprove) {
          if (!window.confirm(`Odrzucić ${KIND_LABEL[kind] || "pozycję"}? Zostanie oznaczona jako ODRZUCONA w arkuszu.`)) return;
        }

        setErr("");
        // Zablokuj wszystkie przyciski tej karty na czas żądania
        const card = btn.closest(".gearCard");
        card?.querySelectorAll("button").forEach((b) => { b.disabled = true; });

        try {
          await apiPostJson({
            url: isApprove ? ADMIN_APPROVE_URL : ADMIN_REJECT_URL,
            idToken: ctx.idToken,
            body: { kind, id },
          });
          await load();
        } catch (e) {
          // Odmowy merytoryczne zatwierdzenia (422) niosą czytelny komunikat PL.
          setErr(mapUserFacingApiError(e, isApprove ? "Nie udało się zatwierdzić." : "Nie udało się odrzucić."));
          card?.querySelectorAll("button").forEach((b) => { b.disabled = false; });
        }
      });

      reloadBtn.addEventListener("click", load);
      await load();
    }
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDatePL(iso) {
  const s = String(iso || "").trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
  const [yyyy, mm, dd] = s.split("-");
  return `${dd}.${mm}.${yyyy}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
