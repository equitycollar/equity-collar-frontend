import React, { useEffect, useMemo, useRef, useState } from 'react'
import { calculateCollar, getExpirations, calculatePremium } from './api'
import {
  Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend
} from 'chart.js'
import PremiumDebug from "./PremiumDebug";
export default function App() {
  return <PremiumDebug />;
}

// PremiumPanel.jsx (or wherever your form lives)
import { useEffect, useState } from "react";
import { calculatePremium } from "./api";

export default function PremiumPanel({ form }) {
  const [premium, setPremium] = useState(null);
  const [pErr, setPErr] = useState("");
  const [pLoading, setPLoading] = useState(false);

  // read key from an input or .env; this reads from localStorage for convenience
  const apiKey = localStorage.getItem("PREMIUM_API_KEY") || "";

  useEffect(() => {
    const { ticker, expiration, put_strike, call_strike, shares } = form || {};
    if (!ticker || !expiration || !put_strike || !call_strike || !apiKey) return;

    setPLoading(true);
    setPErr("");
    const payload = {
      ticker: ticker.toUpperCase(),
      shares: Number(shares || 100),
      entry_price: 1,                // backend overrides to spot
      put_strike: Number(put_strike),
      call_strike: Number(call_strike),
      expiration,                    // "YYYY-MM-DD"
    };

    // IMPORTANT: this is the call that should appear in the Network tab
    calculatePremium(payload, apiKey)
      .then((resp) => setPremium(resp))
      .catch((e) => setPErr(String(e.message || e)))
      .finally(() => setPLoading(false));
  }, [form.ticker, form.expiration, form.put_strike, form.call_strike, form.shares, apiKey]);

  // ----- render (very simple) -----
  if (pLoading) return <div>Loading premium…</div>;
  if (pErr) return <pre style={{color:"crimson"}}>{pErr}</pre>;
  if (!premium) return <div>Premium not loaded yet</div>;

  return (
    <div>
      <div>AnchorLock Score: <b>{premium?.signals?.score ?? premium?.anchorlock?.score ?? "—"}</b></div>
      <div>Signal: <b>{premium?.signal ?? premium?.signals?.action ?? "—"}</b></div>
      <div>IV (Put/Call): <b>{premium?.iv_put ?? "—"}</b> / <b>{premium?.iv_call ?? "—"}</b></div>

      <h4>Portfolio Greeks (Net)</h4>
      <ul>
        <li>Delta: <b>{premium?.portfolioGreeks?.net?.Delta ?? premium?.greeks?.delta ?? premium?.delta ?? "—"}</b></li>
        <li>Gamma: <b>{premium?.portfolioGreeks?.net?.Gamma ?? premium?.greeks?.gamma ?? premium?.gamma ?? "—"}</b></li>
        <li>Theta: <b>{premium?.portfolioGreeks?.net?.Theta ?? premium?.greeks?.theta ?? premium?.theta ?? "—"}</b></li>
        <li>Vega:  <b>{premium?.portfolioGreeks?.net?.Vega  ?? premium?.greeks?.vega  ?? premium?.vega  ?? "—"}</b></li>
        <li>Rho:   <b>{premium?.portfolioGreeks?.net?.Rho   ?? premium?.greeks?.rho   ?? premium?.rho   ?? "—"}</b></li>
      </ul>

      <h4>Components</h4>
      <ul>
        <li>RSI: {premium?.components?.RSI ?? "—"}</li>
        <li>RSI Score: {premium?.components?.RSIScore ?? "—"}</li>
        <li>Momentum 30d: {premium?.components?.Momentum30d ?? "—"}</li>
        <li>200-DMA: {premium?.components?.DMA200 ?? "—"}</li>
        <li>Gap to 200-DMA: {premium?.components?.GapTo200DMA ?? "—"}</li>
        <li>200-DMA 30d slope: {premium?.components?.DMA200Slope30d ?? "—"}</li>
        <li>Earnings Score: {premium?.components?.EarningsScore ?? "—"}</li>
      </ul>

      <h4>Assumptions</h4>
      <ul>
        <li>r: {premium?.assumptions?.r ?? "—"}</li>
        <li>q: {premium?.assumptions?.q ?? "—"}</li>
        <li>Time to Exp (yrs): {premium?.assumptions?.time_to_exp_years ?? "—"}</li>
      </ul>
    </div>
  );
}


Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend)

