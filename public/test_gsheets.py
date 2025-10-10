import gspread
from google.oauth2.service_account import Credentials
import MetaTrader5 as mt5
import subprocess
import time
import os
import psutil
import pandas as pd
from datetime import datetime, timedelta
import random

# === Config ===
SHEET_ID = "1nKFD3mA4dGxD-1CQH_OH4QxQqJXqfM4YsHNpQO4t3Pc"
TAB_NAME  = "Accounts"
MT5_PATH  = r"C:\Program Files\MetaTrader 5 EXNESS\terminal64.exe"

ATTEMPTS_PER_ACCOUNT   = 2
SLEEP_BETWEEN_ACCOUNTS = 2
CHUNK_ROWS             = 400

scope  = ["https://www.googleapis.com/auth/spreadsheets","https://www.googleapis.com/auth/drive"]
creds  = Credentials.from_service_account_file("creds.json", scopes=scope)
client = gspread.authorize(creds)

# === MT5 helpers ===
def kill_mt5():
    os.system('taskkill /IM terminal64.exe /F >nul 2>&1')

def start_mt5():
    subprocess.Popen([MT5_PATH])
    for _ in range(30):
        if any("terminal64.exe" in p.name() for p in psutil.process_iter()):
            print("✅ MT5 process detected.")
            return True
        time.sleep(1)
    return False

def mt5_last_err():
    try:
        return mt5.last_error()
    except Exception:
        return None

def attempt_login(login, password, server):
    kill_mt5()
    time.sleep(2)
    if not start_mt5():
        print("❌ Failed to start MT5 process.")
        return False
    time.sleep(5)

    ok = mt5.initialize(
        path=MT5_PATH,
        login=login,
        password=password,
        server=server,
        timeout=60000,
        portable=False
    )
    if not ok:
        print(f"❌ Login failed: {mt5_last_err()}")
        try: mt5.shutdown()
        except Exception: pass
        kill_mt5()
        return False

    print("✅ Logged in.")
    time.sleep(2)
    return True

def close_mt5():
    try: mt5.shutdown()
    except Exception: pass
    kill_mt5()
    print("🔒 Closed MT5.")

# === History (no CSV) ===
def start_of_june_this_year():
    now = datetime.now()
    return datetime(now.year, 9, 1, 0, 0, 0)

def _to_dt(dt_or_sec):
    if isinstance(dt_or_sec, (int, float)):
        return datetime.fromtimestamp(dt_or_sec)
    return dt_or_sec

def dtfmt(dt):
    return _to_dt(dt).strftime("%Y.%m.%d %H:%M:%S")

def deals_sum_pnl(deal):
    return float(getattr(deal, "profit", 0) or 0) + \
           float(getattr(deal, "swap", 0) or 0) + \
           float(getattr(deal, "commission", 0) or 0)

def safe_history_deals_get(date_from, date_to, retries=8, pause=1.0):
    df = date_from; dt = date_to
    for _ in range(retries):
        try:
            deals = mt5.history_deals_get(df, dt)
            if deals is not None:
                return list(deals)
        except Exception:
            pass
        try: _ = mt5.symbols_total()
        except Exception: pass
        time.sleep(pause)

    for _ in range(3):
        try:
            deals = mt5.history_deals_get(df, dt, group="*")
            if deals is not None:
                return list(deals)
        except Exception:
            pass
        time.sleep(pause)

    out=[]; day=timedelta(days=1); cur=df
    while cur <= dt:
        nxt = min(cur+day, dt)
        for _ in range(2):
            try:
                got = mt5.history_deals_get(cur, nxt)
                if got is not None:
                    out.extend(list(got)); break
            except Exception:
                pass
            time.sleep(0.5)
        cur = nxt + timedelta(seconds=1)
    return out

