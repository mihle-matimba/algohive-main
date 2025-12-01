import os
import datetime as dt
import requests
from supabase import create_client, Client

SUPABASE_URL = "https://aazofjsssobejhkyyiqv.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhem9manNzc29iZWpoa3l5aXF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExMjU0NSwiZXhwIjoyMDczNjg4NTQ1fQ.FUyd9yCRrHYv5V5YrKup9_OI3n01aCfxS3_MxReLxBM"

# Alpaca config
ALPACA_API_KEY = "PKARM7PKO5AYOTHGHBAEYNLXV2"
ALPACA_SECRET_KEY = "AfVJWotnuyuSE2LBqFhX744zia9qc65xPSwbGEvCEC1T"

ALPACA_DATA_URL = "https://data.alpaca.markets/v2"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def now_utc():
    return dt.datetime.now(dt.timezone.utc)


def get_bars_last_3_months(symbol: str):
    """Get daily bars for roughly the last 3 months (90 days) for one symbol."""

    end_dt = now_utc()
    start_dt = end_dt - dt.timedelta(days=90)

    start_iso = start_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat(timespec="seconds").replace("+00:00", "Z")
    end_iso = end_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat(timespec="seconds").replace("+00:00", "Z")

    url = f"{ALPACA_DATA_URL}/stocks/bars"

    params = {
        "symbols": symbol,
        "timeframe": "1D",
        "start": start_iso,
        "end": end_iso,
        "limit": 1000,
        "adjustment": "raw",
        "feed": "sip",
        "sort": "asc",
    }

    headers = {
        "accept": "application/json",
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
    }

    resp = requests.get(url, params=params, headers=headers)

    if resp.status_code != 200:
        print(f"[WARN] Failed to fetch bars for {symbol}: {resp.status_code} {resp.text}")
        return []

    data = resp.json()
    bars_by_symbol = data.get("bars", {})
    bars = bars_by_symbol.get(symbol, [])

    if not bars:
        print(f"[WARN] No bars returned for {symbol} in last 3 months")
        return []

    return bars


def update_trading_universe_closes_3m():
    print("[INFO] Fetching trading_universe rows...")

    resp = supabase.table("trading_universe").select("*").execute()
    rows = resp.data or []

    print(f"[INFO] Found {len(rows)} instruments")

    for row in rows:
        symbol = row.get("symbol")
        if not symbol:
            continue

        print(f"[INFO] Updating {symbol}...")

        bars = get_bars_last_3_months(symbol)
        if not bars:
            print(f"[INFO] Skipping {symbol}, no bars in range")
            continue

        closes = row.get("closes_30d") or []
        if not isinstance(closes, list):
            closes = []

        existing_dates = set()
        for entry in closes:
            if isinstance(entry, dict) and "date" in entry:
                existing_dates.add(entry["date"])

        for bar in bars:
            t = bar.get("t")
            o = bar.get("o")
            c = bar.get("c")

            if t is None or o is None or c is None:
                continue

            date_str = t[:10]

            if date_str in existing_dates:
                continue

            if o == 0:
                pct = 0.0
            else:
                pct = (c - o) / o

            closes.append({
                "pct": float(pct),
                "date": date_str
            })
            existing_dates.add(date_str)

        if not closes:
            print(f"[INFO] {symbol} has no closes after processing")
            continue

        cutoff_date = (now_utc().date() - dt.timedelta(days=90)).isoformat()
        closes = [e for e in closes if isinstance(e, dict) and e.get("date", "") >= cutoff_date]

        try:
            closes.sort(key=lambda x: x.get("date", ""))
        except Exception as e:
            print(f"[WARN] Could not sort closes for {symbol}: {e}")

        update_payload = {
            "closes_30d": closes,
            "last_updated_at": now_utc().isoformat()
        }

        supabase.table("trading_universe").update(update_payload).eq("id", row["id"]).execute()

        print(f"[INFO] {symbol} updated, total days stored: {len(closes)}")

    print("[INFO] Done updating closes_30d for last 3 months.")


if __name__ == "__main__":
    update_trading_universe_closes_3m()
