document.addEventListener("DOMContentLoaded", () => {
  const display = document.getElementById("blocked-count");
  const domainLabel = document.getElementById("current-domain");
  const btnWhitelist = document.getElementById("btn-whitelist");
  const logList = document.getElementById("log-list");
  const scoreDisplay = document.getElementById("security-score");

  function updateScore(blockedCount) {
    if (!scoreDisplay) return;

    let score = Math.max(0, 100 - blockedCount * 5);
    scoreDisplay.textContent = score;

    scoreDisplay.classList.remove("warning", "danger");

    if (score <= 50) {
      scoreDisplay.classList.add("danger");
    } else if (score <= 80) {
      scoreDisplay.classList.add("warning");
    }
  }

  chrome.storage.local.get(["blockedCount", "whitelist", "logs"], (res) => {
    display.textContent = res.blockedCount || 0;
    updateScore(res.blockedCount || 0);

    renderLogs(res.logs || []);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const domain = new URL(tabs[0].url).hostname;
        domainLabel.textContent = domain;

        if ((res.whitelist || []).includes(domain)) {
          btnWhitelist.textContent = "Remove Trust";
          btnWhitelist.classList.add("trusted");
        }
      }
    });
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.blockedCount) {
      display.textContent = changes.blockedCount.newValue;
      updateScore(changes.blockedCount.newValue);
    }
    if (changes.logs) {
      renderLogs(changes.logs.newValue);
    }
  });

  function renderLogs(logs) {
    if (!logList) return;
    logList.innerHTML = "";

    logs.forEach((log) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${log.time}</strong>: Detected ${log.type} on <em>${log.site}</em>`;
      logList.appendChild(li);
    });
  }

  btnWhitelist.onclick = () => {
    const domain = domainLabel.textContent;
    chrome.storage.local.get(["whitelist"], (res) => {
      let whitelist = res.whitelist || [];

      if (whitelist.includes(domain)) {
        whitelist = whitelist.filter((d) => d !== domain);
        btnWhitelist.textContent = "Trust this site";
      } else {
        whitelist.push(domain);
        btnWhitelist.textContent = "Remove Trust";
      }

      chrome.storage.local.set({ whitelist: whitelist });
    });
  };

  document.getElementById("btn-clear").onclick = () => {
    if (confirm("Clear all logs and statistics?")) {
      chrome.storage.local.set({ blockedCount: 0, logs: [] });
      display.textContent = "0";
      logList.innerHTML = "";
    }
  };

  document.getElementById("btn-upgrade").onclick = () => {
    window.open("https://your-stripe-payment-link.com", "_blank");
  };
  document.getElementById("btn-export").onclick = () => {
    chrome.storage.local.get(["blockedCount", "logs", "whitelist"], (res) => {
      const reportData = {
        extension: "Sentinel Privacy Auditor",
        exportDate: new Date().toLocaleString(),
        totalThreatsDetected: res.blockedCount || 0,
        trustedDomains: res.whitelist || [],
        activityLogs: res.logs || [],
      };

      const jsonString = JSON.stringify(reportData, null, 2);

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `sentinel_audit_${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };
});
