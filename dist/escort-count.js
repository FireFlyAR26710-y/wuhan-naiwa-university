(() => {
  'use strict';
  const endpoint = '/api/escort-count';
  const number = document.getElementById('escort-number');
  const line = document.getElementById('escort-total');
  const target = window.NAIWA_CONFIG.targetUrl;
  let departureSent = false;
  let supported = false;

  async function readCount() {
    try {
      const response = await fetch(endpoint, {credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(4500)});
      if (!response.ok) throw new Error('Counter unavailable');
      const data = await response.json();
      if (!Number.isSafeInteger(data.count) || data.count < 0) throw new Error('Invalid count');
      number.textContent = new Intl.NumberFormat('zh-CN').format(data.count);
      line.removeAttribute('data-loading');
      line.dataset.state = 'ready';
      supported = true;
    } catch {
      // Do not replace missing data with an invented zero or locally cached total.
      if (!supported) { line.dataset.state = 'unavailable'; number.textContent = '—'; }
    }
  }

  window.naiwaEscort = {
    recordDeparture() {
      if (departureSent || !supported) return;
      departureSent = true;
      // keepalive lets the genuine departure event finish after the page navigates.
      fetch(endpoint, {
        method: 'POST', credentials: 'same-origin', keepalive: true,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({event: 'depart', target})
      }).catch(() => {});
    }
  };

  readCount();
  setInterval(() => { if (!document.hidden) readCount(); }, 30000);
})();
