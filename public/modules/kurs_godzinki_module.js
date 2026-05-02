// public/modules/kurs_godzinki_module.js

const REGULAMIN_URL = "https://drive.google.com/file/d/1XLDgcoCsj7Xt7FVToFk0gR2fy4yC40nQ/view?usp=drive_link";

const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

function renderKursGodzinki(viewEl) {
  const regulaminHtml = REGULAMIN_URL
    ? `<a href="${REGULAMIN_URL}" target="_blank" rel="noopener" class="kursLink">Regulamin godzinek →</a>`
    : "";

  viewEl.innerHTML = `
    <div class="card">
      <div class="kursHeader">
        <h2>Godzinki</h2>
        <div class="moduleNav">
          <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
        </div>
      </div>

      <p>Godzinki to klubowa waluta za aktywność i pracę na rzecz Morzkulca.</p>
      <p>Dostajesz je m.in. za pomoc przy sprzęcie, imprezach, basenie, szkoleniach i działaniach organizacyjnych. Zgłoszone godzinki muszą zostać zatwierdzone przez Zarząd.</p>
      <p>Godzinki mogą być też ujemne — np. po wypożyczeniu sprzętu lub skorzystaniu z klubowych zasobów. Dodatnie saldo i aktywność klubowa mogą być brane pod uwagę przy dofinansowaniach, pierwszeństwie udziału w działaniach klubu oraz sprawach organizacyjnych.</p>
      <p>Godzinki mają termin ważności i po czasie mogą wygasać. Do głosowania na Walnym wymagane jest dodatnie saldo godzinek.</p>

      <div class="kursGodzinkiPrzyklad">
        <h3>Przykład</h3>
        <dl class="kursInfoDl">
          <dt>Saldo</dt><dd>+2h</dd>
          <dt>Oczekuje na akceptację</dt><dd>+3h</dd>
          <dt>Wygasa najbliżej</dt><dd>12.2028</dd>
        </dl>
      </div>

      ${regulaminHtml ? `<div class="kursGodzinkiRegulamin">${regulaminHtml}</div>` : ""}
    </div>
  `;

  viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => {
    window.location.hash = "#home/home";
  });
}

// ─── Module ───────────────────────────────────────────────────────────────────

export function createKursGodzinkiModule({ id, type, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    type,
    label,
    defaultRoute,
    order,
    enabled,
    access,

    async render({ viewEl }) {
      renderKursGodzinki(viewEl);
    },
  };
}
