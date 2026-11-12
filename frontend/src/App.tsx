import { useEffect, useRef, useState, useCallback } from 'react'
import { useStore } from './store/useStore'
import { createChart, ColorType } from 'lightweight-charts'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API = window.location.origin
const SYMBOLS = ['NIFTY50', 'SENSEX', 'BANKNIFTY', 'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK']

function ThemeToggle() {
  const { theme, setTheme } = useStore()
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-yellow-300 transition-colors border border-gray-300 dark:border-gray-600"
      title="Toggle theme"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

function Disclaimer() {
  return (
    <div className="mt-4 p-3 rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs">
      ⚠️ <strong>Disclaimer:</strong> All signals are probabilistic research tools, NOT financial advice. Past backtest performance does not guarantee future results. You are responsible for compliance with SEBI's algo trading requirements and your broker's terms. Never risk money you cannot afford to lose.
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color || 'text-gray-900 dark:text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

function DashboardTab({ symbol }: { symbol: string }) {
  const [quote, setQuote] = useState<any>(null)
  const [prediction, setPrediction] = useState<any>(null)
  const [priceHistory, setPriceHistory] = useState<{ time: string; value: number }[]>([])

  useEffect(() => {
    fetch(`${API}/api/market/quote/${symbol}`).then(r => r.json()).then(setQuote)
    fetch(`${API}/api/predict/${symbol}`).then(r => r.json()).then(setPrediction)
  }, [symbol])

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/market/${symbol}`)
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data)
      setQuote((q: any) => ({ ...q, ltp: d.ltp, change: d.change, change_pct: d.change_pct }))
      setPriceHistory(h => [...h.slice(-49), { time: new Date().toLocaleTimeString(), value: d.ltp }])
    }
    return () => ws.close()
  }, [symbol])

  const changeColor = quote?.change_pct >= 0 ? 'text-green-500' : 'text-red-500'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="LTP" value={quote ? `₹${Number(quote.ltp).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'} />
        <StatCard label="Change" value={quote ? `${Number(quote.change_pct).toFixed(2)}%` : '—'} sub={quote ? `₹${Number(quote.change).toFixed(2)}` : ''} color={changeColor} />
        <StatCard label="Volume" value={quote ? `${(quote.volume / 1e6).toFixed(2)}M` : '—'} />
        <StatCard label="Day Range" value={quote ? `${Number(quote.low).toFixed(0)}–${Number(quote.high).toFixed(0)}` : '—'} sub="Low – High" />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Live Price — {symbol}</div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={priceHistory}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb' }} />
            <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#colorPrice)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {prediction && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI Market Signal</div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${prediction.direction === 'BULLISH' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : prediction.direction === 'BEARISH' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'}`}>
              {prediction.direction}
            </span>
          </div>
          <div className="mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Confidence: {(prediction.confidence * 100).toFixed(0)}%</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className={`h-2 rounded-full ${prediction.direction === 'BULLISH' ? 'bg-green-500' : prediction.direction === 'BEARISH' ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${prediction.confidence * 100}%` }} />
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{prediction.rationale}</p>
          <Disclaimer />
        </div>
      )}
    </div>
  )
}

function ChartsTab({ symbol }: { symbol: string }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const [interval, setIntervalVal] = useState('5m')
  const { theme } = useStore()
  const intervals = ['1m', '5m', '15m', '1h', '1D', '1W']

  useEffect(() => {
    if (!chartRef.current) return
    const isDark = theme === 'dark'
    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 400,
      layout: { background: { type: ColorType.Solid, color: isDark ? '#111827' : '#ffffff' }, textColor: isDark ? '#d1d5db' : '#374151' },
      grid: { vertLines: { color: isDark ? '#1f2937' : '#f3f4f6' }, horzLines: { color: isDark ? '#1f2937' : '#f3f4f6' } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: isDark ? '#374151' : '#d1d5db' },
      timeScale: { borderColor: isDark ? '#374151' : '#d1d5db', timeVisible: true },
    })
    chartInstanceRef.current = chart
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    })
    candleSeriesRef.current = candleSeries
    const resize = () => { if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth }) }
    window.addEventListener('resize', resize)
    return () => { chart.remove(); window.removeEventListener('resize', resize) }
  }, [theme])

  useEffect(() => {
    fetch(`${API}/api/market/ohlc/${symbol}?interval=${interval}&limit=200`)
      .then(r => r.json())
      .then(d => {
        if (candleSeriesRef.current && d.candles) {
          candleSeriesRef.current.setData(d.candles.map((c: any) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })))
          chartInstanceRef.current?.timeScale().fitContent()
        }
      })
  }, [symbol, interval])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Candlestick Chart — {symbol}</div>
      <div className="flex flex-wrap gap-2 mb-4">
        {intervals.map(iv => (
          <button key={iv} onClick={() => setIntervalVal(iv)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${interval === iv ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            {iv}
          </button>
        ))}
      </div>
      <div ref={chartRef} style={{ width: '100%' }} />
    </div>
  )
}

