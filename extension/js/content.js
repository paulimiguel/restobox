const isRestoBox = location.hostname === 'restobox.beweb.com.ar';

function hasRestaurantSchema() {
  return [...document.querySelectorAll('script[type="application/ld+json"]')].some((script) =>
    /Restaurant|FoodEstablishment|CafeOrCoffeeShop|BarOrPub|LocalBusiness/i.test(script.textContent || '')
  );
}

function looksLikePlacePage() {
  if (hasRestaurantSchema()) return true;
  const text = (document.body?.innerText || '').slice(0, 60000).toLocaleLowerCase();
  const signals = ['restaurante', 'restaurant', 'menú', 'menu', 'reservas', 'horarios', 'ubicación', 'dirección'];
  return signals.filter((signal) => text.includes(signal)).length >= 2;
}

function openImporter() {
  chrome.runtime.sendMessage({ action: 'openImport', url: location.href });
}

function addImportButton() {
  if (isRestoBox || document.querySelector('#restobox-import-button') || !looksLikePlacePage()) return;
  const button = document.createElement('button');
  button.id = 'restobox-import-button';
  button.type = 'button';
  button.title = 'Importar este lugar a RestoBox';
  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('icons/mark.svg');
  icon.alt = '';
  const tooltip = document.createElement('span');
  tooltip.textContent = 'Importar a RestoBox';
  button.append(icon, tooltip);
  button.addEventListener('click', openImporter);
  document.body.append(button);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addImportButton, { once: true });
else addImportButton();
