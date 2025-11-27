/************************************************************
 * 30_firestore_mappers.gs
 * Mapery dokumentów Firestore → obiekty JS
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

/***************************************************
 * HELPERY dla mapperów
 ***************************************************/
function _str(f, name) {
  if (!f[name]) return "";
  if (f[name].stringValue !== undefined) return f[name].stringValue;
  return "";
}

function _bool(f, name, def) {
  if (!f[name]) return def;
  if (typeof f[name].booleanValue === "boolean") return f[name].booleanValue;
  return def;
}

function _ts(f, name) {
  if (!f[name]) return "";
  return timestampToIso(f[name]) || "";
}

/***************************************************
 * MAPERY — każdy sprzęt
 ***************************************************/

function mapKayakDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numerKajaka:  _str(f,'numerKajaka'),
    producent:    _str(f,'producent'),
    model:        _str(f,'model'),
    zdjecieUrl:   _str(f,'zdjecieUrl'),
    kolor:        _str(f,'kolor'),
    typ:          _str(f,'typ'),
    litrow:       _str(f,'litrow'),
    zakresWag:    _str(f,'zakresWag'),
    kokpit:       _str(f,'kokpit'),
    sprawny:      _bool(f,'sprawny', false),
    basen:        _bool(f,'basen', false),
    prywatny:     _bool(f,'prywatny', false),
    uwagi:        _str(f,'uwagi'),

    dostepny:           _bool(f,'dostepny', true),
    aktualnyUzytkownik: _str(f,'aktualnyUzytkownik'),
    od:                 _ts(f,'od'),
    do:                 _ts(f,'do'),
    blockFrom:          _ts(f,'blockFrom'),
    blockTo:            _ts(f,'blockTo'),
  };
}

function mapPaddleDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numer:     _str(f,'numer'),
    producent: _str(f,'producent'),
    model:     _str(f,'model'),
    kolor:     _str(f,'kolor'),
    rodzaj:    _str(f,'rodzaj'),
    dlugosc:   _str(f,'dlugosc'),
    skladane:  _bool(f,'skladane', false),
    basen:     _bool(f,'basen', false),
    uwagi:     _str(f,'uwagi'),

    sprawny:            _bool(f,'sprawny', true),
    prywatny:           _bool(f,'prywatny', false),
    dostepny:           _bool(f,'dostepny', true),
    aktualnyUzytkownik: _str(f,'aktualnyUzytkownik'),
    od:                 _ts(f,'od'),
    do:                 _ts(f,'do'),

    rezerwacjaAktywna:  _bool(f,'rezerwacjaAktywna', false),
    rezerwujacy:        _str(f,'rezerwujacy'),
    rezerwacjaOd:       _ts(f,'rezerwacjaOd'),
    rezerwacjaDo:       _ts(f,'rezerwacjaDo'),
    blockFrom:          _ts(f,'blockFrom'),
    blockTo:            _ts(f,'blockTo'),
  };
}

function mapLifejacketDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numer:     _str(f,'numer'),
    producent: _str(f,'producent'),
    model:     _str(f,'model'),
    kolor:     _str(f,'kolor'),
    typ:       _str(f,'typ'),
    rozmiar:   _str(f,'rozmiar'),
    basen:     _bool(f,'basen', false),
    uwagi:     _str(f,'uwagi'),

    sprawny:            _bool(f,'sprawny', true),
    prywatny:           _bool(f,'prywatny', false),
    dostepny:           _bool(f,'dostepny', true),
    aktualnyUzytkownik: _str(f,'aktualnyUzytkownik'),
    od:                 _ts(f,'od'),
    do:                 _ts(f,'do'),

    rezerwacjaAktywna:  _bool(f,'rezerwacjaAktywna', false),
    rezerwujacy:        _str(f,'rezerwujacy'),
    rezerwacjaOd:       _ts(f,'rezerwacjaOd'),
    rezerwacjaDo:       _ts(f,'rezerwacjaDo'),
    blockFrom:          _ts(f,'blockFrom'),
    blockTo:            _ts(f,'blockTo'),
  };
}

function mapHelmetDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numer:     _str(f,'numer'),
    producent: _str(f,'producent'),
    model:     _str(f,'model'),
    kolor:     _str(f,'kolor'),
    rozmiar:   _str(f,'rozmiar'),
    basen:     _bool(f,'basen', false),
    uwagi:     _str(f,'uwagi'),

    sprawny:            _bool(f,'sprawny', true),
    prywatny:           _bool(f,'prywatny', false),
    dostepny:           _bool(f,'dostepny', true),
    aktualnyUzytkownik: _str(f,'aktualnyUzytkownik'),
    od:                 _ts(f,'od'),
    do:                 _ts(f,'do'),

    rezerwacjaAktywna:  _bool(f,'rezerwacjaAktywna', false),
    rezerwujacy:        _str(f,'rezerwujacy'),
    rezerwacjaOd:       _ts(f,'rezerwacjaOd'),
    rezerwacjaDo:       _ts(f,'rezerwacjaDo'),
    blockFrom:          _ts(f,'blockFrom'),
    blockTo:            _ts(f,'blockTo'),
  };
}

function mapThrowbagDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numer:     _str(f,'numer'),
    producent: _str(f,'producent'),
    uwagi:     _str(f,'uwagi'),

    sprawny:            _bool(f,'sprawny', true),
    prywatny:           _bool(f,'prywatny', false),
    dostepny:           _bool(f,'dostepny', true),
    aktualnyUzytkownik: _str(f,'aktualnyUzytkownik'),
    od:                 _ts(f,'od'),
    do:                 _ts(f,'do'),

    rezerwacjaAktywna:  _bool(f,'rezerwacjaAktywna', false),
    rezerwujacy:        _str(f,'rezerwujacy'),
    rezerwacjaOd:       _ts(f,'rezerwacjaOd'),
    rezerwacjaDo:       _ts(f,'rezerwacjaDo'),
    blockFrom:          _ts(f,'blockFrom'),
    blockTo:            _ts(f,'blockTo'),
  };
}

function mapSprayskirtDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  return {
    id: id,

    numer:         _str(f,'numer'),
    producent:     _str(f,'producent'),
    model:         _str(f,'model'),
    material:      _str(f,'material'),
    rozmiar:       _str(f,'rozmiar'),
    rozmiarKomina: _str(f,'rozmiarKomina'),
    basen:         _bool(f,'basen', false),
    niziny:        _bool(f,'niziny', false),
    uwagi:         _str(f,'uwagi'),

    sprawny:            _bool(f,'sprawny', true),
    prywatny:           _bool(f,'prywatny', false),
    dostepny:           _bool(f,'dostepny', true),
    aktualnyUzytkownik: _str(f,'aktualnyUzytkownik'),
    od:                 _ts(f,'od'),
    do:                 _ts(f,'do'),

    rezerwacjaAktywna:  _bool(f,'rezerwacjaAktywna', false),
    rezerwujacy:        _str(f,'rezerwujacy'),
    rezerwacjaOd:       _ts(f,'rezerwacjaOd'),
    rezerwacjaDo:       _ts(f,'rezerwacjaDo'),
    blockFrom:          _ts(f,'blockFrom'),
    blockTo:            _ts(f,'blockTo'),
  };
}
