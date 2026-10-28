-- Private per-account cloud persistence for TradeMind.
-- Run in the Supabase SQL Editor after creating your Supabase project.
create extension if not exists pgcrypto;
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text,
  trade_date date not null,
  trade_time time,
  market text not null check (market in ('USOIL','BTCUSD','XAUUSD','US100 Cash')),
  direction text not null check (direction in ('Long','Short')),
  setup text not null,
  entry numeric not null,
  exit numeric not null,
  stop_loss numeric,
  take_profit numeric,
  position_size numeric not null default 0,
  planned_risk numeric not null default 0,
  pnl numeric not null default 0,
  fees numeric not null default 0,
  mistake text not null default 'None',
  emotion text not null default 'Calm',
  notes text not null default '',
  rule_followed boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.trades add column if not exists source_id text;
alter table public.trades enable row level security;
drop policy if exists "Users can view their own trades" on public.trades;
drop policy if exists "Users can insert their own trades" on public.trades;
drop policy if exists "Users can update their own trades" on public.trades;
drop policy if exists "Users can delete their own trades" on public.trades;
create policy "Users can view their own trades" on public.trades for select using (auth.uid() = user_id);
create policy "Users can insert their own trades" on public.trades for insert with check (auth.uid() = user_id);
create policy "Users can update their own trades" on public.trades for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own trades" on public.trades for delete using (auth.uid() = user_id);
create index if not exists trades_user_date_idx on public.trades(user_id, trade_date desc);
create unique index if not exists trades_user_source_id_idx on public.trades(user_id, source_id);
