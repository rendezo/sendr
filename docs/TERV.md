# Terv — mi van most, mi jön

Az egyetlen teendő-lista. **A sorrendről a user dönt.** Tételenként egy sor; a részletek a
modul-leírásokban vannak (linkkel).

Karbantartás: a munkamenet elején `/start`, munka közben az „ötlet:” szabály, a végén `/end`.

## Most
- **Biztonsági audit** (2026-10-17): semmilyen saját adat vagy kulcs ne kerülhessen ki, és idegen ne tudjon
  költséget generálni a user szolgáltatásain (Cloudflare, GitHub). Kiindulás: [szerződés](integraciok/worker-api.md).
  Akkor van kész, ha (javaslat — a `/start`-nál véglegesítjük):
  - minden nyilvános felület át van nézve (GitHub-repó és a teljes történet, GitHub Pages, az AMO-csomag, a
    Worker-cím), és egyikben sincs titok vagy személyes adat — ami van, el van távolítva;
  - tudjuk, milyen Cloudflare-csomagon fut a fiók, és mi történik, ha valaki a nyilvános Worker-címet terheli;
    a kockázat le van zárva vagy tudatosan vállalva, és ezt beállítás vagy mérés igazolja;
  - a megállapítások és a döntések le vannak írva a `docs/`-ban.
  Ami már ismert (2026-10-17): a repó nyilvános, a GitHub Pages él (a PWA nem szűnt meg); az AMO-n ~4 napi
  felhasználó van, és mind a user Workerét hívja; a Worker minden kérésnél KV-olvasással ellenőrzi a kulcsot
  (a hibás kulcsú kérés is fogyaszt), rate limit nincs; az AMO-csomag (1.0.1, 2026-02-14) tartalmát még nem
  vetettük össze a repóval; megnézendő, nincs-e a valódi API kulcs a shell-történetben (a README
  `wrangler kv key put "api:…"` parancsa parancssorban adja meg).

## Következő (sorrendben)
- Worker deploy rendbetétele: `wrangler.toml` a repóba (a KV-azonosító nem titok), verzió + git-hash, és egy
  ellenőrizhető „kész” jel (pl. `/version`). A régi konfig nincs meg — a Cloudflare-fiókból kell visszafejteni.
- Időkorlát a kliensek hálózati hívásaira — most egy beragadt kérés korlát nélkül vár.
- Elavult leírások javítása: `sendr/README.md` (QR-párosítás, régi API-formátum); a gyökér README
  licencfájlra hivatkozik, ami nincs; a PWA-t és a Chrome-ot érintő részek frissítése.

## Ötletek (beérkező — még nincs eldöntve, kell-e és mikor)
- 2026-10-17 — Közös kliens-kód (titkosítás, történet, Worker-cím) egy helyen — most három példányban él.
- 2026-10-17 — A Worker csak a legutolsó üzenetet tartja: két gyors küldésből az első elvész.
  ([szerződés](integraciok/worker-api.md#buktatók))
- 2026-10-17 — A helyi történet titkosítatlan; a „feloldás” csak felületi zár.
- 2026-10-17 — Fix só (`mobio-salt`) a kulcsszármaztatásban: azonos titkos kulcsból mindenkinél azonos kulcs.
- 2026-10-17 — Helyi teszt a klienseknek: a bővítményekben a Worker-cím be van égetve, a PWA csak `https://`
  címet fogad el → a helyi Workerre egyik sem állítható át.
- 2026-10-17 — Saját backend-cím a bővítményekben is (mint a PWA-ban).

## Félretéve (tudatosan — csak kérésre)
- Chrome Web Store — nem fogadták el; a Chrome-verzió kicsomagolva megy.
