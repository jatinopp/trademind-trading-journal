# Vantage MT5 → TradeMind CSV connector

This local, read-only connector exports closed positions from an already signed-in
MetaTrader 5 terminal. It does not ask for or store your Vantage password, place
orders, or connect to a broker from the TradeMind website.

## Setup

1. Install MetaTrader 5 and sign in to your Vantage account in the terminal.
2. Keep the terminal open. In PowerShell, open this folder:

   ```powershell
   cd "C:\path\to\trademind\vantage_mt5"
   ```

3. Install the local Python package and run the exporter:

   ```powershell
   py -m pip install MetaTrader5
   py export_vantage_mt5.py
   ```

4. The script creates `trademind_vantage_trades.csv` in this folder.
5. In TradeMind, open **Trade Journal → Import CSV** and select that file.

If more than one MT5 terminal is installed, set `MT5_TERMINAL_PATH` to the
Vantage terminal executable before running the script, for example:

```powershell
$env:MT5_TERMINAL_PATH = "C:\Program Files\Vantage International MT5\terminal64.exe"
py export_vantage_mt5.py
```

## Symbol mapping and trade calculations

The script maps common oil, gold, Bitcoin, and US100 aliases to TradeMind's
supported markets. If your Vantage symbols differ, add their normalized names
to `SYMBOL_MAP` in `export_vantage_mt5.py`. Unrecognized symbols are reported
and skipped; they are not silently relabeled.

Partial fills and partial closes are combined by MT5 position ID when the
position is fully closed. Open positions, reversals, and positions without a
matching total entry/exit volume are skipped. The exported `pnl` is MT5's
realized profit; commissions, swaps, and fees are included in TradeMind's
`fees` field so its net P&L calculation can subtract them. Stop-loss, target,
and planned risk are not inferred from history.

Re-importing the same connector CSV will not add duplicate positions. Check
the exported symbols and net totals against MT5 before relying on the journal
analytics. Broker reporting conventions can vary.
