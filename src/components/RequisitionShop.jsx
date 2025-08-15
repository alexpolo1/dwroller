import { useEffect, useMemo, useState } from 'react'
import axios from 'axios';

function safeGet(key) {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

async function sha256Hex(str) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
    const arr = Array.from(new Uint8Array(buf))
    return arr.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return str
  }
}


const GM_PASSWORD = 'bongo'
const STORAGE_SHOP_SESSION = 'dw:shop:sessionId'

const RANK_ORDER = ['None','Respected','Distinguished','Famed','Hero']
function normalizeRank(r) {
  const s = String(r||'').trim()
  const found = RANK_ORDER.find(x=>x.toLowerCase()===s.toLowerCase())
  return found || (s? s : 'None')
}
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

export default function RequisitionShop({ authedPlayer, sessionId }) {
  const [items, setItems] = useState([])
  const [players, setPlayers] = useState([]);
  // authedPlayer and sessionId come from props
  const [gmOpen, setGmOpen] = useState(false)
  const [gmPassInput, setGmPassInput] = useState('')
  const [gmUnlocked, setGmUnlocked] = useState(false)

  const [search, setSearch] = useState('')
  
  // Define flash function
  function flash(msg) {
    console.log(msg); // Since saveMsg is not being displayed, just log it
  }

  const categories = useMemo(()=>{
    const set = new Set()
    for (const it of items) { if (it && it.category) set.add(String(it.category)) }
    return ['All', ...Array.from(set).sort((a,b)=>String(a).localeCompare(String(b)))]
  },[items])
  const [categoryFilter, setCategoryFilter] = useState('All')

  // Items are sourced from a single JSON file; disable local persistence
  // useEffect(()=>{ safeSet(STORAGE_SHOP_ITEMS, items) },[items])
  // Remove localStorage for players
  // Always fetch players from backend on mount and after updates
  useEffect(() => {
    async function fetchPlayers() {
      try {
        const response = await axios.get('/api/players', { headers: { 'x-session-id': sessionId || '' } });
        setPlayers(response.data);
      } catch (error) {
        setPlayers([]);
      }
    }
    fetchPlayers();
  }, [sessionId]);

  // On mount, validate sessionId if present
  // Sync login state with localStorage/sessionId on mount, tab switch, and storage changes
  // No per-tab session sync; handled globally
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

  const currentPlayer = useMemo(() => {
    const p = players.find(p => p.name === authedPlayer);
    if (!p) return null;
    return p.tabInfo ? { ...p, ...p.tabInfo } : p;
  }, [players, authedPlayer]);
  const filteredItems = useMemo(()=>{
    const q = search.trim().toLowerCase()
    return items.filter(i => {
      const inQuery = !q || i.name.toLowerCase().includes(q) || (i.category||'').toLowerCase().includes(q)
      const inCat = categoryFilter==='All' || String(i.category||'').toLowerCase()===String(categoryFilter).toLowerCase()
      return inQuery && inCat
    })
  },[items, search, categoryFilter])

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
  // No per-tab login/logout; handled globally

  // Updated purchaseItem to subtract requisition points from the player
  async function purchaseItem(item) {
    if (!currentPlayer) return;
    // Update tabInfo only
    const updatedTabInfo = {
      ...currentPlayer,
      rp: (currentPlayer.rp || 0) - (item.cost || 0),
      inventory: [...(currentPlayer.inventory || []), item],
      transactions: [...(currentPlayer.transactions || []), { item, date: new Date() }],
    };
    try {
  const sid = safeGet(STORAGE_SHOP_SESSION);
  await axios.put(`/api/players/${currentPlayer.name}`, updatedTabInfo, { headers: { 'x-session-id': sid || '' } });
  // Refetch players after update
  const response = await axios.get('/api/players', { headers: { 'x-session-id': sid || '' } });
  setPlayers(response.data);
    } catch (error) {
      console.error('Failed to update player:', error);
    }
  }

  async function addPlayer(name, rp, pw) {
    const nm = String(name||'').trim();
    if (!nm) return;
    const h = await sha256Hex(String(pw||'').trim());
    const playerDoc = {
      name: nm,
      tabInfo: {
        rp: Math.max(0, Number.isFinite(+rp)? +rp : 0),
        inventory: [],
        renown: 'None',
      },
      pw: pw,
      pwHash: h
    };
    try {
  const sid = safeGet(STORAGE_SHOP_SESSION);
  await axios.post('/api/players', playerDoc, { headers: { 'x-session-id': sid || '' } });
  // Refetch players after creation
  const response = await axios.get('/api/players', { headers: { 'x-session-id': sid || '' } });
  setPlayers(response.data);
    } catch (error) {
      console.error('Failed to create player:', error);
    }
  }
  async function setPlayerRP(name, rp) {
    const nm = String(name||'').trim();
    const player = players.find(p => p.name === nm);
    if (!player) return;
    const updatedTabInfo = { ...player.tabInfo, rp: Math.max(0, Number.isFinite(+rp)? +rp : 0) };
    try {
    const sid = safeGet(STORAGE_SHOP_SESSION);
    await axios.put(`/api/players/${nm}`, { tabInfo: updatedTabInfo }, { headers: { 'x-session-id': sid || '' } });
  const response = await axios.get('/api/players', { headers: { 'x-session-id': sid || '' } });
  setPlayers(response.data);
    } catch (error) {
      console.error('Failed to update RP:', error);
    }
  }
  async function setPlayerRenown(name, renown) {
    const nm = String(name||'').trim();
    const player = players.find(p => p.name === nm);
    if (!player) return;
    const updatedTabInfo = { ...player.tabInfo, renown: normalizeRank(renown) };
    try {
    const sid = safeGet(STORAGE_SHOP_SESSION);
    await axios.put(`/api/players/${nm}`, { tabInfo: updatedTabInfo }, { headers: { 'x-session-id': sid || '' } });
  const response = await axios.get('/api/players', { headers: { 'x-session-id': sid || '' } });
  setPlayers(response.data);
    } catch (error) {
      console.error('Failed to update renown:', error);
    }
  }
  async function resetPlayerPw(name, pw) {
    const nm = String(name || '').trim();
    if (!nm) {
      flash('Player name is required');
      return;
    }
    const h = await sha256Hex(String(pw || '').trim());
    const player = players.find(p => p.name === nm);
    if (!player) return;
    try {
  const sid = safeGet(STORAGE_SHOP_SESSION);
  await axios.put(`/api/players/${nm}`, { ...player, pw: pw, pwHash: h }, { headers: { 'x-session-id': sid || '' } });
  const response = await axios.get('/api/players', { headers: { 'x-session-id': sid || '' } });
  setPlayers(response.data);
      flash(`Password reset for ${nm}`);
    } catch (error) {
      console.error('Failed to reset password:', error);
    }
  }
  async function deletePlayer(name) {
    const nm = String(name||'').trim();
    try {
  const sid = safeGet(STORAGE_SHOP_SESSION);
  await axios.delete(`/api/players/${nm}`, { headers: { 'x-session-id': sid || '' } });
  const response = await axios.get('/api/players', { headers: { 'x-session-id': sid || '' } });
  setPlayers(response.data);
    } catch (error) {
      console.error('Failed to delete player:', error);
    }
  }

  function setItemMeta(id, req, renown) {
    setItems(prev => prev.map(it => it.id===id ? { ...it, req: Math.max(0, Number.isFinite(+req)? +req : (it.req||0)), cost: Math.max(0, Number.isFinite(+req)? +req : (it.cost||0)), renown: normalizeRank(renown||it.renown) } : it))
  }

  function setGmPassword(newPw) {
    // This is just for demo - password changes aren't persisted
    console.log('GM password changed to:', newPw);
  }

  // Display saveMsg in the UI
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 shadow-xl space-y-4">
      <div className="text-2xl font-bold">Requisition Shop</div>
      
      {!authedPlayer ? (
        <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-500/30">
          <p className="text-amber-300">Please log in using the header above to access the shop.</p>
        </div>
      ) : (
        <>
          {/* Player Info */}
          <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
            <div className="text-lg font-semibold text-blue-300">
              Current Player: {authedPlayer}
            </div>
            {currentPlayer && (
              <div className="text-sm text-blue-200">
                Requisition Points: {currentPlayer.rp || 0} | Renown: {currentPlayer.renown || 'None'}
              </div>
            )}
          </div>

          {/* Search and Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div key={item.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/10">
                <div className="font-semibold text-white">{item.name}</div>
                <div className="text-xs text-slate-300 mb-2">{item.category}</div>
                <div className="text-sm text-slate-200 mb-3">{item.desc}</div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-slate-400">Cost: {item.cost} RP</div>
                    <div className={`text-xs px-2 py-1 rounded ${renownClass(item.renown)}`}>
                      {item.renown}
                    </div>
                  </div>
                  {currentPlayer && (
                    <button
                      onClick={() => purchaseItem(item)}
                      disabled={!currentPlayer || (currentPlayer.rp || 0) < item.cost}
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-sm"
                    >
                      Buy
                    </button>
                  )}
                </div>
                {gmUnlocked && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <GmEditItemMeta item={item} onSet={setItemMeta} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* GM Panel */}
          <div className="border-t border-white/10 pt-4">
            <button
              onClick={() => setGmOpen(!gmOpen)}
              className="px-3 py-2 rounded bg-amber-600 hover:bg-amber-500 text-sm font-medium"
            >
              {gmOpen ? 'Hide' : 'Show'} GM Panel
            </button>
            
            {gmOpen && !gmUnlocked && (
              <div className="mt-3 p-3 rounded bg-amber-900/20 border border-amber-500/30">
                <div className="flex gap-2">
                  <input
                    className="rounded border border-white/10 bg-white/10 px-2 py-1"
                    type="password"
                    placeholder="GM Password"
                    value={gmPassInput}
                    onChange={e => setGmPassInput(e.target.value)}
                  />
                  <button
                    onClick={handleGmUnlock}
                    className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            )}

            {gmOpen && gmUnlocked && (
              <div className="mt-3 space-y-4">
                <div className="p-3 rounded bg-amber-900/20 border border-amber-500/30">
                  <div className="text-amber-300 font-semibold mb-2">Add/Update Player</div>
                  <GmAddPlayer onAdd={addPlayer} />
                </div>

                <div className="p-3 rounded bg-red-900/20 border border-red-500/30">
                  <div className="text-red-300 font-semibold mb-2">Manage Players</div>
                  <div className="space-y-2">
                    {players.map(player => (
                      <div key={player.name} className="flex items-center gap-3 p-2 rounded bg-black/20">
                        <div className="flex-1">
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-slate-400">
                            RP: {player.rp || 0} | Renown: {player.renown || 'None'}
                          </div>
                        </div>
                        <GmSetRP name={player.name} onSet={setPlayerRP} />
                        <GmSetRenown name={player.name} value={player.renown || 'None'} onSet={setPlayerRenown} />
                        <GmResetPW name={player.name} onReset={resetPlayerPw} />
                        <button
                          onClick={() => deletePlayer(player.name)}
                          className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded bg-purple-900/20 border border-purple-500/30">
                  <div className="text-purple-300 font-semibold mb-2">GM Settings</div>
                  <GmChangePassword onSet={newPw => setGmPassword(newPw)} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
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
