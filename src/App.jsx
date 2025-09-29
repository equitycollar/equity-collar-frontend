// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { calculateCollar, getExpirations, calculatePremium } from "./api";
import {
  Chart, LineController, LineElement, PointElement, LinearScale,
  Title, CategoryScale, Tooltip, Legend
} from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend);

export default function App() {
  const [form, setForm] = useState({
    ticker: "AAPL", shares: 100, entry_price: 220, put_strike: 180, call_strike: 250, expiration: ""
  });
  const [exps, setExps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);

  // Premium state
  const [proKey, setProKey] = useState(localStorage.getItem("PREMIUM_API_KEY") || "");
  const [proLoading, setProLoading] = useState(false);
  const [proErr, setProErr] = useState("");
  const [pro, setPro] = useState(null);

  const chartRef = useRef(null);
  const chartObj = useRef(null);

  // Load expirations whenever ticker changes
  useEffect(() => {
    setRes(null); setPro(null); setErr(""); setProErr("");
    (async () => {
      try {
        const resp = await getExpirations(form.ticker);
        // Support either array or {expirations:[...]}
        const list = Array.isArray(resp) ? resp : (resp?.expirations || []);
        setExps(list);
        if (list?.length) setForm(f => ({ ...f, expiration: list[0] }));
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, [form.ticker]);

  // Draw payoff chart
  useEffect(() => {
    if (!res) return;
    const ctx = chartRef.current?.getContext("2d"); if (!ctx) return;
    if (chartObj.current) chartObj.current.destroy();

    const xs = res.payoff_prices.map(Number);
    const ys = res.payoff_values.map(Number);
    const pairs = xs.map((x, i) => [x, ys[i]]).sort((a, b) => a[0] - b[0]);

    chartObj.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: pairs.map(p => p[0]),
        datasets: [{
          label: "Payoff at Expiration",
          data: pairs.map(p => p[1]),
          pointRadius: 0,
          tension: 0,
          stepped: true
        }]
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: `${res.ticker} Collar Payoff` }, legend: { display: false }, tooltip: { mode: "nearest", intersect: false } },
        elements: { line: { tension: 0 } },
        scales: { x: { title: { display: true, text: "Stock Price at Expiration" } }, y: { title: { display: true, text: "P/L ($)" } } },
        animation: false
      }
    });
    return () => chartObj.current?.destroy();
  }, [res]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({
      ...f,
      [name]:
        name === "shares" ? Number(value || 0)
          : ["entry_price", "put_strike", "call_strike"].includes(name) ? Number(value || 0)
            : value
    }));
  };

  const submit = async () => {
    setLoading(true); setErr(""); setRes(null); setPro(null); setProErr("");
    try {
      const data = await calculateCollar(form);
      setRes(data);
    } catch (e) { setErr(String(e.message || e)); }
    finally { setLoading(false); }
  };

  const loadPremium = async () => {
    setPro(null); setProErr(""); setProLoading(true);
    try {
      if (!proKey.trim()) throw new Error("Premium key missing.");
      localStorage.setItem("PREMIUM_API_KEY", proKey.trim());
      const data = await calculatePremium({
        ticker: form.ticker.toUpperCase(),
        shares: form.shares,
        entry_price: form.entry_price,         // backend will override to spot per policy
        put_strike: form.put_strike,
        call_strike: form.call_strike,
        expiration: form.expiration
      }, proKey.trim());
      setPro(data);
    } catch (e) { setProErr(String(e.message || e)); }
    finally { setProLoading(false); }
  };

  const kpis = useMemo(() => res ? [
    { title: "Net Premium", val: `$${res.net_premium}` },
    { title: "Max Gain", val: `$${res.max_gain}` },
    { title: "Max Loss", val: `$${res.max_loss}` },
  ] : [], [res]);

  // ------ helpers to read backend fields safely ------
  const g = pro?.portfolioGreeks?.net || pro?.greeks || pro || {};
  const ivPut  = pro?.iv_put ?? pro?.iv?.put ?? "—";
  const ivCall = pro?.iv_call ?? pro?.iv?.call ?? "—";
  const signal = pro?.signal ?? pro?.signals?.action ?? "—";

  const comp = pro?.components || {}; // backend sends components at root
  const assumptions = pro?.assumptions || {}; // backend sends assumptions at root

  return (
    <div className="wrapper">
      <h1 className="h1">Equity Collar Calculator</h1>

      <div className="card">
        <div className="grid">
          <div><div className="label">Ticker</div><input className="input" name="ticker" value={form.ticker} onChange={onChange} /></div>
          <div><div className="label">Shares</div><input className="input" name="shares" type="number" value={form.shares} onChange={onChange} /></div>
          <div><div className="label">Entry Price</div><input className="input" name="entry_price" type="number" step="0.01" value={form.entry_price} onChange={onChange} /></div>
          <div><div className="label">Put Strike</div><input className="input" name="put_strike" type="number" step="1" value={form.put_strike} onChange={onChange} /></div>
          <div><div className="label">Call Strike</div><input className="input" name="call_strike" type="number" step="1" value={form.call_strike} onChange={onChange} /></div>
          <div>
            <div className="label">Expiration</div>
            <select className="input" name="expiration" value={form.expiration} onChange={onChange}>
              {exps.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        <div className="row" style={{ marginTop: 14, gap: 12 }}>
          <button className="btn" onClick={submit} disabled={loading}>{loading ? "Calculating…" : "Calculate"}</button>
          {err && <span className="badge" style={{ borderColor: "var(--err)", color: "#ffd9d9" }}>{err}</span>}
        </div>

        {res && (
          <>
            <div className="kpis">
              {kpis.map(k => (
                <div key={k.title} className="kpi">
                  <div className="title">{k.title}</div>
                  <div className="val">{k.val}</div>
                </div>
              ))}
            </div>

            <table className="table">
              <tbody>
                <tr><th>Selected Put</th><td>{res.selected_put_strike}</td><th>Put Premium (paid)</th><td>${res.put_premium_paid}</td></tr>
                <tr><th>Selected Call</th><td>{res.selected_call_strike}</td><th>Call Premium (rcv)</th><td>${res.call_premium_received}</td></tr>
                <tr><th>Breakeven (est)</th><td>${res.breakeven_estimate}</td><th>Spot (policy)</th><td>{res.spot_price ?? "n/a"} ({res.spot_policy || "—"})</td></tr>
              </tbody>
            </table>

            <div className="chart">
              <canvas ref={chartRef} height="240" />
              <div className="note">Payoff uses delayed data and mid-pricing for premiums.</div>
            </div>

            {/* ---------------- Premium Section ---------------- */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 10 }}>
                <div className="label">Premium API Key</div>
                <input
                  className="input" type="password" placeholder="Paste API key"
                  value={proKey} onChange={e => setProKey(e.target.value)} style={{ maxWidth: 320 }}
                />
                <button className="btn" onClick={loadPremium} disabled={proLoading || !proKey.trim()}>
                  {proLoading ? "Loading…" : "Load Premium"}
                </button>
                {proErr && <span className="badge" style={{ borderColor: "var(--err)", color: "#ffd9d9" }}>{proErr}</span>}
              </div>

              {pro && (
                <>
                  <h3 className="h1" style={{ fontSize: 18, marginTop: 0 }}>Premium: Greeks & AnchorLock</h3>

                  <div className="kpis">
                    <div className="kpi">
                      <div className="title">AnchorLock Score</div>
                      <div className="val">{pro?.signals?.score ?? pro?.anchorlock?.score ?? "—"}</div>
                    </div>
                    <div className="kpi">
                      <div className="title">Signal</div>
                      <div className="val">{signal}</div>
                    </div>
                    <div className="kpi">
                      <div className="title">IV (Put / Call)</div>
                      <div className="val">{ivPut} / {ivCall}</div>
                    </div>
                  </div>

                  <div className="grid" style={{ marginTop: 16 }}>
                    <div className="kpi">
                      <div className="title">Portfolio Greeks (Net)</div>
                      <table className="table">
                        <tbody>
                          <tr><th>Delta</th><td>{g.Delta ?? g.delta ?? "—"}</td></tr>
                          <tr><th>Gamma</th><td>{g.Gamma ?? g.gamma ?? "—"}</td></tr>
                          <tr><th>Theta</th><td>{g.Theta ?? g.theta ?? "—"}</td></tr>
                          <tr><th>Vega</th><td>{g.Vega ?? g.vega ?? "—"}</td></tr>
                          <tr><th>Rho</th><td>{g.Rho ?? g.rho ?? "—"}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="kpi">
                      <div className="title">Components</div>
                      <table className="table">
                        <tbody>
                          <tr><th>RSI</th><td>{comp.RSI ?? "—"}</td></tr>
                          <tr><th>RSI Score</th><td>{comp.RSIScore ?? "—"}</td></tr>
                          <tr><th>Momentum 30d</th><td>{comp.Momentum30d ?? "—"}</td></tr>
                          <tr><th>200-DMA</th><td>{comp.DMA200 ?? "—"}</td></tr>
                          <tr><th>Gap to 200-DMA</th><td>{comp.GapTo200DMA ?? "—"}</td></tr>
                          <tr><th>200-DMA 30d slope</th><td>{comp.DMA200Slope30d ?? "—"}</td></tr>
                          <tr><th>Earnings Score</th><td>{comp.EarningsScore ?? "—"}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="kpi" style={{ marginTop: 16 }}>
                    <div className="title">Assumptions</div>
                    <table className="table">
                      <tbody>
                        <tr><th>r</th><td>{assumptions.r ?? "—"}</td></tr>
                        <tr><th>q</th><td>{assumptions.q ?? "—"}</td></tr>
                        <tr><th>Time to Exp (yrs)</th><td>{assumptions.time_to_exp_years ?? "—"}</td></tr>
                        <tr><th>Contracts</th><td>
                          {assumptions.contracts
                            ? (typeof assumptions.contracts === "string"
                                ? assumptions.contracts
                                : JSON.stringify(assumptions.contracts))
                            : "—"}
                        </td></tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
