(function() {
  function ensureDismissButton(alert) {
    if (!alert || alert.querySelector('.btn-close')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-close';
    button.setAttribute('data-bs-dismiss', 'alert');
    button.setAttribute('aria-label', 'Close');
    alert.appendChild(button);
  }

  function autoDismiss(alert) {
    const delay = Number(alert?.dataset?.autoDismiss || 4000);
    if (!Number.isFinite(delay) || delay <= 0) return;

    window.setTimeout(() => {
      if (!alert || !alert.isConnected) return;
      if (window.bootstrap && window.bootstrap.Alert) {
        window.bootstrap.Alert.getOrCreateInstance(alert).close();
      } else {
        alert.remove();
      }
    }, delay);
  }

  function initAlerts() {
    document.querySelectorAll('.alert[role="alert"]').forEach((alert) => {
      if (alert.dataset.alertInitialized === 'true') return;
      alert.dataset.alertInitialized = 'true';
      alert.classList.add('alert-dismissible', 'fade', 'show');
      ensureDismissButton(alert);
      autoDismiss(alert);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAlerts);
  } else {
    initAlerts();
  }
})();
