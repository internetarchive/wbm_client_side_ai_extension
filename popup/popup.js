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
      statusMessage.textContent = 'Saved!';
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 2000);
    });
  });

  document.querySelectorAll('.action-card:not(.action-card--disabled)').forEach(card => {
    card.addEventListener('click', () => {
      const action = card.dataset.action;
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab) {
          chrome.runtime.sendMessage({ type: "PERFORM_ACTION", action, tabId: tab.id }, () => {
            window.close();
          });
        }
      });
    });
  });
});
