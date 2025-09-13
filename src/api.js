// src/api.js — SINGLE source of truth (proxy-friendly)

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
  // 1) Try query-style (returns { symbol, expirations: [...] })
  let res = await fetch(`${API_URL}/expirations?symbol=${encodeURIComponent(ticker)}`);
  if (res.ok) {
    const json = await res.json();
    if (json && Array.isArray(json.expirations)) return json.expirations;
  } else {
    // If not ok, try to capture the message (helps a lot)
    const txt = await res.text().catch(() => "");
    console.warn("Expirations query endpoint failed:", res.status, txt);
  }

  // 2) Fallback to legacy path-style (returns an array)
  res = await fetch(`${API_URL}/expirations/${encodeURIComponent(ticker)}`);
  if (res.ok) {
    const json = await res.json();
    if (Array.isArray(json)) return json;
    // some backends return {expirations:[...]} even here
    if (json && Array.isArray(json.expirations)) return json.expirations;
  } else {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to fetch expirations (HTTP ${res.status}) ${txt}`);
  }

  throw new Error("Failed to fetch expirations (unexpected response shape)");
}

// Premium: when using the proxy (/api), do NOT send a key from the browser.
// The Vercel function injects it server-side. If you bypass the proxy, you can still pass a key.
export async function calculatePremium(payload, clientKey) {
  const headers = { "Content-Type": "application/json" };
  if (!usingProxy && clientKey) {
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
