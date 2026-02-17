/**
 * Sendr - Popup (Chrome): browser.* API via webextension-polyfill
 */

const STORAGE_KEY = 'apiKey';
const SECRET_KEY = 'secretPhrase';
const BASE_URL = 'https://delicate-leaf-fbfc.rendezo.workers.dev';
const NO_DATA_RESPONSE = 'NO_DATA';
/** Küldés maximális karaktere */
const MAX_SEND_LENGTH = 500;

// Titkosítási függvények
async function deriveKey(secret) {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("mobio-salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptText(secret, text) {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encoded = new TextEncoder().encode(text);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext))
  };
}

async function decryptText(secret, payload) {
  const key = await deriveKey(secret);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
    key,
    new Uint8Array(payload.ciphertext)
  );

  return new TextDecoder().decode(decrypted);
}

// Device ID – egyszer generáljuk, majd storage-ban tároljuk
async function getDeviceId() {
  const data = await browser.storage.local.get('deviceId');
  if (data.deviceId) return data.deviceId;

  const newId = crypto.randomUUID();
  await browser.storage.local.set({ deviceId: newId });
  return newId;
}

const apiKeyEl = document.getElementById('apiKey');
const secretEl = document.getElementById('secret');
const saveBtn = document.getElementById('save');
const sendBtn = document.getElementById('send');
const sendTextEl = document.getElementById('sendText');
const fetchBtn = document.getElementById('fetch');
const statusEl = document.getElementById('status');
const historyEl = document.getElementById('history');
const clearHistoryBtn = document.getElementById('clearHistory');
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const openSettingsBtn = document.getElementById('openSettings');
const closeSettingsBtn = document.getElementById('closeSettings');
const historySection = document.getElementById('historySection');
const historyToggle = document.getElementById('historyToggle');
const historyUnlock = document.getElementById('historyUnlock');
const historySecretInput = document.getElementById('historySecretInput');
const historyUnlockBtn = document.getElementById('historyUnlockBtn');

let historyUnlocked = false;

// Történet alapból nyitva (ne legyen összecsukva)
historySection.classList.remove('collapsed');

function showMainView() {
  mainView.classList.remove('hide');
  settingsView.classList.remove('show');
}

function showSettingsView() {
  mainView.classList.add('hide');
  settingsView.classList.add('show');
}

openSettingsBtn.addEventListener('click', showSettingsView);
closeSettingsBtn.addEventListener('click', showMainView);

function showStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.className = 'status show ' + (isError ? 'err' : 'ok');
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'épp most';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} perce`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} órája`;
  return date.toLocaleDateString('hu-HU', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderHistory(history) {
  historyEl.textContent = '';
  if (!history || history.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color: #9ca3af; font-size: 12px; padding: 8px;';
    empty.textContent = 'Még nincs történet';
    historyEl.appendChild(empty);
    return;
  }
  for (const item of history) {
    const wrap = document.createElement('div');
    wrap.className = 'history-item';
    wrap.setAttribute('data-text', String(item.fullText || ''));
    const textEl = document.createElement('div');
    textEl.className = 'history-item-text';
    textEl.textContent = item.text || '';
    const timeEl = document.createElement('div');
    timeEl.className = 'history-item-time';
    timeEl.textContent = formatTime(item.timestamp);
    wrap.appendChild(textEl);
    wrap.appendChild(timeEl);
    wrap.addEventListener('click', () => {
      const text = wrap.getAttribute('data-text');
      const destination = document.querySelector('input[name="destination"]:checked').value;
      handleSendText(text, null, destination);
    });
    historyEl.appendChild(wrap);
  }
}

async function loadHistory() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'GET_HISTORY' });
    renderHistory(response?.history || []);
  } catch (err) {
    console.warn('[Sendr] History betöltés hiba:', err);
  }
}

// Betöltés: browser.storage visszaad Promise-t
browser.storage.local.get(STORAGE_KEY).then((data) => {
  if (data[STORAGE_KEY]) apiKeyEl.value = data[STORAGE_KEY];
});

browser.storage.local.get(SECRET_KEY).then((data) => {
  if (data[SECRET_KEY]) secretEl.value = data[SECRET_KEY];
});

// Device ID inicializálás - biztosítjuk, hogy létezzen
getDeviceId().catch(err => {
  console.warn('[Sendr] Device ID inicializálás hiba:', err);
});

// Történet lenyitható + azonosító
historyToggle.addEventListener('click', (e) => {
  if (e.target.id === 'clearHistory' || e.target.closest('#clearHistory')) return;
  historySection.classList.toggle('collapsed');
});

clearHistoryBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (confirm('Biztosan törölni szeretnéd a történetet?')) {
    browser.storage.local.set({ history: [] }).then(() => {
      if (historyUnlocked) loadHistory();
      showStatus('Történet törölve.');
    });
  }
});

