/**
 * Sendr - Background (Chrome MV3): service worker, browser.* via webextension-polyfill
 * Listeners registered at top level so the service worker stays valid.
 */
importScripts('browser-polyfill.min.js');

const BASE_URL = 'https://delicate-leaf-fbfc.rendezo.workers.dev';

// ACK küldése az új formátummal: body-ban device_id + message_id
async function sendAck(messageId, apiKey) {
  const deviceData = await browser.storage.local.get('deviceId');
  const deviceId = deviceData.deviceId;

  const response = await fetch(`${BASE_URL}/ack`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      device_id: deviceId,
      message_id: messageId
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ACK sikertelen: ${response.status} - ${text}`);
  }
}

function sendToContentScript(text, destination) {
  return new Promise((resolve) => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) {
        resolve({ status: '', noTab: true });
        return;
      }
      browser.tabs.sendMessage(tabs[0].id, { 
        type: 'INSERT_TEXT', 
        text: text,
        destination: destination 
      }, (response) => {
        if (browser.runtime.lastError) {
          console.warn('[Sendr] Content script error:', browser.runtime.lastError.message);
          resolve({ status: '', noTab: false });
          return;
        }
        resolve(response ?? { status: '' });
      });
    });
  });
}

async function saveToHistory(text, messageId) {
  try {
    const data = await browser.storage.local.get('history');
    const history = data.history || [];
    history.unshift({
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      fullText: text,
      messageId,
      timestamp: Date.now()
    });
    // Csak az utolsó 50 elemet tároljuk
    if (history.length > 50) {
      history.pop();
    }
    await browser.storage.local.set({ history });
  } catch (err) {
    console.warn('[Sendr] History mentés hiba:', err);
  }
}

// Top-level listener registration (required for service worker)
browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'SEND_AND_ACK') return;

  const { message_id: messageId, text, apiKey, destination } = message;
  if (text == null || !apiKey) {
    return Promise.resolve({ error: 'Hiányzó text vagy apiKey.' });
  }

  return (async () => {
    try {
      // Mindkét esetben a content scriptet használjuk (vágólap és mezőbe beillesztés)
      const contentResponse = await sendToContentScript(text, destination);
      if (contentResponse?.status !== 'OK') {
        const msg = contentResponse?.noTab === true
          ? 'Nincs aktív lap. Nyiss meg egy oldalt, majd próbáld újra.'
          : destination === 'clipboard'
            ? 'Nem sikerült a vágólapra másolás. Próbáld újra.'
            : 'Nem sikerült a beillesztés. Próbáld újra vagy használd a vágólap opciót.';
        return { error: msg };
      }

      // ACK csak akkor, ha van messageId (szerverről jött üzenet)
      if (messageId) {
        await sendAck(messageId, apiKey);
        await saveToHistory(text, messageId);
        console.log('[Sendr] message_id:', messageId);
        return { 
          status: destination === 'clipboard' 
            ? 'Vágólapra másolva, ACK elküldve.' 
            : 'Beillesztve, ACK elküldve.' 
        };
      } else {
        // History-ból küldés: nincs ACK, csak beillesztés
        return { 
          status: destination === 'clipboard' 
            ? 'Vágólapra másolva.' 
            : 'Beillesztve.' 
        };
      }
    } catch (err) {
      console.warn('[Sendr] Hiba:', err);
      return { error: err.message || 'Ismeretlen hiba' };
    }
  })();
});

// History lekérdezés és mentés – top-level listener
browser.runtime.onMessage.addListener((message) => {
  if (message?.type === 'GET_HISTORY') {
    return browser.storage.local.get('history').then((data) => {
      return { history: data.history || [] };
    });
  }
  
  // History mentés (küldés után)
  if (message?.type === 'SAVE_TO_HISTORY') {
    return saveToHistory(message.text, message.messageId).then(() => {
      return { status: 'OK' };
    });
  }
});
