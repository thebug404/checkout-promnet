const API_BASE = '/v1';

/**
 * Create a CyberSource Unified Checkout session via the backend API.
 */
export async function createSession(apiKey, merchantId, sessionData) {
  const res = await fetch(`${API_BASE}/merchants/${merchantId}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(sessionData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.details || err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Process a payment using the transient token from Unified Checkout.
 */
export async function processPayment(apiKey, merchantId, sessionId, transientToken, referenceCode) {
  const res = await fetch(`${API_BASE}/merchants/${merchantId}/sessions/${sessionId}/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ transientToken, referenceCode }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.details || err.error || `HTTP ${res.status}`);
  }

  return res.json();
}
