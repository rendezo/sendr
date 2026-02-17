# Sendr - Telefonról PC-re küldés

Firefox bővítmény szövegek és linkek küldésére telefonról PC-re Cloudflare Workers API-n keresztül.

## Funkciók

- 📤 **Telefonról küldés**: Közvetlenül a bővítményből küldhetsz szöveget vagy linket (ha telefonon is telepítve van)
- 📥 **PC-re lekérés**: PC-n lekérheted a telefonról küldött tartalmat
- 📋 **Vágólapra másolás**: Automatikus másolás vágólapra
- ✏️ **Mezőbe beillesztés**: Automatikus beillesztés az aktuális mezőbe
- 📜 **Történet**: Utolsó 50 küldött elem megjelenítése és újraküldése
- 🔄 **ACK mechanizmus**: Biztosítja a sikeres kézbesítést
- 🔐 **Titkosítás**: AES-GCM titkosítás az üzenetekhez
- 📷 **QR kód**: QR kód generálás és beolvasás a beállítások párosításához

## Telepítés

### 1. Library fájlok letöltése

A QR kód funkcióhoz szükséges library fájlokat le kell tölteni:

1. **qrcode.min.js**: https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js
   - Mentsd el a `sendr` mappába `qrcode.min.js` néven

2. **jsQR.js**: https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js
   - Mentsd el a `sendr` mappába `jsQR.js` néven

### 2. Bővítmény betöltése (ideiglenes)

1. Firefox címsor: **about:debugging**
2. **„Ez a Firefox"** → **„Kiegészítő betöltése…"** (Load Temporary Add-on)
3. Kattints **„Fájl kiválasztása…"** és válaszd ki ebben a mappában a **manifest.json** fájlt.

Ha hibát ír: vedd ki a bővítményt, indítsd újra a Firefoxot, majd töltsd be újra a manifest.json-t.

## Ikon a toolbaron

1. **Puzzle** ikon (jobb fent) → **Sendr** mellett kattints a **tű** ikonra (rögzítés).
2. Vagy: jobb klikk a toolbaron → **Változtass a toolbaron** → húzd a Sendr-t a toolbarra.

## Használat

### Telefonon (küldés):
1. **API kulcs beállítása**: Add meg az API kulcsot és mentsd el
2. **Szöveg beírása**: Írd be a küldendő szöveget vagy linket a szövegmezőbe
3. **Küldés**: Kattints a "📤 Küldés" gombra

### PC-n (lekérés):
1. **API kulcs beállítása**: Add meg az API kulcsot és mentsd el
2. **Célhely kiválasztása**: Válaszd ki, hogy vágólapra másolás vagy mezőbe beillesztés
3. **Lekérés**: Kattints a "📥 Lekérés PC-re" gombra
4. **Történet**: A korábbi küldések a történetben láthatók, és újra küldhetők

### QR kód párosítás:
1. **QR generálás**: Egyik eszközön kattints a "📷 QR generálása" gombra
2. **QR beolvasás**: Másik eszközön válassz ki egy képet a "QR beolvasása" mezőben
3. Az API kulcs és titkos kulcs automatikusan beállításra kerül

## API formátum

A Cloudflare Workers API-nak a következő formátumot kell visszaadnia:

```json
{
  "transfer_id": "unique-id",
  "text": "A küldendő szöveg vagy link"
}
```

Vagy ha nincs adat:
```
NO_DATA
```

## Telefon oldal

A telefonról küldéshez két lehetőség van:

### 1. Bővítmény használata (ajánlott)
Ha a bővítmény telepítve van telefonon is, akkor közvetlenül a bővítményből küldhetsz:
- Nyisd meg a bővítmény popup-ját
- Írd be a szöveget
- Kattints a "📤 Küldés" gombra

### 2. Külső webes felület vagy app
Alternatívaként külső alkalmazás is küldhet az API-ra:

```
POST /send
Headers: 
  x-api-key: YOUR_API_KEY
  Content-Type: application/json
Body: { "text": "A küldendő szöveg" }
```

Az API válasza tartalmazza a `transfer_id`-t:
```json
{
  "transfer_id": "unique-id"
}
```
