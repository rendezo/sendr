/**
 * Sendr - Content Script (Chrome): browser.* API via webextension-polyfill
 */

function findActiveInput() {
  // Először próbáljuk meg az aktív elemet
  const active = document.activeElement;
  if (active && (
    active.tagName === 'INPUT' || 
    active.tagName === 'TEXTAREA' ||
    active.isContentEditable
  )) {
    return active;
  }

  // Keresünk input/textarea mezőket
  const inputs = document.querySelectorAll('input[type="text"], input[type="url"], input[type="email"], input[type="search"], textarea, [contenteditable="true"]');
  
  // Visszaadjuk az első látható mezőt
  for (const input of inputs) {
    if (input.offsetParent !== null) {
      return input;
    }
  }
  
  return null;
}

function insertText(element, text) {
  if (element.isContentEditable) {
    // ContentEditable elemekhez
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // Ha nincs kijelölés, egyszerűen hozzáfűzzük a szöveget
      element.focus();
      const textNode = document.createTextNode(text);
      element.appendChild(textNode);
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } else {
    // Normál input/textarea mezőkhöz
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const value = element.value || '';
    element.value = value.substring(0, start) + text + value.substring(end);
    element.selectionStart = element.selectionEnd = start + text.length;
  }
  
  // Események kiváltása
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'INSERT_TEXT') return;
  if (message?.text == null) {
    return Promise.resolve({ status: '' });
  }

  return (async () => {
    try {
      const destination = message.destination || 'field';
      const text = String(message.text);

      if (destination === 'clipboard') {
        // Vágólapra másolás
        try {
          await navigator.clipboard.writeText(text);
          return { status: 'OK' };
        } catch (err) {
          // Fallback: execCommand használata
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          textarea.style.top = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          try {
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (success) {
              return { status: 'OK' };
            } else {
              return { status: '' };
            }
          } catch (e) {
            document.body.removeChild(textarea);
            return { status: '' };
          }
        }
      } else {
        // Aktuális mezőbe beillesztés
        const input = findActiveInput();
        if (!input) {
          console.warn('[Sendr] Nem található aktív mező.');
          return { status: '' };
        }
        
        // Fókusz beállítása, ha nincs
        if (document.activeElement !== input) {
          input.focus();
        }
        
        insertText(input, text);
        return { status: 'OK' };
      }
    } catch (err) {
      console.warn('[Sendr] Hiba:', err);
      return { status: '' };
    }
  })();
});
