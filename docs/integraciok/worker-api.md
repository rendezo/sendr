# Worker API és titkosítás — a kliensek és a Worker szerződése

> Állapot (2026-10-17): a kódból leírva (commit bd8e04a). A Worker (`workers.js`) és a három kliens
> (`sendr/`, `sendr-chrome/`, `sendr-pwa/`) erre hivatkozik; **csak együtt változhat**. Egy kliens, amely
> eltér, a többi üzenetét nem tudja visszafejteni.

## Szereplők — ki mit csinál
- **Kliens** (Firefox, Chrome, PWA): titkosít küldés előtt, visszafejt lekérés után, eszközazonosítót tart,
  és ACK-val jelzi, hogy az adott eszköz megkapta az üzenetet. A titkos kulcs a klienst soha nem hagyja el.
- **Worker**: ellenőrzi az API kulcsot, tárolja a titkosított payloadot 1 órára, és eszközönként nyilvántartja,
  ki olvasta. A payloadba nem lát bele, nem is ellenőrzi.

## Cím
Éles: `https://delicate-leaf-fbfc.rendezo.workers.dev`. Beégetve: `sendr/popup.js`, `sendr/background.js`,
`sendr-chrome/popup.js`, `sendr-chrome/background.js`. A PWA-ban alapértelmezés; a Beállításokban átírható, de
csak `https://` címre, és csak az origin marad meg belőle (útvonal nélkül).

## Hitelesítés
- Fejléc: `x-api-key: <API kulcs>`.
- A Worker a `TRANSFER_STORES` KV-ban keresi: `api:<API kulcs>` → az értéke a felhasználó-azonosító (`userId`).
  Az API kulcsot a user maga regisztrálja wranglerrel (README 2.4).
- Hiányzik a fejléc → `401 MISSING_API_KEY`; nincs ilyen kulcs → `401 INVALID_API_KEY`.
- A kulcs-ellenőrzés **minden** kérésnél lefut (az útvonal vizsgálata előtt): hibás kulcsú kérés is egy KV-olvasás.
- `OPTIONS` (CORS preflight): hitelesítés nélkül válaszol.
- CORS: `Access-Control-Allow-Origin: *`; metódusok `GET, POST, OPTIONS`; fejlécek `Content-Type, x-api-key`.

## Végpontok
| Végpont | Kérés | Válasz | Hibák |
| --- | --- | --- | --- |
| `POST /send` | JSON: `{ "payload": <titkosított objektum> }` | `200` JSON: `{ "status": "OK", "message_id": "<uuid>" }` | `400 INVALID_BODY` (nincs `payload`), `400 PAYLOAD_TOO_LARGE` (a payload JSON-ja > 50 000 karakter) |
| `GET /next?device_id=<id>` | — | `200` JSON tömb: `[]`, vagy egy elem: `{ "message_id", "payload", "timestamp" }` | `400 MISSING_DEVICE_ID` |
| `POST /ack` | JSON: `{ "device_id", "message_id" }` | `200 ACK_OK` (szöveg) | `400 INVALID_BODY` |
| bármi más | | `404 Not found` | |

A hibaválaszok sima szövegek (nem JSON).

## Tárolás (KV) — mi hol van, meddig
| KV | Kulcs | Érték | Lejárat |
| --- | --- | --- | --- |
| `TRANSFER_STORES` | `api:<API kulcs>` | `userId` | nincs (kézzel kezelt) |
| `TEXT_BUFFER` | `message:<userId>:<message_id>` | `{ payload, timestamp }` (JSON) | 3600 s |
| `TEXT_BUFFER` | `latest:<userId>` | a legutolsó `message_id` | 3600 s |
| `TEXT_BUFFER` | `read:<userId>:<device_id>:<message_id>` | `"1"` | 3600 s |

## Logika lépésekben
1. **Küldés:** a kliens titkosít → `POST /send` → a Worker új `message_id`-t ad, eltárolja az üzenetet, és
   **felülírja** a `latest:<userId>`-t. A küldő a sikeres küldést a saját helyi történetébe menti.
2. **Lekérés:** `GET /next` a saját `device_id`-val → a Worker a `latest` üzenetet adja vissza, ha ez az eszköz
   még nem ACK-olta, és még nem járt le; különben `[]`.
3. **ACK:** miután a kliens a szöveget vágólapra tette vagy beillesztette → `POST /ack` → az üzenet ennél az
   eszköznél olvasottnak számít. A Worker nem ellenőrzi, hogy az üzenet létezik-e.

## Titkosítás (kliensoldal — mindhárom kliensben azonosnak kell lennie)
- Kulcsszármaztatás: PBKDF2, SHA-256, 100 000 iteráció, **fix só: `mobio-salt`** (UTF-8), a „titkos kulcsból”
  (UTF-8) → AES-GCM 256 bites kulcs.
- Titkosítás: AES-GCM, véletlen 12 bájtos IV, kiegészítő adat nélkül.
- A `payload` alakja: `{ "iv": [12 szám], "ciphertext": [számok] }` — bájtok számtömbként (0–255); a
  `ciphertext` a végén tartalmazza a 16 bájtos GCM-címkét.
- Nyílt szöveg: UTF-8; a kliensek legfeljebb 500 karaktert engednek küldeni (a levágott szöveg JS-hossza).
- Rossz titkos kulcs esetén a visszafejtés kivételt dob.

## Eszközazonosító és helyi adatok (kliensoldal)
- `device_id`: `crypto.randomUUID()`, eszközönként egyszer generálva, tárolva (`deviceId`).
- Tárolt kulcsok (bővítményben `browser.storage.local`, PWA-ban `localStorage`): `apiKey`, `secretPhrase`,
  `deviceId`, `history`; a PWA-ban még `baseUrl`.
- `history`: legfeljebb 50 elem, **titkosítatlanul** (a teljes szöveggel). A „feloldás a titkos kulccsal” csak
  a felületen rejti el, az adatot nem védi.

## Buktatók
- Csak a legutolsó üzenet érhető el: ha két küldés jön egymás után, mielőtt a másik eszköz lekérné, az első
  elvész (a `latest` felülíródik).
- A küldés nem jelöli olvasottnak az üzenetet a küldő eszközön: ha a küldő eszközön is „Lekérés”-t nyomnak, a
  saját üzenetét kapja vissza.
- Egy óra után minden lejár; utána a `/next` üres.

## Döntések naplója (dátum — döntés — miért)
- 2026-10-17 — A szerződés leírva a meglévő kódból, változtatás nélkül — hogy a három kliens és a Worker egy
  helyről legyen összevethető.

## Nyitott kérdések
- Lásd docs/TERV.md (biztonsági audit; csak a legutolsó üzenet; fix só; titkosítatlan helyi történet).
