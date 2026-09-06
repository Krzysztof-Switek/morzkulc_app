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
  {
    id: "klucze",
    label: "Klucze",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>`,
  },
  {
    id: "kto-jest-kim",
    label: "Kto jest kim",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  },
];

// Kafelek "Gdzie pływamy" — duplikat tego z modułu Ranking/km_module.js (tam
// jako zakładka otwierająca /map.html) — feedback użytkownika 05.09.2026:
// ten sam skrót ma być dostępny też z sekcji Klub, bez przechodzenia przez ranking.
const MAP_TILE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`;

// Ten sam wzorzec otwierania mapy co w render_shell.js (kafelek "mapa" na
// stronie głównej) i km_module.js::openMap().
function openMap() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  // ?cb=1 jednorazowo wymusza pominięcie starych, już zapisanych na urządzeniach
  // kopii /map.html sprzed dodania nagłówka no-store (05.09.2026, firebase.json).
  const mapUrl = "/map.html?cb=1";
  if (isStandalone) {
    window.location.href = mapUrl;
  } else {
    window.open(mapUrl, "_blank", "noopener");
  }
}

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

          <div class="klubTileGrid" role="tablist">
            ${KLUB_TABS.map((tab, idx) => `
              <button
                type="button"
                class="klubTile${idx === 0 ? " active" : ""}"
                data-klub-tab="${escapeAttr(tab.id)}"
                aria-pressed="${idx === 0 ? "true" : "false"}"
                title="${escapeAttr(tab.label)}"
              >${tab.icon}<span class="klubTileTitle">${escapeHtml(tab.label)}</span></button>
            `).join("")}
            <button type="button" class="klubTile" data-klub-action="mapa" title="Gdzie pływamy">${MAP_TILE_ICON}<span class="klubTileTitle">Gdzie pływamy</span></button>
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

      viewEl.querySelector("[data-klub-action='mapa']")?.addEventListener("click", openMap);

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
