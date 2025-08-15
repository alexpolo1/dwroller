import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import logger, { debug, info, warn, logApiCall, logApiError, logUserAction } from '../utils/logger';

const STORAGE_SHOP_AUTHED = 'dw:shop:authedPlayer';
const STORAGE_SHOP_PLAYERS = 'dw:shop:players:v1';

const RANK_ORDER = ['None','Respected','Distinguished','Famed','Hero'];

const GM_PASSWORD = 'bongo';

function safeGet(key) {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function safeSet(key, val) { try { if (typeof window !== 'undefined' && 'localStorage' in window) window.localStorage.setItem(key, JSON.stringify(val)) } catch {} }

const CHARACTERISTICS = [
  { key: 'ws', label: 'Weapon Skill (WS)' },
  { key: 'bs', label: 'Ballistic Skill (BS)' },
  { key: 's', label: 'Strength (S)' },
  { key: 't', label: 'Toughness (T)' },
  { key: 'ag', label: 'Agility (Ag)' },
  { key: 'int', label: 'Intelligence (Int)' },
  { key: 'per', label: 'Perception (Per)' },
  { key: 'wp', label: 'Will Power (WP)' },
  { key: 'fel', label: 'Fellowship (Fel)' },
]

// Updated default skills to Space Marine skills
const SKILLS = [
  'Acrobatics (Ag)', 'Awareness (Per)', 'Charm (Fel)', 'Climb (S)', 'Command (Fel)',
  'Common Lore (Int)', 'Deathwatch', 'Imperium', 'War', 'Dodge (Ag)',
  'Forbidden Lore (Int)', 'Xenos', 'Intimidate (S)', 'Literacy (Int)', 'Medicae (Int)',
  'Navigation (Int)', 'Pilot (Ag)', 'Scholastic Lore (Int)', 'Codex Astartes',
  'Scrutiny (Per)', 'Search (Per)', 'Silent Move (Ag)', 'Speak Language (Int)',
  'High Gothic', 'Low Gothic', 'Survival (Int)', 'Tactics (Int)', 'Tracking (Int)',
  'Tech-Use (Int)'
]

// Updated PlayerTab to clear data unless logged in and maintain session across all tabs
function PlayerTab({ 
  authedPlayer, 
  sessionId
}) {
  // helpers to read shop state
  function getShopAuthed() {
    return safeGet(STORAGE_SHOP_AUTHED) || '';
  }

  // UI state
  const [charName, setCharName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [gmOpen, setGmOpen] = useState(false);

  // Character sheet state
  const [gear, setGear] = useState([]);
  const [chapter, setChapter] = useState('');
  const [demeanour, setDemeanour] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [rank, setRank] = useState('');
  const [powerArmour, setPowerArmour] = useState('');
  const [description, setDescription] = useState('');
  const [pastEvent, setPastEvent] = useState('');
  const [personalDemeanour, setPersonalDemeanour] = useState('');
  const [characteristics, setCharacteristics] = useState({});
  const [skills, setSkills] = useState([]);
  const [weapons, setWeapons] = useState([]);
  const [armour, setArmour] = useState({});
  const [talents, setTalents] = useState('');
  const [psychic, setPsychic] = useState('');
  const [wounds, setWounds] = useState({});
  const [insanity, setInsanity] = useState({});
  const [movement, setMovement] = useState({});
  const [fate, setFate] = useState({});
  const [corruption, setCorruption] = useState(0);
  const [renown, setRenown] = useState('');
  const [xp, setXp] = useState(0);
  const [xpSpent, setXpSpent] = useState(0);
  const [notes, setNotes] = useState('');

  // State management
  const [players, setPlayers] = useState([]);

  // Debug state
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  
  // Initialize GM state is now handled in App.js

  // Debug log handling
  useEffect(() => {
    if (showLogs) setLogs(logger.getLogs({ limit: 200 }));
  }, [showLogs]);

  // Remove localStorage cache for players except after backend fetch

  const currentPlayer = useMemo(() => {
    if (!Array.isArray(players)) {
      warn('PlayerTab', 'players is not an array', players);
      return null;
    }
    const player = players.find(p => p.name === authedPlayer) || null;
    debug('PlayerTab', 'currentPlayer computed', { authedPlayer, playerFound: !!player });
    return player;
  }, [players, authedPlayer]);

  useEffect(() => {
    debug('PlayerTab', 'Data loading effect triggered', { authedPlayer, hasCurrentPlayer: !!currentPlayer });
    
    if (!authedPlayer || !currentPlayer) {
      // Clear form when not logged in or no player selected
      info('PlayerTab', 'Clearing form data - no auth or player');
      setCharName('');
      setPlayerName('');
      setGear([]);
      setChapter('');
      setDemeanour('');
      setSpeciality('');
      setRank('');
      setPowerArmour('');
      setDescription('');
      setPastEvent('');
      setPersonalDemeanour('');
      setCharacteristics({});
      setSkills([]);
      setWeapons([]);
      setArmour({});
      setTalents('');
      setPsychic('');
      setWounds({});
      setInsanity({});
      setMovement({});
      setFate({});
      setCorruption(0);
      setRenown('');
      setXp(0);
      setXpSpent(0);
      setNotes('');
      return;
    }

    // Load player data when logged in
    info('PlayerTab', 'Loading player data', { playerName: currentPlayer.name });
    const tabInfo = currentPlayer.tabInfo || {};
    
    setCharName(tabInfo.charName || '');
    setPlayerName(currentPlayer.name || '');
    setGear(tabInfo.gear || []);
    setChapter(tabInfo.chapter || '');
    setDemeanour(tabInfo.demeanour || '');
    setSpeciality(tabInfo.speciality || '');
    setRank(tabInfo.rank || '');
    setPowerArmour(tabInfo.powerArmour || '');
    setDescription(tabInfo.description || '');
    setPastEvent(tabInfo.pastEvent || '');
    setPersonalDemeanour(tabInfo.personalDemeanour || '');
    setCharacteristics(tabInfo.characteristics || {});
    setSkills(tabInfo.skills || []);
    setWeapons(tabInfo.weapons || []);
    setArmour(tabInfo.armour || {});
    setTalents(tabInfo.talents || '');
    setPsychic(tabInfo.psychic || '');
    setWounds(tabInfo.wounds || {});
    setInsanity(tabInfo.insanity || {});
    setMovement(tabInfo.movement || {});
    setFate(tabInfo.fate || {});
    setCorruption(tabInfo.corruption || 0);
    setRenown(tabInfo.renown || '');
    setXp(tabInfo.xp || 0);
    setXpSpent(tabInfo.xpSpent || 0);
    setNotes(tabInfo.notes || '');
    
    debug('PlayerTab', 'Player data loaded', { 
      charName: tabInfo.charName,
      rp: tabInfo.rp,
      gearCount: (tabInfo.gear || []).length 
    });
  }, [players, authedPlayer, currentPlayer]);

  function handleCharChange(key, value) {
    setCharacteristics(prev => ({ ...prev, [key]: value }));
  }

  function handleSkillChange(skill, level, value) {
    setSkills(prev => ({
      ...prev,
      [skill]: {
        ...prev[skill],
        [level]: value,
      },
    }));
  }

  function handleWeaponChange(idx, field, value) {
    setWeapons(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function handleArmourChange(part, value) {
    setArmour(prev => ({ ...prev, [part]: value }));
  }

  function updateGear(id, updates) {
    if (!isGMOrShopAuthed()) {
      flash('Only GM or shop can update gear');
      return;
    }
    setGear(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
  }

  function deleteGear(id) {
    setGear(prev => prev.filter(item => item.id !== id));
  }

  function addGearItem(name) {
    setGear(prev => [...prev, { id: Date.now(), name, qty: 1 }]);
  }

  function flash(msg) {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 2000);
  }

  // Fetch players from the database and only update localStorage after successful fetch
  useEffect(() => {
    async function fetchPlayers() {
      try {
        console.log('DEBUG: fetchPlayers called, isGMLoggedIn():', isGMLoggedIn(), 'authedPlayer:', authedPlayer);
        
        // If GM is logged in, always fetch all players from API
        if (isGMLoggedIn()) {
          console.log('DEBUG: GM is logged in, fetching all players from API');
          logApiCall('PlayerTab', 'GET', '/api/players');
          const response = await axios.get('/api/players', { headers: buildHeaders() });
          const data = response.data;
          console.log('DEBUG: GM API response:', data.length, 'players');
          if (!Array.isArray(data)) {
            warn('PlayerTab', '/api/players did not return an array', data);
            setPlayers([]);
          } else {
            info('PlayerTab', `Fetched ${data.length} players`);
            setPlayers(data);
            safeSet(STORAGE_SHOP_PLAYERS, data);
          }
          return;
        }

        console.log('DEBUG: Not GM, checking stored data');
        // For regular players, try to get stored player data from login first
        const storedPlayerData = safeGet('dw:shop:playerData');
        if (storedPlayerData && authedPlayer) {
          console.log('DEBUG: Using stored player data for regular user');
          // If we have stored player data and user is logged in, use it
          setPlayers([storedPlayerData]);
          return;
        }

        console.log('DEBUG: Fetching from API for regular user');
        logApiCall('PlayerTab', 'GET', '/api/players');
        const response = await axios.get('/api/players', { headers: buildHeaders() });
        const data = response.data;
        if (!Array.isArray(data)) {
          warn('PlayerTab', '/api/players did not return an array', data);
          setPlayers([]);
        } else {
          info('PlayerTab', `Fetched ${data.length} players`);
          setPlayers(data);
          safeSet(STORAGE_SHOP_PLAYERS, data);
        }
      } catch (apiError) {
        console.log('DEBUG: API error:', apiError);
        logApiError('PlayerTab', 'GET', '/api/players', apiError);
        // If API fails but we have stored player data, use that
        const storedPlayerData = safeGet('dw:shop:playerData');
        if (storedPlayerData && authedPlayer) {
          setPlayers([storedPlayerData]);
        } else {
          setPlayers([]);
        }
      }
    }
    fetchPlayers();
  // Add buildHeaders to dependencies since it's used in fetchPlayers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, gmOpen, authedPlayer]);

  // Update player data in the database
  async function updatePlayerData(updatedPlayer) {
    try {
      logApiCall('PlayerTab', 'PUT', `/api/players/${updatedPlayer.playerName}`, updatedPlayer);
      
      // Ensure we preserve existing tabInfo structure and merge new data correctly
      const existingPlayer = players.find(p => p.name === updatedPlayer.playerName);
      const tabInfo = {
        ...(existingPlayer?.tabInfo || {}),
        charName: updatedPlayer.charName,
        gear: updatedPlayer.gear,
        chapter: updatedPlayer.chapter,
        demeanour: updatedPlayer.demeanour,
        speciality: updatedPlayer.speciality,
        rank: updatedPlayer.rank,
        powerArmour: updatedPlayer.powerArmour,
        description: updatedPlayer.description,
        pastEvent: updatedPlayer.pastEvent,
        personalDemeanour: updatedPlayer.personalDemeanour,
        characteristics: updatedPlayer.characteristics,
        skills: updatedPlayer.skills,
        weapons: updatedPlayer.weapons,
        armour: updatedPlayer.armour,
        talents: updatedPlayer.talents,
        psychic: updatedPlayer.psychic,
        wounds: updatedPlayer.wounds,
        insanity: updatedPlayer.insanity,
        movement: updatedPlayer.movement,
        fate: updatedPlayer.fate,
        corruption: updatedPlayer.corruption,
        renown: updatedPlayer.renown,
        xp: updatedPlayer.xp,
        xpSpent: updatedPlayer.xpSpent,
        notes: updatedPlayer.notes,
        rp: updatedPlayer.rp
      };

      await axios.put(`/api/players/${updatedPlayer.playerName}`, { 
        name: updatedPlayer.playerName,
        tabInfo
      }, { headers: buildHeaders() });
      
      // Refetch players after update to get fresh data
      const response = await axios.get('/api/players', { headers: buildHeaders() });
      setPlayers(response.data);
      info('PlayerTab', 'Player data updated successfully', { playerName: updatedPlayer.playerName });
    } catch (apiError) {
      logApiError('PlayerTab', 'PUT', `/api/players/${updatedPlayer.playerName}`, apiError);
      flash('Failed to save player data');
    }
  }

  // Updated saveLocal to persist all player data including requisition points
  async function saveLocal() {
    logUserAction('PlayerTab', 'save_attempt', { authedPlayer, gmOpen });
    
    // In GM mode, allow saving for any selected player
    if (!authedPlayer && !gmOpen) {
      flash('Not logged in');
      warn('PlayerTab', 'Save blocked - not logged in');
      return;
    }
    // Determine which player to save
    let targetName = authedPlayer;
    if (gmOpen && playerName) {
      targetName = playerName;
    }
    if (!targetName) {
      flash('No player selected');
      warn('PlayerTab', 'Save blocked - no player selected');
      return;
    }
    
    const playerData = {
      playerName: targetName,
      charName,
      gear,
      chapter,
      demeanour,
      speciality,
      rank,
      powerArmour,
      description,
      pastEvent,
      personalDemeanour,
      characteristics,
      skills,
      weapons,
      armour,
      talents,
      psychic,
      wounds,
      insanity,
      movement,
      fate,
      corruption,
      renown,
      xp,
      xpSpent,
      notes,
      rp: (currentPlayer?.tabInfo?.rp) || 0,
    };
    
    info('PlayerTab', 'Saving player data', { targetName, dataKeys: Object.keys(playerData) });
    await updatePlayerData(playerData);
    flash('Player data saved');
  }

  // No per-tab logout; handled globally

  // Define shopAuthed for use in the component
  const shopAuthed = getShopAuthed();

  function isGMOrShopAuthed() {
    return isGMLoggedIn() || authedPlayer;
  }

  function isGMLoggedIn() {
    return authedPlayer === 'gm';
  }

  // GM session is now managed in App.js

  // GM unlock is now handled in App.js

  // GM delete handler
  async function gmDeletePlayer(name) {
    try {
      logApiCall('PlayerTab', 'DELETE', `/api/players/${name}`)
      await axios.delete(`/api/players/${name}`, { headers: buildHeaders() });
      const res = await axios.get('/api/players', { headers: buildHeaders() });
      setPlayers(res.data);
      flash('Player deleted');
    } catch (e) {
      logApiError('PlayerTab', 'DELETE', `/api/players/${name}`, e);
      flash('Failed to delete player');
    }
  }

  // Early return if not authenticated
  if (!authedPlayer && !gmOpen) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Player Tab</h1>
            <p className="text-slate-400">Please log in to access player data</p>
          </div>



        </div>
      </section>
    );
  }

  // GM management components
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

  function GmSetXP({ name, onSet }) {
    const [xp, setXp] = useState('')
    return (
      <div className="flex gap-2">
        <input className="rounded-xl border border-white/10 bg-white/10 px-2 py-1 text-sm w-20" type="number" placeholder="XP" value={xp} onChange={e=>setXp(e.target.value)} />
        <button onClick={()=>{ onSet(name, parseInt(xp||'0')); setXp('') }} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Set XP</button>
      </div>
    )
  }

  function GmSetXPSpent({ name, onSet }) {
    const [xpSpent, setXpSpent] = useState('')
    return (
      <div className="flex gap-2">
        <input className="rounded-xl border border-white/10 bg-white/10 px-2 py-1 text-sm w-20" type="number" placeholder="XP Spent" value={xpSpent} onChange={e=>setXpSpent(e.target.value)} />
        <button onClick={()=>{ onSet(name, parseInt(xpSpent||'0')); setXpSpent('') }} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Set XP Spent</button>
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

  // GM action handlers
  async function gmSetXP(name, xp) {
    console.log('PlayerTab: gmSetXP', { name, xp });
    const player = players.find(p => p.name === name)
    if (!player) {
      console.error('PlayerTab: player not found')
      flash('Player not found')
      return
    }
    try {
      const { data } = await axios.put(`/api/players/${name}`, {
        tabInfo: { ...player.tabInfo, xp }
      }, { headers: buildHeaders() })
      
      const res = await axios.get('/api/players', { headers: buildHeaders() });
      setPlayers(res.data);
      flash('XP updated')
    } catch (e) {
      console.error('PlayerTab: gmSetXP failed', e.response?.data || e.message)
      flash('Failed to update XP')
    }
  }

  async function gmSetXPSpent(name, xpSpent) {
    console.log('PlayerTab: gmSetXPSpent', { name, xpSpent });
    const player = players.find(p => p.name === name)
    if (!player) {
      console.error('PlayerTab: player not found')
      flash('Player not found')
      return
    }
    try {
      const { data } = await axios.put(`/api/players/${name}`, {
        tabInfo: { ...player.tabInfo, xpSpent }
      }, { headers: buildHeaders() })
      
      const res = await axios.get('/api/players', { headers: buildHeaders() });
      setPlayers(res.data);
      flash('XP Spent updated')
    } catch (e) {
      console.error('PlayerTab: gmSetXPSpent failed', e.response?.data || e.message)
      flash('Failed to update XP Spent')
    }
  }

  async function gmAddOrUpdatePlayer(name, rp, pw) {
    console.log('PlayerTab: gmAddOrUpdatePlayer', { name, rp, pwProvided: !!pw });
    try {
      logApiCall('PlayerTab', 'POST', '/api/players')
      const body = { name, rp, pw };
      const headers = buildHeaders();
      const resPost = await axios.post('/api/players', body, { headers });
      console.log('PlayerTab: gmAddOrUpdatePlayer POST response', resPost.status, resPost.data);
      const res = await axios.get('/api/players', { headers: buildHeaders() });
      setPlayers(res.data);
      flash('Player added/updated');
    } catch (e) {
      logApiError('PlayerTab', 'POST', '/api/players', e);
      console.error('PlayerTab: gmAddOrUpdatePlayer failed', e.response?.data || e.message);
      flash('Failed to add player');
    }
  }
  async function gmSetRP(name, rp) {
    console.log('PlayerTab: gmSetRP', { name, rp });
    try {
      logApiCall('PlayerTab', 'PUT', `/api/players/${name}/rp`);
      const headers = buildHeaders();
      
      // Get existing player data
      const existingPlayer = players.find(p => p.name === name);
      if (!existingPlayer) {
        throw new Error('Player not found');
      }
      
      // Create updated player data
      const playerData = {
        name: name,
        tabInfo: {
          ...(existingPlayer.tabInfo || {}),
          rp: parseInt(rp) || 0
        }
      };
      
      console.log('Updating player with:', playerData);
      await axios.put(`/api/players/${name}`, playerData, { headers });
      
      // Refetch players after update
      const res = await axios.get('/api/players', { headers: buildHeaders() });
      setPlayers(res.data);
      flash('RP updated');
    } catch (e) {
      logApiError('PlayerTab', 'PUT', `/api/players/${name}/rp`, e);
      console.error('PlayerTab: gmSetRP failed', e.response?.data || e.message);
      flash('Failed to set RP');
    }
  }
  async function gmSetRenown(name, renown) {
    console.log('PlayerTab: gmSetRenown', { name, renown });
    try {
      logApiCall('PlayerTab', 'PUT', `/api/players/${name}/renown`)
      const headers = buildHeaders();
      await axios.put(`/api/players/${name}`, { renown }, { headers });
      const res = await axios.get('/api/players', { headers: buildHeaders() });
      setPlayers(res.data);
      flash('Renown updated');
    } catch (e) {
      logApiError('PlayerTab', 'PUT', `/api/players/${name}/renown`, e);
      console.error('PlayerTab: gmSetRenown failed', e.response?.data || e.message);
      flash('Failed to set renown');
    }
  }
  async function gmResetPlayerPw(name, pw) {
    console.log('PlayerTab: gmResetPlayerPw', { name, pwProvided: !!pw });
    try {
      logApiCall('PlayerTab', 'PUT', `/api/players/${name}/pw`)
      const headers = buildHeaders();
      await axios.put(`/api/players/${name}`, { pw }, { headers });
      const res = await axios.get('/api/players', { headers: buildHeaders() });
      setPlayers(res.data);
      flash('Password reset');
    } catch (e) {
      logApiError('PlayerTab', 'PUT', `/api/players/${name}/pw`, e);
      console.error('PlayerTab: gmResetPlayerPw failed', e.response?.data || e.message);
      flash('Failed to reset password');
    }
  }



  // Added: helper to build request headers (session + GM secret when GM unlocked)
  function buildHeaders(extra = {}) {
    const headers = { 'x-session-id': sessionId || '' , ...extra };
    if (isGMLoggedIn()) {
      // Use the same GM_PASSWORD constant as in App.js
      headers['x-gm-secret'] = GM_PASSWORD;
    }
    return headers;
  }

  function refreshLogs() { setLogs(logger.getLogs({ limit: 200 })); }
  function clearLogs() { logger.clearLogs(); setLogs([]); }

  // No per-tab login/logout; handled globally

  // Early return if not authenticated
  if (!authedPlayer) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Player Tab</h1>
            <p className="text-slate-400">Please log in to access player data</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Character Name & Player Name */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 rounded-xl p-3 border border-white/10">
          <div>
            <label className="text-xs uppercase opacity-70">Character Name</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Player Name</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="text-sm opacity-80">
            {/* Login status now handled globally in header */}
            <span className="italic opacity-70">Character data auto-saves when logged in</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveLocal}
              className={`px-3 py-1.5 rounded-lg border border-white/10 text-sm ${(authedPlayer || gmOpen) ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-900/40 cursor-not-allowed'}`}
              disabled={!(authedPlayer || gmOpen)}
            >
              Save
            </button>
            <button onClick={() => setShowLogs(s => !s)} className="px-3 py-1.5 rounded-lg border border-white/10 text-sm bg-slate-700 hover:bg-slate-600">{showLogs ? 'Hide Logs' : 'Show Logs'}</button>
            {saveMsg && (
              <span className="ml-2 text-xs px-2 py-1 rounded bg-white/10 border border-white/10">
                {saveMsg}
              </span>
            )}
          </div>
        </div>
          <div>
            <label className="text-xs uppercase opacity-70">Chapter</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Chapter Demeanour</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={demeanour}
              onChange={(e) => setDemeanour(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Speciality</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={speciality}
              onChange={(e) => setSpeciality(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Rank</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Power Armour History</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={powerArmour}
              onChange={(e) => setPowerArmour(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Description</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Past Event</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={pastEvent}
              onChange={(e) => setPastEvent(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Personal Demeanour</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={personalDemeanour}
              onChange={(e) => setPersonalDemeanour(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          {/* GM Panel toggle only shown for GM user */}
          {isGMLoggedIn() && (
            <div className="col-span-4 flex justify-end mt-4">
              <button
                onClick={() => setGmOpen(!gmOpen)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 border border-white/10 text-sm"
              >
                {gmOpen ? 'Close GM Panel' : 'Open GM Panel'}
              </button>
            </div>
          )}
        </div>

        {/* Requisition Points Display */}
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
          <div className="text-lg font-medium">Requisition Points</div>
          <div className="text-base">
            Current RP: <span className="font-semibold text-xl text-amber-400">{currentPlayer?.tabInfo?.rp || '0'}</span>
          </div>
          {/* Only show for GMs */}
          {isGMLoggedIn() && (
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-24 rounded border border-white/10 bg-white/10 px-2 py-1"
                  placeholder="RP"
                  defaultValue={currentPlayer?.tabInfo?.rp || 0}
                  onChange={(e) => {
                    const newRP = parseInt(e.target.value || '0', 10);
                    gmSetRP(currentPlayer.name, newRP);
                  }}
                />
                <button
                  onClick={() => {
                    const currentRP = currentPlayer?.tabInfo?.rp || 0;
                    gmSetRP(currentPlayer.name, currentRP + 1);
                  }}
                  className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500"
                >
                  +1 RP
                </button>
                <button
                  onClick={() => {
                    const currentRP = currentPlayer?.tabInfo?.rp || 0;
                    if (currentRP > 0) {
                      gmSetRP(currentPlayer.name, currentRP - 1);
                    }
                  }}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500"
                >
                  -1 RP
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Characteristics */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="font-semibold mb-2">Characteristics</div>
          <div className="grid grid-cols-2 md:grid-cols-9 gap-2">
            {CHARACTERISTICS.map(c => (
              <div key={c.key} className="flex flex-col items-center">
                <label className="text-xs opacity-70 mb-1">{c.label}</label>
                <input type="number" className="w-16 text-center text-lg rounded border border-white/10 bg-white/10 px-2 py-1" value={characteristics[c.key]} onChange={e=>handleCharChange(c.key, parseInt(e.target.value||'0'))} />
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="font-semibold mb-2">Skills</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SKILLS.map(skill => (
              <div key={skill} className="flex items-center gap-2">
                <span className="text-xs min-w-[120px]">{skill}</span>
                <input type="checkbox" checked={!!skills[skill]?.trained} onChange={e => handleSkillChange(skill, 'trained', e.target.checked)} />
                <input type="checkbox" checked={!!skills[skill]?.plus10} onChange={e => handleSkillChange(skill, 'plus10', e.target.checked)} />
                <input type="checkbox" checked={!!skills[skill]?.plus20} onChange={e => handleSkillChange(skill, 'plus20', e.target.checked)} />
              </div>
            ))}
          </div>
        </div>

        {/* Space Marine Abilities */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="font-semibold mb-2">Space Marine Abilities</div>
          <div className="text-xs opacity-80">
            Secondary Heart, Larraman’s Organ, Catalepsean Node, Preomnor, Omophagea, Multi-lung, Sus-an Membrane, Oolitic Kidney, Neuroglottis, Mucranoid, Betcher’s Gland, Progenoid Glands, Melanochrome, Occulobe, Lyman’s Ear
          </div>
        </div>

        {/* Gear Section */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="font-semibold text-lg mb-4 flex items-center justify-between">
            <span>Assigned Gear</span>
            {isGMOrShopAuthed() && (
              <button
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm"
                onClick={() => addGearItem('')}
              >
                Add New Item
              </button>
            )}
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-slate-400 pb-2 border-b border-white/10">
              <div className="col-span-5">Item Name</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-3">Notes</div>
              <div className="col-span-2">Actions</div>
            </div>
            
            {/* Gear Items */}
            {gear.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-center bg-white/5 rounded-lg p-2">
                <input
                  className="col-span-5 rounded border border-white/10 bg-white/10 px-3 py-2"
                  placeholder="Item name"
                  value={item.name || ''}
                  onChange={(e) => updateGear(item.id, { name: e.target.value })}
                  disabled={!isGMOrShopAuthed()}
                />
                <input
                  type="number"
                  className="col-span-2 rounded border border-white/10 bg-white/10 px-3 py-2"
                  placeholder="Qty"
                  value={item.qty || 1}
                  onChange={(e) => updateGear(item.id, { qty: parseInt(e.target.value) || 1 })}
                  disabled={!isGMOrShopAuthed()}
                  min="1"
                />
                <input
                  className="col-span-3 rounded border border-white/10 bg-white/10 px-3 py-2"
                  placeholder="Add notes..."
                  value={item.note || ''}
                  onChange={(e) => updateGear(item.id, { note: e.target.value })}
                  disabled={!isGMOrShopAuthed()}
                />
                <div className="col-span-2 flex gap-2">
                  <button
                    className="rounded px-3 py-2 bg-amber-600 hover:bg-amber-500 flex-1"
                    onClick={() => updateGear(item.id, { qty: (item.qty || 1) + 1 })}
                    disabled={!isGMOrShopAuthed()}
                  >
                    +
                  </button>
                  <button
                    className="rounded px-3 py-2 bg-rose-600 hover:bg-rose-500 flex-1"
                    onClick={() => {
                      const newQty = (item.qty || 1) - 1;
                      if (newQty <= 0) {
                        deleteGear(item.id);
                      } else {
                        updateGear(item.id, { qty: newQty });
                      }
                    }}
                    disabled={!isGMOrShopAuthed()}
                  >
                    -
                  </button>
                </div>
              </div>
            ))}
            
            {/* Empty State */}
            {gear.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No gear assigned yet.
                {isGMOrShopAuthed() && (
                  <div className="mt-2">
                    <button
                      className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-sm"
                      onClick={() => addGearItem('')}
                    >
                      Add First Item
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Weapons & Armour */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="font-semibold mb-2">Weapons</div>
            {[0,1,2].map(idx => (
              <div key={idx} className="mb-2 border-b border-white/10 pb-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-1">
                  <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Name" value={weapons[idx]?.name||''} onChange={e=>handleWeaponChange(idx,'name',e.target.value)} />
                  <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Class" value={weapons[idx]?.class||''} onChange={e=>handleWeaponChange(idx,'class',e.target.value)} />
                  <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Damage" value={weapons[idx]?.damage||''} onChange={e=>handleWeaponChange(idx,'damage',e.target.value)} />
                  <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Type" value={weapons[idx]?.type||''} onChange={e=>handleWeaponChange(idx,'type',e.target.value)} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-1">
                  <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Pen" value={weapons[idx]?.pen||''} onChange={e=>handleWeaponChange(idx,'pen',e.target.value)} />
                  <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Range" value={weapons[idx]?.range||''} onChange={e=>handleWeaponChange(idx,'range',e.target.value)} />
                  <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="RoF" value={weapons[idx]?.rof||''} onChange={e=>handleWeaponChange(idx,'rof',e.target.value)} />
                  <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Clip" value={weapons[idx]?.clip||''} onChange={e=>handleWeaponChange(idx,'clip',e.target.value)} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-1">
                  <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Rld" value={weapons[idx]?.rld||''} onChange={e=>handleWeaponChange(idx,'rld',e.target.value)} />
                  <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Special Rules" value={weapons[idx]?.special||''} onChange={e=>handleWeaponChange(idx,'special',e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="font-semibold mb-2">Armour</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Head" value={armour.head} onChange={e=>handleArmourChange('head',e.target.value)} />
              <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Body" value={armour.body} onChange={e=>handleArmourChange('body',e.target.value)} />
              <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Right Arm" value={armour.ra} onChange={e=>handleArmourChange('ra',e.target.value)} />
              <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Left Arm" value={armour.la} onChange={e=>handleArmourChange('la',e.target.value)} />
              <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Right Leg" value={armour.rl} onChange={e=>handleArmourChange('rl',e.target.value)} />
              <input className="rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Left Leg" value={armour.ll} onChange={e=>handleArmourChange('ll',e.target.value)} />
            </div>
            <div className="mt-2">
              <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1" placeholder="Additions/Notes" value={armour.additions} onChange={e=>handleArmourChange('additions',e.target.value)} />
            </div>
          </div>
        </div>

        {/* Talents, Psychic Powers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="font-semibold mb-2">Talents & Traits</div>
            <textarea className="w-full h-32 rounded border border-white/10 bg-white/10 px-2 py-1" value={talents} onChange={e=>setTalents(e.target.value)} />
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="font-semibold mb-2">Psychic Powers</div>
            <textarea className="w-full h-32 rounded border border-white/10 bg-white/10 px-2 py-1" value={psychic} onChange={e=>setPsychic(e.target.value)} />
          </div>
        </div>

        {/* Wounds, Insanity, Movement, Fate, Corruption, Renown, XP */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-white/5 rounded-xl p-3 border border-white/10">
          <div>
            <label className="text-xs uppercase opacity-70">Wounds</label>
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1 mb-1" type="number" placeholder="Total" value={wounds.total} onChange={e=>setWounds(w=>({...w,total:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1 mb-1" type="number" placeholder="Current" value={wounds.current} onChange={e=>setWounds(w=>({...w,current:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1" type="number" placeholder="Fatigue" value={wounds.fatigue} onChange={e=>setWounds(w=>({...w,fatigue:parseInt(e.target.value||'0')}))} />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Insanity</label>
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1 mb-1" type="number" placeholder="Current" value={insanity.current} onChange={e=>setInsanity(i=>({...i,current:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1 mb-1" type="number" placeholder="Battle Fatigue" value={insanity.battleFatigue} onChange={e=>setInsanity(i=>({...i,battleFatigue:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1" type="number" placeholder="Primarch's Curse" value={insanity.primarchsCurse} onChange={e=>setInsanity(i=>({...i,primarchsCurse:parseInt(e.target.value||'0')}))} />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Movement</label>
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1 mb-1" type="number" placeholder="Half" value={movement.half} onChange={e=>setMovement(m=>({...m,half:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1 mb-1" type="number" placeholder="Charge" value={movement.charge} onChange={e=>setMovement(m=>({...m,charge:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1" type="number" placeholder="Full" value={movement.full} onChange={e=>setMovement(m=>({...m,full:parseInt(e.target.value||'0')}))} />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Fate</label>
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1 mb-1" type="number" placeholder="Total" value={fate.total} onChange={e=>setFate(f=>({...f,total:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1" type="number" placeholder="Current" value={fate.current} onChange={e=>setFate(f=>({...f,current:parseInt(e.target.value||'0')}))} />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Corruption</label>
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1" type="number" placeholder="Current" value={corruption} onChange={e=>setCorruption(parseInt(e.target.value||'0'))} />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Renown</label>
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1 mb-1" value={renown} onChange={e=>setRenown(e.target.value)} />
            <label className="text-xs uppercase opacity-70">XP</label>
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1 mb-1" type="number" value={xp} onChange={e=>setXp(parseInt(e.target.value||'0'))} />
            <label className="text-xs uppercase opacity-70">XP Spent</label>
            <input className="w-full rounded border border-white/10 bg-white/10 px-2 py-1" type="number" value={xpSpent} onChange={e=>setXpSpent(parseInt(e.target.value||'0'))} />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="font-semibold mb-2">Notes</div>
          <textarea className="w-full h-24 rounded border border-white/10 bg-white/10 px-2 py-1" value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>

        {/* GM Panel - Player Management */}
        {isGMLoggedIn() && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 mt-4">
            <div className="font-semibold text-lg mb-4">Player Management</div>
            
            {/* Add/Update Player */}
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Add or Update Player</div>
              <GmAddPlayer onAdd={gmAddOrUpdatePlayer} />
            </div>

            {/* Set RP */}
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Set Requisition Points (RP)</div>
              {players.map(player => (
                <div key={player.name} className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{player.name} (Current: {player.tabInfo?.rp || 0} RP)</span>
                  <GmSetRP name={player.name} onSet={gmSetRP} />
                </div>
              ))}
            </div>

            {/* Set XP */}
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Set Experience Points (XP)</div>
              {players.map(player => (
                <div key={player.name} className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{player.name} (Total XP: {player.tabInfo?.xp || 0}, Spent: {player.tabInfo?.xpSpent || 0})</span>
                  <div className="flex gap-2">
                    <GmSetXP name={player.name} onSet={gmSetXP} />
                    <GmSetXPSpent name={player.name} onSet={gmSetXPSpent} />
                  </div>
                </div>
              ))}
            </div>

            {/* Set Renown */}
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Set Renown</div>
              {players.map(player => (
                <div key={player.name} className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{player.name}</span>
                  <GmSetRenown name={player.name} value={player.renown} onSet={gmSetRenown} />
                </div>
              ))}
            </div>

            {/* Reset Password */}
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Reset Password</div>
              {players.map(player => (
                <div key={player.name} className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{player.name}</span>
                  <GmResetPW name={player.name} onReset={gmResetPlayerPw} />
                </div>
              ))}
            </div>

            {/* Delete Player */}
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Delete Player</div>
              {players.map(player => (
                <div key={player.name} className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{player.name}</span>
                  <button onClick={() => gmDeletePlayer(player.name)} className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-500">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In-app log panel */}
        {showLogs && (
          <div className="mt-4 bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Client Logs (latest)</div>
              <div className="flex gap-2">
                <button onClick={refreshLogs} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Refresh</button>
                <button onClick={clearLogs} className="text-xs px-2 py-1 rounded bg-rose-600 hover:bg-rose-500">Clear</button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto text-xs font-mono">
              {logs.length === 0 && <div className="opacity-70">No logs</div>}
              {logs.map(l => (
                <div key={l.id} className="mb-1 border-b border-white/5 pb-1">
                  <div className="text-xs opacity-80">{l.timestamp} <span className="uppercase">{l.level}</span> <span className="opacity-60">[{l.component}]</span></div>
                  <div className="text-sm">{l.message}</div>
                  {l.data && <pre className="text-xs mt-1 whitespace-pre-wrap">{l.data}</pre>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default PlayerTab;
