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

// ...existing code...

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
        // Fetch players (for admin/GM functionality)
        console.log('Fetching players with sessionId:', sessionId);
        try {
          const playersResponse = await axios.get('/api/players', { 
            headers: { 'x-session-id': sessionId || '' }
          });
          console.log('Fetched players:', playersResponse.data);
          setPlayers(playersResponse.data);
        } catch (playerError) {
          console.log('Could not fetch full player data (likely not GM), using basic names:', playerError.message);
          // Fall back to public player names if full player data is not available
          try {
            const playersResponse = await axios.get('/api/players/names');
            setPlayers(playersResponse.data);
          } catch (e) {
            console.error('Failed to fetch even basic player names:', e);
            setPlayers([]);
          }
        }
        // Fetch shop items from the new database (public endpoint, no session needed)
        console.log('Fetching shop items');
        const itemsResponse = await axios.get('/api/shop');
        console.log('Fetched shop items:', itemsResponse.data);

        if (!itemsResponse.data || !itemsResponse.data.items) {
          console.log('Warning: Shop items response was empty or missing items')
          setItems([]);
          return;
        }

        // Flatten the categorized items into a single array
        const allItems = [];
        const itemsByCategory = itemsResponse.data.items;
        
        for (const category in itemsByCategory) {
          if (Array.isArray(itemsByCategory[category])) {
            itemsByCategory[category].forEach(item => {
              // Only include items that have a cost > 0 (purchasable items)
              const reqCost = item.req || 0;
              if (reqCost > 0) {
                allItems.push({
                  id: item.id || `${category}-${item.name}`,
                  name: item.name,
                  category: category,
                  req: reqCost,
                  renown: item.renown || 'Any',
                  stats: item.stats || {},
                  itemType: item.itemType || 'equipment'
                });
              }
            });
          }
        }

        setItems(allItems);
      } catch (error) {
        console.error('Error fetching data:', error);
        // If shop API fails, we can't load items. Keep players fallback behavior.
        setPlayers([]);
      }
    }
    // Always fetch shop items; fetch players only if we have a sessionId
    fetchData();
  }, [sessionId]);

  const currentPlayer = useMemo(() => {
    const p = players.find(p => p.name === authedPlayer);
    if (!p) return null;
    
    // Player data is stored in tabInfo structure
    const tabInfo = p.tabInfo || {};
    return {
      ...p,
      id: p.id,
      requisition_points: Number(tabInfo.rp || 0),
      renown_level: tabInfo.renown || 'None',
      // Keep gear from tabInfo for inventory system
      gear: Array.isArray(tabInfo.gear) ? tabInfo.gear : []
    };
  }, [players, authedPlayer]);

  // Helper function to check if an item can be purchased
  const canPurchaseItem = (item) => {
    if (!currentPlayer) return false;
    
    const playerRP = currentPlayer.requisition_points || 0;
    const playerRenown = currentPlayer.renown_level || 'None';
    const requiredRenown = item.renown || 'Any';
    
    const hasEnoughRP = playerRP >= item.req;
    const hasEnoughRenown = requiredRenown === 'Any' || 
      RANK_ORDER.indexOf(playerRenown) >= RANK_ORDER.indexOf(requiredRenown);
    
    return hasEnoughRP && hasEnoughRenown;
  };

  // Helper function to get purchase button text and styling
  const getPurchaseButtonInfo = (item) => {
    if (!currentPlayer) return { text: 'Buy', disabled: true, className: 'px-3 py-1 rounded bg-slate-600 text-sm cursor-not-allowed' };
    
    const playerRP = currentPlayer.requisition_points || 0;
    const playerRenown = currentPlayer.renown_level || 'None';
    const requiredRenown = item.renown || 'Any';
    
    const hasEnoughRP = playerRP >= item.req;
    const hasEnoughRenown = requiredRenown === 'Any' || 
      RANK_ORDER.indexOf(playerRenown) >= RANK_ORDER.indexOf(requiredRenown);
    
    if (!hasEnoughRP && !hasEnoughRenown) {
      return { text: 'Need RP & Renown', disabled: true, className: 'px-3 py-1 rounded bg-red-600 text-xs cursor-not-allowed' };
    } else if (!hasEnoughRP) {
      return { text: 'Need RP', disabled: true, className: 'px-3 py-1 rounded bg-red-600 text-xs cursor-not-allowed' };
    } else if (!hasEnoughRenown) {
      return { text: 'Need Renown', disabled: true, className: 'px-3 py-1 rounded bg-orange-600 text-xs cursor-not-allowed' };
    } else {
      return { text: 'Buy', disabled: false, className: 'px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-sm' };
    }
  };

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
    if (currentRp < item.req) {
      setErrorMsg(`Not enough Requisition Points. Need ${item.req} RP but only have ${currentRp} RP.`);
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
          playerId: currentPlayer.name, // Use player name instead of id
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
      
      setErrorMsg(`Successfully purchased ${item.name} for ${item.req} RP`);
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
                
                {/* Display item stats */}
                {item.stats && Object.keys(item.stats).length > 0 && (
                  <div className="text-sm text-slate-200 mb-3 space-y-1">
                    {item.stats.damage && (
                      <div className="text-xs"><span className="text-slate-400">Damage:</span> {item.stats.damage}</div>
                    )}
                    {item.stats.class && (
                      <div className="text-xs"><span className="text-slate-400">Class:</span> {item.stats.class}</div>
                    )}
                    {item.stats.type && (
                      <div className="text-xs"><span className="text-slate-400">Type:</span> {item.stats.type}</div>
                    )}
                    {item.stats.protection && (
                      <div className="text-xs">
                        <span className="text-slate-400">Protection:</span> 
                        {' '}Head: {item.stats.protection.head}, 
                        Arms: {item.stats.protection.arms}, 
                        Body: {item.stats.protection.body}, 
                        Legs: {item.stats.protection.legs}
                      </div>
                    )}
                    {item.stats.source && (
                      <div className="text-xs text-slate-500">Source: {item.stats.source}</div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-slate-400">Cost: {item.req} RP</div>
                    <div className={`text-xs px-2 py-1 rounded ${renownClass(item.renown)}`}>
                      {item.renown}
                    </div>
                  </div>
                  {currentPlayer && (
                    <button
                      onClick={() => purchaseItem(item)}
                      disabled={getPurchaseButtonInfo(item).disabled}
                      className={getPurchaseButtonInfo(item).className}
                    >
                      {getPurchaseButtonInfo(item).text}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>


        </>
      )}
    </div>
  );
}


