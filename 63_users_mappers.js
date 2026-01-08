/********************************************************************
 * users_mappers.gs
 ********************************************************************/
function mapUserDocument(doc) {
  if (!doc || !doc.fields) return null;

  const f = doc.fields;

  const email    = _strSafe(f, "email");
  const imie     = _strSafe(f, "imie");
  const nazwisko = _strSafe(f, "nazwisko");
  const ksywa    = _strSafe(f, "ksywa");

  const rola =
    _strSafe(f, "rola") ||
    _strSafe(f, "role") ||
    "";

  const status = _strSafe(f, "status") || "";

  let id = _strSafe(f, "id");
  if (!id && doc.name) {
    const parts = String(doc.name).split("/");
    id = parts[parts.length - 1] || "";
  }

  return {
    email,
    imie,
    nazwisko,
    ksywa,
    rola,
    role: rola,
    status,
    id
  };
}

function _strSafe(fields, key) {
  if (!fields || !fields[key]) return "";
  return fields[key].stringValue || "";
}
