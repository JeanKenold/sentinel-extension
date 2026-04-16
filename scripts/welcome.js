document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const messageKey = element.getAttribute("data-i18n");
    const message = chrome.i18n.getMessage(messageKey);

    if (message) {
      element.textContent = message;
    }
  });

  const ctaButton = document.getElementById("finish-setup-btn");

  if (ctaButton) {
    ctaButton.addEventListener("click", () => {
      window.open("https://seusiteoficial.com/pro-features", "_blank");
    });
  }

  console.log("Sentinel Onboarding Loaded");
});
