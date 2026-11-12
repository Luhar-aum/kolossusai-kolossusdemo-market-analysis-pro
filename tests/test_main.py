import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_symbols():
    r = client.get("/api/market/symbols")
    assert r.status_code == 200
    assert "NIFTY50" in r.json()["symbols"]

def test_quote():
    r = client.get("/api/market/quote/NIFTY50")
    assert r.status_code == 200
    d = r.json()
    assert "ltp" in d and "change_pct" in d

def test_ohlc():
    r = client.get("/api/market/ohlc/NIFTY50?interval=5m&limit=50")
    assert r.status_code == 200
    d = r.json()
    assert len(d["candles"]) == 50

def test_predict():
    r = client.get("/api/predict/NIFTY50")
    assert r.status_code == 200
    d = r.json()
    assert d["direction"] in ["BULLISH", "BEARISH", "SIDEWAYS"]
    assert 0 <= d["confidence"] <= 1

def test_backtest():
    r = client.post("/api/backtest/run", json={"symbol": "NIFTY50", "capital": 100000})
    assert r.status_code == 200
    d = r.json()
    assert "total_return_pct" in d and "equity_curve" in d

def test_positions():
    r = client.get("/api/broker/positions")
    assert r.status_code == 200
    assert "positions" in r.json()
