/**
 * Orchestrator wypożyczania / rezerwacji – łączy logikę sprzętu i użytkowników.
 * Szczegółowe reguły: rental_equipment_rules.gs, rental_user_rules.gs
 */

/*********************************************************************
 * Rent API (retry)
 *********************************************************************/
function rentItem(type, id, user, start, end) {

  if (!type || !id) return { error: "Brak parametrów: type, id." };

  var userCtx = getUserContext(user);

  if (userCtx.role === "no_access") return { error: "Brak dostępu." };
  if (userCtx.role === "gosc") return { error: "Tryb podglądu — nie można wypożyczać." };
  if (!userCtx.limits || userCtx.limits.maxItems <= 0) {
    return { error: "Twoja rola nie pozwala na wypożyczanie sprzętu." };
  }

  const MAX_RETRIES = 3;
  for (var i = 0; i < MAX_RETRIES; i++) {
    var res = tryRentOnce_(type, id, userCtx, start, end);
    if (res && res.conflict) {
      Utilities.sleep(50);
      continue;
    }
    return res;
  }

  return { error: "Sprzęt zmieniony przez innego użytkownika. Spróbuj ponownie." };
}

/*********************************************************************
 * Reserve API (retry)
 *********************************************************************/
function reserveItem(type, id, user, start, end) {

  if (!type || !id) return { error: "Brak parametrów." };
  var userCtx = getUserContext(user);

  if (userCtx.role === "no_access") return { error: "Brak dostępu." };
  if (userCtx.role === "gosc") return { error: "Tryb podglądu." };
  if (!userCtx.limits || userCtx.limits.maxItems <= 0) return { error: "Rola nie pozwala na rezerwacje." };

  const MAX_RETRIES = 3;
  for (var i = 0; i < MAX_RETRIES; i++) {
    var res = tryReserveOnce_(type, id, userCtx, start, end);
    if (res && res.conflict) {
      Utilities.sleep(50);
      continue;
    }
    return res;
  }

  return { error: "Sprzęt zmieniony przez innego użytkownika. Spróbuj ponownie." };
}

/*********************************************************************
 * Return API (retry)
 *********************************************************************/
function returnItem(type, id) {

  const MAX_RETRIES = 3;
  for (var i = 0; i < MAX_RETRIES; i++) {
    var res = tryReturnOnce_(type, id);
    if (res && res.conflict) {
      Utilities.sleep(50);
      continue;
    }
    return res;
  }

  return { error: "Sprzęt zmieniony przez innego użytkownika." };
}

/*********************************************************************
 * TEST
 *********************************************************************/
function testRentItemBroken() {
  var r = rentItem("kayak", "2", "", "", "");
  Logger.log(JSON.stringify(r, null, 2));
}
