// public/modules/klub_module.js
import { apiGetJson } from "/core/api_client.js";
import { setHash } from "/core/router.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";
import { storageFetchKlubVideoUrl } from "/core/firebase_client.js";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

const KLUB_URL = "/api/klub";

// Zakładki modułu Klub — "Kto jest kim" przeniesione tu z boksu profilu
// (feedback użytkownika 05.09.2026): dane te i tak pochodzą z tego samego
// /api/klub, więc profil nie potrzebuje już własnej kopii (patrz render_shell.js,
// buildKlubBoxHtml — zostaje tam już tylko blok "Dokumenty i dostęp").
const KLUB_TABS = [
  { id: "klucze", label: "Klucze" },
  { id: "kto-jest-kim", label: "Kto jest kim" },
];

function escapeHtml(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
}

// Dopuszczamy tylko http(s) jako href (ochrona przed javascript: itp.).
function safeUrl(u) {
  const s = String(u || "").trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

// Numer NRB (26 cyfr) → grupy „2 + 6×4"; nieznany format pokazujemy bez zmian.
function formatNrb(raw) {
  const digits = String(raw || "").replace(/\s+/g, "");
  if (!/^\d{26}$/.test(digits)) return String(raw || "");
  return digits.slice(0, 2) + " " + (digits.slice(2).match(/.{1,4}/g) || []).join(" ");
}

function renderKluczeTable(osoby) {
  if (!osoby.length) {
    return `<p class="hint">Brak osób z przypisanymi kluczami.</p>`;
  }
  const CHECK = `<span class="kluczeCheck">✓</span>`;
  const DASH = `<span class="kluczeDash">—</span>`;
  let html = `<div class="tableWrapper"><table class="reportTable"><thead><tr><th>Osoba</th><th>Telefon</th><th>Klucze do siedziby</th><th>Dostęp akademik</th></tr></thead><tbody>`;
  for (const o of osoby) {
    html += `<tr><td>${escapeHtml(o.name)}</td><td>${o.phone ? escapeHtml(o.phone) : DASH}</td><td>${o.hasClubKeys ? CHECK : DASH}</td><td>${o.hasAkademikAccess ? CHECK : DASH}</td></tr>`;
  }
  html += `</tbody></table></div>`;
  return html;
}

function renderKtoJestKimTab(data, videoUrl) {
  const zarzad = Array.isArray(data?.zarzad) ? data.zarzad : [];
  const kr = Array.isArray(data?.kr) ? data.kr : [];

  const blocks = [];

  if (zarzad.length) {
    const rows = zarzad.map((z) => {
      const mail = String(z?.mailbox || "").trim();
      const mailLink = mail
        ? ` <a class="klubMail" href="mailto:${escapeAttr(mail)}" title="Napisz: ${escapeAttr(mail)}" aria-label="Napisz e-mail do: ${escapeAttr(mail)}">✉</a>`
        : "";
      return `<div class="mentorRow"><span class="mentorRole">${escapeHtml(z?.funkcja || "")}</span><span class="mentorName">${escapeHtml(z?.name || "—")}${mailLink}</span></div>`;
    }).join("");
    blocks.push(`<div class="profileBlock"><h3 class="profileBlockTitle">Zarząd</h3>${rows}</div>`);
  }

  if (kr.length) {
    const items = kr.map((k) => `<li>${escapeHtml(k?.name || "—")}</li>`).join("");
    blocks.push(`<div class="profileBlock"><h3 class="profileBlockTitle">Komisja rewizyjna</h3><ul class="klubList">${items}</ul></div>`);
  }

  // Film wprowadzający — pod Zarządem/KR (feedback użytkownika 05.09.2026), plik
  // video/Morzkulc_długi.mp4 w Firebase Storage (patrz storageFetchKlubVideoUrl).
  // Pomijamy całkowicie, gdy URL nie udało się rozwiązać.
  if (videoUrl) {
    blocks.push(`<div class="profileBlock">
      <h3 class="profileBlockTitle">Jak działa klub</h3>
      <video class="klubVideo" controls preload="metadata" playsinline>
        <source src="${escapeAttr(videoUrl)}" type="video/mp4">
        Twoja przeglądarka nie obsługuje odtwarzania wideo.
      </video>
    </div>`);
  }

  if (!blocks.length) return `<p class="hint">Brak danych.</p>`;
  return `<div class="klubHeaderInfo">${blocks.join("")}</div>`;
}

// Nad zakładkami, zawsze widoczne: konto klubowe + adresy (siedziba, akademik
// z kluczami) — feedback użytkownika 05.09.2026.
function renderHeaderInfo(data) {
  const konto = String(data?.finanse?.konto || "").trim();
  const bank = String(data?.finanse?.bank || "").trim();
  // Stany finansowe przychodzą z serwera TYLKO dla KR/Zarządu (inaczej pola brak).
  const hasFinance = data?.finanse?.stanKonta !== undefined;
  const siedziba = String(data?.adresy?.siedziba || "").trim();
  const akademik = String(data?.adresy?.akademik || "").trim();

  const blocks = [];

  if (konto || bank || hasFinance) {
    const kontoRaw = konto.replace(/\s+/g, "");
    const line = `${bank ? `<strong>${escapeHtml(bank)}:</strong> ` : ""}${konto ? `<span class="klubKontoNr" id="klubKontoNr">${escapeHtml(formatNrb(konto))}</span>` : ""}`;
    const kontoLine = (konto || bank) ? `<div class="klubKonto"><span class="klubKontoLine">${line}</span>${
      konto ? `<button type="button" class="ghost klubCopyBtn" data-klub-copy="${escapeAttr(kontoRaw)}">Kopiuj</button>` : ""
    }</div>` : "";
    const finanse = hasFinance ? `<div class="klubFinanse">
      <div class="klubFinRow"><span>Stan konta:</span> <strong>${escapeHtml(String(data.finanse.stanKonta || "0"))} zł</strong></div>
      <div class="klubFinRow"><span>Stan gotówki:</span> <strong>${escapeHtml(String(data.finanse.stanGotowki || "0"))} zł</strong></div>
    </div>` : "";
    blocks.push(`<div class="profileBlock"><h3 class="profileBlockTitle">Konto klubowe</h3>${kontoLine}${finanse}</div>`);
  }

  if (siedziba || akademik) {
    blocks.push(`<div class="profileBlock">
      ${siedziba ? `<div class="mentorRow"><span class="mentorRole">Siedziba</span><span class="mentorName">${escapeHtml(siedziba)}</span></div>` : ""}
      ${akademik ? `<div class="mentorRow"><span class="mentorRole">Akademik (klucze)</span><span class="mentorName">${escapeHtml(akademik)}</span></div>` : ""}
    </div>`);
  }

  if (!blocks.length) return "";
  return `<div class="klubHeaderInfo">${blocks.join("")}</div>`;
}

function wireCopyButtons(root) {
  root.querySelectorAll("[data-klub-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const val = btn.getAttribute("data-klub-copy") || "";
      try {
        await navigator.clipboard.writeText(val);
        const old = btn.textContent;
        btn.textContent = "Skopiowano ✓";
        btn.disabled = true;
        setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1500);
      } catch {
        // Schowek niedostępny — zaznacz numer do ręcznego skopiowania.
        const nr = root.querySelector("#klubKontoNr");
        if (nr) {
          const range = document.createRange();
          range.selectNodeContents(nr);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    });
  });
}