historyUnlockBtn.addEventListener('click', async () => {
  const entered = historySecretInput.value.trim();
  const data = await browser.storage.local.get(SECRET_KEY);
  const stored = (data[SECRET_KEY] || '').trim();
  if (!stored) {
    showStatus('Nincs titkos kulcs beállítva. Beállításokban add meg.', true);
    return;
  }
  if (entered !== stored) {
    showStatus('Hibás titkos kulcs.', true);
    return;
  }
  historyUnlocked = true;
  historyUnlock.style.display = 'none';
  historyEl.style.display = 'block';
  historySecretInput.value = '';
  loadHistory();
});

saveBtn.addEventListener('click', () => {
  const key = apiKeyEl.value.trim();
  if (!key) {
    showStatus('Add meg az API kulcsot.', true);
    return;
  }
  browser.storage.local.set({ 
    [STORAGE_KEY]: key,
    [SECRET_KEY]: secretEl.value.trim()
  }).then(() => {
    showMainView();
    showStatus('API kulcs és titkos kulcs mentve.');
  });
});

// Küldés gomb (telefonról / aktuális eszközről)
sendBtn.addEventListener('click', async () => {
  statusEl.className = 'status';
  statusEl.textContent = '';

  const text = sendTextEl.value.trim();
  if (!text) {
    showStatus('Add meg a küldendő szöveget.', true);
    return;
  }
  if (text.length > MAX_SEND_LENGTH) {
    showStatus(`Max. ${MAX_SEND_LENGTH} karakter küldhető (most: ${text.length}).`, true);
    return;
  }

  let apiKey;
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    apiKey = data[STORAGE_KEY] && String(data[STORAGE_KEY]).trim();
  } catch (e) {
    showStatus('Storage hiba.', true);
    return;
  }

  if (!apiKey) {
    showStatus('Nincs API kulcs. Add meg és mentsd el.', true);
    return;
  }

  const secretData = await browser.storage.local.get(SECRET_KEY);
  const secret = secretData[SECRET_KEY];

  if (!secret) {
    showStatus('Add meg a titkos kulcsot.', true);
    return;
  }

  try {
    const encrypted = await encryptText(secret, text);

    const response = await fetch(`${BASE_URL}/send`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload: encrypted }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      showStatus(`HTTP hiba: ${response.status} - ${errorText}`, true);
      return;
    }

    const result = await response.json();
    if (result.message_id) {
      showStatus('Sikeresen elküldve!');
      sendTextEl.value = ''; // Töröljük a mezőt
      // Opcionálisan menthetjük a történetbe is
      await browser.runtime.sendMessage({
        type: 'SAVE_TO_HISTORY',
        text: text,
        messageId: result.message_id
      });
      loadHistory();
    } else {
      showStatus('Küldés sikeres, de nincs message_id.', true);
    }
  } catch (err) {
    showStatus(err.message || 'Hálózati hiba', true);
  }
});

async function handleSendText(text, messageId, destination) {
  let apiKey;
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    apiKey = data[STORAGE_KEY] && String(data[STORAGE_KEY]).trim();
  } catch (e) {
    showStatus('Storage hiba.', true);
    throw new Error('Storage hiba.');
  }

  if (!apiKey) {
    showStatus('Nincs API kulcs. Add meg és mentsd el.', true);
    throw new Error('Nincs API kulcs.');
  }

  try {
    const resp = await browser.runtime.sendMessage({
      type: 'SEND_AND_ACK',
      message_id: messageId,
      text: String(text),
      apiKey,
      destination,
    });
    if (resp?.error) {
      showStatus(resp.error, true);
      throw new Error(resp.error);
    }
    showStatus(resp?.status ?? 'Kész.');
    loadHistory(); // Frissítjük a történetet
    return { success: true };
  } catch (err) {
    showStatus(err.message || 'Bővítmény hiba', true);
    throw err;
  }
}

fetchBtn.addEventListener('click', async () => {
  statusEl.className = 'status';
  statusEl.textContent = '';

  let apiKey;
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    apiKey = data[STORAGE_KEY] && String(data[STORAGE_KEY]).trim();
  } catch (e) {
    showStatus('Storage hiba.', true);
    return;
  }

  if (!apiKey) {
    showStatus('Nincs API kulcs. Add meg és mentsd el.', true);
    return;
  }

  const destination = document.querySelector('input[name="destination"]:checked').value;

  try {
    const deviceId = await getDeviceId();

    const response = await fetch(
      `${BASE_URL}/next?device_id=${deviceId}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      showStatus(`HTTP hiba: ${response.status}`, true);
      return;
    }

    const messages = await response.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      showStatus('Nincs küldésre váró tartalom.');
      return;
    }

    // Legutolsó üzenet feldolgozása
    const latest = messages[messages.length - 1];

    const secretData = await browser.storage.local.get(SECRET_KEY);
    const secret = secretData[SECRET_KEY];

    if (!secret) {
      showStatus('Hiányzó titkos kulcs.', true);
      return;
    }

    // A backend payload objektumot ad vissza: { iv, ciphertext }
    const decryptedText = await decryptText(secret, latest.payload || latest);

    await handleSendText(
      decryptedText,
      latest.message_id,
      destination
    );
  } catch (err) {
    showStatus(err.message || 'Hálózati hiba', true);
  }
});
