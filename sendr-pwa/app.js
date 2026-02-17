/**
 * Sendr PWA - ugyanaz a backend (Cloudflare Worker), localStorage
 */

const STORAGE_KEY = 'apiKey';
const SECRET_KEY = 'secretPhrase';
const BASE_URL_KEY = 'baseUrl';
const DEFAULT_BASE_URL = 'https://delicate-leaf-fbfc.rendezo.workers.dev';
const MAX_SEND_LENGTH = 500;

function getBaseUrl() {
  try {
    const u = localStorage.getItem(BASE_URL_KEY);
    const url = (u && u.trim()) ? u.trim() : DEFAULT_BASE_URL;
    if (!url.startsWith('https://')) return DEFAULT_BASE_URL;
    return url.replace(/\/+$/, ''); // levágjuk a végén lévő perjeleket
  } catch (_) {
    return DEFAULT_BASE_URL;
  }
}

async function deriveKey(secret) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('mobio-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(secret, text) {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return { iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)) };
}

async function decryptText(secret, payload) {
  const key = await deriveKey(secret);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
    key,
    new Uint8Array(payload.ciphertext)
  );
  return new TextDecoder().decode(decrypted);
}

function getDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('deviceId', id);
  }
  return id;
}

function getStored(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch (_) {
    return '';
  }
}

function setStored(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch (_) {}
}

const apiKeyEl = document.getElementById('apiKey');
const secretEl = document.getElementById('secret');
const baseUrlEl = document.getElementById('baseUrl');
const saveBtn = document.getElementById('save');
const sendBtn = document.getElementById('send');
const sendTextEl = document.getElementById('sendText');
const fetchBtn = document.getElementById('fetch');
const statusEl = document.getElementById('status');
const fetchedBox = document.getElementById('fetchedBox');
const fetchedTextEl = document.getElementById('fetchedText');
const copyFetchedBtn = document.getElementById('copyFetched');
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
let pendingFetched = null; // { text, messageId } after fetch, until ACK

function showMainView() {
  mainView.classList.remove('hide');
  settingsView.classList.remove('show');
}

function showSettingsView(e) {
  if (e) e.preventDefault();
  mainView.classList.add('hide');
  settingsView.classList.add('show');
}

function showStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.className = 'status show ' + (isError ? 'err' : 'ok');
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'épp most';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' perce';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' órája';
  return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderHistory(history) {
  historyEl.textContent = '';
  if (!history || history.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color: #9ca3af; font-size: 13px; padding: 12px;';
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
      sendTextEl.value = text;
      showStatus('Szöveg beillesztve a küldő mezőbe.');
    });
    historyEl.appendChild(wrap);
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem('history');
    const history = raw ? JSON.parse(raw) : [];
    renderHistory(history);
  } catch (_) {
    renderHistory([]);
  }
}

function saveToHistory(text, messageId) {
  try {
    const raw = localStorage.getItem('history');
    const history = raw ? JSON.parse(raw) : [];
    history.unshift({
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      fullText: text,
      messageId,
      timestamp: Date.now()
    });
    if (history.length > 50) history.pop();
    localStorage.setItem('history', JSON.stringify(history));
  } catch (_) {}
}

async function sendAck(messageId, apiKey) {
  const baseUrl = getBaseUrl();
  const res = await fetch(baseUrl + '/ack', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: getDeviceId(), message_id: messageId })
  });
  if (!res.ok) throw new Error('ACK sikertelen');
}

openSettingsBtn.addEventListener('click', showSettingsView);
closeSettingsBtn.addEventListener('click', (e) => { e.preventDefault(); showMainView(); });

apiKeyEl.value = getStored(STORAGE_KEY);
secretEl.value = getStored(SECRET_KEY);
baseUrlEl.placeholder = DEFAULT_BASE_URL;
const savedUrl = getStored(BASE_URL_KEY);
if (savedUrl) baseUrlEl.value = savedUrl;

historyToggle.addEventListener('click', (e) => {
  if (e.target.id === 'clearHistory' || e.target.closest('#clearHistory')) return;
  historySection.classList.toggle('collapsed');
});

clearHistoryBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (confirm('Biztosan törölni szeretnéd a történetet?')) {
    localStorage.setItem('history', '[]');
    if (historyUnlocked) loadHistory();
    showStatus('Történet törölve.');
  }
});

