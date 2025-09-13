// src/api.js — SINGLE source of truth

// Default to the proxy. You can override with VITE_API_URL if needed.
export const API_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
const usingProxy = !/^https?:\/\//i.test(API_URL); // true when API_URL=/api

export async function calculateCollar(payload) {
  const res = await fetch(`${API_URL}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getExpirations(ticker) {
  // Works with your legacy route (/expirations/{ticker}); backend also supports ?symbol=
  const res = await fetch(`${API_URL}/expirations/${encodeURIComponent(ticker)}`);
  if (!res.ok) throw new Error("Failed to fetch expirations");
  return res.json();
}

// Note: when using the proxy (API_URL=/api), DO NOT send a premium key from the browser.
// The serverless function injects it. If you bypass the proxy (API_URL is an https URL),
// you can still pass a key and it will be sent.
export async function calculatePremium(payload, clientKey) {
  const headers = { "Content-Type": "application/json" };

  if (!usingProxy && clientKey) {
    // Direct-to-Render mode only. Backend accepts either header name.
    headers["X-Premium-Key"] = clientKey;
    headers["X-API-KEY"] = clientKey;
  }

  const res = await fetch(`${API_URL}/premium/calculate`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Premium HTTP ${res.status} ${text}`);
  }
  return res.json();
}