export default function App(){
  const [form, setForm] = useState({
    ticker:'AAPL', shares:100, entry_price:220, put_strike:180, call_strike:250, expiration:''
  })
  const [exps, setExps] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState(null)

  // Premium state
  const [proKey, setProKey] = useState('')
  const [proLoading, setProLoading] = useState(false)
  const [proErr, setProErr] = useState('')
  const [pro, setPro] = useState(null)

  const chartRef = useRef(null)
  const chartObj = useRef(null)

  // load expirations
  useEffect(()=>{
    setRes(null); setPro(null); setErr(''); setProErr('')
    getExpirations(form.ticker)
      .then(list => { setExps(list || []); if(list?.length) setForm(f=>({...f, expiration:list[0]})) })
      .catch(e => setErr(String(e)))
  }, [form.ticker])

  // draw chart
  useEffect(()=>{
    if(!res) return
    const ctx = chartRef.current?.getContext('2d'); if(!ctx) return
    if(chartObj.current) chartObj.current.destroy()

    const xs = res.payoff_prices.map(Number)
    const ys = res.payoff_values.map(Number)
    const pairs = xs.map((x,i)=>[x, ys[i]]).sort((a,b)=>a[0]-b[0])

    chartObj.current = new Chart(ctx, {
      type:'line',
      data:{
        labels: pairs.map(p=>p[0]),
        datasets:[{
          label:'Payoff at Expiration',
          data: pairs.map(p=>p[1]),
          pointRadius:0,
          tension:0,
          stepped:true
        }]
      },
      options:{
        responsive:true,
        plugins:{ title:{ display:true, text:`${res.ticker} Collar Payoff` }, legend:{display:false}, tooltip:{mode:'nearest', intersect:false}},
        elements:{ line:{ tension:0 } },
        scales:{ x:{ title:{display:true,text:'Stock Price at Expiration'}}, y:{ title:{display:true,text:'P/L ($)'}} },
        animation:false
      }
    })
    return ()=> chartObj.current?.destroy()
  }, [res])

  const onChange = (e)=>{
    const {name, value} = e.target
    setForm(f=>({
      ...f,
      [name]:
        name==='shares' ? Number(value||0)
        : ['entry_price','put_strike','call_strike'].includes(name) ? Number(value||0)
        : value
    }))
  }

  const submit = async ()=>{
    setLoading(true); setErr(''); setRes(null); setPro(null); setProErr('')
    try{
      const data = await calculateCollar(form)
      setRes(data)
    }catch(e){ setErr(String(e.message || e)) }
    finally{ setLoading(false) }
  }

  const loadPremium = async ()=>{
    setPro(null); setProErr(''); setProLoading(true)
    try{
      const data = await calculatePremium(form, proKey.trim())
      setPro(data)
    }catch(e){ setProErr(String(e.message || e)) }
    finally{ setProLoading(false) }
  }

  const kpis = useMemo(()=> res ? [
    { title:'Net Premium', val:`$${res.net_premium}` },
    { title:'Max Gain',   val:`$${res.max_gain}` },
    { title:'Max Loss',   val:`$${res.max_loss}` },
  ]: [], [res])

  return (
    <div className="wrapper">
      <h1 className="h1">Equity Collar Calculator</h1>
      <div className="card">
        <div className="grid">
          <div><div className="label">Ticker</div><input className="input" name="ticker" value={form.ticker} onChange={onChange} /></div>
          <div><div className="label">Shares</div><input className="input" name="shares" type="number" value={form.shares} onChange={onChange} /></div>
          <div><div className="label">Entry Price</div><input className="input" name="entry_price" type="number" step="0.01" value={form.entry_price} onChange={onChange} /></div>
          <div><div className="label">Put Strike</div><input className="input" name="put_strike" type="number" step="0.01" value={form.put_strike} onChange={onChange} /></div>
          <div><div className="label">Call Strike</div><input className="input" name="call_strike" type="number" step="0.01" value={form.call_strike} onChange={onChange} /></div>
          <div><div className="label">Expiration</div>
            <select className="input" name="expiration" value={form.expiration} onChange={onChange}>
              {exps.map(e => <option key={e} value={e}>{e}</option>)}
            </select></div>
        </div>

        <div className="row" style={{marginTop:14, gap:12}}>
          <button className="btn" onClick={submit} disabled={loading}>{loading? 'Calculating…':'Calculate'}</button>
          {err && <span className="badge" style={{borderColor:'var(--err)', color:'#ffd9d9'}}>{err}</span>}
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
                <tr><th>Breakeven (est)</th><td>${res.breakeven_estimate}</td><th>Spot (delayed)</th><td>{res.spot_price ?? 'n/a'}</td></tr>
              </tbody>
            </table>

            <div className="chart">
              <canvas ref={chartRef} height="240" />
              <div className="note">Payoff uses delayed data and mid-pricing for premiums.</div>
            </div>

            {/* Premium Section */}
            <div className="card" style={{marginTop:16}}>
              <div className="row" style={{gap:10, alignItems:'center', marginBottom:10}}>
                <div className="label">Premium API Key (not stored)</div>
                <input className="input" type="password" placeholder="Paste API key" value={proKey} onChange={e=>setProKey(e.target.value)} style={{maxWidth:320}} />
                <button className="btn" onClick={loadPremium} disabled={proLoading || !proKey.trim()}>{proLoading? 'Loading…':'Load Premium'}</button>
                {proErr && <span className="badge" style={{borderColor:'var(--err)', color:'#ffd9d9'}}>{proErr}</span>}
              </div>

              {pro && (
                <>
                  <h3 className="h1" style={{fontSize:18, marginTop:0}}>Premium: Greeks & AnchorLock</h3>

                  <div className="kpis">
                    <div className="kpi">
                      <div className="title">AnchorLock Score</div>
                      <div className="val">{pro?.anchorlock?.score ?? '—'}</div>
                    </div>
                    <div className="kpi">
                      <div className="title">Signal</div>
                      <div className="val">{pro?.anchorlock?.signal ?? '—'}</div>
                    </div>
                    <div className="kpi">
                      <div className="title">IV (Put / Call)</div>
                      <div className="val">{pro?.greeks?.assumptions ? `${pro.greeks.assumptions.iv_put} / ${pro.greeks.assumptions.iv_call}` : '—'}</div>
                    </div>
                  </div>

                  <div className="grid" style={{marginTop:16}}>
                    <div className="kpi">
                      <div className="title">Portfolio Greeks (Net)</div>
                      <table className="table">
                        <tbody>
                          <tr><th>Delta</th><td>{pro?.greeks?.net?.delta ?? '—'}</td></tr>
                          <tr><th>Gamma</th><td>{pro?.greeks?.net?.gamma ?? '—'}</td></tr>
                          <tr><th>Theta</th><td>{pro?.greeks?.net?.theta ?? '—'}</td></tr>
                          <tr><th>Vega</th><td>{pro?.greeks?.net?.vega ?? '—'}</td></tr>
                          <tr><th>Rho</th><td>{pro?.greeks?.net?.rho ?? '—'}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="kpi">
                      <div className="title">Components</div>
                      <table className="table">
                        <tbody>
                          <tr><th>RSI</th><td>{pro?.anchorlock?.components?.rsi ?? '—'}</td></tr>
                          <tr><th>RSI Score</th><td>{pro?.anchorlock?.components?.rsi_score ?? '—'}</td></tr>
                          <tr><th>Momentum 30d</th><td>{pro?.anchorlock?.components?.mom30 ?? '—'}</td></tr>
                          <tr><th>200-DMA</th><td>{pro?.anchorlock?.components?.ma200 ?? '—'}</td></tr>
                          <tr><th>Gap to 200-DMA</th><td>{pro?.anchorlock?.components?.ma200_gap ?? '—'}</td></tr>
                          <tr><th>200-DMA 30d slope</th><td>{pro?.anchorlock?.components?.ma200_slope30 ?? '—'}</td></tr>
                          <tr><th>Earnings Score</th><td>{pro?.anchorlock?.components?.earn_score ?? '—'}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="kpi" style={{marginTop:16}}>
                    <div className="title">Assumptions</div>
                    <table className="table">
                      <tbody>
                        <tr><th>r</th><td>{pro?.greeks?.assumptions?.r ?? '—'}</td></tr>
                        <tr><th>q</th><td>{pro?.greeks?.assumptions?.q ?? '—'}</td></tr>
                        <tr><th>Time to Exp (yrs)</th><td>{pro?.greeks?.assumptions?.T_years ?? '—'}</td></tr>
                        <tr><th>Contracts</th><td>{pro?.greeks?.assumptions?.contracts ?? '—'}</td></tr>
                        <tr><th>Multiplier</th><td>{pro?.greeks?.assumptions?.multiplier ?? '—'}</td></tr>
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
  )
}