export function createKlubModule({ id, type, label, defaultRoute, order, enabled, access }) {
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
        viewEl.innerHTML = `<div class="card center"><h2>${escapeHtml(label)}</h2><p>Brak tokenu sesji. Odśwież stronę.</p></div>`;
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

          <div id="klubHeaderInfo"><p class="hint">Ładuję…</p></div>

          <div class="klubTabs" role="tablist">
            ${KLUB_TABS.map((tab, idx) => `
              <button
                type="button"
                class="klubTab${idx === 0 ? " active" : ""}"
                data-klub-tab="${escapeAttr(tab.id)}"
                aria-pressed="${idx === 0 ? "true" : "false"}"
              >${escapeHtml(tab.label)}</button>
            `).join("")}
          </div>

          <div id="klubTabBody"></div>
        </div>
      `;

      viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => setHash("home", "home"));
      viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => setHash("home", "home"));

      const headerEl = viewEl.querySelector("#klubHeaderInfo");
      const tabBodyEl = viewEl.querySelector("#klubTabBody");
      let activeTab = KLUB_TABS[0].id;
      let data = null;
      let videoUrl = null;

      const renderActiveTab = () => {
        if (activeTab === "klucze") {
          const osoby = Array.isArray(data?.kluczeOsoby) ? data.kluczeOsoby : [];
          tabBodyEl.innerHTML = renderKluczeTable(osoby);
        } else {
          tabBodyEl.innerHTML = renderKtoJestKimTab(data, videoUrl);
        }
      };

      viewEl.querySelectorAll("[data-klub-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeTab = btn.getAttribute("data-klub-tab");
          viewEl.querySelectorAll("[data-klub-tab]").forEach((b) => {
            const isActive = b === btn;
            b.classList.toggle("active", isActive);
            b.setAttribute("aria-pressed", isActive ? "true" : "false");
          });
          renderActiveTab();
        });
      });

      try {
        // storageFetchKlubVideoUrl() nigdy nie odrzuca obietnicy (własny try/catch →
        // null), więc Promise.all może się nie powieść tylko z powodu apiGetJson —
        // zachowanie catch-bloku poniżej bez zmian względem stanu przed dodaniem wideo.
        const [klubData, klubVideoUrl] = await Promise.all([
          apiGetJson({ url: KLUB_URL, idToken: ctx.idToken }),
          storageFetchKlubVideoUrl(),
        ]);
        data = klubData;
        videoUrl = klubVideoUrl;
        headerEl.innerHTML = renderHeaderInfo(data) || "";
        wireCopyButtons(headerEl);
        renderActiveTab();
      } catch (e) {
        const msg = escapeHtml(mapUserFacingApiError(e, "Nie udało się pobrać informacji o klubie."));
        headerEl.innerHTML = "";
        tabBodyEl.innerHTML = `<p class="err">${msg}</p>`;
      }
    },
  };
}