function SentimentTab({ symbol }: { symbol: string }) {
  const [pred, setPred] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch(`${API}/api/predict/${symbol}`).then(r => r.json()).then(d => { setPred(d); setLoading(false) })
  }, [symbol])

  useEffect(() => { refresh() }, [refresh])

  const featureLabels: Record<string, string> = { rsi: 'RSI(14)', macd_signal: 'MACD Signal', pcr: 'Put-Call Ratio', fii_net: 'FII Net (₹Cr)', news_sentiment: 'News Sentiment', vix: 'India VIX' }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-semibold text-gray-800 dark:text-white">AI Market Direction Signal — {symbol}</div>
          <button onClick={refresh} disabled={loading} className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition-colors">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {pred && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <span className={`text-xl font-bold px-4 py-2 rounded-xl ${pred.direction === 'BULLISH' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : pred.direction === 'BEARISH' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'}`}>
                {pred.direction === 'BULLISH' ? '▲' : pred.direction === 'BEARISH' ? '▼' : '◆'} {pred.direction}
              </span>
              <div className="flex-1">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Confidence: {(pred.confidence * 100).toFixed(0)}%</div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div className={`h-3 rounded-full transition-all ${pred.direction === 'BULLISH' ? 'bg-green-500' : pred.direction === 'BEARISH' ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${pred.confidence * 100}%` }} />
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">{pred.rationale}</p>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Feature Breakdown</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Indicator</th>
                  <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(pred.features).map(([k, v]) => (
                  <tr key={k} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 text-gray-700 dark:text-gray-300">{featureLabels[k] || k}</td>
                    <td className="py-2 text-right font-mono text-gray-900 dark:text-white">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <Disclaimer />
      </div>
    </div>
  )
}

