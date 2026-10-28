import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, BookOpen, Brain, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Download, FileSpreadsheet, Filter, Gauge, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Target, TrendingUp, Upload, Wallet, X, Zap } from 'lucide-react';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const markets = ['USOIL', 'BTCUSD', 'XAUUSD', 'US100 Cash'];
const setups = ['Breakout', 'Pullback', 'Support / Resistance', 'Trend continuation', 'Liquidity sweep', 'Other'];
const mistakeOptions = ['None', 'FOMO entry', 'Revenge trade', 'Moved stop loss', 'Exited too early', 'Overtrading', 'No valid setup', 'Oversized position'];

const fmt = (n) => `${n < 0 ? '-$' : '$'}${Math.abs(Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const dateLabel = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'});

function tradeFromRow(row){
 return {
   id:row.id,
   sourceId:row.source_id||'',
   date:row.trade_date,
   time:row.trade_time||'',
   market:row.market,
   direction:row.direction,
   setup:row.setup,
   entry:Number(row.entry),
   exit:Number(row.exit),
   stop:Number(row.stop_loss||0),
   target:Number(row.take_profit||0),
   size:Number(row.position_size||0),
   risk:Number(row.planned_risk||0),
   pnl:Number(row.pnl||0),
   fees:Number(row.fees||0),
   mistake:row.mistake||'None',
   emotion:row.emotion||'Calm',
   notes:row.notes||'',
   ruleFollowed:row.rule_followed!==false
 };
}

function tradeToRow(trade,userId){
 return {
   user_id:userId,
   source_id:trade.sourceId||null,
   trade_date:trade.date,
   trade_time:trade.time||null,
   market:trade.market,
   direction:trade.direction,
   setup:trade.setup||'Other',
   entry:Number(trade.entry),
   exit:Number(trade.exit),
   stop_loss:Number(trade.stop||0)||null,
   take_profit:Number(trade.target||0)||null,
   position_size:Number(trade.size||0),
   planned_risk:Number(trade.risk||0),
   pnl:Number(trade.pnl||0),
   fees:Number(trade.fees||0),
   mistake:trade.mistake||'None',
   emotion:trade.emotion||'Calm',
   notes:trade.notes||'',
   rule_followed:trade.ruleFollowed!==false
 };
}

function AuthGate({client,missingConfig,recovery=false,initialError=''}){
 const [mode,setMode]=useState(recovery?'update':'signin');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);

 async function submit(event){
   event.preventDefault();
   setMessage('');
   setError('');
   if(missingConfig)return;
   const normalizedEmail=email.trim();
   if(mode!=='update'&&!normalizedEmail){setError('Enter your email address.');return}
   if(mode!=='reset'&&password.length<8){setError('Password must be at least 8 characters.');return}
   setBusy(true);
   try{
     if(mode==='signup'){
       const {data,error:authError}=await client.auth.signUp({email:normalizedEmail,password});
       if(authError)throw authError;
       setMessage(data.session?'Account created. You are signed in.':'Check your email to confirm your new account.');
     }else if(mode==='signin'){
       const {error:authError}=await client.auth.signInWithPassword({email:normalizedEmail,password});
       if(authError)throw authError;
     }else if(mode==='reset'){
       const {error:authError}=await client.auth.resetPasswordForEmail(normalizedEmail,{redirectTo:window.location.origin});
       if(authError)throw authError;
       setMessage('If an account exists for this email, a password reset link is on its way.');
     }else if(mode==='update'){
       const {error:authError}=await client.auth.updateUser({password});
       if(authError)throw authError;
       setMessage('Password updated. You can continue to your journal.');
     }
   }catch(authError){
     setError(authError.message||'Authentication failed. Please try again.');
   }finally{
     setBusy(false);
   }
 }

 return (
   <main className="auth-page">
     <section className="auth-card">
       <div className="auth-brand"><span className="brand-mark"><Activity size={21}/></span><div><b>Trade<span>Mind</span></b><small>PRIVATE TRADING JOURNAL</small></div></div>
       <div className="auth-eyebrow"><ShieldCheck size={14}/> PRIVATE BY DEFAULT</div>
       <h1>{missingConfig?'Connect your Supabase project':mode==='signup'?'Create your account':mode==='reset'?'Reset your password':mode==='update'?'Choose a new password':'Welcome back'}</h1>
       <p className="auth-description">{missingConfig?'Add your Supabase project URL and publishable anon key to enable secure sign-in and private cloud storage.':mode==='update'?'Set a new password for your account.':'Sign in to securely view and sync your private trade journal.'}</p>
       {missingConfig?(
         <div className="auth-setup">
           <p>Copy <code>.env.example</code> to <code>.env</code> and set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> from your Supabase project. Then run <code>supabase/schema.sql</code> in its SQL editor and restart the app.</p>
           <p>For deployment, set the same two public client variables in your hosting provider. Never use a Supabase service-role key in the browser.</p>
         </div>
       ):(
         <form className="auth-form" onSubmit={submit}>
           {mode!=='update'&&<label>Email address<input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/></label>}
           {mode!=='reset'&&<label>Password<input type="password" autoComplete={mode==='signin'?'current-password':'new-password'} minLength="8" required value={password} onChange={event=>setPassword(event.target.value)} placeholder="At least 8 characters"/></label>}
           {initialError&&!error&&<p className="auth-error" role="alert">{initialError}</p>}
           {error&&<p className="auth-error" role="alert">{error}</p>}
           {message&&<p className="auth-message" role="status">{message}</p>}
           <button className="btn btn-primary auth-submit" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create account':mode==='reset'?'Send reset link':mode==='update'?'Update password':'Sign in'}</button>
           {mode!=='update'&&<div className="auth-links">
             {mode==='signin'&&<><button type="button" onClick={()=>{setMode('signup');setError('');setMessage('')}}>Create account</button><button type="button" onClick={()=>{setMode('reset');setError('');setMessage('')}}>Forgot password?</button></>}
             {mode!=='signin'&&<button type="button" onClick={()=>{setMode('signin');setError('');setMessage('')}}>Back to sign in</button>}
           </div>}
         </form>
       )}
       <div className="auth-privacy"><ShieldCheck size={15}/> Every trade is protected by Supabase authentication and row-level security.</div>
     </section>
   </main>
 );
}

function DhanCalendar({ trades, onAddTrade }) {
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 1));
  const [viewMode, setViewMode] = useState('two-month');
  const [styleMode, setStyleMode] = useState('dhan');
  const [selectedDate, setSelectedDate] = useState(null);

  const prevMonth = () => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };
  const resetToToday = () => {
    setCurrentDate(new Date(2026, 9, 1));
  };

  const buildMonth = (year, month) => {
    const monthDate = new Date(year, month, 1);
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday as start (0: Mon, 1: Tue, ... 6: Sun)
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, empty: true });
    }

    let monthPnl = 0;
    let greenDays = 0;
    let redDays = 0;
    let totalTrades = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTrades = trades.filter(t => t.date === dateStr);
      const dayNet = dayTrades.reduce((sum, t) => sum + Number(t.pnl || 0) - Number(t.fees || 0), 0);
      const count = dayTrades.length;

      let status = 'none';
      if (count > 0) {
        totalTrades += count;
        monthPnl += dayNet;
        if (dayNet > 0) {
          status = 'green';
          greenDays++;
        } else if (dayNet < 0) {
          status = 'red';
          redDays++;
        } else {
          status = 'even';
        }
      }

      days.push({
        day: d,
        dateStr,
        trades: dayTrades,
        pnl: dayNet,
        count,
        status,
        empty: false
      });
    }

    const tradedDays = greenDays + redDays;
    const winRate = tradedDays ? Math.round((greenDays / tradedDays) * 100) : 0;

    return {
      year,
      month,
      monthName,
      days,
      monthPnl,
      greenDays,
      redDays,
      totalTrades,
      tradedDays,
      winRate
    };
  };

  const primaryMonth = buildMonth(currentDate.getFullYear(), currentDate.getMonth());
  const prevMonthIndex = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1;
  const prevYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
  const secondaryMonth = buildMonth(prevYear, prevMonthIndex);

  const displayedMonths = viewMode === 'two-month' ? [secondaryMonth, primaryMonth] : [primaryMonth];

  const combinedPnl = displayedMonths.reduce((a, m) => a + m.monthPnl, 0);
  const combinedGreen = displayedMonths.reduce((a, m) => a + m.greenDays, 0);
  const combinedRed = displayedMonths.reduce((a, m) => a + m.redDays, 0);
  const combinedTrades = displayedMonths.reduce((a, m) => a + m.totalTrades, 0);
  const combinedWinRate = (combinedGreen + combinedRed) ? Math.round((combinedGreen / (combinedGreen + combinedRed)) * 100) : 0;

  const selectedTrades = selectedDate ? trades.filter(t => t.date === selectedDate) : [];
  const selectedDayNet = selectedTrades.reduce((a, t) => a + Number(t.pnl || 0) - Number(t.fees || 0), 0);
  const selectedDateFormatted = selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <section className="dhan-calendar-panel" id="pnl-calendar">
      <div className="dhan-top-row">
        <div className="dhan-title-wrap">
          <div className="dhan-icon-badge">
            <CalendarDays size={20} />
          </div>
          <div>
            <h2>
              Trader's Diary <span className="dhan-tag">DHAN P&L CALENDAR</span>
            </h2>
            <div className="dhan-subtitle">
              Visual profit & loss calendar — green days for profit, red days for loss
            </div>
          </div>
        </div>

        <div className="dhan-controls">
          <div className="dhan-btn-group">
            <button
              className={viewMode === 'two-month' ? 'active' : ''}
              onClick={() => setViewMode('two-month')}
              title="2 Months side-by-side like Dhan app"
            >
              2 Months View
            </button>
            <button
              className={viewMode === 'single' ? 'active' : ''}
              onClick={() => setViewMode('single')}
            >
              1 Month
            </button>
          </div>

          <div className="dhan-btn-group">
            <button
              className={styleMode === 'dhan' ? 'active' : ''}
              onClick={() => setStyleMode('dhan')}
              title="Compact tiles matching Dhan"
            >
              Dhan Tiles
            </button>
            <button
              className={styleMode === 'detailed' ? 'active' : ''}
              onClick={() => setStyleMode('detailed')}
            >
              Detailed P&L
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button className="dhan-nav-btn" onClick={prevMonth} title="Previous Month">
              <ChevronLeft size={16} />
            </button>
            <button className="dhan-today-btn" onClick={resetToToday}>
              Current
            </button>
            <button className="dhan-nav-btn" onClick={nextMonth} title="Next Month">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="dhan-kpis">
        <div className={`dhan-kpi-item ${combinedPnl >= 0 ? 'dhan-kpi-green' : 'dhan-kpi-red'}`}>
          <span>{viewMode === 'two-month' ? '2-Month Net P&L:' : 'Month Net P&L:'}</span>
          <strong>{fmt(combinedPnl)}</strong>
        </div>
        <div className="dhan-kpi-item dhan-kpi-green">
          <span>🟢 Green Days:</span>
          <strong>{combinedGreen} Days</strong>
        </div>
        <div className="dhan-kpi-item dhan-kpi-red">
          <span>🔴 Red Days:</span>
          <strong>{combinedRed} Days</strong>
        </div>
        <div className="dhan-kpi-item">
          <span>🎯 Day Win Rate:</span>
          <strong>{combinedWinRate}%</strong>
        </div>
        <div className="dhan-kpi-item">
          <span>⚡ Total Trades:</span>
          <strong>{combinedTrades} Trades</strong>
        </div>
      </div>

      <div className={`dhan-months-container ${viewMode}`}>
        {displayedMonths.map((m) => (
          <div className="dhan-month-card" key={`${m.year}-${m.month}`}>
            <div className="dhan-month-header">
              <div className="dhan-month-title">
                {m.monthName}
              </div>
              <div className={`dhan-month-pnl-chip ${m.monthPnl >= 0 ? 'positive' : 'negative'}`}>
                {m.monthPnl >= 0 ? '+' : ''}{fmt(m.monthPnl)} · {m.greenDays}W / {m.redDays}L
              </div>
            </div>

            <div className="dhan-weekdays">
              <div>M</div>
              <div>T</div>
              <div>W</div>
              <div>T</div>
              <div>F</div>
              <div>S</div>
              <div>S</div>
            </div>

            <div className="dhan-grid">
              {m.days.map((item, idx) => {
                if (item.empty) {
                  return <div className="dhan-day-cell empty" key={`empty-${idx}`} />;
                }
                const isSelected = selectedDate === item.dateStr;
                return (
                  <div
                    key={item.dateStr}
                    className={`dhan-day-cell ${styleMode === 'dhan' ? 'compact' : 'detailed'} ${item.status} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDate(isSelected ? null : item.dateStr)}
                    title={item.count ? `${item.dateStr}: ${fmt(item.pnl)} (${item.count} trades)` : `${item.dateStr}: No trades`}
                  >
                    {styleMode === 'dhan' ? (
                      <>
                        <span className="day-num">{item.day}</span>
                        {item.count > 0 && <span className="mini-dot" />}
                      </>
                    ) : (
                      <>
                        <div className="day-header">
                          <span className="day-num">{item.day}</span>
                          {item.count > 0 && <span className="day-count">{item.count}t</span>}
                        </div>
                        <div className="day-pnl">
                          {item.count > 0 ? (item.pnl >= 0 ? `+${fmt(item.pnl).replace('$','')}` : fmt(item.pnl).replace('-$','-')) : '—'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedDate && (
        <div className="dhan-day-details">
          <div className="dhan-details-top">
            <div className="dhan-details-title">
              <CalendarDays size={18} style={{ color: '#fed287' }} />
              <div>
                <h3>Day Breakdown: {selectedDateFormatted}</h3>
                <small style={{ color: '#bfa198' }}>{selectedTrades.length} trades recorded</small>
              </div>
            </div>

            <div className="dhan-details-metrics">
              {selectedTrades.length > 0 && (
                <div className={`dhan-day-result-badge ${selectedDayNet >= 0 ? 'positive' : 'negative'}`}>
                  Net Result: {fmt(selectedDayNet)}
                </div>
              )}
              <button
                className="icon-btn"
                title="Close breakdown"
                onClick={() => setSelectedDate(null)}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {selectedTrades.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>MARKET / SETUP</th>
                    <th>ENTRY → EXIT</th>
                    <th>NET P&L</th>
                    <th>REVIEW</th>
                    <th>NOTES</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTrades.map((t) => (
                    <tr key={t.id}>
                      <td><b style={{ color: '#fff1e6' }}>{t.time || '—'}</b></td>
                      <td>
                        <div className="table-market">
                          <span className={`market-dot dot-${Math.max(0, markets.indexOf(t.market))}`}></span>
                          <b>{t.market}</b>
                          <span className={`direction ${t.direction === 'Long' ? 'long' : 'short'}`}>{t.direction}</span>
                        </div>
                        <div className="muted small-text">{t.setup}</div>
                      </td>
                      <td>
                        <div className="price-main">
                          {Number(t.entry).toLocaleString()} <span>→</span> {Number(t.exit).toLocaleString()}
                        </div>
                        <div className="muted small-text">Size {t.size}</div>
                      </td>
                      <td>
                        <b className={Number(t.pnl) - Number(t.fees) >= 0 ? 'positive' : 'negative'}>
                          {fmt(Number(t.pnl) - Number(t.fees))}
                        </b>
                        <div className="muted small-text">{Number(t.fees) > 0 ? `${fmt(t.fees)} fees` : 'No fees'}</div>
                      </td>
                      <td>
                        <span className={`mistake-pill ${t.mistake === 'None' ? 'clean' : 'flagged'}`}>
                          {t.mistake === 'None' ? '✓ Clean' : t.mistake}
                        </span>
                        <div className="muted small-text">{t.ruleFollowed ? 'Rules followed' : 'Rule break'}</div>
                      </td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dhan-empty-day">
              <p>No trades logged on this date ({selectedDate}).</p>
              <button
                className="btn btn-secondary"
                onClick={() => onAddTrade(selectedDate)}
              >
                <Plus size={15} /> Log trade for this date
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function App(){
 const [trades,setTrades]=useState([]);
 const [authLoading,setAuthLoading]=useState(Boolean(supabase));
 const [tradesLoading,setTradesLoading]=useState(false);
 const [cloudError,setCloudError]=useState('');
 const [page,setPage]=useState('Overview');
 const [marketFilter,setMarketFilter]=useState('All markets');
 const [search,setSearch]=useState('');
 const [period,setPeriod]=useState('All time');
 const [showAdd,setShowAdd]=useState(false);
 const [mobileNav,setMobileNav]=useState(false);
 const [toast,setToast]=useState('');
 const [user,setUser]=useState(null);
 const [passwordRecovery,setPasswordRecovery]=useState(false);
 const [showVantageConnect,setShowVantageConnect]=useState(false);
 const [form,setForm]=useState({date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5),market:'XAUUSD',direction:'Long',setup:'Pullback',entry:'',exit:'',stop:'',target:'',size:'0.1',risk:'',pnl:'',fees:'0',mistake:'None',emotion:'Calm',notes:'',ruleFollowed:true});

 useEffect(()=>{
   if(!supabase){setAuthLoading(false);return}
   const {data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{
     if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTrades([]);
     setUser(s?.user||null);
     if(event==='PASSWORD_RECOVERY')setPasswordRecovery(true);
     if(event==='USER_UPDATED')setPasswordRecovery(false);
   });
   supabase.auth.getSession().then(({data,error})=>{
     if(error)setCloudError(error.message);
     setUser(data?.session?.user||null);
     setAuthLoading(false);
   }).catch(error=>{
     setCloudError(error.message||'Could not verify your session.');
     setAuthLoading(false);
   });
   return()=>subscription.unsubscribe();
 },[]);

 useEffect(()=>{
   if(!supabase||!user){setTrades([]);setTradesLoading(false);return}
   let active=true;
   setTrades([]);
   setTradesLoading(true);
   setCloudError('');
   supabase.from('trades').select('*').eq('user_id',user.id).order('trade_date',{ascending:false}).order('trade_time',{ascending:false}).then(({data,error})=>{
     if(!active)return;
     if(error){setCloudError(`Could not load your journal: ${error.message}`);setTradesLoading(false);return}
     setTrades((data||[]).map(tradeFromRow));
     setTradesLoading(false);
   }).catch(error=>{
     if(active){setCloudError(error.message||'Could not load your journal.');setTradesLoading(false)}
   });
   return()=>{active=false};
 },[user]);

 const filtered=useMemo(()=>trades.filter(t=>(marketFilter==='All markets'||t.market===marketFilter)&&(`${t.market} ${t.setup} ${t.mistake} ${t.notes}`.toLowerCase().includes(search.toLowerCase()))&&(period==='All time'||(period==='Today'?t.date===new Date().toISOString().slice(0,10):period==='7 days'?new Date(t.date)>=new Date(Date.now()-7*86400000):new Date(t.date)>=new Date(Date.now()-30*86400000)))),[trades,marketFilter,search,period]);
 const totalPnl=filtered.reduce((a,t)=>a+Number(t.pnl||0)-Number(t.fees||0),0);
 const wins=filtered.filter(t=>Number(t.pnl)>0);
 const losses=filtered.filter(t=>Number(t.pnl)<0);
 const winRate=filtered.length?Math.round(wins.length/filtered.length*100):0;
 const grossWin=wins.reduce((a,t)=>a+Number(t.pnl),0);
 const grossLoss=Math.abs(losses.reduce((a,t)=>a+Number(t.pnl),0));
 const profitFactor=grossLoss?grossWin/grossLoss:grossWin?grossWin:0;
 const avgR=filtered.length?filtered.reduce((a,t)=>a+(Number(t.risk)>0?Number(t.pnl)/Number(t.risk):0),0)/filtered.length:0;
 const ruleRate=filtered.length?Math.round(filtered.filter(t=>t.ruleFollowed).length/filtered.length*100):0;
 const equity=useMemo(()=>{
   let running=0;
   return [...filtered].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).map((t,i)=>({date:dateLabel(t.date),equity:Number((running+=Number(t.pnl||0)-Number(t.fees||0)).toFixed(2)),trade:i+1}));
 },[filtered]);
 const byMarket=markets.map(m=>({market:m,pnl:Number(filtered.filter(t=>t.market===m).reduce((a,t)=>a+Number(t.pnl||0)-Number(t.fees||0),0).toFixed(2))}));

 const notify=(s)=>{setToast(s);setTimeout(()=>setToast(''),2600)};

 function saveTrade(e){
   e.preventDefault();
   const entry=Number(form.entry),exit=Number(form.exit),stop=Number(form.stop),risk=Math.abs(entry-stop)*Number(form.size||0);
   let pnl=form.pnl!==''?Number(form.pnl):((form.direction==='Long'?exit-entry:entry-exit)*Number(form.size||0));
   if(!form.entry||!form.exit){notify('Enter entry and exit prices first.');return}
   const trade={...form,id:crypto.randomUUID(),entry,exit,stop:form.stop===''?0:stop,target:Number(form.target||0),size:Number(form.size||0),risk:form.risk!==''?Number(form.risk):risk,pnl,fees:Number(form.fees||0)};
   supabase.from('trades').insert(tradeToRow(trade,user.id)).select().single().then(({data,error})=>{
     if(error){notify(`Could not save trade: ${error.message}`);return}
     setTrades(p=>[tradeFromRow(data),...p]);
     setShowAdd(false);
     setForm({...form,entry:'',exit:'',stop:'',target:'',risk:'',pnl:'',notes:''});
     notify('Trade saved to your private journal.');
   }).catch(error=>notify(`Could not save trade: ${error.message||'Unexpected error.'}`));
 }

 function exportCSV(){
   const cols=['date','time','market','direction','setup','entry','exit','stop','target','size','risk','pnl','fees','mistake','emotion','ruleFollowed','notes','sourceId'];
   const csv=[cols.join(','),...filtered.map(t=>cols.map(k=>`"${String(t[k]??'').replaceAll('"','""')}"`).join(','))].join('\n');
   const a=document.createElement('a');
   a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
   a.download='trademind-journal.csv';
   a.click();
   URL.revokeObjectURL(a.href);
   notify('CSV export downloaded.');
 }

 async function importCSV(e){
   const file=e.target.files?.[0];
   if(!file)return;
   e.target.value='';
   try{
     const lines=(await file.text()).split(/\r?\n/).filter(Boolean);
     if(lines.length<2)throw new Error('CSV has no trade rows.');
     const headers=lines[0].replace(/^\uFEFF/,'').split(',').map(x=>x.replaceAll('"','').trim());
     const rows=lines.slice(1).map(line=>{
       const cells=line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)||[];
       const vals=cells.map(x=>x.replace(/,$/,'').replace(/^"|"$/g,'').replaceAll('""','"'));
       return Object.fromEntries(headers.map((h,i)=>[h,vals[i]||'']));
     }).filter(r=>r.date&&r.market);
     const existingSourceIds=new Set(trades.map(t=>t.sourceId).filter(Boolean));
     const seenSourceIds=new Set();
     const uniqueRows=rows.filter(row=>{
       if(!row.sourceId)return true;
       if(existingSourceIds.has(row.sourceId)||seenSourceIds.has(row.sourceId))return false;
       seenSourceIds.add(row.sourceId);
       return true;
     });
     if(!uniqueRows.length){notify('No new trades to import.');return}
     const imported=uniqueRows.map(r=>({
       id:crypto.randomUUID(),
       sourceId:r.sourceId||'',
       date:r.date,
       time:r.time||'',
       market:r.market,
       direction:r.direction==='Short'?'Short':'Long',
       setup:r.setup||'Other',
       entry:Number(r.entry)||0,
       exit:Number(r.exit)||0,
       stop:Number(r.stop)||0,
       target:Number(r.target)||0,
       size:Number(r.size)||0,
       risk:Number(r.risk)||0,
       pnl:Number(r.pnl)||0,
       fees:Number(r.fees)||0,
       mistake:r.mistake||'None',
       emotion:r.emotion||'Calm',
       ruleFollowed:String(r.ruleFollowed)==='false'?false:true,
       notes:r.notes||''
     }));
     const {data,error}=await supabase.from('trades').upsert(imported.map(trade=>tradeToRow(trade,user.id)),{onConflict:'user_id,source_id',ignoreDuplicates:true}).select();
     if(error)throw error;
     const saved=(data||[]).map(tradeFromRow);
     setTrades(p=>[...saved,...p]);
     notify(`Imported ${saved.length} trades${rows.length>saved.length?`; skipped ${rows.length-saved.length} duplicates`:''}.`);
   }catch(error){
     notify(`Could not import CSV: ${error.message||'Check the file format and database setup.'}`);
   }
 }

 async function deleteTrade(id){
   const {error}=await supabase.from('trades').delete().eq('id',id).eq('user_id',user.id);
   if(error){notify(`Could not delete trade: ${error.message}`);return}
   setTrades(p=>p.filter(t=>t.id!==id));
   notify('Trade deleted.');
 }

 async function signOut(){
   const {error}=await supabase.auth.signOut();
   if(error)notify(`Could not sign out: ${error.message}`);
 }

 const nav=[
   ['Overview',LayoutDashboard],
   ['P&L Calendar',CalendarDays],
   ['Trade Journal',BookOpen],
   ['Analytics',BarChart3],
   ['Mistakes & Mindset',Brain],
   ['Risk Manager',ShieldCheck]
 ];

 if(authLoading)return <div className="auth-page"><div className="auth-card auth-loading">Checking your secure session…</div></div>;
 if(passwordRecovery)return <AuthGate client={supabase} recovery/>;
 if(!user)return <AuthGate client={supabase} missingConfig={!supabase} initialError={cloudError}/>;

 return (
   <div className="app-shell">
     <aside className={`sidebar ${mobileNav?'mobile-open':''}`}>
       <div className="brand">
         <div className="brand-mark"><Activity size={21}/></div>
         <div><b>Trade<span>Mind</span></b><small>TRADING JOURNAL</small></div>
         <button className="icon-btn close-nav" onClick={()=>setMobileNav(false)}><X size={18}/></button>
       </div>

       <div className="workspace">
         <div className="avatar">JM</div>
         <div><b>My Trading Desk</b><small>Personal workspace</small></div>
         <ChevronDown size={15}/>
       </div>

       <div className="nav-label">WORKSPACE</div>
       <nav>
         {nav.map(([label,Icon])=>(
           <button
             key={label}
             className={`nav-item ${page===label?'active':''}`}
             onClick={()=>{setPage(label);setMobileNav(false)}}
           >
             <Icon size={18}/>
             <span>{label}</span>
             {label==='Mistakes & Mindset'&&<span className="nav-count">{filtered.filter(t=>t.mistake!=='None').length}</span>}
           </button>
         ))}
       </nav>

       <div className="nav-label market-label">MARKETS</div>
       <div className="market-nav">
         {markets.map((m,i)=>(
           <button
             key={m}
             className="market-link"
             onClick={()=>{setMarketFilter(m);setPage('Trade Journal');setMobileNav(false)}}
           >
             <span className={`market-dot dot-${i}`}></span>{m}
             <ChevronRight size={14}/>
           </button>
         ))}
       </div>

       <div className="sidebar-bottom">
         <div className="streak-card">
           <div className="streak-icon"><Zap size={17}/></div>
           <div><b>Consistency matters</b><p>Follow the plan. Review the process.</p></div>
         </div>
         <button className="nav-item" onClick={()=>setPage('Settings')}><Settings size={18}/><span>Settings</span></button>
         <div className="profile-row">
           <div className="avatar profile-avatar">{(user.email||'TM').slice(0,2).toUpperCase()}</div>
           <div className="profile-text"><b>My Journal</b><small>{user.email}</small></div>
           <button className="icon-btn" title="Sign out" onClick={signOut}><LogOut size={16}/></button>
         </div>
       </div>
     </aside>

     <main className="main">
       <header className="topbar">
         <div className="top-left">
           <button className="icon-btn menu-btn" onClick={()=>setMobileNav(true)}><Menu size={20}/></button>
           <div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>{page}</b></div>
         </div>
         <div className="top-actions">
           <div className="live-pill"><span></span>Private cloud journal</div>
           <button className="btn btn-secondary vantage-connect-btn" onClick={()=>setShowVantageConnect(true)}><Link2 size={15}/> Connect Vantage MT5</button>
           <button className="icon-btn" title="Help" onClick={()=>notify('Tip: record every trade, including losses, and review mistakes weekly.')}><CircleHelp size={18}/></button>
           <button className="icon-btn notification" title="Notifications" onClick={()=>notify('You are all caught up.')}><Bell size={18}/></button>
           <div className="top-avatar">{(user.email||'TM').slice(0,2).toUpperCase()}</div>
         </div>
       </header>

       <div className="page-content">
         {cloudError&&<div className="cloud-error" role="alert">{cloudError}</div>}
         <div className="welcome-row">
           <div>
             <div className="eyebrow"><Sparkles size={13}/> YOUR EDGE STARTS WITH THE DATA</div>
             <h1>{page==='Overview'?'Good trading is a process.':page}</h1>
             <p className="subhead">
               {page==='Overview'?'Review your decisions, protect your capital, and track your green & red trading days.'
               :page==='P&L Calendar'?'Dhan-style Trader’s Diary — inspect every day’s profit, loss, and execution.'
               :page==='Trade Journal'?'Every trade tells a story. Capture the facts, not just the outcome.'
               :page==='Analytics'?'Find the setups, markets, and habits that drive your results.'
               :page==='Mistakes & Mindset'?'Spot repeated behavior before it becomes an expensive habit.'
               :page==='Risk Manager'?'Define the risk before the market defines it for you.'
               :'Manage your journal preferences and data.'}
             </p>
           </div>
           <div className="welcome-actions">
             <button className="btn btn-secondary" onClick={exportCSV}><Download size={16}/> Export</button>
             <button className="btn btn-primary" onClick={()=>setShowAdd(true)}><Plus size={17}/> Log a trade</button>
           </div>
         </div>

         {/* Overview Tab with Dhan P&L Calendar */}
         {page==='Overview'&& (
           <>
             <div className="filter-row">
               <div className="filter-left">
                 <span className="filter-caption"><SlidersHorizontal size={15}/> VIEW</span>
                 <select value={period} onChange={e=>setPeriod(e.target.value)}>
                   <option>All time</option>
                   <option>Today</option>
                   <option>7 days</option>
                   <option>30 days</option>
                 </select>
                 <select value={marketFilter} onChange={e=>setMarketFilter(e.target.value)}>
                   <option>All markets</option>
                   {markets.map(m=><option key={m}>{m}</option>)}
                 </select>
               </div>
               <div className="updated-label"><span className="status-dot"></span> Based on {filtered.length} logged trades</div>
             </div>

             <div className="stats-grid">
               <Stat icon={Wallet} label="NET P&L" value={fmt(totalPnl)} change={`${totalPnl>=0?'Positive':'Negative'} net result`} positive={totalPnl>=0}/>
               <Stat icon={Target} label="WIN RATE" value={`${winRate}%`} change={`${wins.length} wins · ${losses.length} losses`} positive={winRate>=50}/>
               <Stat icon={TrendingUp} label="PROFIT FACTOR" value={profitFactor.toFixed(2)} change="Gross wins ÷ gross losses" positive={profitFactor>=1}/>
               <Stat icon={ShieldCheck} label="RULE ADHERENCE" value={`${ruleRate}%`} change={`${filtered.filter(t=>t.ruleFollowed).length} trades followed plan`} positive={ruleRate>=80}/>
             </div>

             {/* Dhan P&L Calendar in Overview */}
             <DhanCalendar
               trades={filtered}
               onAddTrade={(d)=>{setForm(f=>({...f,date:d}));setShowAdd(true);}}
             />

             <div className="content-grid">
               <section className="panel equity-panel">
                 <div className="panel-heading">
                   <div><h2>Equity curve</h2><p>Your cumulative net results over time</p></div>
                   <div className="panel-badge"><span></span> JOURNAL P&L</div>
                 </div>
                 <div className="chart-summary">
                   <strong className={totalPnl>=0?'positive':'negative'}>{fmt(totalPnl)}</strong>
                   <span>Net result · after recorded fees</span>
                 </div>
                 <div className="chart-area">
                   {equity.length>1 ? (
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={equity} margin={{top:12,right:12,left:0,bottom:0}}>
                         <defs>
                           <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="#62e6c2" stopOpacity={0.25}/>
                             <stop offset="100%" stopColor="#62e6c2" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <CartesianGrid stroke="#242b38" strokeDasharray="3 5" vertical={false}/>
                         <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:'#7f8a9e',fontSize:11}}/>
                         <YAxis axisLine={false} tickLine={false} tick={{fill:'#7f8a9e',fontSize:11}} tickFormatter={v=>`$${v}`} width={55}/>
                         <Tooltip contentStyle={{background:'#151b26',border:'1px solid #303949',borderRadius:12,color:'#e8edf5'}} formatter={v=>[fmt(v),'Net P&L']}/>
                         <Area type="monotone" dataKey="equity" stroke="#62e6c2" strokeWidth={2.5} fill="url(#equityFill)" activeDot={{r:5,fill:'#62e6c2',stroke:'#10151e',strokeWidth:2}}/>
                       </AreaChart>
                     </ResponsiveContainer>
                   ) : <EmptyChart onAdd={()=>setShowAdd(true)}/>}
                 </div>
                 <div className="chart-foot">
                   <span><i className="legend-line"></i> Cumulative net P&L</span>
                   <span>{equity.length} data points</span>
                 </div>
               </section>

               <section className="panel market-panel">
                 <div className="panel-heading">
                   <div><h2>Performance by market</h2><p>Where your results are coming from</p></div>
                   <button className="icon-btn" onClick={()=>setPage('Analytics')}><MoreHorizontal size={19}/></button>
                 </div>
                 <div className="market-performance">
                   {byMarket.map((m,i)=>(
                     <div className="market-perf-row" key={m.market}>
                       <div className="market-perf-top">
                         <div className="market-name">
                           <span className={`market-dot dot-${i}`}></span><b>{m.market}</b>
                         </div>
                         <strong className={m.pnl>=0?'positive':'negative'}>{fmt(m.pnl)}</strong>
                       </div>
                       <div className="progress-track">
                         <div className={`progress-fill ${m.pnl<0?'loss-fill':''}`} style={{width:`${Math.max(3,Math.min(100,Math.abs(m.pnl)/(Math.max(1,...byMarket.map(x=>Math.abs(x.pnl))))*100))}%`}}/>
                       </div>
                     </div>
                   ))}
                 </div>
                 <button className="text-link" onClick={()=>setPage('Analytics')}>View detailed analytics <ArrowUpRight size={15}/></button>
               </section>
             </div>

             <div className="content-grid lower-grid">
               <section className="panel recent-panel">
                 <div className="panel-heading">
                   <div><h2>Recent trades</h2><p>Your latest decisions at a glance</p></div>
                   <button className="text-link" onClick={()=>setPage('Trade Journal')}>View all <ArrowUpRight size={15}/></button>
                 </div>
                 <TradeTable trades={filtered.slice(0,5)} onDelete={deleteTrade}/>
               </section>

               <section className="panel insight-panel">
                 <div className="panel-heading">
                   <div><h2><Brain size={17} className="inline-icon"/> Mistake radar</h2><p>Patterns worth paying attention to</p></div>
                   <span className="ai-tag"><Sparkles size={12}/> JOURNAL INSIGHT</span>
                 </div>
                 <MistakeInsights trades={filtered}/>
                 <button className="text-link" onClick={()=>setPage('Mistakes & Mindset')}>Review all patterns <ArrowUpRight size={15}/></button>
               </section>
             </div>
           </>
         )}

         {/* Dedicated P&L Calendar Tab */}
         {page==='P&L Calendar'&& (
           <DhanCalendar
             trades={filtered}
             onAddTrade={(d)=>{setForm(f=>({...f,date:d}));setShowAdd(true);}}
           />
         )}

         {page==='Trade Journal'&& (
           <section className="panel journal-panel">
             <div className="journal-toolbar">
               <div className="searchbox"><Search size={16}/><input placeholder="Search market, setup, mistake..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
               <div className="toolbar-right">
                 <select value={marketFilter} onChange={e=>setMarketFilter(e.target.value)}>
                   <option>All markets</option>
                   {markets.map(m=><option key={m}>{m}</option>)}
                 </select>
                 <label className="btn btn-secondary upload-btn"><Upload size={15}/> Import CSV<input type="file" accept=".csv,text/csv" onChange={importCSV} hidden/></label>
                 <button className="btn btn-primary" onClick={()=>setShowAdd(true)}><Plus size={16}/> Add trade</button>
               </div>
             </div>
             {tradesLoading?<div className="loading-trades">Loading your private trades…</div>:<TradeTable trades={filtered} onDelete={deleteTrade}/>}
             <div className="table-footer">Showing <b>{filtered.length}</b> trades <span>Net P&L: <b className={totalPnl>=0?'positive':'negative'}>{fmt(totalPnl)}</b></span></div>
           </section>
         )}

         {page==='Analytics'&& (
           <>
             <div className="stats-grid">
               <Stat icon={Activity} label="AVG. WIN" value={fmt(wins.length?grossWin/wins.length:0)} change="Per winning trade" positive/>
               <Stat icon={ArrowDownRight} label="AVG. LOSS" value={fmt(losses.length?grossLoss/losses.length:0)} change="Absolute average loss"/>
               <Stat icon={Gauge} label="AVERAGE R" value={`${avgR.toFixed(2)}R`} change="Average result / planned risk" positive={avgR>=0}/>
               <Stat icon={CalendarDays} label="TRADES LOGGED" value={String(filtered.length)} change="In selected view" positive/>
             </div>
             <div className="content-grid">
               <section className="panel equity-panel">
                 <div className="panel-heading"><div><h2>Net equity progression</h2><p>After fees recorded in your journal</p></div></div>
                 <div className="chart-area large-chart">
                   {equity.length>1 ? (
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={equity}>
                         <CartesianGrid stroke="#242b38" strokeDasharray="3 5" vertical={false}/>
                         <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:'#7f8a9e',fontSize:11}}/>
                         <YAxis axisLine={false} tickLine={false} tick={{fill:'#7f8a9e',fontSize:11}}/>
                         <Tooltip contentStyle={{background:'#151b26',border:'1px solid #303949',borderRadius:12,color:'#e8edf5'}} formatter={v=>[fmt(v),'Net P&L']}/>
                         <Area dataKey="equity" stroke="#62e6c2" fill="#62e6c222" strokeWidth={2.5}/>
                       </AreaChart>
                     </ResponsiveContainer>
                   ) : <EmptyChart onAdd={()=>setShowAdd(true)}/>}
                 </div>
               </section>
               <section className="panel market-panel">
                 <div className="panel-heading"><div><h2>Net P&L by market</h2><p>Compare selected instruments</p></div></div>
                 <div className="chart-area bar-chart">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={byMarket} layout="vertical" margin={{left:10,right:12}}>
                       <CartesianGrid stroke="#242b38" strokeDasharray="3 5" horizontal={false}/>
                       <XAxis type="number" tick={{fill:'#7f8a9e',fontSize:10}} axisLine={false} tickLine={false}/>
                       <YAxis dataKey="market" type="category" width={92} tick={{fill:'#aeb8c8',fontSize:11}} axisLine={false} tickLine={false}/>
                       <Tooltip contentStyle={{background:'#151b26',border:'1px solid #303949',borderRadius:12,color:'#e8edf5'}} formatter={v=>[fmt(v),'Net P&L']}/>
                       <Bar dataKey="pnl" fill="#62e6c2" radius={[0,5,5,0]}/>
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
               </section>
             </div>
             <section className="panel stats-details">
               <div className="panel-heading"><div><h2>Performance breakdown</h2><p>Useful metrics to evaluate your process</p></div></div>
               <div className="detail-metrics">
                 <Metric label="Gross profit" value={fmt(grossWin)}/>
                 <Metric label="Gross loss" value={fmt(-grossLoss)}/>
                 <Metric label="Recorded fees" value={fmt(filtered.reduce((a,t)=>a+Number(t.fees||0),0))}/>
                 <Metric label="Rule adherence" value={`${ruleRate}%`}/>
                 <Metric label="Profit factor" value={profitFactor.toFixed(2)}/>
                 <Metric label="Average R-multiple" value={`${avgR.toFixed(2)}R`}/>
               </div>
             </section>
           </>
         )}

         {page==='Mistakes & Mindset'&& (
           <>
             <div className="stats-grid">
               <Stat icon={Brain} label="RULE BREAKS" value={String(filtered.filter(t=>!t.ruleFollowed).length)} change="Trades marked off-plan"/>
               <Stat icon={ShieldCheck} label="RULE ADHERENCE" value={`${ruleRate}%`} change="Higher is more consistent" positive={ruleRate>=80}/>
               <Stat icon={Activity} label="MOST COMMON" value={mostCommon(filtered)} change="Among recorded mistakes"/>
               <Stat icon={Target} label="CLEAN TRADES" value={String(filtered.filter(t=>t.mistake==='None'&&t.ruleFollowed).length)} change="No mistake + rules followed" positive/>
             </div>
             <div className="content-grid">
               <section className="panel">
                 <div className="panel-heading"><div><h2>Mistake frequency</h2><p>Based on your own trade annotations</p></div></div>
                 <MistakeInsights trades={filtered} detailed/>
               </section>
               <section className="panel">
                 <div className="panel-heading"><div><h2>Review checklist</h2><p>Use before every entry</p></div></div>
                 <Checklist/>
               </section>
             </div>
             <section className="panel">
               <div className="panel-heading"><div><h2>Trades needing review</h2><p>Trades marked with a mistake or rule violation</p></div></div>
               <TradeTable trades={filtered.filter(t=>t.mistake!=='None'||!t.ruleFollowed)} onDelete={deleteTrade}/>
             </section>
           </>
         )}

         {page==='Risk Manager'&& <RiskManager notify={notify}/>}

         {page==='Settings'&& (
           <section className="panel settings-panel">
             <div className="panel-heading"><div><h2>Journal settings</h2><p>Manage data storage and your journal</p></div></div>
             <div className="setting-row">
               <div><b>Storage mode</b><p>Your journal is stored in your authenticated Supabase account and protected by row-level security.</p></div>
               <span className="status-chip">Private cloud</span>
             </div>
             <div className="setting-row">
               <div><b>Export your data</b><p>Download a CSV backup of the trades in the current view.</p></div>
               <button className="btn btn-secondary" onClick={exportCSV}><Download size={15}/> Export CSV</button>
             </div>
             <div className="setting-row">
               <div><b>Signed in as</b><p>{user.email}</p></div>
               <button className="btn btn-secondary" onClick={signOut}><LogOut size={15}/> Sign out</button>
             </div>
             <div className="notice-box">
               <ShieldCheck size={19}/>
               <div><b>Private by account</b><p>Your trade rows are isolated to your authenticated user with Supabase row-level security. Never put a Supabase service-role key or broker password in the browser app.</p></div>
             </div>
           </section>
         )}

         <footer className="footer">
           <span>© 2026 TradeMind Journal</span>
           <span><ShieldCheck size={13}/> Built for discipline, not predictions</span>
           <span>Educational tool · Not financial advice</span>
         </footer>
       </div>
     </main>

     {showAdd && (
       <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}>
         <div className="modal">
           <div className="modal-heading">
             <div>
               <div className="eyebrow">TRADE RECORD</div>
               <h2>Log a trade</h2>
               <p>Record the plan, outcome, and mindset.</p>
             </div>
             <button className="icon-btn" onClick={()=>setShowAdd(false)}><X size={19}/></button>
           </div>
           <form onSubmit={saveTrade}>
             <div className="form-grid">
               <Field label="Date"><input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
               <Field label="Time"><input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></Field>
               <Field label="Market"><select value={form.market} onChange={e=>setForm({...form,market:e.target.value})}>{markets.map(m=><option key={m}>{m}</option>)}</select></Field>
               <Field label="Direction"><select value={form.direction} onChange={e=>setForm({...form,direction:e.target.value})}><option>Long</option><option>Short</option></select></Field>
               <Field label="Setup"><select value={form.setup} onChange={e=>setForm({...form,setup:e.target.value})}>{setups.map(s=><option key={s}>{s}</option>)}</select></Field>
               <Field label="Position size"><input required type="number" min="0" step="any" value={form.size} onChange={e=>setForm({...form,size:e.target.value})}/></Field>
               <Field label="Entry price"><input required type="number" step="any" value={form.entry} onChange={e=>setForm({...form,entry:e.target.value})} placeholder="0.00"/></Field>
               <Field label="Exit price"><input required type="number" step="any" value={form.exit} onChange={e=>setForm({...form,exit:e.target.value})} placeholder="0.00"/></Field>
               <Field label="Stop loss"><input type="number" step="any" value={form.stop} onChange={e=>setForm({...form,stop:e.target.value})} placeholder="Optional"/></Field>
               <Field label="Take profit"><input type="number" step="any" value={form.target} onChange={e=>setForm({...form,target:e.target.value})} placeholder="Optional"/></Field>
               <Field label="Net P&L before fees ($)"><input type="number" step="any" value={form.pnl} onChange={e=>setForm({...form,pnl:e.target.value})} placeholder="Auto from price difference"/></Field>
               <Field label="Fees ($)"><input type="number" min="0" step="any" value={form.fees} onChange={e=>setForm({...form,fees:e.target.value})}/></Field>
               <Field label="Mistake tag"><select value={form.mistake} onChange={e=>setForm({...form,mistake:e.target.value})}>{mistakeOptions.map(s=><option key={s}>{s}</option>)}</select></Field>
               <Field label="Mindset"><select value={form.emotion} onChange={e=>setForm({...form,emotion:e.target.value})}>{['Calm','Confident','Anxious','Fearful','Greedy','Frustrated','Angry','Tired'].map(s=><option key={s}>{s}</option>)}</select></Field>
             </div>
             <label className="check-label"><input type="checkbox" checked={form.ruleFollowed} onChange={e=>setForm({...form,ruleFollowed:e.target.checked})}/> I followed my trading plan and risk rules</label>
             <Field label="Trade notes"><textarea rows="3" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Why did you enter? What did you learn?"/></Field>
             <div className="modal-actions">
               <button type="button" className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
               <button className="btn btn-primary" type="submit"><Check size={16}/> Save trade</button>
             </div>
           </form>
         </div>
       </div>
     )}

     {showVantageConnect&&(
       <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowVantageConnect(false)}}>
         <div className="modal connect-modal">
           <div className="modal-heading">
             <div><div className="eyebrow">LOCAL, READ-ONLY IMPORT</div><h2>Connect Vantage MT5</h2><p>Your broker password stays in MT5; this website never receives it.</p></div>
             <button className="icon-btn" aria-label="Close" onClick={()=>setShowVantageConnect(false)}><X size={19}/></button>
           </div>
           <ol className="connect-steps">
             <li>Sign in to your Vantage account in the MT5 desktop terminal.</li>
             <li><a href="/vantage_mt5/export_vantage_mt5.py" download>Download the MT5 history connector</a> and save it on your computer.</li>
             <li>Open PowerShell in the downloaded file's folder and run:<code>py -m pip install MetaTrader5<br/>py export_vantage_mt5.py</code></li>
             <li>Choose <b>Import CSV</b> in Trade Journal and import <code>trademind_vantage_trades.csv</code>.</li>
           </ol>
           <div className="connect-security"><ShieldCheck size={16}/> Exports closed trades only. No live sync or order access.</div>
           <a className="connect-guide" href="/vantage_mt5/README.md" target="_blank" rel="noreferrer">Read the full setup guide</a>
         </div>
       </div>
     )}

     {toast && <div className="toast"><Check size={16}/>{toast}</div>}
   </div>
 );
}

