function isValidLuhn(number) {
  const cleanNumber = number.replace(/\D/g, "");

  if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function isValidCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return emailRegex.test(email.trim());
}

function isValidAPIKey(token) {
  const knownSignatures = [
    /^sk_live_[0-9a-zA-Z]{24,34}$/,
    /^sk-[a-zA-Z0-9]{48}$/,
    /^AIza[0-9A-Za-z-_]{35}$/,

    /^AKIA[0-9A-Z]{16}$/,
    /^dp\.[a-zA-Z0-9]{36}$/,
    /^do[a-zA-Z0-9_]{26}$/,

    /^ghp_[a-zA-Z0-9]{36}$/,
    /^glpat-[a-zA-Z0-9\-]{20}$/,
    /^npm_[a-zA-Z0-9]{36}$/,

    /^xox[baprs]-[0-9a-zA-Z]{10,48}$/,
    /^SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}$/,
    /^SK[0-9a-fA-F]{32}$/,
    /^[0-9a-f]{32}-us[0-9]{1,2}$/,

    /^sq0[a-z]{3}-[0-9A-Za-z\-_]{22,43}$/,
    /^access_token\$production\$[a-zA-Z0-9]+$/,
  ];

  return knownSignatures.some((regex) => regex.test(token.trim()));
}

const patterns = {
  creditCard: /\b(?:\d[ -]*?){13,19}\b/g,
  cpf: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  apiKey:
    /\b(?:sk_live_|sk-|AIza|AKIA|dp\.|do|ghp_|glpat-|npm_|xox[baprs]-|SG\.|SK|sq0[a-z]{3}-|access_token\$)[a-zA-Z0-9-_\.$]{20,60}\b/g,
};

function auditText(text, element) {
  if (!chrome.runtime?.id) {
    console.warn(
      "[Sentinel Audit] Contexto invalidado. Por favor, recarregue a página.",
    );
    return;
  }
  const currentDomain = window.location.hostname;

  chrome.storage.local.get(["whitelist"], (result) => {
    const whitelist = result.whitelist || [];
    if (whitelist.includes(currentDomain)) {
      return;
    }

    let detectedThreats = [];

    Object.keys(patterns).forEach((key) => {
      const matches = text.match(patterns[key]);

      if (matches) {
        if (key === "creditCard") {
          const validCards = matches.filter((card) => isValidLuhn(card));
          if (validCards.length > 0) {
            detectedThreats.push("Credit Card");
            console.warn("[Sentinel Audit] Credit Card detected!");
          }
        } else if (key === "cpf") {
          const validCPFs = matches.filter((cpf) => isValidCPF(cpf));
          if (validCPFs.length > 0) {
            detectedThreats.push("CPF");
            console.warn("[Sentinel Audit] CPF detected!");
          }
        } else if (key === "apiKey") {
          const validAPIs = matches.filter((keyStr) => isValidAPIKey(keyStr));
          if (validAPIs.length > 0) {
            detectedThreats.push("API Key (High Risk)");
            console.warn("[Sentinel Audit] API Key detected!");
          }
        } else if (key === "email") {
          const validEmails = matches.filter((email) => isValidEmail(email));
          if (validEmails.length > 0) {
            detectedThreats.push("E-mail");
            console.warn("[Sentinel Audit] E-mail detected!");
          }
        }
      }
    });

    if (detectedThreats.length > 0) {
      applyAlert(element);
      saveAlertCount(detectedThreats[0]);
    } else {
      removeAlert(element);
    }
  });
}

function applyAlert(el) {
  el.style.setProperty("border", "4px solid #ef4444", "important");
  el.style.setProperty("background-color", "#fff1f1", "important");
  el.title = "[Sentinel Audit] Sensitive data detected!";
}

function removeAlert(el) {
  el.style.border = "";
  el.style.backgroundColor = "";
  el.style.removeProperty("border");
}

function saveAlertCount(type) {
  const newLog = {
    type: type,
    site: window.location.hostname,
    time: new Date().toLocaleTimeString(),
  };

  chrome.storage.local.get(["blockedCount", "logs"], (res) => {
    const count = (res.blockedCount || 0) + 1;
    const logs = res.logs || [];

    logs.unshift(newLog);
    if (logs.length > 5) logs.pop();

    chrome.storage.local.set({
      blockedCount: count,
      logs: logs,
    });
  });
}

let timeout;
document.addEventListener("input", (e) => {
  clearTimeout(timeout);
  const target = e.target;
  if (
    target.tagName === "TEXTAREA" ||
    target.tagName === "INPUT" ||
    target.isContentEditable
  ) {
    timeout = setTimeout(() => {
      auditText(target.value || target.innerText, target);
    }, 500);
  }
});
