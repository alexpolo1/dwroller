import { useEffect, useMemo, useState } from 'react'
import axios from 'axios';

function safeGet(key) {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function safeSet(key, val) { try { if (typeof window !== 'undefined' && 'localStorage' in window) window.localStorage.setItem(key, JSON.stringify(val)) } catch {} }
function safeRemove(key) { try { if (typeof window !== 'undefined' && 'localStorage' in window) window.localStorage.removeItem(key) } catch {} }

async function sha256Hex(str) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
    const arr = Array.from(new Uint8Array(buf))
    return arr.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return str
  }
}

const STORAGE_SHOP_PLAYERS = 'dw:shop:players:v1'
const STORAGE_SHOP_AUTHED = 'dw:shop:authedPlayer'

const GM_PASSWORD = 'bongo'

const RANK_ORDER = ['None','Respected','Distinguished','Famed','Hero']
function normalizeRank(r) {
  const s = String(r||'').trim()
  const found = RANK_ORDER.find(x=>x.toLowerCase()===s.toLowerCase())
  return found || (s? s : 'None')
}
function rankIndex(r) { const idx = RANK_ORDER.indexOf(normalizeRank(r)); return idx<0?0:idx }
function renownClass(r) {
  const rr = normalizeRank(r)
  if (rr==='Respected') return 'bg-emerald-700'
  if (rr==='Distinguished') return 'bg-indigo-700'
  if (rr==='Famed') return 'bg-purple-700'
  if (rr==='Hero') return 'bg-rose-700'
  return 'bg-slate-700'
}

function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') }

function normalizeItem(it) {
  const name = String(it.name||'').trim()
  if (!name) return null
  const id = String(it.id||slugify(name))
  const category = String(it.category||'Gear').trim()
  const req = Math.max(0, Number.isFinite(+it.req) ? +it.req : (Number.isFinite(+it.cost)? +it.cost : 0))
  const cost = req
  const desc = String(it.desc||'').trim()
  const renown = normalizeRank(it.renown||it.Renown)
  return { id, name, category, cost, req, renown, desc }
}

