import { useState } from "react";
import { calculatePremium } from "./api";

export default function PremiumDebug() {
  const [ticker, setTicker] = useState("AAPL");
  const [exp, setExp] = useState("2025-10-17");
  const [apiKey, setApiKey] = useState("");
  const [out, setOut] = useState(null);
  const [err, setErr] = useState("");

  async function run() {
    setErr(""); setOut(null);
    try {
      const payload = {
        ticker,
        shares: 100,
        entry_price: 1,         // backend overrides to spot
        put_strike: 175,
        call_strike: 205,
        expiration: exp,
      };
      const resp = await calculatePremium(payload, apiKey);
      setOut(resp);
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h3>Premium Debug</h3>
      <div style={{ display:"grid", gap:8, maxWidth:600 }}>
        <input value={ticker} onChange={e=>setTicker(e.target.value)} placeholder="Ticker"/>
        <input value={exp} onChange={e=>setExp(e.target.value)} placeholder="YYYY-MM-DD"/>
        <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Premium API Key"/>
        <button onClick={run}>Call /premium/calculate</button>
      </div>
      {err && <pre style={{ color:"crimson", whiteSpace:"pre-wrap" }}>{err}</pre>}
      {out && (
        <pre style={{ whiteSpace:"pre-wrap", background:"#111", color:"#0f0", padding:12 }}>
{JSON.stringify({
  topLevelGreeks: { delta: out.delta, gamma: out.gamma, vega: out.vega, theta: out.theta },
  greeks: out.greeks,
  premiumGreeks: out?.premium?.greeks,
  anchorlock: out.anchorlock,
  signals: out.signals,
  premiumAnchor: out?.premium?.anchorlock,
  premiumSignals: out?.premium?.signals,
  spot: out.spot_price,
  spot_policy: out.spot_policy,
  data_source: out.data_source
}, null, 2)}
        </pre>
      )}
    </div>
  );
}
