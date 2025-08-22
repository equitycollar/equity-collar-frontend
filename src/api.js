// Replace with your real Render URL once deployed
export const API_URL = import.meta.env.VITE_API_URL || "https://equity-collar-api.onrender.com";

export async function calculateCollar(payload){
  const res = await fetch(`${API_URL}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if(!res.ok){
    const err = await res.json().catch(()=>({detail:'Unknown error'}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getExpirations(ticker){
  const res = await fetch(`${API_URL}/expirations/${encodeURIComponent(ticker)}`);
  if(!res.ok) throw new Error('Failed to fetch expirations');
  return res.json();
}
