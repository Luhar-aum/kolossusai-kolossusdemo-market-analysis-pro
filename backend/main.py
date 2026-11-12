from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import random
import math
import time
import json
import os
from datetime import datetime, timedelta

app = FastAPI(title="Market Analysis Pro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_PRICES = {
    "NIFTY50": 24500.0,
    "SENSEX": 81000.0,
    "BANKNIFTY": 52000.0,
    "RELIANCE": 2850.0,
    "TCS": 4200.0,
    "INFY": 1900.0,
    "HDFC": 1750.0,
    "ICICIBANK": 1250.0,
    "SBIN": 820.0,
    "WIPRO": 560.0,
}

current_prices: Dict[str, float] = {k: v for k, v in BASE_PRICES.items()}

def get_price(symbol: str) -> float:
    base = BASE_PRICES.get(symbol.upper(), 1000.0)
    if symbol.upper() not in current_prices:
        current_prices[symbol.upper()] = base
    drift = random.gauss(0, 0.0003)
    current_prices[symbol.upper()] *= (1 + drift)
    return round(current_prices[symbol.upper()], 2)

def gen_ohlcv(symbol: str, interval: str, bars: int = 200):
    base = BASE_PRICES.get(symbol.upper(), 1000.0)
    now = datetime.utcnow()
    interval_seconds = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "1D": 86400, "1W": 604800}.get(interval, 300)
    candles = []
    price = base * random.uniform(0.92, 1.08)
    for i in range(bars):
        ts = int((now - timedelta(seconds=interval_seconds * (bars - i))).timestamp())
        open_ = price
        close = open_ * (1 + random.gauss(0, 0.008))
        high = max(open_, close) * (1 + abs(random.gauss(0, 0.004)))
        low = min(open_, close) * (1 - abs(random.gauss(0, 0.004)))
        volume = int(random.uniform(500000, 5000000))
        candles.append({"time": ts, "open": round(open_, 2), "high": round(high, 2), "low": round(low, 2), "close": round(close, 2), "volume": volume})
        price = close
    return candles

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/market/symbols")
async def get_symbols():
    return {"symbols": list(BASE_PRICES.keys())}

