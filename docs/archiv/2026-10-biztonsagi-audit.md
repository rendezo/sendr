# Biztonsági audit — 2026-10

> Állapot (2026-10-17): **folyamatban.** A kiszivárgási felmérés kész; a számla-rész a Cloudflare-csomagon
> múlik, és két döntés vár (lásd docs/TERV.md „Most”). Ha lezárult, ez a fájl a végleges jelentés.

## Cél
Semmilyen saját adat vagy kulcs ne kerülhessen ki, és idegen ne tudjon költséget generálni a user
szolgáltatásain (Cloudflare, GitHub).

## Szabály ehhez a fájlhoz
A repó nyilvános. Ide NEM kerül: kulcs, fiókazonosító, KV-azonosító, az API kulcs jellemzői (hossz,
karakterek), a fiók többi Workerének neve vagy címe.

## Kiszivárgás — mit néztünk, mit találtunk (2026-10-17)
| Felület | Hogyan | Eredmény |
| --- | --- | --- |
| GitHub-repó, teljes történet | minden valaha követett fájl listája; titok-minták a teljes `git log -p`-ben | titok nincs; `wrangler.toml` és `.env` soha nem került be. Személyes adat: a commitok szerzői e-mail-címe. |
| GitHub Pages | az élő PWA-fájlok összevetése a repóval | `app.js`, `index.html`, `sw.js`, `manifest.json` azonos; külső betöltés (CDN, betűtípus) nincs |
| AMO-csomag 1.0.1 | letöltés az AMO API-ból, összevetés a `sendr/`-rel | a sorvégektől (CRLF) és a manifest átformázásától eltekintve azonos; csak a Workert hívja |
| Élő Worker | a kód letöltése a Cloudflare API-ból, összevetés | azonos a `workers.js`-szel; kulcs nélkül csak 401-es hibakódot ad |
| Shell-történet (`~/.zsh_history`) | minta-keresés: `kv key put`, `api:`, `x-api-key` | nincs találat |
| API kulcs | a KV-kulcslista elemzése, a kulcs kiírása nélkül | egy kulcs van, lejárat nélkül; cseréje javasolt (TERV „Most” 2.) |
| wrangler OAuth-token (helyi) | | csak a gépen van (`~/Library/Preferences/.wrangler/config/default.toml`, 644-es jogosultság), gitben sehol. Széles írási joga van (Workers, KV, AI, containers…): ha kikerülne, ez lenne a legnagyobb számla-kockázat. |

## Számla — amit tudunk (2026-10-17)
- Forgalom (Cloudflare GraphQL, 2026-09-17 – 2026-10-17): a Sendr Worker 55 kérés, 0 hiba, legtöbb egy napon
  26. KV: `TEXT_BUFFER` 55 olvasás és 24 írás, `TRANSFER_STORES` 35 olvasás. Idegen terhelés nyoma nincs.
- A fiókon a Sendren kívül három másik projekt Workere fut, közös számlával és közös limitekkel.
- Az AMO-n ~4 átlagos napi felhasználó van; a bővítmény a user Workerét hívja — kulcs nélkül 401-et kapnak, de
  minden kérésük Worker-hívás, és kulcs-próbánként KV-olvasás.
- A Sendr Worker beállítása: Workers Logs bekapcsolva (invocation logs, megőrzéssel) — a kérések metaadatai a
  fiókban 3 (Free) / 7 (Paid) napig megmaradnak; csak a fiók látja.
- Cloudflare árak és limitek (2026-10-17, developers.cloudflare.com/workers/platform/pricing és /limits):
  - Free: napi 100 000 kérés **fiókonként**, fölötte 1027-es hiba (számla nincs); KV naponta 100 000 olvasás,
    1000 írás / törlés / lista, fölötte a művelet hibát ad.
  - Paid: $5/hó; 10 M kérés/hó benne, utána $0,30/M; KV 10 M olvasás (utána $0,50/M), 1 M írás (utána $5/M);
    Workers Logs 20 M esemény/hó, utána $0,60/M. **Felső korlát nincs**; csak költségriasztás (budget alert)
    állítható, és az is a küszöb átlépése utáni napon szól.
- Következmény: Free csomagnál elérhetőségi kockázat (a nyilvános Sendr-cím terhelése aznapra a fiók összes
  Workerét leállíthatja), Paid csomagnál költség-kockázat.
- GitHub: nyilvános repó + Pages, Actions-workflow nincs — számla nem keletkezhet.

## Hogyan ellenőrizhető újra (csak olvasás)
- `wrangler whoami`, `wrangler deployments list --name delicate-leaf-fbfc`, `wrangler kv namespace list`.
- Cloudflare API és GraphQL a wrangler OAuth-tokenjével (a fenti fájl `oauth_token` sora — kiírni tilos):
  `/accounts/<id>/workers/scripts` (Worker-lista), `…/scripts/<név>/settings` (kötések), `…/scripts/<név>/content/v2`
  (kód), `…/storage/kv/namespaces/<id>/keys` (kulcslista — csak darabszámot és hosszt szabad kiírni); GraphQL:
  `workersInvocationsAdaptive`, `kvOperationsAdaptiveGroups` (forgalom). A számlázás (`/accounts/<id>/subscriptions`)
  ezzel a tokennel nem olvasható (Authentication error).
- AMO: `https://addons.mozilla.org/api/v5/addons/addon/sendr/` → `current_version.file.url`; letöltés külön mappába,
  kicsomagolás, `diff --strip-trailing-cr` a `sendr/`-rel.

## Döntések naplója (dátum — döntés — miért)
- 2026-10-17 — A kulcsra és a fiókra vonatkozó részletek nem kerülnek a repóba — mert a repó nyilvános, és a
  részletek a támadónak segítenének.

## Nyitott
Lásd docs/TERV.md „Most” (csomag, kulcscsere, a leírások nyilvánossága, commit-e-mail).
