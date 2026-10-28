"""Export closed Vantage MT5 positions to a TradeMind-compatible CSV."""

import csv
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


OUTPUT_PATH = Path(__file__).resolve().parent / "trademind_vantage_trades.csv"

SYMBOL_MAP = {
    "USOIL": "USOIL",
    "USOILCASH": "USOIL",
    "XTIUSD": "USOIL",
    "WTI": "USOIL",
    "BTCUSD": "BTCUSD",
    "BTCUSDM": "BTCUSD",
    "BTCUSDRAW": "BTCUSD",
    "XAUUSD": "XAUUSD",
    "GOLD": "XAUUSD",
    "US100": "US100 Cash",
    "US100CASH": "US100 Cash",
    "NAS100": "US100 Cash",
    "NAS100CASH": "US100 Cash",
    "USTEC": "US100 Cash",
}

CSV_COLUMNS = [
    "date",
    "time",
    "market",
    "direction",
    "setup",
    "entry",
    "exit",
    "stop",
    "target",
    "size",
    "risk",
    "pnl",
    "fees",
    "mistake",
    "emotion",
    "ruleFollowed",
    "notes",
    "sourceId",
]


def normalize_symbol(symbol):
    return re.sub(r"[^A-Z0-9]", "", symbol.upper())


def build_trade_rows(deals, mt5):
    positions = defaultdict(list)
    for deal in deals:
        position_id = getattr(deal, "position_id", 0)
        if position_id:
            positions[position_id].append(deal)

    rows = []
    skipped_symbols = set()
    skipped_positions = 0

    for position_id, position_deals in positions.items():
        symbol = position_deals[0].symbol
        market = SYMBOL_MAP.get(normalize_symbol(symbol))
        if not market:
            skipped_symbols.add(symbol)
            continue

        if any(deal.entry == mt5.DEAL_ENTRY_INOUT for deal in position_deals):
            skipped_positions += 1
            continue

        entries = [deal for deal in position_deals if deal.entry == mt5.DEAL_ENTRY_IN]
        exits = [
            deal
            for deal in position_deals
            if deal.entry in (mt5.DEAL_ENTRY_OUT, mt5.DEAL_ENTRY_OUT_BY)
        ]
        if not entries or not exits:
            skipped_positions += 1
            continue

        entry_types = {deal.type for deal in entries}
        if len(entry_types) != 1 or any(deal.symbol != symbol for deal in position_deals):
            skipped_positions += 1
            continue

        entry_volume = sum(deal.volume for deal in entries)
        exit_volume = sum(deal.volume for deal in exits)
        tolerance = max(1e-8, entry_volume * 1e-6)
        if entry_volume <= 0 or abs(entry_volume - exit_volume) > tolerance:
            skipped_positions += 1
            continue

        entry_price = sum(deal.volume * deal.price for deal in entries) / entry_volume
        exit_price = sum(deal.volume * deal.price for deal in exits) / exit_volume
        opened_at = min(deal.time for deal in entries)
        closed_at = max(deal.time for deal in exits)
        opened_local = datetime.fromtimestamp(opened_at, timezone.utc).astimezone()
        gross_pnl = sum(deal.profit for deal in position_deals)
        costs = sum(
            getattr(deal, "commission", 0)
            + getattr(deal, "swap", 0)
            + getattr(deal, "fee", 0)
            for deal in position_deals
        )
        direction = "Long" if next(iter(entry_types)) == mt5.DEAL_TYPE_BUY else "Short"

        rows.append(
            {
                "date": opened_local.date().isoformat(),
                "time": opened_local.strftime("%H:%M"),
                "market": market,
                "direction": direction,
                "setup": "Other",
                "entry": round(entry_price, 10),
                "exit": round(exit_price, 10),
                "stop": 0,
                "target": 0,
                "size": round(entry_volume, 8),
                "risk": 0,
                "pnl": round(gross_pnl, 8),
                "fees": round(-costs, 8),
                "mistake": "None",
                "emotion": "Calm",
                "ruleFollowed": "true",
                "notes": f"Vantage MT5 position {position_id}; closed {datetime.fromtimestamp(closed_at, timezone.utc).astimezone():%Y-%m-%d %H:%M}",
                "sourceId": f"mt5:{position_id}",
                "_opened_at": opened_at,
            }
        )

    rows.sort(key=lambda row: row["_opened_at"], reverse=True)
    for row in rows:
        del row["_opened_at"]
    return rows, skipped_positions, sorted(skipped_symbols)


def main():
    try:
        import MetaTrader5 as mt5
    except ImportError:
        print(
            "MetaTrader5 package not found. Run: py -m pip install MetaTrader5",
            file=sys.stderr,
        )
        return 1

    terminal_path = os.environ.get("MT5_TERMINAL_PATH")
    initialized = (
        mt5.initialize(terminal_path) if terminal_path else mt5.initialize()
    )
    if not initialized:
        print(
            f"Could not connect to the MT5 terminal: {mt5.last_error()}. "
            "Open MT5, sign in to Vantage, and try again.",
            file=sys.stderr,
        )
        return 1

    try:
        account = mt5.account_info()
        if account is None:
            print(f"Could not read MT5 account status: {mt5.last_error()}", file=sys.stderr)
            return 1

        deals = mt5.history_deals_get(
            datetime(1970, 1, 1, tzinfo=timezone.utc),
            datetime.now(timezone.utc),
        )
        if deals is None:
            print(f"Could not read MT5 deal history: {mt5.last_error()}", file=sys.stderr)
            return 1

        rows, skipped_positions, skipped_symbols = build_trade_rows(deals, mt5)
        with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=CSV_COLUMNS)
            writer.writeheader()
            writer.writerows(rows)
    finally:
        mt5.shutdown()

    print(f"Exported {len(rows)} closed positions to: {OUTPUT_PATH}")
    if skipped_positions:
        print(
            f"Skipped {skipped_positions} incomplete or complex positions; "
            "these may include open positions or reversals."
        )
    if skipped_symbols:
        print(
            "Skipped unrecognized symbols: "
            + ", ".join(skipped_symbols)
            + ". Add their aliases to SYMBOL_MAP in this script and run it again."
        )
    print("Review the CSV totals against MT5 before importing it into TradeMind.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