historyUnlockBtn.addEventListener('click', () => {
  const entered = historySecretInput.value.trim();
  const stored = getStored(SECRET_KEY).trim();
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
  setStored(STORAGE_KEY, key);
  setStored(SECRET_KEY, secretEl.value.trim());
  const url = baseUrlEl.value.trim();
  if (url) setStored(BASE_URL_KEY, url);
  else setStored(BASE_URL_KEY, '');
  showMainView();
  showStatus('Mentve.');
});

sendBtn.addEventListener('click', async () => {
  statusEl.className = 'status';
  statusEl.textContent = '';
  const text = sendTextEl.value.trim();
  if (!text) {
    showStatus('Add meg a küldendő szöveget.', true);
    return;
  }
  if (text.length > MAX_SEND_LENGTH) {
    showStatus('Max. ' + MAX_SEND_LENGTH + ' karakter (most: ' + text.length + ').', true);
    return;
  }
  const apiKey = getStored(STORAGE_KEY).trim();
  const secret = getStored(SECRET_KEY);
  if (!apiKey) {
    showStatus('Nincs API kulcs. Beállításokban add meg.', true);
    return;
  }
  if (!secret) {
    showStatus('Add meg a titkos kulcsot.', true);
    return;
  }
  try {
    const encrypted = await encryptText(secret, text);
    const baseUrl = getBaseUrl();
    const res = await fetch(baseUrl + '/send', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: encrypted })
    });
    if (!res.ok) {
      let msg = 'HTTP hiba: ' + res.status + (res.status === 404 ? '. Ellenőrizd a Beállításokban a Backend URL-t (perjel nélkül).' : ' - ' + (await res.text()));
      showStatus(msg, true);
      return;
    }
    const result = await res.json();
    if (result.message_id) {
      showStatus('Sikeresen elküldve!');
      sendTextEl.value = '';
      saveToHistory(text, result.message_id);
      loadHistory();
    } else {
      showStatus('Küldés sikeres, de nincs message_id.', true);
    }
  } catch (err) {
    showStatus(err.message || 'Hálózati hiba', true);
  }
});

fetchBtn.addEventListener('click', async () => {
  statusEl.className = 'status';
  statusEl.textContent = '';
  fetchedBox.classList.remove('show');
  pendingFetched = null;
  const apiKey = getStored(STORAGE_KEY).trim();
  const secret = getStored(SECRET_KEY);
  if (!apiKey) {
    showStatus('Nincs API kulcs. Beállításokban add meg.', true);
    return;
  }
  if (!secret) {
    showStatus('Hiányzó titkos kulcs.', true);
    return;
  }
  try {
    const baseUrl = getBaseUrl();
    const deviceId = getDeviceId();
    const res = await fetch(baseUrl + '/next?device_id=' + encodeURIComponent(deviceId), {
      method: 'GET',
      headers: { 'x-api-key': apiKey, 'Accept': 'application/json' }
    });
    if (!res.ok) {
      let msg = 'HTTP hiba: ' + res.status;
      if (res.status === 404) {
        msg += '. Ellenőrizd a Beállításokban a Backend URL-t (pl. https://xxx.workers.dev, perjel nélkül).';
      }
      showStatus(msg, true);
      return;
    }
    const messages = await res.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      showStatus('Nincs küldésre váró tartalom.');
      return;
    }
    const latest = messages[messages.length - 1];
    const decryptedText = await decryptText(secret, latest.payload || latest);
    fetchedTextEl.textContent = decryptedText;
    fetchedBox.classList.add('show');
    pendingFetched = { text: decryptedText, messageId: latest.message_id };

    try {
      await navigator.clipboard.writeText(decryptedText);
      await sendAck(latest.message_id, apiKey);
      saveToHistory(decryptedText, latest.message_id);
      loadHistory();
      showStatus('Vágólapra másolva, ACK elküldve.');
    } catch (_) {
      showStatus('Lekérve. Másold vágólapra a gombbal, ha kell.');
    }
  } catch (err) {
    showStatus(err.message || 'Hálózati hiba', true);
  }
});

copyFetchedBtn.addEventListener('click', async () => {
  if (!pendingFetched) return;
  try {
    await navigator.clipboard.writeText(pendingFetched.text);
    showStatus('Vágólapra másolva.');
    const apiKey = getStored(STORAGE_KEY).trim();
    if (apiKey && pendingFetched.messageId) {
      await sendAck(pendingFetched.messageId, apiKey);
      saveToHistory(pendingFetched.text, pendingFetched.messageId);
      loadHistory();
    }
    pendingFetched = null;
  } catch (_) {
    showStatus('Másolás sikertelen.', true);
  }
});