export default function RequisitionShop() {
  const [items, setItems] = useState([])
  const [players, setPlayers] = useState(() => safeGet(STORAGE_SHOP_PLAYERS) || []);
  const [authedPlayer, setAuthedPlayer] = useState(() => safeGet(STORAGE_SHOP_AUTHED) || '');
  const [gmOpen, setGmOpen] = useState(false)
  const [gmPassInput, setGmPassInput] = useState('')
  const [gmUnlocked, setGmUnlocked] = useState(false)

  const [playerName, setPlayerName] = useState('')
  const [playerPw, setPlayerPw] = useState('')
  const [search, setSearch] = useState('')

  const categories = useMemo(()=>{
    const set = new Set()
    for (const it of items) { if (it && it.category) set.add(String(it.category)) }
    return ['All', ...Array.from(set).sort((a,b)=>String(a).localeCompare(String(b)))]
  },[items])
  const [categoryFilter, setCategoryFilter] = useState('All')

  // Items are sourced from a single JSON file; disable local persistence
  // useEffect(()=>{ safeSet(STORAGE_SHOP_ITEMS, items) },[items])
  useEffect(()=>{ safeSet(STORAGE_SHOP_PLAYERS, players) },[players])
  useEffect(()=>{
    // Always load from the static JSON on startup
    ;(async()=>{
      try {
        const res = await fetch('/deathwatch-armoury.json', { cache: 'no-store' })
        if (!res.ok) return
        const arr = await res.json()
        const next = Array.isArray(arr) ? arr.map(normalizeItem).filter(Boolean) : []
        if (next.length>0) {
          setItems(next)
        }
      } catch {}
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  useEffect(()=>{
    // Restore authed player on mount
    const ap = safeGet(STORAGE_SHOP_AUTHED)
    if (ap && typeof ap === 'string') setAuthedPlayer(ap)
  },[])

  const currentPlayer = useMemo(()=> players.find(p=>p.name===authedPlayer) || null,[players, authedPlayer])
  const filteredItems = useMemo(()=>{
    const q = search.trim().toLowerCase()
    return items.filter(i => {
      const inQuery = !q || i.name.toLowerCase().includes(q) || (i.category||'').toLowerCase().includes(q)
      const inCat = categoryFilter==='All' || String(i.category||'').toLowerCase()===String(categoryFilter).toLowerCase()
      return inQuery && inCat
    })
  },[items, search, categoryFilter])

  // Define flash function
  const [saveMsg, setSaveMsg] = useState('');
  function flash(msg) {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 2000);
  }

  // Ensure GM Panel login functionality works correctly
  async function handleGmUnlock() {
    if (gmPassInput === GM_PASSWORD) {
      setGmUnlocked(true);
      flash('GM Panel unlocked');
    } else {
      flash('Incorrect GM password');
    }
  }

  // Ensure player login functionality is consistent
  async function handlePlayerLogin() {
    const player = players.find(p => p.name === playerName);
    if (player && player.pw === playerPw) {
      setAuthedPlayer(playerName);
      flash('Player logged in');
    } else {
      flash('Invalid player credentials');
    }
  }
  function handlePlayerLogout() {
    safeRemove(STORAGE_SHOP_AUTHED);
    setAuthedPlayer('');
    flash('Player logged out');
  }

  // Updated purchaseItem to subtract requisition points from the player
  async function purchaseItem(item) {
    if (!currentPlayer) return;
    const updatedPlayer = {
      ...currentPlayer,
      rp: (currentPlayer.rp || 0) - (item.cost || 0),
      inventory: [...(currentPlayer.inventory || []), item],
      transactions: [...(currentPlayer.transactions || []), { item, date: new Date() }],
    };
    try {
      await axios.put(`/api/players/${updatedPlayer.name}`, updatedPlayer);
      setPlayers(prevPlayers => {
        const index = prevPlayers.findIndex(p => p.name === updatedPlayer.name);
        if (index !== -1) {
          const newPlayers = [...prevPlayers];
          newPlayers[index] = updatedPlayer;
          return newPlayers;
        }
        return [...prevPlayers, updatedPlayer];
      });
    } catch (error) {
      console.error('Failed to update player:', error);
    }
  }

  async function addPlayer(name, rp, pw) {
    const nm = String(name||'').trim()
    if (!nm) return
    const h = await sha256Hex(String(pw||'').trim())
    setPlayers(prev => {
      const others = prev.filter(x=>x.name!==nm)
      return [...others, { name:nm, rp: Math.max(0, Number.isFinite(+rp)? +rp : 0), pwHash: h, inventory: [], renown: 'None' }].sort((a,b)=>a.name.localeCompare(b.name))
    })
  }
  function setPlayerRP(name, rp) {
    const nm = String(name||'').trim()
    setPlayers(prev => prev.map(p => p.name===nm ? { ...p, rp: Math.max(0, Number.isFinite(+rp)? +rp : 0) } : p))
  }
  function setPlayerRenown(name, renown) {
    const nm = String(name||'').trim()
    setPlayers(prev => prev.map(p => p.name===nm ? { ...p, renown: normalizeRank(renown) } : p))
  }
  async function resetPlayerPW(name, pw) {
    const nm = String(name || '').trim();
    if (!nm) {
      flash('Player name is required');
      return;
    }
    const h = await sha256Hex(String(pw || '').trim());
    setPlayers(prev => prev.map(p => p.name === nm ? { ...p, pw: pw, pwHash: h } : p));
    flash(`Password reset for ${nm}`);
  }
  function deletePlayer(name) { setPlayers(prev => prev.filter(p => p.name!==name)) }

  function setItemMeta(id, req, renown) {
    setItems(prev => prev.map(it => it.id===id ? { ...it, req: Math.max(0, Number.isFinite(+req)? +req : (it.req||0)), cost: Math.max(0, Number.isFinite(+req)? +req : (it.cost||0)), renown: normalizeRank(renown||it.renown) } : it))
  }

  // Display saveMsg in the UI
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Requisition Shop</div>
        <button
          onClick={() => setGmOpen(!gmOpen)}
          className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500"
        >
          {gmOpen ? 'Close GM Panel' : 'Open GM Panel'}
        </button>
      </div>

      {saveMsg && (
        <div className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">
          {saveMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
          <div className="text-xs uppercase opacity-70">Player Login</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select className="rounded-xl border border-white/10 bg-white/10 px-3 py-2" value={playerName} onChange={e=>setPlayerName(e.target.value)}>
              <option value="">Select player</option>
              {players.map(p => (<option key={p.name} value={p.name}>{p.name}</option>))}
            </select>
            <input className="rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="password" placeholder="Password" value={playerPw} onChange={e=>setPlayerPw(e.target.value)} />
            {!authedPlayer ? (
              <button onClick={handlePlayerLogin} className="rounded-xl px-3 py-2 bg-blue-600 hover:bg-blue-500">Login</button>
            ) : (
              <button onClick={handlePlayerLogout} className="rounded-xl px-3 py-2 bg-slate-700 hover:bg-slate-600">Logout ({authedPlayer})</button>
            )}
            <div className="rounded-xl bg-white/10 px-3 py-2 text-sm">
              RP: <span className="font-semibold">{currentPlayer ? (currentPlayer.rp||0) : '-'}</span>{' '}
              <span className="opacity-70">• Renown:</span> <span className="font-semibold">{currentPlayer ? (currentPlayer.renown||'None') : '-'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Items</div>
            <div className="flex items-center gap-2">
              <select className="rounded-xl border border-white/10 bg-white/10 px-2 py-1.5 text-sm" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>
                {categories.map(c => (<option key={c} value={c}>{c}</option>))}
              </select>
              <input className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {filteredItems.map(it => (
              <div key={it.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{it.name}</div>
                    <div className="text-xs opacity-70 truncate">{it.category}</div>
                  </div>
                  <div className="text-xs shrink-0">Req <span className="font-semibold">{it.req ?? it.cost ?? 0}</span></div>
                  <span className={`text-xs px-2 py-0.5 rounded ${renownClass(it.renown)}`}>{it.renown || 'None'}</span>
                  {gmUnlocked && (
                    <GmEditItemMeta item={it} onSet={setItemMeta} />
                  )}
                  <button
                    onClick={()=>purchaseItem(it)}
                    disabled={!currentPlayer || (currentPlayer?.rp||0) < (it.cost||0) || rankIndex((currentPlayer?.renown)||'None') < rankIndex((it.renown)||'None')}
                    className={`text-sm rounded-lg px-3 py-1.5 ${(!currentPlayer || (currentPlayer?.rp||0) < (it.cost||0) || rankIndex((currentPlayer?.renown)||'None') < rankIndex((it.renown)||'None')) ? 'bg-slate-700 opacity-60' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))}
            {filteredItems.length===0 && (<div className="text-xs opacity-70">No items</div>)}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
          <div className="text-sm font-medium">Inventory {currentPlayer ? `• ${currentPlayer.name}` : ''}</div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
            {currentPlayer && currentPlayer.inventory && currentPlayer.inventory.length > 0 ? (
              currentPlayer.inventory.map((inv, i) => (
                <div key={i} className="text-sm">{inv.name} <span className="opacity-70 text-xs">({inv.cost})</span></div>
              ))
            ) : (
              <div className="text-xs opacity-70">No purchases</div>
            )}
            {currentPlayer && currentPlayer.transactions && currentPlayer.transactions.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold">Transaction History:</div>
                {currentPlayer.transactions.map((txn, i) => (
                  <div key={i} className="text-xs">{txn.item.name} - {txn.item.cost} Req - {new Date(txn.date).toLocaleString()}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {gmOpen && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-900/20 p-3 space-y-3">
          <div className="text-sm font-semibold text-amber-200">GM Controls</div>
          {!gmUnlocked ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input className="rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="password" placeholder="Enter GM password" value={gmPassInput} onChange={e=>setGmPassInput(e.target.value)} />
              <button onClick={handleGmUnlock} className="rounded-xl px-3 py-2 bg-amber-600 hover:bg-amber-500">Unlock</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                <div className="text-sm font-medium">Players</div>
                <GmAddPlayer onAdd={addPlayer} />
                <div className="space-y-2 max-h-44 overflow-y-auto pr-2">
                  {players.map(p=> (
                    <div key={p.name} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-sm">RP: {p.rp||0}</div>
                      <GmSetRP name={p.name} onSet={setPlayerRP} />
                      <GmSetRenown name={p.name} value={p.renown||'None'} onSet={setPlayerRenown} />
                      <GmResetPW name={p.name} onReset={resetPlayerPW} />
                      <button onClick={()=>deletePlayer(p.name)} className="text-xs px-2 py-1 rounded bg-rose-600 hover:bg-rose-500">Delete</button>
                    </div>
                  ))}
                  {players.length===0 && (<div className="text-xs opacity-70">No players</div>)}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                <div className="text-sm font-medium">GM Settings</div>
                <GmChangePassword onSet={(pw)=>{ setGmPassInput(''); /* placeholder: fixed bongo; not persisted */ }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GmAddPlayer({ onAdd }) {
  const [name, setName] = useState('')
  const [rp, setRp] = useState(10)
  const [pw, setPw] = useState('')
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      <input className="rounded-xl border border-white/10 bg-white/10 px-3 py-2" placeholder="Player name" value={name} onChange={e=>setName(e.target.value)} />
      <input className="rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" min={0} value={rp} onChange={e=>setRp(parseInt(e.target.value||'0'))} />
      <input className="rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} />
      <button onClick={()=>{ onAdd(name, rp, pw); setName(''); setRp(10); setPw('') }} className="rounded-xl px-3 py-2 bg-amber-600 hover:bg-amber-500">Add/Update</button>
      <div className="self-center text-xs opacity-70">Add or overwrite by name</div>
    </div>
  )
}
function GmSetRP({ name, onSet }) {
  const [rp, setRp] = useState('')
  return (
    <div className="flex gap-2">
      <input className="rounded-xl border border-white/10 bg-white/10 px-2 py-1 text-sm w-20" type="number" placeholder="RP" value={rp} onChange={e=>setRp(e.target.value)} />
      <button onClick={()=>{ onSet(name, parseInt(rp||'0')); setRp('') }} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Set RP</button>
    </div>
  )
}
function GmSetRenown({ name, value, onSet }) {
  const [renown, setRenown] = useState(value)
  return (
    <div className="flex gap-2">
      <select className="rounded-xl border border-white/10 bg-white/10 px-2 py-1 text-sm w-20" value={renown} onChange={e=>setRenown(e.target.value)}>
        {RANK_ORDER.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <button onClick={()=>{ onSet(name, renown); setRenown(value) }} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Set Renown</button>
    </div>
  )
}
function GmResetPW({ name, onReset }) {
  const [pw, setPw] = useState('')
  return (
    <div className="flex gap-2">
      <input className="rounded-xl border border-white/10 bg-white/10 px-2 py-1 text-sm" type="password" placeholder="New PW" value={pw} onChange={e=>setPw(e.target.value)} />
      <button onClick={()=>{ onReset(name, pw); setPw('') }} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Reset PW</button>
    </div>
  )
}

function GmEditItemMeta({ item, onSet }) {
  const [req, setReq] = useState(item.req ?? item.cost ?? 0)
  const [renown, setRenown] = useState(item.renown || 'None')
  return (
    <div className="flex items-center gap-1">
      <input className="w-16 rounded border border-white/10 bg-white/10 px-2 py-1 text-xs" type="number" min={0} value={req} onChange={e=>setReq(e.target.value)} />
      <select className="rounded border border-white/10 bg-white/10 px-2 py-1 text-xs" value={renown} onChange={e=>setRenown(e.target.value)}>
        {RANK_ORDER.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <button onClick={()=>onSet(item.id, parseInt(req||'0'), renown)} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Set</button>
    </div>
  )
}

function GmChangePassword({ onSet }){
  const [pw, setPw] = useState('')
  return (
    <div className="flex items-center gap-2 text-xs">
      <input className="rounded-xl border border-white/10 bg-white/10 px-2 py-1" type="password" placeholder="New GM password (not persisted)" value={pw} onChange={e=>setPw(e.target.value)} />
      <button onClick={()=>{ onSet(pw); setPw('') }} className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500">Set Password</button>
    </div>
  )
}
