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
