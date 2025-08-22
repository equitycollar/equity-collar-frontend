import React, { useEffect, useMemo, useRef, useState } from 'react'
import { calculateCollar, getExpirations } from './api'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale
} from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale)

export default function App(){
  const [form, setForm] = useState({
    ticker: 'AAPL',
    shares: 100,
    entry_price: 160,
    put_strike: 150,
    call_strike: 175,
    expiration: ''
  })
  const [exps, setExps] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState(null)

  const chartRef = useRef(null)
  const chartObj = useRef(null)

  // Load expirations whenever ticker changes
  useEffect(() => {
    setRes(null); setErr('');
    getExpirations(form.ticker)
      .then(list => {
        setExps(list || [])
        if (list?.length) setForm(f => ({ ...f, expiration: list[0] }))
      })
      .catch(e => setErr(String(e)))
  }, [form.ticker])

  // Draw (or re-draw) the chart after results render
  useEffect(() => {
    if (!res) return
    const ctx = chartRef.current?.getContext('2d')
    if (!ctx) return

    if (chartObj.current) chartObj.current.destroy()
    chartObj.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: res.payoff_prices,
        datasets: [{
          label: 'Payoff at Expiration',
          data: res.payoff_values,
          tension: 0.15
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: `${res.ticker} Collar Payoff` }
        },
        scales: {
          x: { title: { display: true, text: 'Stock Price at Expiration' } },
          y: { title: { display: true, text: 'P/L ($)' } }
        }
      }
    })

    return () => { chartObj.current?.destroy() }
  }, [res])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({
      ...f,
      [name]:
        name === 'shares'
          ? Number(value || 0)
          : ['entry_price', 'put_strike', 'call_strike'].includes(name)
          ? Number(value || 0)
          : value
    }))
  }

  const submit = async () => {
    setLoading(true); setErr(''); setRes(null)
    try {
      const data = await calculateCollar(form)
      setRes(data) // chart draws in the useEffect above
    } catch (e) {
      setErr(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  const kpis = useMemo(() => res ? [
    { title: 'Net Premium', val: `$${res.net_premium}` },
    { title: 'Max Gain', val: `$${res.max_gain}` },
    { title: 'Max Loss', val: `$${res.max_loss}` },
  ] : [], [res])

  return (
    <div className="wrapper">
      <h1 className="h1">Equity Collar Calculator</h1>
      <div className="card">
        <div className="grid">
          <div>
            <div className="label">Ticker</div>
            <input className="input" name="ticker" value={form.ticker} onChange={onChange} />
          </div>
          <div>
            <div className="label">Shares</div>
            <input className="input" name="shares" type="number" value={form.shares} onChange={onChange} />
          </div>
          <div>
            <div className="label">Entry Price</div>
            <input className="input" name="entry_price" type="number" step="0.01" value={form.entry_price} onChange={onChange} />
          </div>
          <div>
            <div className="label">Put Strike</div>
            <input className="input" name="put_strike" type="number" step="0.01" value={form.put_strike} onChange={onChange} />
          </div>
          <div>
            <div className="label">Call Strike</div>
            <input className="input" name="call_strike" type="number" step="0.01" value={form.call_strike} onChange={onChange} />
          </div>
          <div>
            <div className="label">Expiration</div>
            <select className="input" name="expiration" value={form.expiration} onChange={onChange}>
              {exps.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={submit} disabled={loading}>
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
          {err && <span className="badge" style={{ borderColor: 'var(--err)', color: '#ffd9d9' }}>{err}</span>}
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
                <tr>
                  <th>Selected Put</th><td>{res.selected_put_strike}</td>
                  <th>Put Premium (paid)</th><td>${res.put_premium_paid}</td>
                </tr>
                <tr>
                  <th>Selected Call</th><td>{res.selected_call_strike}</td>
                  <th>Call Premium (rcv)</th><td>${res.call_premium_received}</td>
                </tr>
                <tr>
                  <th>Breakeven (est)</th><td>${res.breakeven_estimate}</td>
                  <th>Spot (delayed)</th><td>{res.spot_price ?? 'n/a'}</td>
                </tr>
              </tbody>
            </table>

            <div className="chart">
              <canvas ref={chartRef} height="220" />
              <div className="note">Payoff uses delayed data and mid-pricing for premiums.</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