function Stat({icon:Icon,label,value,change,positive}){
 return (
   <div className="stat-card">
     <div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={17}/></div></div>
     <div className="stat-value">{value}</div>
     <div className={`stat-change ${positive===true?'green':positive===false?'red':''}`}>
       {positive===true?<ArrowUpRight size={14}/>:positive===false?<ArrowDownRight size={14}/>:<Activity size={13}/>}
       <span>{change}</span>
     </div>
   </div>
 );
}

function TradeTable({trades,onDelete}){
 return (
   <div className="table-wrap">
     <table>
       <thead>
         <tr>
           <th>TRADE</th>
           <th>MARKET / SETUP</th>
           <th>ENTRY → EXIT</th>
           <th>RISK</th>
           <th>NET P&L</th>
           <th>REVIEW</th>
           <th></th>
         </tr>
       </thead>
       <tbody>
         {trades.map(t=>(
           <tr key={t.id}>
             <td>
               <div className="trade-date">{dateLabel(t.date)}</div>
               <div className="muted small-text">{t.time||'—'}</div>
             </td>
             <td>
               <div className="table-market">
                 <span className={`market-dot dot-${Math.max(0,markets.indexOf(t.market))}`}></span>
                 <b>{t.market}</b>
                 <span className={`direction ${t.direction==='Long'?'long':'short'}`}>{t.direction}</span>
               </div>
               <div className="muted small-text">{t.setup}</div>
             </td>
             <td>
               <div className="price-main">{Number(t.entry).toLocaleString()} <span>→</span> {Number(t.exit).toLocaleString()}</div>
               <div className="muted small-text">SL {t.stop?Number(t.stop).toLocaleString():'—'} · TP {t.target?Number(t.target).toLocaleString():'—'}</div>
             </td>
             <td>{t.risk?fmt(t.risk):'—'}</td>
             <td>
               <b className={Number(t.pnl)-Number(t.fees)>=0?'positive':'negative'}>{fmt(Number(t.pnl)-Number(t.fees))}</b>
               <div className="muted small-text">{Number(t.fees)>0?`${fmt(t.fees)} fees`:'No fees entered'}</div>
             </td>
             <td>
               <span className={`mistake-pill ${t.mistake==='None'?'clean':'flagged'}`}>{t.mistake==='None'?'✓ Clean':t.mistake}</span>
               <div className="muted small-text">{t.ruleFollowed?'Rules followed':'Rule break'}</div>
             </td>
             <td>
               <button className="icon-btn delete-btn" title="Delete trade" onClick={()=>{if(confirm('Delete this trade from your journal?'))onDelete(t.id)}}>
                 <MoreHorizontal size={17}/>
               </button>
             </td>
           </tr>
         ))}
       </tbody>
     </table>
     {trades.length===0&&(
       <div className="empty-state">
         <BookOpen size={28}/>
         <h3>No trades found</h3>
         <p>Try another filter or add your first trade.</p>
       </div>
     )}
   </div>
 );
}

