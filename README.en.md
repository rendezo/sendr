# Sendr – Send from phone to PC

**[Magyar: README.md](README.md)**

Firefox extension: send text and links from your phone to your computer (or the other way around). Content is encrypted in transit; the extension does not collect any data.

---

## How to use it

Sendr has two parts:

1. **Firefox extension** – you install this in the browser (on your phone and/or PC).
2. **Backend (API)** – a small server that receives and stores the sent text. **You need to set this up** using a **Cloudflare Worker**.

**So:** Yes, to use Sendr you need to deploy **workers.js** to Cloudflare and configure an API key. Below is the step-by-step guide.

---

## 1. Install the extension

- **Firefox Add-ons (AMO):** [addons.mozilla.org](https://addons.mozilla.org) → search for “Sendr” → Install.
- Or **temporary install:** Firefox → `about:debugging` → “This Firefox” → “Load Temporary Add-on…” → choose the `sendr/manifest.json` file.

---

## 2. Set up the backend (Cloudflare) – required for it to work

The extension sends text through an API. That API is provided by a **Cloudflare Worker** and two **KV stores**. The **workers.js** file in this repo contains the code; you need to deploy it to Cloudflare.

### 2.1 Cloudflare account and Wrangler

1. Sign up at [Cloudflare](https://dash.cloudflare.com/sign-up) (free).
2. Install [Node.js](https://nodejs.org) if you don’t have it.
3. Install the Wrangler CLI (in a terminal):

```bash
npm install -g wrangler
wrangler login
```

You’ll log in to your Cloudflare account in the browser.

### 2.2 Create KV stores

The Worker uses two KV (key–value) stores. Create them (the commands will print the `id` values; you’ll need these later):

```bash
wrangler kv:namespace create "TRANSFER_STORES"
wrangler kv:namespace create "TEXT_BUFFER"
wrangler kv:namespace create "TEXT_BUFFER" --preview
```

### 2.3 Worker folder and files

1. Create a folder for the Worker project (e.g. `sendr-backend`).
2. Copy **workers.js** from this repo (from the repo root) into that folder.
3. Create a **wrangler.toml** file in the folder. Example (replace the `id` and `preview_id` values with the ones from step 2.2):

```toml
name = "sendr-api"
main = "workers.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "TRANSFER_STORES"
id = "YOUR_TRANSFER_STORES_ID"

[[kv_namespaces]]
binding = "TEXT_BUFFER"
id = "YOUR_TEXT_BUFFER_ID"

[[kv_namespaces]]
binding = "TEXT_BUFFER"
preview_id = "YOUR_TEXT_BUFFER_PREVIEW_ID"
```

### 2.4 Register your API key

Choose a secret password – this will be your **API key**. Register it in KV (replace `YOUR_API_KEY` with your chosen value; `user1` can stay or be anything, e.g. `default`):

```bash
wrangler kv key put --binding=TRANSFER_STORES "api:YOUR_API_KEY" "user1"
```

**Important:** In the Sendr extension Settings, enter **YOUR_API_KEY** (the password you chose) in the “API key” field – do not include the `api:` prefix.

### 2.5 Deploy the Worker

```bash
wrangler deploy
```

The command will print your Worker URL (e.g. `https://sendr-api.xyz.workers.dev`).  
**If you build the extension yourself:** set the `BASE_URL` in `sendr/popup.js` and `sendr/background.js` to this URL. The official Sendr from AMO uses a preconfigured URL; for your own backend you need your own build, or the developer may add support for a custom URL later.

---

## 3. Using Sendr

1. **Extension Settings** (⚙️): enter your **API key** (the password from step 2.4) and **secret phrase** (you choose this; use the same on phone and PC). Save.
2. **Send from phone:** open Sendr → enter text or link (max. 500 characters) → Send.
3. **Fetch on PC:** open Sendr → choose destination (clipboard or paste into focused field) → Fetch.
4. **History:** to view past sends, enter your secret phrase; the list can be collapsed.

---

## Repository structure

| File / folder   | Purpose |
|-----------------|--------|
| **sendr/**      | Firefox extension (manifest, popup, background, content script) |
| **workers.js**  | Cloudflare Worker code – deploy this to Cloudflare |
| **sendr-bemutato.html** | Demo and setup guide (e.g. for mobio.hu) |

---

## Privacy

Sendr does not collect or send any data to the developer. The API key and secret phrase are stored only on your device. Sent text is encrypted and goes only to your own backend (Cloudflare Worker).

---

## License

See the license file in this repository.
