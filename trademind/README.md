# TradeMind — Trading Journal

A responsive trading journal and analytics dashboard for **USOIL, BTCUSD, XAUUSD, and US100 Cash**. Built with React + Vite, Recharts, Lucide, and Supabase authentication with per-user cloud storage.

## Included

- Warm burgundy / champagne-gold editorial UI inspired by your reference screenshot, with subtle grid backdrop, refined serif headings, soft glow, smooth hover states, and responsive layouts
- Dashboard with net P&L, win rate, profit factor, rule adherence, equity curve, market comparison, recent trades, and mistake radar
- Add/delete trade form with market, direction, setup, entry/exit, stop/target, size, risk, fees, mistake tag, mindset, notes, and rule-followed flag
- Search, market filters, time filters, CSV import/export
- Local, read-only Vantage MT5 history export to TradeMind-compatible CSV (see [`vantage_mt5/README.md`](./vantage_mt5/README.md))
- Analytics page with equity progression and market comparison
- Mistake/mindset review and pre-trade checklist
- Risk calculator and daily loss guardrail
- Email/password sign-up, sign-in, email verification, password reset, and sign-out
- Private cloud trades protected by Supabase row-level security
- Starts empty; no sample/demo trades are seeded

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173/`).

To create a production build:

```bash
npm run build
npm run preview
```

## Deploy to Netlify

1. Push this TradeMind project folder to a Git provider, then import that repository in Netlify. If the repository contains this app inside a `trademind/` subfolder, set the Netlify base directory to `trademind`; otherwise leave the base directory blank.
2. Netlify reads [`netlify.toml`](./netlify.toml): build command `npm run build`, publish directory `dist`, and a single-page-app fallback for direct page loads.
3. Before the first deploy, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Site configuration → Environment variables**. Use the Supabase project's public URL and publishable/anon key, never its service-role key.
4. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to your production Netlify URL (for example `https://your-site.netlify.app`) and add that domain to the allowed redirect URLs (for example `https://your-site.netlify.app/**`). Add your custom domain there too if you configure one.
6. Configure Supabase email confirmation and production SMTP, then trigger a fresh Netlify deploy after setting the environment variables.
7. Test account sign-up, email confirmation, sign-in, password reset, saving and deleting one trade, and CSV import on the deployed URL.

Vite embeds `VITE_` variables in the built frontend. The Supabase publishable/anon key is intended for browser use and is protected by RLS; never put the service-role key in Netlify frontend variables. If Supabase environment variables are missing, the deployed page intentionally shows setup instructions instead of demo data.

### Deployment checks

- **Setup screen after deploy:** check both Netlify environment variable names and values, then trigger a new deploy; Vite reads them at build time.
- **Trades table or column error:** run the current `supabase/schema.sql` in the Supabase SQL Editor.
- **Email confirmation/reset returns to the wrong URL:** set the Supabase Site URL and allowed redirect URLs to your live Netlify URL (and custom domain, if used).
- **Confirmation email is missing or delayed:** configure production SMTP in Supabase Auth and test with your live domain.

## Configure authentication and cloud storage

1. Create a Supabase project and copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project's public URL and publishable/anon key. Never use a service-role key in the browser or commit `.env`.
3. Run `supabase/schema.sql` in the Supabase SQL Editor to create the trades table, unique MT5 import key, and per-user RLS policies.
4. In Supabase Authentication → URL Configuration, set the local Site URL for development and add your production domain to the allowed redirect URLs.
5. Configure SMTP/email confirmation for production signup and password recovery. Test verification and recovery links on your actual domain.
6. Restart Vite after setting environment variables. Without project credentials, the app shows setup instructions and does not open a local/demo journal.

For production deployment, set the same two public client variables in your hosting provider and rebuild. Keep the Supabase service-role key private and server-side only. Supabase row-level security is enabled; never disable it.

## Data and important limitations

- Trades are stored in the signed-in user's Supabase account. Clearing browser data does not delete cloud trades.
- If you have data in an older local-only version, export a CSV backup before switching. The new authenticated version does not automatically copy local browser data into an account.
- The app calculates estimated P&L from price difference × entered size unless a manual P&L is entered. This generic formula does **not** account for all broker contract sizes, tick values, currency conversion, swaps, slippage, or commissions. Enter the broker-reported P&L when needed.
- The position-size calculator is only an estimate. Verify each instrument's contract specifications and point/tick value with your broker before relying on a result. It does not place trades or connect to a broker.
- This is a journaling/educational tool, not financial advice or an automated trading system.

## Vantage MT5 history import

Use **Connect Vantage MT5** in the app for the local read-only connector steps.
The connector reads closed positions from an MT5 terminal where you are already
signed in; it does not send broker credentials to the website and does not
provide automatic/live sync. See [`vantage_mt5/README.md`](./vantage_mt5/README.md)
for setup and limitations.

## Stack

- React 18 + Vite
- Recharts for data visualization
- Lucide React icons
- Supabase JS client (authentication and private cloud storage)
- Plain CSS responsive styling
