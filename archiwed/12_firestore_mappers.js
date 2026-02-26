/************************************************************
 * 30_firestore_mappers.gs
 * Mapery dokumentów Firestore → obiekty JS
 * Wersja 2025 – kompletna, bezpieczna, 1:1 kompatybilna
 ************************************************************/


/************************************************************
 * SAFE EXTRACTORS – odporne na brak pól
 ************************************************************/

function _strSafe(f, name) {
  if (!f || !f[name]) return "";
  const v = f[name];
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return String(v.integerValue);
  if (v.doubleValue !== undefined) return String(v.doubleValue);
  if (v.booleanValue !== undefined) return String(v.booleanValue);
  return "";
}

function _boolSafe(f, name, def) {
  if (!f || !f[name]) return def;
  const v = f[name];
  if (typeof v.booleanValue === "boolean") return v.booleanValue;
  if (v.stringValue === "true") return true;
  if (v.stringValue === "false") return false;
  return def;
}

function _tsSafe(f, name) {
  if (!f || !f[name]) return "";
  return timestampToIso(f[name]) || "";
}


/************************************************************
 * Stare helpery – pozostają dla kompatybilności
 ************************************************************/

function _str(f, name) {
  if (!f || !f[name]) return "";
  if (f[name].stringValue !== undefined) return f[name].stringValue;
  return "";
}

function _bool(f, name, def) {
  if (!f || !f[name]) return def;
  if (typeof f[name].booleanValue === "boolean") return f[name].booleanValue;
  return def;
}

function _ts(f, name) {
  if (!f[name]) return "";
  return timestampToIso(f[name]) || "";
}


/************************************************************
 * MAPER: setup
 ************************************************************/
function mapSetupDocument(doc) {
  const f = doc.fields || {};
  const id = doc.name.split("/").pop();

  let value = null;
  if (f.value) {
    if (f.value.stringValue !== undefined) value = f.value.stringValue;
    if (f.value.integerValue !== undefined) value = Number(f.value.integerValue);
    if (f.value.booleanValue !== undefined) value = f.value.booleanValue;
    if (f.value.nullValue !== undefined) value = null;
  }

  return { name: id, value: value };
}


/************************************************************
 * MAPERY SPRZĘTU
 ************************************************************/

/*********************
 * KAJAKI
 *********************/
function mapKayakDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numerKajaka:    _strSafe(f,'numerKajaka'),
    producent:      _strSafe(f,'producent'),
    model:          _strSafe(f,'model'),
    zdjecieUrl:     _strSafe(f,'zdjecieUrl'),
    kolor:          _strSafe(f,'kolor'),
    typ:            _strSafe(f,'typ'),
    litrow:         _strSafe(f,'litrow'),
    zakresWag:      _strSafe(f,'zakresWag'),
    kokpit:         _strSafe(f,'kokpit'),
    sprawny:        _boolSafe(f,'sprawny', false),
    basen:          _boolSafe(f,'basen', false),
    prywatny:       _boolSafe(f,'prywatny', false),
    privateAvailable: _boolSafe(f,'privateAvailable', false),
    privateOwnerEmail: _strSafe(f,'privateOwnerEmail'),
    uwagi:          _strSafe(f,'uwagi'),

    dostepny:           _boolSafe(f,'dostepny', true),
    aktualnyUzytkownik: _strSafe(f,'aktualnyUzytkownik'),
    od:                 _tsSafe(f,'od'),
    do:                 _tsSafe(f,'do'),
    rezerwacjaAktywna:  _boolSafe(f,'rezerwacjaAktywna', false),
    rezerwujacy:        _strSafe(f,'rezerwujacy'),
    rezerwacjaOd:       _tsSafe(f,'rezerwacjaOd'),
    rezerwacjaDo:       _tsSafe(f,'rezerwacjaDo'),
    blockFrom:          _tsSafe(f,'blockFrom'),
    blockTo:            _tsSafe(f,'blockTo'),
  };
}


/*********************
 * WIOSŁA (paddles)
 *********************/
function mapPaddleDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numer:     _strSafe(f,'numer'),
    producent: _strSafe(f,'producent'),
    model:     _strSafe(f,'model'),
    kolor:     _strSafe(f,'kolor'),
    rodzaj:    _strSafe(f,'rodzaj'),
    dlugosc:   _strSafe(f,'dlugosc'),
    skladane:  _boolSafe(f,'skladane', false),
    basen:     _boolSafe(f,'basen', false),
    uwagi:     _strSafe(f,'uwagi'),

    sprawny:            _boolSafe(f,'sprawny', true),
    prywatny:           _boolSafe(f,'prywatny', false),
    dostepny:           _boolSafe(f,'dostepny', true),
    aktualnyUzytkownik: _strSafe(f,'aktualnyUzytkownik'),
    od:                 _tsSafe(f,'od'),
    do:                 _tsSafe(f,'do'),

    rezerwacjaAktywna:  _boolSafe(f,'rezerwacjaAktywna', false),
    rezerwujacy:        _strSafe(f,'rezerwujacy'),
    rezerwacjaOd:       _tsSafe(f,'rezerwacjaOd'),
    rezerwacjaDo:       _tsSafe(f,'rezerwacjaDo'),
    blockFrom:          _tsSafe(f,'blockFrom'),
    blockTo:            _tsSafe(f,'blockTo'),
  };
}


