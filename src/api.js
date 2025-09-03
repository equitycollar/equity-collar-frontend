// Point directly at your Render URL (can switch to VITE_API_URL later)
export const API_URL = "https://equity-collar-api2.onrender.com";

export async function calculateCollar(payload){
  const url = `${API_URL}/calculate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if(!res.ok){
    const txt = await res.text().catch(()=> "");
    console.error("calculate error", res.status, url, txt);
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function getExpirations(ticker){
  const url = `${API_URL}/expirations/${encodeURIComponent(ticker)}`;
  const res = await fetch(url);
  if(!res.ok){
    const txt = await res.text().catch(()=> "");
    console.error("expirations error", res.status, url, txt);
    throw new Error('Failed to fetch expirations');
  }
  return res.json();
}

// src/api.js
export const API_URL = import.meta.env.VITE_API_URL || "https://equity-collar-api2.onrender.com";

export async function calculateCollar(payload){
  const res = await fetch(`${API_URL}/calculate`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getExpirations(ticker){
  const res = await fetch(`${API_URL}/expirations/${encodeURIComponent(ticker)}`);
  if(!res.ok) throw new Error('Failed to fetch expirations');
  return res.json();
}

// NEW: premium
export async function calculatePremium(payload, apiKey){
  const res = await fetch(`${API_URL}/premium/calculate`, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'X-API-KEY': apiKey || ''   // do NOT hardcode your key
    },
    body: JSON.stringify(payload)
  });
  if(!res.ok){
    const text = await res.text().catch(()=> '');
    throw new Error(`Premium HTTP ${res.status} ${text}`);
  }
  return res.json();
}