function MistakeInsights({trades,detailed=false}){
 const broken=trades.filter(t=>t.mistake!=='None');
 const groups=Object.entries(broken.reduce((a,t)=>{a[t.mistake]=(a[t.mistake]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]);
 if(!groups.length)return (
   <div className="empty-insight">
     <div className="calm-icon"><ShieldCheck size={23}/></div>
     <b>No mistakes recorded in this view</b>
     <p>Keep logging honestly — including losses and rule breaks.</p>
   </div>
 );
 return (
   <div className="mistake-list">
     {groups.slice(0,detailed?10:4).map(([name,count])=>(
       <div className="mistake-row" key={name}>
         <div className="mistake-symbol"><Brain size={16}/></div>
         <div className="mistake-info">
           <b>{name}</b>
           <div className="progress-track"><div className="progress-fill mistake-fill" style={{width:`${count/Math.max(...groups.map(g=>g[1]))*100}%`}}/></div>
         </div>
         <span className="mistake-count">{count} {count===1?'trade':'trades'}</span>
       </div>
     ))}
     <div className="insight-callout">
       <Sparkles size={17}/>
       <div>
         <b>Review before the next session</b>
         <p>{groups[0][0]} is your most frequently logged mistake in this view. Write one specific rule to prevent it.</p>
       </div>
     </div>
   </div>
 );
}

function Checklist(){
 const items=['Is my setup clearly present?','Is the stop loss decided before entry?','Is position size within my risk limit?','Is the risk/reward acceptable for my tested plan?','Am I calm — not chasing a loss or a move?'];
 const [checked,setChecked]=useState([]);
 return (
   <div className="checklist">
     {items.map((s,i)=>(
       <label key={s} className={`check-item ${checked.includes(i)?'checked':''}`}>
         <input type="checkbox" checked={checked.includes(i)} onChange={e=>setChecked(p=>e.target.checked?[...p,i]:p.filter(x=>x!==i))}/>
         <span className="fake-check"><Check size={12}/></span>
         <span>{s}</span>
       </label>
     ))}
     <div className="checklist-progress">
       <span>{checked.length} of {items.length} checks complete</span>
       <div className="progress-track"><div className="progress-fill" style={{width:`${checked.length/items.length*100}%`}}/></div>
     </div>
   </div>
 );
}

function RiskManager({notify}){
 const [balance,setBalance]=useState('1000');
 const [risk,setRisk]=useState('0.5');
 const [entry,setEntry]=useState('');
 const [stop,setStop]=useState('');
 const [valuePerPoint,setValuePerPoint]=useState('1');
 const [dailyLimit,setDailyLimit]=useState('2');
 const [lossToday,setLossToday]=useState('0');

 const riskMoney=Math.max(0,Number(balance)||0)*Math.max(0,Number(risk)||0)/100;
 const distance=Math.abs(Number(entry)-Number(stop));
 const size=distance>0&&Number(valuePerPoint)>0?riskMoney/(distance*Number(valuePerPoint)):0;
 const dailyMoney=Math.max(0,Number(balance)||0)*Math.max(0,Number(dailyLimit)||0)/100;

 return (
   <div className="risk-layout">
     <section className="panel risk-calculator">
       <div className="panel-heading">
         <div><h2>Position size calculator</h2><p>Calculate planned risk before placing a trade.</p></div>
         <div className="stat-icon"><ShieldCheck size={18}/></div>
       </div>
       <div className="form-grid">
         <Field label="Account balance ($)"><input type="number" min="0" value={balance} onChange={e=>setBalance(e.target.value)}/></Field>
         <Field label="Risk per trade (%)">
           <select value={risk} onChange={e=>setRisk(e.target.value)}>
             {['0.25','0.5','0.75','1','1.5','2'].map(v=><option key={v} value={v}>{v}%</option>)}
           </select>
         </Field>
         <Field label="Entry price"><input type="number" step="any" value={entry} onChange={e=>setEntry(e.target.value)} placeholder="Entry"/></Field>
         <Field label="Stop-loss price"><input type="number" step="any" value={stop} onChange={e=>setStop(e.target.value)} placeholder="Stop loss"/></Field>
         <Field label="Value per price point per unit ($)"><input type="number" min="0" step="any" value={valuePerPoint} onChange={e=>setValuePerPoint(e.target.value)}/></Field>
       </div>
       <p className="field-help">Important: contract size and tick/point value differ by broker and instrument. Enter the correct value for your symbol. The estimated size is not reliable until this is verified.</p>
       <div className="risk-results">
         <div><span>MAX PLANNED RISK</span><strong>{fmt(riskMoney)}</strong></div>
         <div><span>STOP DISTANCE</span><strong>{distance?distance.toLocaleString():'—'}</strong></div>
         <div><span>ESTIMATED SIZE</span><strong>{distance&&Number(valuePerPoint)>0?size.toFixed(4):'—'}</strong></div>
       </div>
       <button className="btn btn-secondary" onClick={()=>{setEntry('');setStop('');notify('Price fields cleared.')}}>Reset prices</button>
     </section>

     <section className="panel daily-risk-panel">
       <div className="panel-heading">
         <div><h2>Daily loss guardrail</h2><p>Set a stop-trading threshold in advance.</p></div>
       </div>
       <Field label="Daily loss limit (%)">
         <select value={dailyLimit} onChange={e=>setDailyLimit(e.target.value)}>
           {['1','1.5','2','3'].map(v=><option key={v}>{v}</option>)}
         </select>
       </Field>
       <Field label="Loss already taken today ($)"><input type="number" min="0" value={lossToday} onChange={e=>setLossToday(e.target.value)}/></Field>
       <div className="daily-limit">
         <div className="limit-label"><span>Daily loss used</span><b>{fmt(Number(lossToday)||0)} / {fmt(dailyMoney)}</b></div>
         <div className="progress-track"><div className={`progress-fill ${Number(lossToday)>=dailyMoney?'loss-fill':''}`} style={{width:`${dailyMoney?Math.min(100,Number(lossToday)/dailyMoney*100):0}%`}}/></div>
         <strong className={Number(lossToday)>=dailyMoney?'negative':'positive'}>{Number(lossToday)>=dailyMoney?'Limit reached — stop trading':fmt(Math.max(0,dailyMoney-(Number(lossToday)||0)))+' remaining'}</strong>
       </div>
       <div className="notice-box">
         <ShieldCheck size={18}/>
         <div><b>Risk is not the same across symbols</b><p>USOIL, BTCUSD, XAUUSD and US100 Cash can have different contract specifications, tick values, and broker pricing. Verify them in your broker platform before using any calculated size.</p></div>
       </div>
     </section>
   </div>
 );
}

function EmptyChart({onAdd}){
 return (
   <div className="empty-chart">
     <div className="chart-placeholder"><TrendingUp size={27}/></div>
     <b>Your equity curve starts here</b>
     <p>Log a few trades to see your performance over time.</p>
     <button className="btn btn-secondary" onClick={onAdd}><Plus size={15}/> Add first trade</button>
   </div>
 );
}

function Field({label,children}){
 return <label className="field"><span>{label}</span>{children}</label>;
}

function Metric({label,value}){
 return <div className="metric-item"><span>{label}</span><b>{value}</b></div>;
}

function mostCommon(trades){
 const a={};
 trades.filter(t=>t.mistake!=='None').forEach(t=>a[t.mistake]=(a[t.mistake]||0)+1);
 return Object.entries(a).sort((x,y)=>y[1]-x[1])[0]?.[0]||'None logged';
}

createRoot(document.getElementById('root')).render(<App/>);
