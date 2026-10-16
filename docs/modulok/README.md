# Modul-leírások

Minden nagyobb modulnak itt van egy leírása. A cél: ha hetek múlva újra hozzá kell nyúlni egy
modulhoz, ne nulláról kelljen kezdeni.

## Két szabály
1. Módosítás ELŐTT el kell olvasni a modul leírását (különösen a „Buktatók” és az „Összefüggések” részt).
2. Módosítás UTÁN frissíteni kell, ugyanabban a változtatásban, mint a kódot. Egy elavult leírás
   rosszabb, mint ha nem lenne: magabiztosan félrevezet.

## Mi kerül bele — és mi NEM
Bele: amit a kódból nehéz vagy lassú kiolvasni — mire való és mik a fogalmai; kulcsfájlok; a logika
lépésekben; döntések és az okuk, dátummal; összefüggések más modulokkal; buktatók; tesztelés a működő
parancsokkal; nyitott kérdések.
Nem: kódrészletek, függvények paraméterei — az a kódban van, és ott nem avul el.

## Sablon új modulhoz
# <Modulnév> — <egy mondat, mire való>
> Állapot (dátum): …
## Mire való
## Fogalmak
## Kulcsfájlok
## Beállítások
## Hogyan működik (lépésekben)
## Összefüggések más modulokkal
## Buktatók — mire figyelj
## Tesztelés és ellenőrzés
## Döntések naplója (dátum — döntés — miért)
## Nyitott kérdések

## Modulok
| Modul | Leírás |
| --- | --- |
| Firefox-bővítmény (`sendr/`) | még nincs leírás — felhasználói leírás: [sendr/README.md](../../sendr/README.md) (részben elavult: QR-párosítás, régi API-formátum) |
| Chrome-bővítmény (`sendr-chrome/`) | még nincs leírás — felhasználói leírás: [sendr-chrome/README.md](../../sendr-chrome/README.md) |
| PWA (`sendr-pwa/`) | még nincs leírás — felhasználói leírás: [sendr-pwa/README.md](../../sendr-pwa/README.md) |
| Worker backend (`workers.js`) | még nincs leírás — API és tárolás: [../integraciok/worker-api.md](../integraciok/worker-api.md); telepítés: a gyökér [README.md](../../README.md) 2. pontja |
| Bemutató oldal (`sendr-bemutato.html`) | még nincs leírás |

## Szerződések
- [Worker API és titkosítás](../integraciok/worker-api.md) — a három kliens és a Worker közös formátuma.