@app.get("/api/market/quote/{symbol}")
async def get_quote(symbol: str):
    sym = symbol.upper()
    ltp = get_price(sym)
    base = BASE_PRICES.get(sym, ltp)
    change = ltp - base
    change_pct = (change / base) * 100
    return {
        "symbol": sym,
        "ltp": ltp,
        "open": round(base * random.uniform(0.995, 1.005), 2),
        "high": round(ltp * random.uniform(1.001, 1.015), 2),
        "low": round(ltp * random.uniform(0.985, 0.999), 2),
        "close": round(base, 2),
        "volume": random.randint(1000000, 50000000),
        "change": round(change, 2),
        "change_pct": round(change_pct, 2),
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/api/market/ohlc/{symbol}")
async def get_ohlc(symbol: str, interval: str = "5m", limit: int = 200):
    candles = gen_ohlcv(symbol, interval, limit)
    return {"symbol": symbol.upper(), "interval": interval, "candles": candles}

@app.get("/api/market/indicator/{symbol}")
async def get_indicator(symbol: str, type: str = "rsi", period: int = 14):
    candles = gen_ohlcv(symbol, "1D", 100)
    closes = [c["close"] for c in candles]
    times = [c["time"] for c in candles]
    if type == "rsi":
        gains, losses = [], []
        for i in range(1, len(closes)):
            d = closes[i] - closes[i-1]
            gains.append(max(d, 0))
            losses.append(max(-d, 0))
        values = []
        for i in range(period, len(closes)):
            avg_gain = sum(gains[i-period:i]) / period
            avg_loss = sum(losses[i-period:i]) / period
            rs = avg_gain / avg_loss if avg_loss != 0 else 100
            values.append({"time": times[i], "value": round(100 - 100/(1+rs), 2)})
        return {"symbol": symbol.upper(), "indicator": type, "period": period, "values": values}
    elif type == "sma":
        values = [{"time": times[i], "value": round(sum(closes[i-period:i])/period, 2)} for i in range(period, len(closes))]
        return {"symbol": symbol.upper(), "indicator": type, "period": period, "values": values}
    elif type == "ema":
        k = 2 / (period + 1)
        ema = closes[0]
        values = []
        for i in range(len(closes)):
            ema = closes[i] * k + ema * (1 - k)
            if i >= period:
                values.append({"time": times[i], "value": round(ema, 2)})
        return {"symbol": symbol.upper(), "indicator": type, "period": period, "values": values}
    return {"symbol": symbol.upper(), "indicator": type, "period": period, "values": []}

@app.get("/api/predict/{symbol}")
async def predict(symbol: str):
    sym = symbol.upper()
    directions = ["BULLISH", "BEARISH", "SIDEWAYS"]
    direction = random.choice(directions)
    confidence = round(random.uniform(0.52, 0.84), 2)
    features = {
        "rsi": round(random.uniform(35, 65), 1),
        "macd_signal": random.choice(["bullish_crossover", "bearish_crossover", "neutral"]),
        "pcr": round(random.uniform(0.7, 1.3), 2),
        "fii_net": round(random.uniform(-3000, 3000), 0),
        "news_sentiment": round(random.uniform(-1, 1), 2),
        "vix": round(random.uniform(12, 22), 1),
    }
    rationales = {
        "BULLISH": f"Technical indicators show RSI at {features['rsi']} with positive momentum. FII net flows of ₹{features['fii_net']}Cr indicate institutional buying interest. PCR at {features['pcr']} suggests moderate bullish bias.",
        "BEARISH": f"RSI at {features['rsi']} approaching overbought territory. FII outflows of ₹{abs(features['fii_net'])}Cr signal caution. PCR at {features['pcr']} indicates elevated put buying.",
        "SIDEWAYS": f"Mixed signals with RSI at {features['rsi']} in neutral zone. PCR at {features['pcr']} near equilibrium. Market likely to consolidate near current levels pending fresh triggers.",
    }
    return {
        "symbol": sym,
        "direction": direction,
        "confidence": confidence,
        "rationale": rationales[direction],
        "features": features,
        "disclaimer": "This is a probabilistic research signal, NOT financial advice. Past performance does not guarantee future results.",
        "generated_at": datetime.utcnow().isoformat(),
    }

class BacktestRequest(BaseModel):
    strategy_id: str = "default"
    symbol: str = "NIFTY50"
    start_date: str = "2023-01-01"
    end_date: str = "2024-01-01"
    capital: float = 100000.0
    rules: Optional[Dict] = None

@app.post("/api/backtest/run")
async def run_backtest(req: BacktestRequest):
    candles = gen_ohlcv(req.symbol, "1D", 252)
    equity = req.capital
    equity_curve = []
    trades = []
    position = None
    for i, candle in enumerate(candles):
        if i < 14:
            equity_curve.append({"time": candle["time"], "value": round(equity, 2)})
            continue
        rsi_val = random.uniform(25, 75)
        if position is None and rsi_val < 35:
            position = {"entry": candle["close"], "entry_time": candle["time"]}
        elif position is not None and rsi_val > 65:
            pnl = (candle["close"] - position["entry"]) / position["entry"] * equity * 0.1
            equity += pnl
            trades.append({"entry": position["entry"], "exit": candle["close"], "pnl": round(pnl, 2), "time": candle["time"]})
            position = None
        equity_curve.append({"time": candle["time"], "value": round(equity, 2)})
    total_return = ((equity - req.capital) / req.capital) * 100
    wins = [t for t in trades if t["pnl"] > 0]
    losses = [t for t in trades if t["pnl"] <= 0]
    return {
        "symbol": req.symbol,
        "capital": req.capital,
        "final_equity": round(equity, 2),
        "total_return_pct": round(total_return, 2),
        "cagr": round(total_return * 0.9, 2),
        "sharpe_ratio": round(random.uniform(0.8, 2.1), 2),
        "max_drawdown_pct": round(random.uniform(5, 18), 2),
        "win_rate": round(len(wins) / len(trades) * 100 if trades else 0, 1),
        "total_trades": len(trades),
        "avg_win": round(sum(t["pnl"] for t in wins) / len(wins) if wins else 0, 2),
        "avg_loss": round(sum(t["pnl"] for t in losses) / len(losses) if losses else 0, 2),
        "equity_curve": equity_curve,
        "trades": trades[-20:],
    }

class OrderRequest(BaseModel):
    symbol: str
    side: str
    quantity: int
    order_type: str = "MARKET"
    price: Optional[float] = None
    strategy_id: Optional[str] = None

orders_store: List[Dict] = []

@app.post("/api/broker/order")
async def place_order(req: OrderRequest):
    order_id = f"ORD{int(time.time()*1000)}"
    order = {
        "order_id": order_id,
        "symbol": req.symbol.upper(),
        "side": req.side.upper(),
        "quantity": req.quantity,
        "order_type": req.order_type,
        "price": req.price or get_price(req.symbol),
        "status": "COMPLETE",
        "strategy_id": req.strategy_id,
        "timestamp": datetime.utcnow().isoformat(),
    }
    orders_store.append(order)
    return order

@app.get("/api/broker/orders")
async def get_orders():
    return {"orders": orders_store[-50:]}

@app.delete("/api/broker/order/{order_id}")
async def cancel_order(order_id: str):
    for o in orders_store:
        if o["order_id"] == order_id:
            o["status"] = "CANCELLED"
            return {"message": "Order cancelled", "order_id": order_id}
    raise HTTPException(404, "Order not found")

@app.get("/api/broker/positions")
async def get_positions():
    positions = []
    for sym in ["NIFTY50", "RELIANCE", "TCS"]:
        if random.random() > 0.5:
            ltp = get_price(sym)
            avg = ltp * random.uniform(0.97, 1.03)
            qty = random.choice([50, 100, 150, 200])
            pnl = (ltp - avg) * qty
            positions.append({"symbol": sym, "quantity": qty, "average_price": round(avg, 2), "ltp": round(ltp, 2), "pnl": round(pnl, 2), "pnl_pct": round((ltp-avg)/avg*100, 2)})
    return {"positions": positions}

@app.get("/api/market/option-chain/{symbol}")
async def get_option_chain(symbol: str):
    base = BASE_PRICES.get(symbol.upper(), 1000.0)
    strikes = [round(base * (1 + 0.01 * i), -2) for i in range(-5, 6)]
    chain = []
    for strike in strikes:
        chain.append({
            "strike": strike,
            "call_oi": random.randint(10000, 500000),
            "call_volume": random.randint(1000, 100000),
            "call_ltp": round(max(0, base - strike + random.uniform(-50, 50)), 2),
            "put_oi": random.randint(10000, 500000),
            "put_volume": random.randint(1000, 100000),
            "put_ltp": round(max(0, strike - base + random.uniform(-50, 50)), 2),
        })
    pcr = round(sum(c["put_oi"] for c in chain) / max(sum(c["call_oi"] for c in chain), 1), 2)
    return {"symbol": symbol.upper(), "spot": round(base, 2), "pcr": pcr, "chain": chain}

active_connections: Dict[str, List[WebSocket]] = {}

@app.websocket("/ws/market/{symbol}")
async def websocket_market(websocket: WebSocket, symbol: str):
    await websocket.accept()
    sym = symbol.upper()
    if sym not in active_connections:
        active_connections[sym] = []
    active_connections[sym].append(websocket)
    try:
        while True:
            price = get_price(sym)
            base = BASE_PRICES.get(sym, price)
            await websocket.send_json({
                "symbol": sym,
                "ltp": price,
                "change": round(price - base, 2),
                "change_pct": round((price - base) / base * 100, 2),
                "volume": random.randint(100, 10000),
                "timestamp": datetime.utcnow().isoformat(),
            })
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        active_connections[sym].remove(websocket)

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = os.path.join(static_dir, "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        return {"error": "Frontend not built"}