function StrategyTab({ symbol }: { symbol: string }) {
  const [capital, setCapital] = useState(100000)
  const [startDate, setStartDate] = useState('2023-01-01')
  const [endDate, setEndDate] = useState('2024-01-01')
  const [rule, setRule] = useState('RSI Oversold')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const rules = ['RSI Oversold', 'MACD Crossover', 'VWAP Breakout', 'Bollinger Band Squeeze']

  const runBacktest = async () => {
    setLoading(true)
    const res = await fetch(`${API}/api/backtest/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy_id: rule.replace(/ /g, '_').toLowerCase(), symbol, start_date: startDate, end_date: endDate, capital }),
    })
    setResults(await res.json())
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-base font-semibold text-gray-800 dark:text-white mb-4">Strategy Builder & Backtester</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Strategy Rule</label>
            <select value={rule} onChange={e => setRule(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              {rules.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Starting Capital (₹)</label>
            <input type="number" value={capital} onChange={e => setCapital(+e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
        </div>
        <button onClick={runBacktest} disabled={loading} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors">
          {loading ? 'Running Backtest…' : '▶ Run Backtest'}
        </button>
        <Disclaimer />
      </div>
      {results && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Return', value: `${results.total_return_pct?.toFixed(2)}%`, color: results.total_return_pct > 0 ? 'text-green-500' : 'text-red-500' },
              { label: 'CAGR', value: `${results.cagr?.toFixed(2)}%`, color: results.cagr > 0 ? 'text-green-500' : 'text-red-500' },
              { label: 'Sharpe Ratio', value: results.sharpe_ratio?.toFixed(2), color: 'text-blue-500' },
              { label: 'Max Drawdown', value: `${results.max_drawdown_pct?.toFixed(2)}%`, color: 'text-red-500' },
              { label: 'Win Rate', value: `${results.win_rate?.toFixed(1)}%`, color: results.win_rate > 50 ? 'text-green-500' : 'text-red-500' },
              { label: 'Total Trades', value: String(results.total_trades), color: 'text-gray-700 dark:text-gray-300' },
            ].map(m => <StatCard key={m.label} label={m.label} value={m.value} color={m.color} />)}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Equity Curve</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={results.equity_curve?.slice(-100)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="time" tick={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={['auto', 'auto']} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Equity']} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#f9fafb' }} />
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

function BrokerTab({ symbol }: { symbol: string }) {
  const [broker, setBroker] = useState('Zerodha (Kite Connect)')
  const [mode, setMode] = useState<'paper' | 'live'>('paper')
  const [positions, setPositions] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [orderSymbol, setOrderSymbol] = useState(symbol)
  const [side, setSide] = useState('BUY')
  const [qty, setQty] = useState(50)
  const [orderType, setOrderType] = useState('MARKET')
  const [killSwitch, setKillSwitch] = useState(false)
  const [maxLoss, setMaxLoss] = useState(5000)
  const [maxPos, setMaxPos] = useState(3)
  const brokers = ['Zerodha (Kite Connect)', 'Upstox', 'Angel One (SmartAPI)', 'Fyers', '5paisa']

  useEffect(() => {
    fetch(`${API}/api/broker/positions`).then(r => r.json()).then(d => setPositions(d.positions || []))
    fetch(`${API}/api/broker/orders`).then(r => r.json()).then(d => setOrders(d.orders || []))
  }, [])

  const placeOrder = async () => {
    if (killSwitch) return alert('Kill switch is active. Trading disabled for today.')
    const res = await fetch(`${API}/api/broker/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: orderSymbol, side, quantity: qty, order_type: orderType }),
    })
    const d = await res.json()
    setOrders(o => [d, ...o])
    alert(`Order placed: ${d.order_id}`)
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg border border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs">
        🏛️ <strong>SEBI Compliance (effective April 1, 2026):</strong> All algo orders require OAuth 2FA, static IP whitelisting, daily session reset, and broker-issued Algo-ID tagging. This platform is for personal research use only. Redistribution requires a SEBI Research Analyst license.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Broker & Mode</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Broker</label>
              <select value={broker} onChange={e => setBroker(e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {brokers.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              {(['paper', 'live'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? m === 'live' ? 'bg-red-600 text-white' : 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {m === 'paper' ? '📄 Paper' : '⚡ Live'} Trading
                </button>
              ))}
            </div>
            {mode === 'live' && <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-400 rounded text-red-700 dark:text-red-300 text-xs">⚠️ Live trading uses real money. Ensure your broker API is connected with valid OAuth token and static IP whitelisted.</div>}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Risk Controls</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Max Daily Loss (₹)</label>
              <input type="number" value={maxLoss} onChange={e => setMaxLoss(+e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Max Open Positions</label>
              <input type="number" value={maxPos} onChange={e => setMaxPos(+e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <button onClick={() => setKillSwitch(!killSwitch)} className={`w-full py-2 rounded-lg font-bold text-sm transition-colors ${killSwitch ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-700 dark:text-gray-300'}`}>
              {killSwitch ? '🔴 KILL SWITCH ACTIVE — Click to Resume' : '⚠️ Activate Kill Switch'}
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Place Order {mode === 'paper' && <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Paper Trade)</span>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: 'Symbol', el: <select value={orderSymbol} onChange={e => setOrderSymbol(e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">{SYMBOLS.map(s => <option key={s}>{s}</option>)}</select> },
            { label: 'Side', el: <select value={side} onChange={e => setSide(e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"><option>BUY</option><option>SELL</option></select> },
            { label: 'Quantity', el: <input type="number" value={qty} onChange={e => setQty(+e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" /> },
            { label: 'Order Type', el: <select value={orderType} onChange={e => setOrderType(e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"><option>MARKET</option><option>LIMIT</option><option>SL</option></select> },
          ].map(({ label, el }) => <div key={label}><label className="text-xs text-gray-500 dark:text-gray-400">{label}</label>{el}</div>)}
        </div>
        <button onClick={placeOrder} className={`w-full py-2 rounded-lg font-medium text-white transition-colors ${side === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
          {side} {orderSymbol}
        </button>
      </div>
      {positions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Open Positions</div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              <th className="text-left py-2">Symbol</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Avg</th><th className="text-right py-2">LTP</th><th className="text-right py-2">P&amp;L</th>
            </tr></thead>
            <tbody>{positions.map((p, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-2 font-medium text-gray-900 dark:text-white">{p.symbol}</td>
                <td className="py-2 text-right text-gray-700 dark:text-gray-300">{p.quantity}</td>
                <td className="py-2 text-right text-gray-700 dark:text-gray-300">₹{p.average_price}</td>
                <td className="py-2 text-right text-gray-700 dark:text-gray-300">₹{p.ltp}</td>
                <td className={`py-2 text-right font-medium ${p.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>₹{p.pnl.toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {orders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Order Log</div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              <th className="text-left py-2">Order ID</th><th className="text-left py-2">Symbol</th><th className="text-left py-2">Side</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Price</th><th className="text-left py-2">Status</th>
            </tr></thead>
            <tbody>{orders.slice(0, 10).map((o, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-2 font-mono text-xs text-gray-500 dark:text-gray-400">{o.order_id}</td>
                <td className="py-2 text-gray-900 dark:text-white">{o.symbol}</td>
                <td className={`py-2 font-medium ${o.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>{o.side}</td>
                <td className="py-2 text-right text-gray-700 dark:text-gray-300">{o.quantity}</td>
                <td className="py-2 text-right text-gray-700 dark:text-gray-300">₹{o.price?.toFixed(2)}</td>
                <td className="py-2"><span className="px-2 py-0.5 rounded text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">{o.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { selectedSymbol, activeTab, setSelectedSymbol, setActiveTab } = useStore()
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/market/${selectedSymbol}`)
    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onerror = () => setWsConnected(false)
    return () => ws.close()
  }, [selectedSymbol])

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'charts', label: '📈 Charts' },
    { id: 'sentiment', label: '🤖 Sentiment' },
    { id: 'strategy', label: '⚙️ Strategy' },
    { id: 'broker', label: '🏦 Broker' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">📈 Market Analysis Pro</span>
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} title={wsConnected ? 'Live' : 'Disconnected'} />
          <span className="text-xs text-gray-500 dark:text-gray-400">{wsConnected ? 'Live' : 'Connecting…'}</span>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)} className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
            {SYMBOLS.map(s => <option key={s}>{s}</option>)}
          </select>
          <ThemeToggle />
        </div>
      </header>
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === t.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="max-w-6xl mx-auto p-4">
        {activeTab === 'dashboard' && <DashboardTab symbol={selectedSymbol} />}
        {activeTab === 'charts' && <ChartsTab symbol={selectedSymbol} />}
        {activeTab === 'sentiment' && <SentimentTab symbol={selectedSymbol} />}
        {activeTab === 'strategy' && <StrategyTab symbol={selectedSymbol} />}
        {activeTab === 'broker' && <BrokerTab symbol={selectedSymbol} />}
      </main>
    </div>
  )
}
