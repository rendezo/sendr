# Sendr – Telefonról PC-re küldés

**[English: README.en.md](README.en.md)**

Firefox-kiegészítő: szöveget és linkeket tudsz küldeni a telefonodról a számítógépedre (vagy fordítva). A tartalom titkosítva megy át; a bővítmény nem gyűjt adatot.

---

## Hogyan tudod használni?

A Sendr két részből áll:

1. **Firefox bővítmény** – ezt telepíted a böngészőbe (telefonra és/vagy PC-re).
2. **Backend (API)** – egy kis szerver, ami átveszi és tárolja a küldött szöveget. Ezt **neked kell felállítanod** egy **Cloudflare Worker** segítségével.

**Tehát:** Igen, a használathoz fel kell töltened (deployolnod) a **workers.js**-t a Cloudflare-ra, és be kell állítanod egy API kulcsot. Az alábbiakban ez lépésről lépésre megvan.

---

## 1. Bővítmény / alkalmazás telepítése

| Platform | Verzió | Telepítés |
|----------|--------|------------|
| **Firefox** (PC, Android) | Bővítmény | [addons.mozilla.org](https://addons.mozilla.org) → „Sendr” → Telepítés. Vagy ideiglenes: Firefox → `about:debugging` → „Kiegészítő betöltése…” → `sendr/manifest.json`. |
| **Chrome PC** | Bővítmény (Manifest V3) | A **sendr-chrome** mappa. Chrome: `chrome://extensions` → Fejlesztői mód → „Kiegészítő betöltése” → válaszd a repó `sendr-chrome` mappáját. Ugyanaz a backend. |
| **Chrome Android** | PWA | A **sendr-pwa** webalkalmazás. Nyisd meg a PWA URL-jét (pl. GitHub Pages) a telefon Chrome-jában → Menü → „Alkalmazás telepítése” / „Hozzáadás a kezdőképernyőhöz”. Beállításokban add meg az API kulcsot és a titkos kulcsot. |
| **Chrome iOS / Safari iOS** | PWA | Ugyanaz a **sendr-pwa**. Safari-ban nyisd meg a PWA oldalt → Megosztás → „Hozzáadás a kezdőképernyőhöz”. Beállítások: API kulcs, titkos kulcs. |

A PWA (sendr-pwa) bármely böngészőből használható, ha feltöltöd (pl. GitHub Pages). Részletesebb lépések: [sendr-pwa/README.md](sendr-pwa/README.md).

---

## 2. Backend felállítása (Cloudflare) – ez kell a működéshez

A bővítmény a küldött szöveget egy API-n keresztül küldi. Ezt az API-t egy **Cloudflare Worker** + két **KV tároló** biztosítja. A repóban a **workers.js** tartalmazza a kódot; ezt kell a Cloudflare-ra feltölteni.

### 2.1 Cloudflare fiók és Wrangler

1. Regisztrálj a [Cloudflare](https://dash.cloudflare.com/sign-up)-n (ingyenes).
2. Telepítsd a [Node.js](https://nodejs.org)-t, ha még nincs.
3. Telepítsd a Wrangler CLI-t (parancssorban):

```bash
npm install -g wrangler
wrangler login
```

A böngészőben be kell jelentkezned a Cloudflare fiókodba.

### 2.2 KV tárolók létrehozása

A Worker két KV (kulcs–érték) tárolót használ. Hozd létre őket (a parancsok kiírják az `id`-t, ezeket később használod):

```bash
wrangler kv:namespace create "TRANSFER_STORES"
wrangler kv:namespace create "TEXT_BUFFER"
wrangler kv:namespace create "TEXT_BUFFER" --preview
```

### 2.3 Worker mappa és fájlok

1. Hozz létre egy mappát a Worker projekthez (pl. `sendr-backend`).
2. Másold bele a repóból a **workers.js** fájlt (a gyökérből: `workers.js`).
3. Hozz létre a mappában egy **wrangler.toml** fájlt. Példa (a `id` és `preview_id` értékeket cseréld ki a 2.2 lépésben kapott id-kre):

```toml
name = "sendr-api"
main = "workers.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "TRANSFER_STORES"
id = "IDE_ide_TRANSFER_STORES"

[[kv_namespaces]]
binding = "TEXT_BUFFER"
id = "IDE_ide_TEXT_BUFFER"

[[kv_namespaces]]
binding = "TEXT_BUFFER"
preview_id = "IDE_ide_TEXT_BUFFER_PREVIEW"
```

### 2.4 API kulcs regisztrálása

Válassz egy titkos jelszót – ez lesz az **API kulcsod**. Regisztráld a KV-ban (a `YOUR_API_KEY` helyére ezt írd, a `user1` maradhat vagy bármi, pl. `default`):

```bash
wrangler kv key put --binding=TRANSFER_STORES "api:YOUR_API_KEY" "user1"
```

**Fontos:** A Sendr bővítmény Beállításokban az „API kulcs” mezőbe a **YOUR_API_KEY** értékét írd (tehát a jelszót, amit kitaláltál) – az `api:` prefix nem kell.

### 2.5 Worker feltöltése (deploy)

```bash
wrangler deploy
```

A parancs kiírja a Worker URL-jét (pl. `https://sendr-api.xyz.workers.dev`).  
**Ha a bővítményt saját magad buildeled:** a `sendr/popup.js` és `sendr/background.js` fájlokban a `BASE_URL` értékét állítsd át erre a címedre. Az AMO-ról telepített hivatalos Sendr egy előre beállított URL-t használ; saját backendedhez saját build kell, vagy a készítő később támogatja a saját URL megadását.

---

## 3. Használat

1. **Bővítmény Beállítások** (⚙️): add meg az **API kulcsot** (a 2.4 lépésben választott jelszó) és a **titkos kulcsot** (ezt te találod ki, ugyanaz legyen telefonon és PC-n). Mentés.
2. **Telefonról küldés:** nyisd meg a Sendrt → írd be a szöveget vagy linket (max. 500 karakter) → Küldés.
3. **PC-n lekérés:** nyisd meg a Sendrt → válaszd a célt (vágólap vagy mezőbe beillesztés) → Lekérés.
4. **Történet:** a korábbi küldések megtekintéséhez add meg a titkos kulcsot; a lista lenyitható.

---

## Fájlstruktúra a repóban

| Fájl / mappa | Mit csinál |
|--------------|------------|
| **sendr/** | Firefox bővítmény (manifest, popup, háttér, tartalom script) |
| **sendr-chrome/** | Chrome bővítmény (Manifest V3); ugyanaz a funkció, ugyanaz a backend |
| **sendr-pwa/** | PWA (webalkalmazás): Chrome Android, iOS, bármely böngésző; ugyanaz a backend |
| **workers.js** | Cloudflare Worker kód – ezt kell deployolni a Cloudflare-ra |
| **sendr-bemutato.html** | Bemutató és telepítési útmutató (pl. mobio.hu-ra feltölthető) |

---

## Adatvédelem

A Sendr nem gyűjt és nem küld adatot a fejlesztőnek. Az API kulcs és a titkos kulcs csak a te eszközödön tárolódik. A küldött szöveg titkosítva megy a te backendedre (Cloudflare Worker).

---

## Licenc

Lásd a repó licencfájlját.
