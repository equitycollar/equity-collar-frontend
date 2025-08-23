// Point directly at your Render URL (can switch to VITE_API_URL later)
export const API_URL = "https://equity-collar-api.onrender.com";

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
