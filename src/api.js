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

// src/api.js

export const API_URL = (import.meta.env.VITE_API_URL ?? "https://equity-collar-api2.onrender.com").replace(/\/$/, "");
const usingProxy = !/^https?:\/\//i.test(API_URL); // true only if API_URL="/api"

export async function calculatePremium(payload, clientKey) {
  // If using the Vercel proxy, don't send key (proxy injects it server-side).
  // If calling Render directly (API_URL starts with https), put the key in the body to avoid CORS preflight.
  const body = usingProxy
    ? JSON.stringify(payload)
    : JSON.stringify({ ...payload, api_key: clientKey });

  const headers = { "Content-Type": "application/json" };
  // Do NOT set custom auth headers in direct mode (avoids preflight)
  // If you still want to support header mode, it's fine too—but we won't set it here.

  const res = await fetch(`${API_URL}/premium/calculate`, {
    method: "POST",
    headers,
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Premium HTTP ${res.status} ${text}`);
  }
  return res.json();
}

