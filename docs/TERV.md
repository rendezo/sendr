# Terv — mi van most, mi jön

Az egyetlen teendő-lista. **A sorrendről a user dönt.** Tételenként egy sor; a részletek a
modul-leírásokban vannak (linkkel).

Karbantartás: a munkamenet elején `/start`, munka közben az „ötlet:” szabály, a végén `/end`.

## Most
- **Biztonsági audit** (2026-10-17): semmilyen saját adat vagy kulcs ne kerülhessen ki, és idegen ne tudjon
  költséget generálni a user szolgáltatásain (Cloudflare, GitHub). Kiindulás: [szerződés](integraciok/worker-api.md).
  Ebben a munkamenetben: felmérés + a sürgős javítás; nagyobb kódváltozás (pl. rate limit) új TERV-tétel lesz.
  Akkor van kész, ha (2026-10-17, egyeztetve):
  - kiszivárgás: átnéztük a GitHub-repót a teljes történettel, a GitHub Pages-t, az AMO-ból letöltött 1.0.1
    csomagot (összevetve a repóval), a Worker válaszait és a gép shell-történetét; mindegyikről le van írva,
    mit találtunk (vagy hogy semmit), és a talált titok cserélve vagy eltávolítva;
  - számla: tudjuk, milyen csomagon fut a Cloudflare-fiók és mekkora a forgalom; le van írva, mennyi költséget
    tud egy idegen generálni a nyilvános címen át, és ha nem nullát, van korlát, amit ellenőriztünk;
  - eldöntöttük, nyilvánosak maradjanak-e a leírások (`CLAUDE.md`, `docs/`), és ennek megfelelően pusholtunk;
    az eredmény audit-jelentésként a `docs/archiv/`-ban.
  Hol tart (2026-10-17): a kiszivárgási felmérés kész, a számla-rész a Cloudflare-csomagon múlik. Mérések és
  eredmények: [audit-jelentés (folyamatban)](archiv/2026-10-biztonsagi-audit.md). Válaszra / döntésre vár:
  1. Milyen csomagon van a Cloudflare-fiók (Free vagy Paid)? dash.cloudflare.com → Workers & Pages → Plans — a
     wrangler tokenje a számlázást nem látja. Free: nincs számla, de a limit fiókszintű (a Sendr-cím terhelése a
     fiók többi Workerét is leállíthatja aznapra); Paid: felső korlát nélküli költség, csak riasztás állítható.
  2. API kulcs cseréje erős, véletlen kulcsra (javasolt sürgős javítás): új kulcs a KV-ba a régi mellé → a user
     átírja a Firefoxban, a Chrome-ban és a telefonos PWA-ban → ha mind működik, a régi törlése. Éles változás:
     jóváhagyásra vár. A kulcs részletei nem kerülnek a repóba.
  3. Nyilvánosak maradjanak-e a leírások (`CLAUDE.md`, `docs/`)? Az `/end` 2026-10-17-én kitette őket a nyilvános
     repóba (és így a GitHub Pages-re is) — érzékeny részlet nélkül. Javaslat: maradjanak (a PWA-hoz nyilvános
     repó kell, titok nincs bennük); a kulcsról és a fiókról részlet akkor sem kerül ide.
  4. (kisebb) A commitok szerzői e-mail-címe nyilvános; az újak átállíthatók a GitHub rejtett (noreply) címére.
     A régiek csak történet-átírással tűnnének el — nem javasolt.

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
- 2026-10-17 — Külön wTime-csatorna a Workerben: a wTime Firefox-bővítménye egy másik gépről (Windows) percenkénti
  „tesztelési idő” összesítéseket küldene, a fő Mac wTime-ja pár percenként lekérné. Saját végpontok és lista, a
  szöveges üzenetekhez (`latest`) nem nyúl, a sendr titkos kulcsával titkosítva. A szerződés-fájlt bővíteni kell.
  Részletek: a wTime projekt `docs/TERV.md`-je.

## Félretéve (tudatosan — csak kérésre)
- Chrome Web Store — nem fogadták el; a Chrome-verzió kicsomagolva megy.
