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

  // Fetch both players and shop items from the backend
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch players
        console.log('Fetching players with sessionId:', sessionId);
        const playersResponse = await axios.get('/api/players', { 
          headers: { 'x-session-id': sessionId || '' }
        });
        console.log('Fetched players:', playersResponse.data);
        setPlayers(playersResponse.data);

        // Fetch shop items from the new database
        console.log('Fetching shop items');
        try {
          const itemsResponse = await axios.get('/api/shop/items', {
            headers: { 'x-session-id': sessionId || '' }
          });
          console.log('Fetched shop items:', itemsResponse.data);
          
          if (!itemsResponse.data || itemsResponse.data.length === 0) {
            console.log('Warning: Shop items response was empty, falling back to JSON');
            throw new Error('Empty shop items');
          }
          
          const normalizedItems = itemsResponse.data.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          cost: item.requisition_cost,
          req: item.requisition_cost,
          renown: item.renown_requirement,
          desc: item.stats ? JSON.parse(item.stats).description || '' : '',
          stats: item.stats ? JSON.parse(item.stats) : {}
        }));
        
        setItems(normalizedItems);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (error.response?.status === 404 && error.response?.data?.includes('shop')) {
          // If shop API fails, fall back to JSON file
          try {
            const res = await fetch('/deathwatch-armoury.json', { cache: 'no-store' })
            if (!res.ok) return;
            const arr = await res.json()
            const next = Array.isArray(arr) ? arr.map(normalizeItem).filter(Boolean) : []
            if (next.length>0) {
              setItems(next)
            }
          } catch (e) {
            console.error('Failed to load fallback JSON:', e);
          }
        }
        setPlayers([]);
      }
    }
    
    if (sessionId) {
      fetchData();
    }
  }, [sessionId]);

  const currentPlayer = useMemo(() => {
    const p = players.find(p => p.name === authedPlayer);
    if (!p) return null;
    
    // Support both old and new data structure
    // Old data is in tabInfo, new data is directly on the player object
    const tabInfo = p.tabInfo || {};
    return {
      ...p,
      id: p.id,
      requisition_points: p.requisition_points !== undefined ? p.requisition_points : Number(tabInfo.rp || 0),
      renown_level: p.renown_level || tabInfo.renown || 'None',
      // Keep gear from tabInfo for now, as we transition to using the inventory table
      gear: Array.isArray(tabInfo.gear) ? tabInfo.gear : []
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

  // Updated purchaseItem to use the new database transaction system
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
    const currentRp = currentPlayer.requisition_points || 0;
    if (currentRp < item.cost) {
      setErrorMsg(`Not enough Requisition Points. Need ${item.cost} RP but only have ${currentRp} RP.`);
      return;
    }

    // Check if player meets renown requirement
    const playerRenown = currentPlayer.renown_level || 'None';
    const requiredRenown = item.renown;
    const playerRenownIndex = RANK_ORDER.indexOf(playerRenown);
    const requiredRenownIndex = RANK_ORDER.indexOf(requiredRenown);
    
    if (playerRenownIndex < requiredRenownIndex) {
      setErrorMsg(`This item requires ${requiredRenown} renown level. Your current renown is ${playerRenown}.`);
      return;
    }

    try {
      console.log('Purchasing item:', item);
      
      // Use the new shop purchase endpoint
      await axios.post(
        '/api/shop/purchase',
        {
          playerId: currentPlayer.id,
          itemId: item.id,
          quantity: 1
        },
        { headers: { 'x-session-id': sessionId } }
      );

      // Refetch players to get updated RP and inventory
      const response = await axios.get('/api/players', { 
        headers: { 'x-session-id': sessionId } 
      });
      setPlayers(response.data);
      
      setErrorMsg(`Successfully purchased ${item.name} for ${item.cost} RP`);
    } catch (error) {
      console.error('Failed to purchase item:', error);
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
                Requisition Points: {currentPlayer.requisition_points || 0} | Renown: {currentPlayer.renown_level || 'None'}
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
                      disabled={!currentPlayer || (currentPlayer.requisition_points || 0) < item.cost}
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