/*********************
 * KAMIZELKI (lifejackets)
 *********************/
function mapLifejacketDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numer:     _strSafe(f,'numer'),
    producent: _strSafe(f,'producent'),
    model:     _strSafe(f,'model'),
    kolor:     _strSafe(f,'kolor'),
    typ:       _strSafe(f,'typ'),
    rozmiar:   _strSafe(f,'rozmiar'),
    basen:     _boolSafe(f,'basen', false),
    uwagi:     _strSafe(f,'uwagi'),

    sprawny:            _boolSafe(f,'sprawny', true),
    prywatny:           _boolSafe(f,'prywatny', false),
    dostepny:           _boolSafe(f,'dostepny', true),
    aktualnyUzytkownik: _strSafe(f,'aktualnyUzytkownik'),
    od:                 _tsSafe(f,'od'),
    do:                 _tsSafe(f,'do'),

    rezerwacjaAktywna:  _boolSafe(f,'rezerwacjaAktywna', false),
    rezerwujacy:        _strSafe(f,'rezerwujacy'),
    rezerwacjaOd:       _tsSafe(f,'rezerwacjaOd'),
    rezerwacjaDo:       _tsSafe(f,'rezerwacjaDo'),
    blockFrom:          _tsSafe(f,'blockFrom'),
    blockTo:            _tsSafe(f,'blockTo'),
  };
}


/*********************
 * KASKI (helmets)
 *********************/
function mapHelmetDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numer:     _strSafe(f,'numer'),
    producent: _strSafe(f,'producent'),
    model:     _strSafe(f,'model'),
    kolor:     _strSafe(f,'kolor'),
    rozmiar:   _strSafe(f,'rozmiar'),
    basen:     _boolSafe(f,'basen', false),
    uwagi:     _strSafe(f,'uwagi'),

    sprawny:            _boolSafe(f,'sprawny', true),
    prywatny:           _boolSafe(f,'prywatny', false),
    dostepny:           _boolSafe(f,'dostepny', true),
    aktualnyUzytkownik: _strSafe(f,'aktualnyUzytkownik'),
    od:                 _tsSafe(f,'od'),
    do:                 _tsSafe(f,'do'),

    rezerwacjaAktywna:  _boolSafe(f,'rezerwacjaAktywna', false),
    rezerwujacy:        _strSafe(f,'rezerwujacy'),
    rezerwacjaOd:       _tsSafe(f,'rezerwacjaOd'),
    rezerwacjaDo:       _tsSafe(f,'rezerwacjaDo'),
    blockFrom:          _tsSafe(f,'blockFrom'),
    blockTo:            _tsSafe(f,'blockTo'),
  };
}


/*********************
 * RZUTKI (throwbags)
 *********************/
function mapThrowbagDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numer:     _strSafe(f,'numer'),
    producent: _strSafe(f,'producent'),
    uwagi:     _strSafe(f,'uwagi'),

    sprawny:            _boolSafe(f,'sprawny', true),
    prywatny:           _boolSafe(f,'prywatny', false),
    dostepny:           _boolSafe(f,'dostepny', true),
    aktualnyUzytkownik: _strSafe(f,'aktualnyUzytkownik'),
    od:                 _tsSafe(f,'od'),
    do:                 _tsSafe(f,'do'),

    rezerwacjaAktywna:  _boolSafe(f,'rezerwacjaAktywna', false),
    rezerwujacy:        _strSafe(f,'rezerwujacy'),
    rezerwacjaOd:       _tsSafe(f,'rezerwacjaOd'),
    rezerwacjaDo:       _tsSafe(f,'rezerwacjaDo'),
    blockFrom:          _tsSafe(f,'blockFrom'),
    blockTo:            _tsSafe(f,'blockTo'),
  };
}


/*********************
 * FARTUCHY (sprayskirts)
 *********************/
function mapSprayskirtDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numer:         _strSafe(f,'numer'),
    producent:     _strSafe(f,'producent'),
    model:         _strSafe(f,'model'),
    material:      _strSafe(f,'material'),
    rozmiar:       _strSafe(f,'rozmiar'),
    rozmiarKomina: _strSafe(f,'rozmiarKomina'),
    basen:         _boolSafe(f,'basen', false),
    niziny:        _boolSafe(f,'niziny', false),
    uwagi:         _strSafe(f,'uwagi'),

    sprawny:            _boolSafe(f,'sprawny', true),
    prywatny:           _boolSafe(f,'prywatny', false),
    dostepny:           _boolSafe(f,'dostepny', true),
    aktualnyUzytkownik: _strSafe(f,'aktualnyUzytkownik'),
    od:                 _tsSafe(f,'od'),
    do:                 _tsSafe(f,'do'),

    rezerwacjaAktywna:  _boolSafe(f,'rezerwacjaAktywna', false),
    rezerwujacy:        _strSafe(f,'rezerwujacy'),
    rezerwacjaOd:       _tsSafe(f,'rezerwacjaOd'),
    rezerwacjaDo:       _tsSafe(f,'rezerwacjaDo'),
    blockFrom:          _tsSafe(f,'blockFrom'),
    blockTo:            _tsSafe(f,'blockTo'),
  };
}