def build_june_to_date_df(login):
    t_from = start_of_june_this_year()
    t_to   = datetime.now()
    if t_to <= t_from:
        t_to = datetime.now()

    epoch  = datetime(1970,1,1)

    deals_before = safe_history_deals_get(epoch, t_from - timedelta(seconds=1))
    starting_balance = 0.0
    for d in deals_before:
        try: starting_balance += deals_sum_pnl(d)
        except Exception: continue

    deals = safe_history_deals_get(t_from, t_to)

    balance_ops = []
    position_deals = []
    for d in deals:
        try:
            if d.type == mt5.DEAL_TYPE_BALANCE:
                balance_ops.append(d)
            elif getattr(d, "position_id", 0):
                position_deals.append(d)
        except Exception:
            continue

    pos_map = {}
    for d in position_deals:
        try:
            pid = d.position_id
            rec = pos_map.get(pid)
            if rec is None:
                rec = {
                    "account": login,
                    "position_id": pid,
                    "symbol": d.symbol,
                    "open_time": None,
                    "close_time": None,
                    "open_price": None,
                    "close_price": None,
                    "volume": None,
                    "type": None,
                    "total_profit": 0.0,
                }
                pos_map[pid] = rec

            rec["total_profit"] += deals_sum_pnl(d)

            entry = d.entry
            if entry in (mt5.DEAL_ENTRY_IN, mt5.DEAL_ENTRY_INOUT):
                ot = _to_dt(d.time)
                if rec["open_time"] is None or ot < rec["open_time"]:
                    rec["open_time"]  = ot
                    rec["open_price"] = d.price
                    rec["volume"]     = d.volume
                    if d.type == mt5.DEAL_TYPE_BUY:  rec["type"] = "Buy"
                    elif d.type == mt5.DEAL_TYPE_SELL: rec["type"] = "Sell"

            if entry in (mt5.DEAL_ENTRY_OUT, mt5.DEAL_ENTRY_INOUT):
                ct = _to_dt(d.time)
                if rec["close_time"] is None or ct > rec["close_time"]:
                    rec["close_time"]  = ct
                    rec["close_price"] = d.price
        except Exception:
            continue

    pos_events = [rec for rec in pos_map.values() if rec["close_time"] is not None]

    bal_events = []
    for d in balance_ops:
        try:
            bal_events.append({
                "time": _to_dt(d.time),
                "amount": deals_sum_pnl(d),
                "ticket": d.ticket,
            })
        except Exception:
            continue

    events = [{"kind":"balance","time":b["time"],"amount":b["amount"],"ticket":b["ticket"]} for b in bal_events]
    events += [{"kind":"position","time":p["close_time"],"pos":p} for p in pos_events]
    events.sort(key=lambda e: e["time"])

    headers = ["AccountNumber","PositionID","Symbol","Type","Volume","OpenPrice","ClosePrice",
               "OpenTime","CloseTime","TotalNetProfit","RunningBalance"]
    rows = []

    rows.append([
        str(login), "STARTING_BALANCE", "---", "Balance",
        "---","---","---",
        dtfmt(t_from), "---",
        f"{starting_balance:.2f}",
        f"{starting_balance:.2f}",
    ])

    running = starting_balance
    for ev in events:
        if ev["kind"] == "balance":
            running += ev["amount"]
            rows.append([
                str(login),
                f"BAL-{ev['ticket']}",
                "---","Balance",
                "---","---","---",
                dtfmt(ev["time"]), "---",
                f"{ev['amount']:.2f}",
                f"{running:.2f}",
            ])
        else:
            p = ev["pos"]
            running += p["total_profit"]
            rows.append([
                str(p["account"]), str(p["position_id"]), p["symbol"] or "",
                p["type"] or "Unknown",
                f"{(p['volume'] or 0):.2f}",
                f"{(p['open_price'] or 0):.5f}",
                f"{(p['close_price'] or 0):.5f}",
                dtfmt(p["open_time"]) if p["open_time"] else "",
                dtfmt(p["close_time"]) if p["close_time"] else "",
                f"{p['total_profit']:.2f}",
                f"{running:.2f}",
            ])

    return pd.DataFrame(rows, columns=headers)

