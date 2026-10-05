function isEditableTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
}

document.addEventListener('keydown', (event) => {
  if (
    event.code !== 'KeyR'
    || !event.shiftKey
    || event.ctrlKey
    || event.altKey
    || event.metaKey
    || event.repeat
    || isEditableTarget(event.target)
  ) return;

  event.preventDefault();
  event.stopPropagation();
  chrome.runtime.sendMessage({ action: 'openPopup' });
}, true);
