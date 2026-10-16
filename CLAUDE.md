# Sendr — szöveg és link küldése telefon és PC között, titkosítva, saját Cloudflare Workeren át

## Mi ez
Személyes eszköz: a user a telefonja és a gépe között küld szöveget vagy linket (max. 500 karakter). Csak
a user használja; API kulcsot senkinek nem adott. A kliens titkosít (AES-GCM, a „titkos kulcsból”
származtatott kulccsal), a Worker csak a titkosított adatot tárolja, 1 órára.

Részek, és hol futnak élesben (2026-10-17-i állapot):
- `sendr/` — Firefox-bővítmény (MV2). Kint van a Mozilla boltban (AMO, `sendr@mobio.dev`, 1.0.1, kiadva
  2026-02-14, nyilvános, ~4 átlagos napi felhasználó); a user is onnan telepítette.
- `sendr-chrome/` — Chrome-bővítmény (MV3). A Chrome Web Store nem fogadta el; a user kicsomagolva tölti be.
- `sendr-pwa/` — webapp. Él a GitHub Pages-en: https://rendezo.github.io/sendr/sendr-pwa/. Az élő fájlok
  azonosak a `main` ággal; a Pages forrás-beállítását nem láttuk (hitelesítés kell hozzá).
- `workers.js` — Cloudflare Worker + két KV (`TRANSFER_STORES`, `TEXT_BUFFER`). Éles cím:
  `https://delicate-leaf-fbfc.rendezo.workers.dev` — be van égetve a kliensekbe. Az élő kód 2026-10-17-én
  azonos a repó `workers.js`-ével.
- `sendr-bemutato.html` — bemutató és telepítési útmutató (a mobio.hu-ra szánva).