# === Sheets helpers ===
def find_rows_by_login_server(ws, login_value, server_value, login_col_idx, server_col_idx):
    login_col_vals  = ws.col_values(login_col_idx)
    server_col_vals = ws.col_values(server_col_idx)
    target_login  = str(login_value).strip()
    target_server = str(server_value).strip()
    rows = []
    max_len = max(len(login_col_vals), len(server_col_vals))
    for i in range(2, max_len + 1):  # skip header
        lv = login_col_vals[i-1]  if i-1 < len(login_col_vals)  else ""
        sv = server_col_vals[i-1] if i-1 < len(server_col_vals) else ""
        if str(lv).strip() == target_login and str(sv).strip() == target_server:
            rows.append(i)
    return rows

def write_cell_with_confirm(ws, row, col, value, tries=3, pause=0.8):
    for attempt in range(1, tries + 1):
        ws.update_cell(row, col, value)
        time.sleep(pause)
        try:
            current = ws.cell(row, col).value
        except Exception:
            current = None
        if str(current).strip() == str(value).strip():
            return True
        print(f"⚠️ confirm failed (attempt {attempt}) row={row} col={col}: got '{current}' want '{value}'")
        time.sleep(pause)
    return False

def write_cells_with_confirm(ws, rows, col, value, tries=3, pause=0.8):
    ok_all = True
    for r in rows:
        ok = write_cell_with_confirm(ws, r, col, value, tries=tries, pause=pause)
        ok_all = ok_all and ok
    return ok_all

def upload_df_to_tab(ss, login, df):
    # (populate flow unchanged)
    headers = df.columns.tolist()
    rows = df.values.tolist()
    sheet_name = f"Master_Trade_History_{login}"

    try:
        acc_ws = ss.worksheet(sheet_name)
    except gspread.exceptions.WorksheetNotFound:
        acc_ws = ss.add_worksheet(title=sheet_name, rows="100", cols=str(len(headers) + 5))

    need_rows = max(100, len(rows) + 20)
    need_cols = max(20, len(headers) + 5)
    try:
        acc_ws.resize(rows=need_rows, cols=need_cols)
    except Exception:
        pass

    acc_ws.clear()
    acc_ws.update(values=[headers], range_name="A1")

    start_row = 2
    for i in range(0, len(rows), CHUNK_ROWS):
        chunk = rows[i:i + CHUNK_ROWS]
        end_row = start_row + len(chunk) - 1
        end_col = len(headers)
        end_a1 = gspread.utils.rowcol_to_a1(end_row, end_col)
        rng = f"A{start_row}:{end_a1}"
        acc_ws.update(values=chunk, range_name=rng)
        start_row = end_row + 1

    print(f"📊 Uploaded {len(rows)} rows to {sheet_name}")
    return True

def parse_dt(s):
    try:
        return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
    except Exception:
        return None

# NEW: universal stale picker (any status) with Under Review priority
def pick_next_account(ws, stale_minutes=5):
    accounts = ws.get_all_records()
    now = datetime.now()
    norm = lambda v: str(v or "").strip().lower()

    def last_update(a):
        s = str(a.get("Last Data Update", "")).strip()
        return parse_dt(s) if s else None

    def is_stale(a):
        dt = last_update(a)
        return (dt is None) or (now - dt > timedelta(minutes=stale_minutes))

    stale = [a for a in accounts if is_stale(a)]
    if not stale:
        return None, accounts

    # Prioritize Under Review first, then the stalest among the rest
    under = [a for a in stale if norm(a.get("status")) == "under review"]
    pool  = under if under else stale

    def sort_key(a):
        dt = last_update(a)
        return dt or datetime(1970,1,1)

    # pick the stalest (oldest Last Data Update)
    pool.sort(key=sort_key)
    return pool[0], accounts

