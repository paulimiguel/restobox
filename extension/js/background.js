const RESTOBOX_URL = 'https://restobox.beweb.com.ar/';

chrome.runtime.onMessage.addListener((request) => {
  if (request?.action !== 'openImport' || typeof request.url !== 'string') return;
  try {
    const source = new URL(request.url);
    if (!['http:', 'https:'].includes(source.protocol)) return;
    const destination = new URL(RESTOBOX_URL);
    destination.searchParams.set('import_url', source.toString());
    chrome.tabs.create({ url: destination.toString() });
  } catch {
    // Las direcciones inválidas se ignoran.
  }
});
