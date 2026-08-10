document.addEventListener('DOMContentLoaded', () => {
  const languageSelect = document.getElementById('language-select');
  const saveButton = document.getElementById('save-button');
  const statusMessage = document.getElementById('status-message');

  chrome.storage.sync.get(['targetLanguage'], (result) => {
    if (result.targetLanguage) {
      languageSelect.value = result.targetLanguage;
    } else {
      languageSelect.value = 'en';
    }
  });

  saveButton.addEventListener('click', () => {
    const selectedLanguage = languageSelect.value;
    chrome.storage.sync.set({ targetLanguage: selectedLanguage }, () => {
      statusMessage.textContent = 'Settings saved!';
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 2000);
    });
  });
});