# === Main loop ===
while True:
    try:
        ss = client.open_by_key(SHEET_ID)
        ws = ss.worksheet(TAB_NAME)

        headers = ws.row_values(1)
        changed = False
        if "status" not in headers:
            ws.update_cell(1, len(headers) + 1, "status"); headers.append("status"); changed = True
        if "Last Data Update" not in headers:
            ws.update_cell(1, len(headers) + 1, "Last Data Update"); headers.append("Last Data Update"); changed = True
        if "# Successful Logins" not in headers:
            ws.update_cell(1, len(headers) + 1, "# Successful Logins"); headers.append("# Successful Logins"); changed = True
        if changed:
            headers = ws.row_values(1)

        status_col  = headers.index("status") + 1
        update_col  = headers.index("Last Data Update") + 1
        counter_col = headers.index("# Successful Logins") + 1
        login_col   = headers.index("login") + 1
        server_col  = headers.index("server") + 1

        print("\n🔄 Starting account processing loop...")

        while True:
            candidate, snapshot = pick_next_account(ws, stale_minutes=5)
            if not candidate:
                print("😴 Nothing stale (>5 min). Sleeping 20s…")
                time.sleep(20)
                break

            try:
                login = int(candidate["login"])
            except Exception:
                print(f"⚠️ Bad login value: {candidate.get('login')}; skipping.")
                time.sleep(2)
                continue

            password = candidate.get("password", "")
            server   = candidate.get("server", "")
            status   = str(candidate.get("status", "")).strip().lower()
            raw_counter = candidate.get("# Successful Logins", 0)
            try:
                counter_val = int(raw_counter)
            except Exception:
                counter_val = 0

            # Update ALL rows for (login, server)
            row_indices = find_rows_by_login_server(ws, login, server, login_col, server_col)
            if not row_indices:
                print(f"⚠️ No rows found for ({login}, {server}); skipping.")
                time.sleep(2)
                continue

            print(f"\n➡️ Processing {login} ({server}) [status={status}] — up to {ATTEMPTS_PER_ACCOUNT} attempts")

            connected_any = False
            uploaded_any  = False

            for attempt in range(1, ATTEMPTS_PER_ACCOUNT + 1):
                print(f"--- Attempt {attempt}/{ATTEMPTS_PER_ACCOUNT} ---")
                if not attempt_login(login, password, server):
                    time.sleep(2)
                    continue

                connected_any = True

                # Build DF directly from deals
                try:
                    df = build_june_to_date_df(login)
                except Exception as ex:
                    print("⚠️ Failed to build history DF:", ex)
                    df = None

                if df is not None:
                    try:
                        upload_df_to_tab(ss, login, df)  # populate unchanged
                        uploaded_any = True
                    except Exception as ex2:
                        print("⚠️ Upload failed:", ex2)

                close_mt5()

                if uploaded_any:
                    print("✅ Success on this attempt — stopping retries.")
                    break
                else:
                    time.sleep(2)

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if uploaded_any:
                new_status  = "Success"
                new_counter = counter_val + 1
            else:
                new_status  = "Invalid Logins" if not connected_any else "Connected-NoData"
                new_counter = counter_val

            ok1 = write_cells_with_confirm(ws, row_indices, status_col,  new_status)
            ok2 = write_cells_with_confirm(ws, row_indices, update_col,  now_str)
            ok3 = write_cells_with_confirm(ws, row_indices, counter_col, str(new_counter))

            print(f"📊 Updated sheet for {login} ({server}) rows={row_indices} | status={new_status} | time={now_str} | #logins={new_counter} | ok={[ok1,ok2,ok3]}")

            # Re-read the worksheet so if a new Under Review appears, it gets priority on the next pick
            ws = ss.worksheet(TAB_NAME)
            time.sleep(SLEEP_BETWEEN_ACCOUNTS)

    except Exception as e:
        print("❌ Error:", e)
        time.sleep(10)