**A repó nyilvános** (https://github.com/rendezo/sendr): ami ide kerül, azt bárki látja.

## Stack
Sima JavaScript, build és függőségkezelés nélkül (nincs `package.json`).
- Firefox: WebExtension MV2, `browser.*` API.
- Chrome: MV3 service worker + `webextension-polyfill` (`sendr-chrome/browser-polyfill.min.js`, beemelve).
- PWA: statikus HTML/JS + service worker, `localStorage`.
- Backend: Cloudflare Worker (ES modul) + Workers KV.
- A gépen: node 25, wrangler 4.72. A `web-ext` nincs telepítve.

## Parancsok (kipróbálva)
- szintaxis-ellenőrzés (2026-10-17: mind OK):
  `for f in sendr/*.js sendr-chrome/{background,content,popup}.js sendr-pwa/*.js; do node --check "$f"; done`
  és `node --input-type=module --check < workers.js`
- Worker helyben (csak helyi KV, az élest nem éri) — egy repón KÍVÜLI mappában (pl. a scratchpadben):
  1. oda a `workers.js` másolata és egy `wrangler.toml` kitalált KV-azonosítókkal (minta: README 2.3);
  2. `wrangler kv key put --binding=TRANSFER_STORES "api:localtest" "user1" --local --persist-to .state`
  3. `wrangler dev --local --persist-to .state --port 8799 --ip 127.0.0.1`
  4. próba curl-lel: `/send` → `/next?device_id=d1` → `/ack` → `/next?device_id=d1` üres, `d2`-nek még megvan.
  A `--local` kötelező: nélküle a `wrangler kv` a valódi Cloudflare-fiókba írhat.
- teszt: nincs automata teszt.
- build: nincs. Firefox-csomag: `web-ext build` a `sendr/` mappában (kizárások: `sendr/.web-extignore`) —
  nem próbáltuk.
- deploy (a user csinálja):
  - Worker: a user szerint wranglerrel ment fel. A valódi `wrangler.toml` nincs meg (se a repóban, se a gépen) —
    lásd docs/TERV.md. Az élő beállítás (2026-10-17): 8 deploy, mind 2026-02-13-án; `compatibility_date`
    2026-02-13; kötések `TEXT_BUFFER` és `TRANSFER_STORES`; Workers Logs bekapcsolva.
  - Firefox: új verzió feltöltése a Mozilla boltba (AMO). A bolti 1.0.1 tartalma azonos a `sendr/`-rel.
  - PWA: GitHub Pages. Mivel az élő fájlok a `main`-nel egyeznek, számolj vele, hogy a push a `main`-re élesít.
  - Chrome: `chrome://extensions` → Fejlesztői mód → Kiegészítő betöltése → `sendr-chrome/`.
- Cloudflare-fiók olvasása (csak olvasás, kipróbálva 2026-10-17): `wrangler whoami`,
  `wrangler deployments list --name delicate-leaf-fbfc`, `wrangler kv namespace list`; API és GraphQL a wrangler
  tokenjével — a módszer: docs/archiv/2026-10-biztonsagi-audit.md „Hogyan ellenőrizhető újra”. A számlázást
  (csomag) a token nem látja: azt a user nézi meg a dashboardon.

## Mappák
`sendr/` Firefox, `sendr-chrome/` Chrome, `sendr-pwa/` PWA, `workers.js` a Worker, `docs/` a leírások.
A felhasználói leírás a gyökér `README.md` (magyar) és `README.en.md` (angol), plusz egy-egy README a
kliensmappákban.

## Környezetek
Csak éles van: egy Worker, egy Cloudflare-fiók, a user saját eszközei.
- Lokál: a Worker `wrangler dev --local`-lal futtatható (fent). A kliensek viszont **az éles Workert érik**: a
  bővítményekben a cím be van égetve, a PWA pedig csak `https://` backend-címet fogad el, így a helyi Workerre
  egyik sem állítható át.
- Értesítés (Telegram, e-mail, SMS) nincs.
- A Cloudflare-fiókon a Sendren kívül más projektek Workerei is futnak: a számla és a Free-csomag limitjei
  (napi kérés, KV-írás) **fiókszintűek, közösek** — ami a Sendr Workerét terheli, a többit is érinti.
- A repó nyilvános: kulcs, fiók- és KV-azonosító, a kulcs jellemzői és a többi Worker neve nem kerülhet a
  leírásokba (2026-10-17, audit).

## Konvenciók
- Felület, kódkommentek és leírások magyarul; commitüzenetek angolul, „Terület: …” előtaggal
  (pl. `PWA: …`, `Chrome: …`, `README: …`, `Docs: …`).
- A három kliens ugyanazt a kódot hordozza (titkosítás, történet, Worker-cím). Ami a Workerrel vagy a
  titkosítással közös, az a szerződés: [docs/integraciok/worker-api.md](docs/integraciok/worker-api.md) — csak
  együtt, mindhárom kliensben változhat.

## Buktatók
- A Worker-cím öt helyen van beégetve: `sendr/popup.js`, `sendr/background.js`, `sendr-chrome/popup.js`,
  `sendr-chrome/background.js`, `sendr-pwa/app.js` (alapértelmezésként).
- A titkosítás paramétereit (só, iteráció, formátum) nem lehet egy kliensben megváltoztatni: a többi nem tudja
  visszafejteni az üzeneteket.
- A régi git-commitok magyar ékezetei elrontva látszanak (Windows-kódolás) — nem hiba a repóban.
- A `sendr/README.md` részben elavult: QR-párosítást és egy régi API-formátumot ír le, ami a kódban nincs.

## Fontos döntések
- 2026-10-17 — A helyi mappa (a GitHub `main` zip-másolata) a GitHub-klón `.git`-jét kapta, nem új `git init`-et —
  így a történet és az `origin` megmaradt.

## Leírások
- modulok: docs/modulok/README.md
- Worker API és titkosítás (szerződés): docs/integraciok/worker-api.md
- biztonsági audit (folyamatban): docs/archiv/2026-10-biztonsagi-audit.md
- teendők: docs/TERV.md
