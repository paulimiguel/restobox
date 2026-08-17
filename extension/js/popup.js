let currentUrl = '';

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const info = document.querySelector('#page-info');
  const button = document.querySelector('#import-button');
  try {
    const url = new URL(tab?.url || '');
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname === 'restobox.beweb.com.ar') throw new Error();
    currentUrl = url.toString();
    info.textContent = tab?.title || url.hostname;
    info.title = currentUrl;
    button.disabled = false;
  } catch {
    info.textContent = 'Esta página no se puede importar.';
  }
  button.addEventListener('click', () => {
    if (!currentUrl) return;
    chrome.runtime.sendMessage({ action: 'openImport', url: currentUrl });
    window.close();
  });
});
