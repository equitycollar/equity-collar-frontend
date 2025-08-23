// src/api.js
export const API_URL = "https://equity-collar-api.onrender.com"; // 

export async function calculateCollar(payload){
  const res = await fetch(`${API_URL}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if(!res.ok){
    const txt = await res.text().catch(()=>"");
    console.error("Calc error", res.status, txt);
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function getExpirations(ticker){
  const res = await fetch(`${API_URL}/expirations/${encodeURIComponent(ticker)}`);
  if(!res.ok){
    const txt = await res.text().catch(()=>"");
    console.error("Expirations error", res.status, txt);
    throw new Error('Failed to fetch expirations');
  }
  return res.json();
}
