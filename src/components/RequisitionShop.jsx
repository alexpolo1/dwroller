import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';



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
  const [search, setSearch] = useState('')
  
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
        console.log('Fetching players with sessionId:', sessionId);
        const response = await axios.get('/api/players', { headers: { 'x-session-id': sessionId || '' } });
        console.log('Fetched players:', response.data);
        setPlayers(response.data);
      } catch (error) {
        console.error('Error fetching players:', error);
        setPlayers([]);
      }
    }
    if (sessionId) {
      fetchPlayers();
    }
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
    // Ensure tabInfo exists and has proper structure
    const tabInfo = p.tabInfo || {};
    return {
      ...p,
      ...tabInfo,
      rp: Number(tabInfo.rp || 0),
      gear: Array.isArray(tabInfo.gear) ? tabInfo.gear : [],
      transactions: Array.isArray(tabInfo.transactions) ? tabInfo.transactions : [],
    };
  }, [players, authedPlayer]);
  const filteredItems = useMemo(()=>{
    const q = search.trim().toLowerCase()
    return items.filter(i => {
      const inQuery = !q || i.name.toLowerCase().includes(q) || (i.category||'').toLowerCase().includes(q)
      const inCat = categoryFilter==='All' || String(i.category||'').toLowerCase()===String(categoryFilter).toLowerCase()
      return inQuery && inCat
    })
  },[items, search, categoryFilter])

  // Updated purchaseItem to subtract requisition points from the player
  async function purchaseItem(item) {
    if (!currentPlayer) {
      setErrorMsg('No player logged in');
      return;
    }
    if (!sessionId) {
      setErrorMsg('Session expired. Please log in again.');
      return;
    }

    // Check if player has enough RP
    if ((currentPlayer.rp || 0) < (item.cost || 0)) {
      setErrorMsg(`Not enough Requisition Points. Need ${item.cost} RP but only have ${currentPlayer.rp || 0} RP.`);
      return;
    }

    // Calculate new values
    const newRp = Math.max(0, (currentPlayer.rp || 0) - (item.cost || 0));
    const newGear = [...(currentPlayer.tabInfo?.gear || []), {
      ...item,
      id: Date.now(),
      qty: 1
    }];
    const newTransactions = [...(currentPlayer.transactions || []), {
      item,
      cost: item.cost,
      date: new Date().toISOString(),
      previousRp: currentPlayer.rp || 0,
      newRp: newRp
    }];
    
    // Update player data including all existing fields
    const updatedTabInfo = {
      ...currentPlayer.tabInfo, // Preserve all existing tabInfo fields
      rp: newRp,
      gear: newGear,
      transactions: newTransactions,
      renown: currentPlayer.renown || 'None',
    };

    try {
      console.log('Updating player with:', currentPlayer.name, updatedTabInfo);
      console.log('Sending update:', {
        name: currentPlayer.name,
        tabInfo: updatedTabInfo
      });
      
      await axios.put(
        `/api/players/${currentPlayer.name}`, 
        {
          name: currentPlayer.name,
          tabInfo: {
            ...currentPlayer.tabInfo,
            gear: updatedTabInfo.gear,
            rp: updatedTabInfo.rp,
            transactions: updatedTabInfo.transactions,
            renown: updatedTabInfo.renown
          }
        },
        { headers: { 'x-session-id': sessionId } }
      );
      // Refetch players after update
      const response = await axios.get('/api/players', { headers: { 'x-session-id': sessionId } });
      setPlayers(response.data);
      setErrorMsg(`Successfully purchased ${item.name} for ${item.cost} RP`);
    } catch (error) {
      console.error('Failed to update player:', error);
      setErrorMsg(error.response?.data?.error || 'Failed to make purchase');
    }
  }


  // Display saveMsg in the UI
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 shadow-xl space-y-4">
      <div className="text-2xl font-bold">Requisition Shop</div>
      
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30">
          <p className="text-red-300">{errorMsg}</p>
        </div>
      )}

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
              </div>
            ))}
          </div>

          {/* GM Panel moved to PlayerTab - GM controls (add/set RP/renown/reset PW) available in PlayerTab when GM is logged in */}
          <div className="border-t border-white/10 pt-4">
            <div className="p-3 rounded bg-amber-900/20 border border-amber-500/30">
              <div className="text-amber-300 font-semibold mb-2">
                GM Panel
              </div>
              <div className="text-sm text-amber-200">
                GM controls have been moved to the PlayerTab. When logged in as GM, you can add players, set RP and renown, reset passwords, and manage items.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// GM subcomponents (GmAddPlayer, GmSetRP, GmSetRenown, GmResetPW, GmEditItemMeta, GmChangePassword)
// were moved to PlayerTab.jsx to centralize player management.

function GmEditItemMeta({ item, onSet }) {
  const [req, setReq] = useState(item.req ?? item.cost ?? 0)
  const [renown, setRenown] = useState(item.renown || 'None')
  return (
    <div className="flex items-center gap-1">
      <input className="w-16 rounded border border-white/10 bg-white/10 px-2 py-1 text-xs" type="number" min={0} value={req} onChange={e=>setReq(e.target.value)} />
      <select className="rounded border border-white/10 bg-white/10 px-2 py-1 text-xs" value={renown} onChange={e=>setRenown(e.target.value)}>
        {['None','Respected','Distinguished','Famed','Hero'].map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <button onClick={()=>onSet(item.id, parseInt(req||'0'), renown)} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Set</button>
    </div>
  )
}
