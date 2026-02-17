# Sendr PWA

Webalkalmazás (PWA) verzió a Sendrhez: **Chrome Android**, **Chrome iOS** és bármely böngészőben használható. Ugyanazt a Cloudflare Workers backendet használja, mint a Firefox/Chrome bővítmény.

## Telepítés mobilon

1. **Android (Chrome):** Nyisd meg az `index.html`-t biztonságos eredetről (pl. GitHub Pages, vagy saját szerver). Menü → „Alkalmazás telepítése” / „Hozzáadás kezdőképernyőhöz”.
2. **iOS (Safari):** Safari-ban nyisd meg az oldalt → Megosztás (Share) → „Hozzáadás a kezdőképernyőhöz”.

A PWA ezután kezdőképernyőről indítható, alkalmazásként viselkedik.

## Futtatás helyben

A PWA fájlok statikusak. Helyi kipróbáláshoz szükség van egy helyi HTTP szerverre (a `file://` néhány böngészőben korlátozza a storage / service worker-t).

Példa (Node.js):

```bash
npx serve sendr-pwa
```

Vagy más statikus szerver a `sendr-pwa` mappára. Ezután a böngészőben nyisd meg a kiírt URL-t (pl. `http://localhost:3000`).

## Közzététel (pl. GitHub Pages)

1. A repóban kapcsold be a GitHub Pages-t (Settings → Pages → Source: main branch, mappa pl. `/ (root)` vagy `docs`).
2. Ha a gyökérből szolgálod: a böngészőben a címed legyen `https://<user>.github.io/<repo>/sendr-pwa/` (így a `manifest.json` és a `sw.js` relatív útvonalak helyesek).
3. Ha külön repo csak a PWA-nak: másold a `sendr-pwa` tartalmát a repo gyökerébe, és a Pages a gyökeret szolgálja ki. Ekkor a `manifest.json`-ben a `start_url` legyen `./index.html` vagy `/index.html`.

## Beállítás

Az első használat előtt a Beállításokban add meg:

- **API kulcs** – ugyanaz, amit a Cloudflare Workerhoz regisztráltál (README 2.4).
- **Titkos kulcs** – tetszőleges jelszó, ugyanaz legyen telefonon és PC-n (bővítménynél is).
- **Backend URL** – opcionális; ha saját workered van, ide írd a címet (pl. `https://xxx.workers.dev`).

A PWA nem gyűjt adatot; az API kulcs és a titkos kulcs csak a böngésző localStorage-jában marad (az adott eszközön).
