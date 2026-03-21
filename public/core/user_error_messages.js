export function parseApiErrorMessage(error) {
  if (!error) return null;

  const raw = String(error?.message || error || "").trim();
  if (!raw) return null;

  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    const tail = raw.slice(jsonStart).trim();

    try {
      const parsed = JSON.parse(tail);
      return {
        code: typeof parsed?.code === "string" ? parsed.code : "",
        message: typeof parsed?.message === "string" ? parsed.message : raw,
        details: parsed?.details || null
      };
    } catch {
      // lecimy dalej do fallbacku tekstowego
    }
  }

  if (typeof error === "object" && error !== null) {
    return {
      code: typeof error.code === "string" ? error.code : "",
      message: typeof error.message === "string" ? error.message : raw,
      details: error.details || null
    };
  }

  return {
    code: "",
    message: raw,
    details: null
  };
}

function joinPrefix(prefix, message) {
  const p = String(prefix || "").trim();
  const m = String(message || "").trim();

  if (!p) return m;
  if (!m) return p;
  return `${p} ${m}`;
}

export function mapUserFacingApiError(error, fallbackPrefix = "") {
  const parsed = parseApiErrorMessage(error);
  const code = String(parsed?.code || "").trim();
  const details = parsed?.details || null;

  switch (code) {
    case "cancel_blocked":
      return joinPrefix(
        fallbackPrefix,
        "Nie możesz już anulować tej rezerwacji. Anulacja jest możliwa tylko przed rozpoczęciem okresu blokady (offsetu). Po jego rozpoczęciu możesz skrócić rezerwację tylko do pierwszego dnia i tylko jeśli ten dzień jeszcze trwa. Jeśli to już niemożliwe, skontaktuj się z Zarządem."
      );

    case "update_blocked":
      return joinPrefix(
        fallbackPrefix,
        "Nie możesz już zmienić tej rezerwacji w ten sposób. Po rozpoczęciu okresu blokady (offsetu) możesz skrócić rezerwację tylko do pierwszego dnia i tylko jeśli ten dzień jeszcze trwa."
      );

    case "conflict":
      return joinPrefix(
        fallbackPrefix,
        "Wybrany kajak nie jest dostępny w tym terminie. Zmień daty albo wybierz inny sprzęt."
      );

    case "max_items_exceeded":
      return joinPrefix(
        fallbackPrefix,
        "Przekroczono maksymalną liczbę kajaków, które możesz mieć zarezerwowane w tym samym czasie."
      );

    case "max_time_exceeded": {
      const maxWeeks = Number(details?.maxWeeks || 0);
      const msg = maxWeeks > 0
        ? `Przekroczono maksymalny czas rezerwacji dla Twojej roli. Maksymalnie możesz zarezerwować sprzęt na ${maxWeeks} tyg.`
        : "Przekroczono maksymalny czas rezerwacji dla Twojej roli.";
      return joinPrefix(fallbackPrefix, msg);
    }

    case "forbidden":
      return joinPrefix(
        fallbackPrefix,
        "Nie masz uprawnień do wykonania tej operacji."
      );

    case "not_found":
      return joinPrefix(
        fallbackPrefix,
        "Nie znaleziono tej rezerwacji."
      );

    case "invalid_state":
      return joinPrefix(
        fallbackPrefix,
        "Tej rezerwacji nie można już zmienić ani anulować."
      );

    case "validation_failed":
      return joinPrefix(
        fallbackPrefix,
        "Dane rezerwacji są nieprawidłowe. Sprawdź daty i spróbuj ponownie."
      );

    case "no_items":
      return joinPrefix(
        fallbackPrefix,
        "Nie wybrano żadnego kajaka."
      );

    case "bad_request":
      return joinPrefix(
        fallbackPrefix,
        "Nie udało się wykonać tej operacji z powodu nieprawidłowych danych."
      );

    default: {
      const fallbackMessage = String(parsed?.message || "").trim();
      if (!fallbackMessage) {
        return joinPrefix(fallbackPrefix, "Wystąpił błąd. Spróbuj ponownie.");
      }

      if (fallbackMessage.startsWith("HTTP ")) {
        return joinPrefix(fallbackPrefix, "Wystąpił błąd. Spróbuj ponownie.");
      }

      return joinPrefix(fallbackPrefix, fallbackMessage);
    }
  }
}
