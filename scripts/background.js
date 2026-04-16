chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "welcome.html" });
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isPro) {
    const iconPath = changes.isPro.newValue
      ? "icons/gold/icon48.png"
      : "icons/default/icon48.png";
    chrome.action.setIcon({ path: iconPath });
  }
});
