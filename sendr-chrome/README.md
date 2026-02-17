# Sendr – Chrome verzió

A **sendr-chrome** mappa a Sendr bővítmény Chrome (Manifest V3) változatát tartalmazza. Ugyanazok a funkciók: szöveg/link küldése telefonról PC-re (és fordítva), titkosítás, történet. Ugyanazt a Cloudflare Workers backendet használja, mint a Firefox verzió.

## Telepítés fejlesztői módban

1. Klónozd a repót vagy töltsd le, és nyisd meg a **sendr-chrome** mappát.
2. Chrome-ban menj a `chrome://extensions` oldalra.
3. Kapcsold be a **Fejlesztői mód** (Developer mode) kapcsolót.
4. Kattints a **Kiegészítő betöltése** (Load unpacked) gombra.
5. Válaszd ki a **sendr-chrome** mappát (azt, amelyik a manifest.json-t tartalmazza).

## Beállítás

Az API kulcs és a titkos kulcs ugyanúgy kell, mint a Firefox verzióhoz: a gyökér README (vagy README.en.md) 2. pontja szerint állítsd fel a Cloudflare Worker-t, majd a bővítmény Beállítások (⚙️) menüjében add meg az API kulcsot és a titkos kulcsot.

## Függőség

A Chrome és Firefox API különbségek miatt a [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) van beépítve (`browser-polyfill.min.js`), így a kód a `browser.*` API-t használja mindkét böngészőben.
