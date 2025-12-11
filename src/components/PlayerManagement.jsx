import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { XPBar } from './XPBar';

const RANK_ORDER = ['None','Respected','Distinguished','Famed','Hero'];

export default function PlayerManagement({ authedPlayer, sessionId }) {
  const [players, setPlayers] = useState([]);
  const [saveMsg, setSaveMsg] = useState('');

  // Helper to build request headers
  function buildHeaders(extra = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) headers['x-session-id'] = sessionId;
    if (authedPlayer === 'gm') headers['x-gm-secret'] = 'bongo';
    return { ...headers, ...extra };
  }

  function flash(msg) {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 3000);
  }

  // Fetch players from the database
  const fetchPlayers = useCallback(async () => {
    try {
      const res = await axios.get('/api/players', { headers: buildHeaders() });
      setPlayers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch players:', err);
      flash('Failed to fetch players');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, authedPlayer]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  if (authedPlayer !== 'gm') return (
    <div className="p-6 rounded-lg bg-red-800 border border-red-700">
      <h2 className="text-xl font-bold text-red-300 mb-2">Access Denied</h2>
      <p className="text-red-200">Player Management is only accessible to Game Masters. Please log in as a GM.</p>
    </div>
  );

  // GM action handlers
  async function gmSetXP(name, xp) {
    console.log('PlayerManagement: gmSetXP', { name, xp });
    try {
      const res = await axios.post('/api/players/gm/set-xp', 
        { playerName: name, xp: parseInt(xp) }, 
        { headers: buildHeaders() }
      );
      console.log('PlayerManagement: gmSetXP response', res.status, res.data);
      flash(`Set XP for ${name} to ${xp}`);
      
      // Refresh players list
      await fetchPlayers();
    } catch (e) {
      console.error('PlayerManagement: gmSetXP failed', e.response?.data || e.message);
      flash(`Failed to set XP for ${name}: ${e.response?.data?.message || e.message}`);
    }
  }

  async function gmSetXPSpent(name, xpSpent) {
    console.log('PlayerManagement: gmSetXPSpent', { name, xpSpent });
    try {
      const res = await axios.post('/api/players/gm/set-xp-spent', 
        { playerName: name, xpSpent: parseInt(xpSpent) }, 
        { headers: buildHeaders() }
      );
      console.log('PlayerManagement: gmSetXPSpent response', res.status, res.data);
      flash(`Set XP Spent for ${name} to ${xpSpent}`);
      
      // Refresh players list
      await fetchPlayers();
    } catch (e) {
      console.error('PlayerManagement: gmSetXPSpent failed', e.response?.data || e.message);
      flash(`Failed to set XP Spent for ${name}: ${e.response?.data?.message || e.message}`);
    }
  }

  async function gmAddOrUpdatePlayer(name, rp, pw) {
    console.log('PlayerManagement: gmAddOrUpdatePlayer', { name, rp, pwProvided: !!pw });
    try {
      const resPost = await axios.post('/api/players/gm/add-or-update', 
        { name, requisitionPoints: parseInt(rp), password: pw || '1234' }, 
        { headers: buildHeaders() }
      );
      console.log('PlayerManagement: gmAddOrUpdatePlayer POST response', resPost.status, resPost.data);
      flash(`Added/Updated player ${name} with ${rp} RP`);
      
      // Refresh players list
      await fetchPlayers();
    } catch (e) {
      console.error('PlayerManagement: gmAddOrUpdatePlayer failed', e.response?.data || e.message);
      flash(`Failed to add/update player ${name}: ${e.response?.data?.message || e.message}`);
    }
  }

  async function gmSetRP(name, rp) {
    console.log('PlayerManagement: gmSetRP', { name, rp });
    try {
      const url = `/api/players/gm/set-rp`;
      const payload = { playerName: name, requisitionPoints: parseInt(rp) };
      const config = { headers: buildHeaders() };
      
      console.log('PlayerManagement: Making request to', url, 'with payload', payload, 'and config', config);
      
      const res = await axios.post(url, payload, config);
      console.log('PlayerManagement: gmSetRP response', res.status, res.data);
      
      flash(`Set RP for ${name} to ${rp}`);
      
      // Refresh players list to show updated RP
      await fetchPlayers();
    } catch (e) {
      console.error('PlayerManagement: gmSetRP failed', e.response?.data || e.message);
      flash(`Failed to set RP for ${name}: ${e.response?.data?.message || e.message}`);
    }
  }

  async function gmSetRenown(name, renown) {
    console.log('PlayerManagement: gmSetRenown', { name, renown });
    try {
      const res = await axios.post('/api/players/gm/set-renown', 
        { playerName: name, renown }, 
        { headers: buildHeaders() }
      );
      console.log('PlayerManagement: gmSetRenown response', res.status, res.data);
      flash(`Set Renown for ${name} to ${renown}`);
      
      // Refresh players list
      await fetchPlayers();
    } catch (e) {
      console.error('PlayerManagement: gmSetRenown failed', e.response?.data || e.message);
      flash(`Failed to set Renown for ${name}: ${e.response?.data?.message || e.message}`);
    }
  }

  async function gmResetPlayerPw(name, pw) {
    console.log('PlayerManagement: gmResetPlayerPw', { name, pwProvided: !!pw });
    try {
      const res = await axios.post('/api/players/gm/reset-password', 
        { playerName: name, newPassword: pw || '1234' }, 
        { headers: buildHeaders() }
      );
      console.log('PlayerManagement: gmResetPlayerPw response', res.status, res.data);
      flash(`Reset password for ${name}`);
    } catch (e) {
      console.error('PlayerManagement: gmResetPlayerPw failed', e.response?.data || e.message);
      flash(`Failed to reset password for ${name}: ${e.response?.data?.message || e.message}`);
    }
  }

  async function gmDeletePlayer(name) {
    if (!window.confirm(`Are you sure you want to delete player ${name}? This cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await axios.delete(`/api/players/gm/delete/${encodeURIComponent(name)}`, 
        { headers: buildHeaders() }
      );
      console.log('PlayerManagement: gmDeletePlayer response', res.status, res.data);
      flash(`Deleted player ${name}`);
      
      // Refresh players list
      await fetchPlayers();
    } catch (e) {
      console.error('PlayerManagement: gmDeletePlayer failed', e.response?.data || e.message);
      flash(`Failed to delete player ${name}: ${e.response?.data?.message || e.message}`);
    }
  }

  // Component for adding new players
  function GmAddPlayer({ onAdd }) {
    const [name, setName] = useState('');
    const [rp, setRp] = useState('50');
    const [pw, setPw] = useState('');
    
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
        <h4 className="text-lg font-medium text-white mb-3">Add New Player</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input 
            className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 text-sm"
            type="text" 
            placeholder="Player Name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
          <input 
            className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 text-sm"
            type="number" 
            placeholder="Requisition Points" 
            value={rp} 
            onChange={e => setRp(e.target.value)} 
          />
          <input 
            className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 text-sm"
            type="password" 
            placeholder="Password (default: 1234)" 
            value={pw} 
            onChange={e => setPw(e.target.value)} 
          />
          <button 
            className="rounded bg-green-600 hover:bg-green-500 px-4 py-2 text-white text-sm font-medium transition-colors"
            onClick={() => {
              if (name.trim()) {
                onAdd(name.trim(), rp, pw || '1234');
                setName('');
                setRp('50');
                setPw('');
              }
            }}
          >
            Add Player
          </button>
        </div>
      </div>
    );
  }

  // Component for setting RP
  function GmSetRP({ name, currentRP, onSet }) {
    const [rp, setRp] = useState(currentRP?.toString() || '0');
    
    // Update state when currentRP prop changes
    useEffect(() => {
      setRp(currentRP?.toString() || '0');
    }, [currentRP]);
    
    return (
      <div className="flex items-center gap-2 w-full">
        <input 
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-sm flex-1 min-w-0"
          type="number" 
          value={rp} 
          onChange={e => setRp(e.target.value)} 
        />
        <button 
          className="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1 text-white text-xs font-medium transition-colors whitespace-nowrap"
          onClick={() => onSet(name, rp)}
        >
          Set
        </button>
      </div>
    );
  }

  // Component for setting XP
  function GmSetXP({ name, currentXP, onSet }) {
    const [xp, setXp] = useState(currentXP?.toString() || '0');
    
    // Update state when currentXP prop changes
    useEffect(() => {
      setXp(currentXP?.toString() || '0');
    }, [currentXP]);
    
    return (
      <div className="flex items-center gap-2 w-full">
        <input 
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-sm flex-1 min-w-0"
          type="number" 
          value={xp} 
          onChange={e => setXp(e.target.value)} 
        />
        <button 
          className="rounded bg-purple-600 hover:bg-purple-500 px-3 py-1 text-white text-xs font-medium transition-colors whitespace-nowrap"
          onClick={() => onSet(name, xp)}
        >
          Set
        </button>
      </div>
    );
  }

  // Component for setting XP Spent
  function GmSetXPSpent({ name, currentXPSpent, onSet }) {
    const [xpSpent, setXpSpent] = useState(currentXPSpent?.toString() || '0');
    
    // Update state when currentXPSpent prop changes
    useEffect(() => {
      setXpSpent(currentXPSpent?.toString() || '0');
    }, [currentXPSpent]);
    
    return (
      <div className="flex items-center gap-2 w-full">
        <input 
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-sm flex-1 min-w-0"
          type="number" 
          value={xpSpent} 
          onChange={e => setXpSpent(e.target.value)} 
        />
        <button 
          className="rounded bg-indigo-600 hover:bg-indigo-500 px-3 py-1 text-white text-xs font-medium transition-colors whitespace-nowrap"
          onClick={() => onSet(name, xpSpent)}
        >
          Set
        </button>
      </div>
    );
  }

  // Component for setting Renown
  function GmSetRenown({ name, currentRenown, onSet }) {
    const [renown, setRenown] = useState(currentRenown || 'None');
    
    // Update state when currentRenown prop changes
    useEffect(() => {
      setRenown(currentRenown || 'None');
    }, [currentRenown]);
    
    return (
      <div className="flex items-center gap-2 w-full">
        <select 
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-sm flex-1 min-w-0"
          value={renown} 
          onChange={e => setRenown(e.target.value)}
        >
          {RANK_ORDER.map(rank => (
            <option key={rank} value={rank} className="bg-slate-800">{rank}</option>
          ))}
        </select>
        <button 
          className="rounded bg-yellow-600 hover:bg-yellow-500 px-3 py-1 text-white text-xs font-medium transition-colors whitespace-nowrap"
          onClick={() => onSet(name, renown)}
        >
          Set
        </button>
      </div>
    );
  }

  // Component for resetting password
  function GmResetPW({ name, onReset }) {
    const [pw, setPw] = useState('');
    
    return (
      <div className="flex items-center gap-2 w-full">
        <input 
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white placeholder-slate-400 text-sm flex-1 min-w-0"
          type="password" 
          placeholder="New password (default: 1234)" 
          value={pw} 
          onChange={e => setPw(e.target.value)} 
        />
        <button 
          className="rounded bg-orange-600 hover:bg-orange-500 px-3 py-1 text-white text-xs font-medium transition-colors whitespace-nowrap"
          onClick={() => {
            onReset(name, pw || '1234');
            setPw('');
          }}
        >
          Reset
        </button>
      </div>
    );
  }

  // Component for bulk XP giving
  function BulkXPGiver({ onGive }) {
    const [amount, setAmount] = useState('100');
    
    return (
      <div className="flex items-center gap-2">
        <input 
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-xs w-16"
          type="number" 
          value={amount} 
          onChange={e => setAmount(e.target.value)} 
        />
        <button 
          className="text-xs px-3 py-1 rounded bg-purple-600 hover:bg-purple-600 text-white transition-colors whitespace-nowrap"
          onClick={() => {
            if (window.confirm(`Give ${amount} XP to all ${players.length} players?`)) {
              onGive(parseInt(amount));
              flash(`Gave ${amount} XP to all players`);
            }
          }}
        >
          Give XP to All
        </button>
      </div>
    );
  }

  // Component for bulk XP setting
  function BulkXPSetter({ onSet }) {
    const [amount, setAmount] = useState('1000');
    
    return (
      <div className="flex items-center gap-2">
        <input 
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-xs w-16"
          type="number" 
          value={amount} 
          onChange={e => setAmount(e.target.value)} 
        />
        <button 
          className="text-xs px-3 py-1 rounded bg-purple-500 hover:bg-purple-500 text-white transition-colors whitespace-nowrap"
          onClick={() => {
            if (window.confirm(`Set all ${players.length} players to ${amount} XP?`)) {
              onSet(parseInt(amount));
              flash(`Set all players to ${amount} XP`);
            }
          }}
        >
          Set All XP
        </button>
      </div>
    );
  }

  // Component for bulk RP giving
  function BulkRPGiver({ onGive }) {
    const [amount, setAmount] = useState('10');
    
    return (
      <div className="flex items-center gap-2">
        <input 
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-xs w-16"
          type="number" 
          value={amount} 
          onChange={e => setAmount(e.target.value)} 
        />
        <button 
          className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-600 text-white transition-colors whitespace-nowrap"
          onClick={() => {
            if (window.confirm(`Give ${amount} RP to all ${players.length} players?`)) {
              onGive(parseInt(amount));
              flash(`Gave ${amount} RP to all players`);
            }
          }}
        >
          Give RP to All
        </button>
      </div>
    );
  }

  // Component for bulk RP setting
  function BulkRPSetter({ onSet }) {
    const [amount, setAmount] = useState('50');
    
    return (
      <div className="flex items-center gap-2">
        <input 
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-xs w-16"
          type="number" 
          value={amount} 
          onChange={e => setAmount(e.target.value)} 
        />
        <button 
          className="text-xs px-3 py-1 rounded bg-blue-500 hover:bg-blue-500 text-white transition-colors whitespace-nowrap"
          onClick={() => {
            if (window.confirm(`Set all ${players.length} players to ${amount} RP?`)) {
              onSet(parseInt(amount));
              flash(`Set all players to ${amount} RP`);
            }
          }}
        >
          Set All RP
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-600">
      <h2 className="text-2xl font-semibold mb-4 text-white">Player Management</h2>
      <p className="text-sm text-slate-300 mb-6">Manage player accounts, requisition points, experience, and renown.</p>
      
      {saveMsg && (
        <div className="mb-4 p-3 rounded bg-green-800 border border-green-700 text-green-300 text-sm">
          {saveMsg}
        </div>
      )}

      {/* Add New Player */}
      <GmAddPlayer onAdd={gmAddOrUpdatePlayer} />

      {/* Players List */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Current Players ({players.length})</h3>
        
        {players.length === 0 ? (
          <div className="text-slate-400 text-center py-8">
            No players found. Add some players above.
          </div>
        ) : (
          <div className="space-y-4">
            {players.map(player => (
              <div key={player.name} className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Player Info Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white text-lg">{player.name}</div>
                        <div className="text-sm text-slate-400">
                          {player.tabInfo?.renown || 'None'} • RP: {player.tabInfo?.rp || 0}
                        </div>
                      </div>
                      <button 
                        className="rounded bg-red-600 hover:bg-red-500 px-3 py-1.5 text-white text-sm font-medium transition-colors"
                        onClick={() => gmDeletePlayer(player.name)}
                      >
                        Delete Player
                      </button>
                    </div>
                    
                    {/* Player Stats with XP Bar */}
                    <div className="space-y-3 mb-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-slate-300">
                          <span className="text-slate-400">Character:</span> {player.tabInfo?.charName || 'Unnamed'}
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-400">Available XP:</span> <span className="text-green-400 font-medium">{(player.tabInfo?.xp || 0) - (player.tabInfo?.xpSpent || 0)}</span>
                        </div>
                      </div>
                      <div className="bg-slate-800 rounded p-3 border border-slate-700">
                        <div className="text-xs font-medium text-slate-300 uppercase tracking-wide mb-2">Experience Progress</div>
                        <XPBar 
                          currentXP={player.tabInfo?.xp || 0} 
                          xpSpent={player.tabInfo?.xpSpent || 0}
                          thresholdXP={500}
                          showLabel={true}
                          compact={false}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Management Controls Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* RP Management */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">Requisition Points</label>
                      <GmSetRP 
                        name={player.name} 
                        currentRP={player.tabInfo?.rp}
                        onSet={gmSetRP} 
                      />
                    </div>

                    {/* XP Management */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">Experience Points</label>
                      <GmSetXP 
                        name={player.name} 
                        currentXP={player.tabInfo?.xp}
                        onSet={gmSetXP} 
                      />
                    </div>

                    {/* XP Spent Management */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">XP Spent</label>
                      <GmSetXPSpent 
                        name={player.name} 
                        currentXPSpent={player.tabInfo?.xpSpent}
                        onSet={gmSetXPSpent} 
                      />
                    </div>

                    {/* Renown Management */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">Renown Level</label>
                      <GmSetRenown 
                        name={player.name} 
                        currentRenown={player.tabInfo?.renown}
                        onSet={gmSetRenown} 
                      />
                    </div>

                    {/* Password Reset */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">Password Reset</label>
                      <GmResetPW 
                        name={player.name} 
                        onReset={gmResetPlayerPw} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
        <h4 className="text-sm font-medium text-white mb-3">Quick Actions</h4>
        
        {/* Bulk XP Actions */}
        <div className="mb-4">
          <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Bulk XP Management</h5>
          <div className="flex flex-wrap gap-2">
            <BulkXPGiver onGive={(amount) => {
              players.forEach(player => {
                const currentXP = player.tabInfo?.xp || 0;
                gmSetXP(player.name, (currentXP + amount).toString());
              });
            }} />
            <BulkXPSetter onSet={(amount) => {
              players.forEach(player => {
                gmSetXP(player.name, amount.toString());
              });
            }} />
          </div>
        </div>

        {/* Bulk RP Actions */}
        <div className="mb-4">
          <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Bulk RP Management</h5>
          <div className="flex flex-wrap gap-2">
            <BulkRPGiver onGive={(amount) => {
              players.forEach(player => {
                const currentRP = player.tabInfo?.rp || 0;
                gmSetRP(player.name, (currentRP + amount).toString());
              });
            }} />
            <BulkRPSetter onSet={(amount) => {
              players.forEach(player => {
                gmSetRP(player.name, amount.toString());
              });
            }} />
          </div>
        </div>

        {/* Other Quick Actions */}
        <div>
          <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Other Actions</h5>
          <div className="flex flex-wrap gap-2">
            <button 
              className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-600 text-white transition-colors"
              onClick={fetchPlayers}
            >
              Refresh Players
            </button>
            <button 
              className="text-xs px-3 py-1 rounded bg-green-600 hover:bg-green-600 text-white transition-colors"
              onClick={() => {
                players.forEach(player => {
                  if ((player.tabInfo?.rp || 0) < 10) {
                    gmSetRP(player.name, '50');
                  }
                });
              }}
            >
              Set Low RP Players to 50
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
