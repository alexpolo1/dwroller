import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import logger, { debug, info, warn, logApiCall, logApiError, logUserAction } from '../utils/logger';
import { Tooltip } from './DeathwatchRoller';
import { XPBar, XPSummary } from './XPBar';

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
  const [skills, setSkills] = useState({});
  const [weapons, setWeapons] = useState([]);
  const [armour, setArmour] = useState({});
  const [talents, setTalents] = useState('');
  const [psychic, setPsychic] = useState('');
  const [picture, setPicture] = useState('');
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

  // Ability descriptions (used as hover tooltips)
  const SPACE_MARINE_ABILITIES = [
    { name: 'Secondary Heart', desc: 'Once per long rest, when reduced to 0 Wounds you remain at 1 Wound instead of falling unconscious (stunned 1 round).' },
    { name: "Larraman's Organ", desc: 'When stabilised or treated with basic medicae, regain an extra 1–3 Wounds (GM roll) or gain +10 to recovery checks.' },
    { name: 'Catalepsean Node', desc: 'Ignore penalties from lack of sleep for ~48 hours and reduce exhaustion effects; can grant allies advantage on vigilance checks during extended watches.' },
    { name: 'Preomnor', desc: 'Strong bonus to toxin-resistance tests (GM: auto-success or +20) and halve duration/effect of ingested poisons.' },
    { name: 'Omophagea', desc: 'On consuming a biological sample (GM permission), gain a one-time clue or +10 to lore/identification checks related to that subject.' },
    { name: 'Multi-lung', desc: 'Ignore breathing penalties in toxic/low-oxygen environments and avoid short-term inhalation damage.' },
    { name: 'Sus-an Membrane', desc: 'Can enter suspended animation to avoid bleeding out when gravely wounded; buys time for evacuation/treatment.' },
    { name: 'Oolitic Kidney', desc: 'Reduce toxin damage/effects by half once per exposure or gain advantage on resisting chemical effects.' },
    { name: 'Neuroglottis', desc: 'Automatic/strong bonus to checks identifying substances by taste; +10 to Tracking vs a target you have tasted.' },
    { name: 'Mucranoid', desc: 'Small resistance to disease and contaminants; +10 on disease-resistance and recovery rolls.' },
    { name: "Betcher's Gland", desc: 'One-use close toxin/venom attack per rest or apply a minor toxin effect on a successful melee strike (GM adjudication).' },
    { name: 'Progenoid Glands', desc: 'Store genetic material for Chapter preservation; may enable long-term resurrection rituals (GM process).' },
    { name: 'Melanochrome', desc: '+10 or advantage to perception in varied lighting and camouflage detection.' },
    { name: 'Occulobe', desc: 'Ignore low-light penalties; see in darkness to short range.' },
    { name: "Lyman's Ear", desc: 'Advantage on hearing/perception checks and ability to detect faint sounds.' }
  ];

  const POWER_ARMOUR_ABILITIES = [
    { name: 'Servo-Augmented Musculature', desc: '+20 Strength while wearing Power Armour.' },
    { name: 'Auto-senses', desc: 'Dark sight; immune to Photon Flash and Stun Grenades; Called Shots are Half Actions; +10 to sight and hearing Awareness Tests (stacks with Heightened Senses).' },
    { name: 'Built-in Vox Link', desc: 'Integrated communications — no external vox gear required.' },
    { name: 'Built-in Magboots', desc: 'Grip in zero-G or slippery conditions; avoid slipping/falling penalties.' },
    { name: 'Nutrient Recycling', desc: 'Operate up to two weeks without resupply.' },
    { name: 'Recoil Suppression', desc: 'May fire Basic weapons one-handed without penalty while in Power Armour.' },
    { name: 'Black Carapace / Size: Hulking', desc: 'Large frame, but Black Carapace prevents enemies gaining a size-based bonus to hit you while in Power Armour.' },
    { name: 'Poor Manual Dexterity', desc: 'Delicate tasks suffer a −10 penalty unless using Space Marine-specific tools.' },
    { name: 'Osmotic Gill Life Sustainer', desc: 'Extended underwater/contaminated atmosphere operation support.' }
  ];
  
  // Initialize GM state is now handled in App.js

  // Debug log handling
  useEffect(() => {
    if (showLogs) setLogs(logger.getLogs({ limit: 200 }));
  }, [showLogs]);

  // GM helpers (define early so hooks using them can call safely)
  const isGMLoggedIn = useCallback(() => authedPlayer === 'gm', [authedPlayer]);
  const isGMOrShopAuthed = useCallback(() => isGMLoggedIn() || !!authedPlayer, [isGMLoggedIn, authedPlayer]);

  // Remove localStorage cache for players except after backend fetch

  const currentPlayer = useMemo(() => {
    if (!Array.isArray(players)) {
      warn('PlayerTab', 'players is not an array', players);
      return null;
    }
  // If GM panel is open and a playerName is provided, show that player's sheet.
  const lookupName = (isGMLoggedIn() && playerName) ? playerName : authedPlayer;
  const player = players.find(p => p.name === lookupName) || null;
  debug('PlayerTab', 'currentPlayer computed', { authedPlayer, playerName, lookupName, playerFound: !!player });
    return player;
  }, [players, authedPlayer, playerName, isGMLoggedIn]);

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
  setSkills({});
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
  setSkills(normalizeIncomingSkills(tabInfo.skills || []));
    setWeapons(tabInfo.weapons || []);
    setArmour(tabInfo.armour || {});
  setPicture(tabInfo.picture || tabInfo.avatar || '');
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

  async function uploadAvatarFile(file) {
    if (!file) return;
    // limit size on client too (200KB)
    const MAX_BYTES = 200 * 1024;
    if (file.size > MAX_BYTES) { flash('File too large (max 200KB)'); return; }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      try {
        const resp = await axios.post(`/api/players/${currentPlayer.name}/avatar`, { filename: file.name, data: dataUrl }, { headers: buildHeaders({'Content-Type':'application/json'}) });
        // Update players list with returned data
        const updated = resp.data;
        setPlayers(prev => prev.map(p => p.name === updated.name ? updated : p));
        setPicture(updated.tabInfo?.picture || '');
        flash('Avatar uploaded');
      } catch (err) {
        console.error('Avatar upload failed', err.response?.data || err.message);
        flash('Avatar upload failed');
      }
    };
    reader.readAsDataURL(file);
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
          console.log('DEBUG: GM API response:', response.data.length, 'players');
          if (!Array.isArray(response.data)) {
            warn('PlayerTab', '/api/players did not return an array', response.data);
            setPlayers([]);
          } else {
            info('PlayerTab', `Fetched ${response.data.length} players`);
            setPlayers(response.data);
            safeSet(STORAGE_SHOP_PLAYERS, response.data);
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
        if (!Array.isArray(response.data)) {
          warn('PlayerTab', '/api/players did not return an array', response.data);
          setPlayers([]);
        } else {
          info('PlayerTab', `Fetched ${response.data.length} players`);
          setPlayers(response.data);
          safeSet(STORAGE_SHOP_PLAYERS, response.data);
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
  skills: serializeSkillsForSave(updatedPlayer.skills),
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
  picture: updatedPlayer.picture,
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
  picture,
      rp: (currentPlayer?.tabInfo?.rp) || 0,
    };
    
    info('PlayerTab', 'Saving player data', { targetName, dataKeys: Object.keys(playerData) });
    await updatePlayerData(playerData);
    flash('Player data saved');
  }

  // No per-tab logout; handled globally

  // Define shopAuthed for use in the component
  const shopAuthed = getShopAuthed();

  // Stable callbacks defined earlier

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
    const [pregens, setPregens] = useState([])
    const [usePregen, setUsePregen] = useState(false)

    useEffect(()=>{
      (async ()=>{
        try {
          const res = await axios.get('/api/players/admin/pregens', { headers: buildHeaders() });
          setPregens(res.data || []);
        } catch (e) {
          console.warn('Failed to load pregens', e);
        }
      })();
    },[])
    return (
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        <div className="flex gap-2">
          <input className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 flex-1" placeholder="Player name" value={name} onChange={e=>setName(e.target.value)} />
          <select className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" value={usePregen ? name : ''} onChange={e=>{ setUsePregen(!!e.target.value); setName(e.target.value); }}>
            <option value="">-- pregens --</option>
            {pregens.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <input className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" type="number" min={0} value={rp} onChange={e=>setRp(parseInt(e.target.value||'0'))} />
        <input className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2" type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} />
        <button onClick={()=>{ onAdd(name, rp, pw); setName(''); setRp(10); setPw('') }} className="rounded-xl px-3 py-2 bg-amber-600 hover:bg-amber-500">Add/Update</button>
        <div className="self-center text-xs opacity-70">Add or overwrite by name</div>
      </div>
    )
  }
  function GmSetRP({ name, onSet }) {
    const [rp, setRp] = useState('')
    return (
      <div className="flex gap-2">
        <input className="rounded-xl border border-slate-600 bg-slate-800 px-2 py-1 text-sm w-20" type="number" placeholder="RP" value={rp} onChange={e=>setRp(e.target.value)} />
        <button onClick={()=>{ onSet(name, parseInt(rp||'0')); setRp('') }} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Set RP</button>
      </div>
    )
  }

  function GmSetXP({ name, onSet }) {
    const [xp, setXp] = useState('')
    return (
      <div className="flex gap-2">
        <input className="rounded-xl border border-slate-600 bg-slate-800 px-2 py-1 text-sm w-20" type="number" placeholder="XP" value={xp} onChange={e=>setXp(e.target.value)} />
        <button onClick={()=>{ onSet(name, parseInt(xp||'0')); setXp('') }} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Set XP</button>
      </div>
    )
  }

  function GmSetXPSpent({ name, onSet }) {
    const [xpSpent, setXpSpent] = useState('')
    return (
      <div className="flex gap-2">
        <input className="rounded-xl border border-slate-600 bg-slate-800 px-2 py-1 text-sm w-20" type="number" placeholder="XP Spent" value={xpSpent} onChange={e=>setXpSpent(e.target.value)} />
        <button onClick={()=>{ onSet(name, parseInt(xpSpent||'0')); setXpSpent('') }} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Set XP Spent</button>
      </div>
    )
  }

  function GmSetRenown({ name, value, onSet }) {
    const [renown, setRenown] = useState(value)
    return (
      <div className="flex gap-2">
        <select className="rounded-xl border border-slate-600 bg-slate-800 px-2 py-1 text-sm w-20" value={renown} onChange={e=>setRenown(e.target.value)}>
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
        <input className="rounded-xl border border-slate-600 bg-slate-800 px-2 py-1 text-sm" type="password" placeholder="New PW" value={pw} onChange={e=>setPw(e.target.value)} />
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
      await axios.put(`/api/players/${name}`, {
        tabInfo: { ...player.tabInfo, xp }
      }, { headers: buildHeaders() });
      
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
      await axios.put(`/api/players/${name}`, {
        tabInfo: { ...player.tabInfo, xpSpent }
      }, { headers: buildHeaders() });
      
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

  // Skills normalization helpers
  function normalizeIncomingSkills(raw) {
    // Backend stores skills as array of names; frontend expects an object map
    if (Array.isArray(raw)) {
      const obj = {};
      for (const s of raw) {
        if (!s) continue;
        obj[s] = { trained: true, plus10: false, plus20: false };
      }
      return obj;
    }
    if (raw && typeof raw === 'object') return raw;
    return {};
  }

  function serializeSkillsForSave(skillsObj) {
    // Convert frontend skills object back to an array of skill names for backend
    if (Array.isArray(skillsObj)) return skillsObj.filter(Boolean);
    if (!skillsObj || typeof skillsObj !== 'object') return [];
    const out = [];
    for (const [k, v] of Object.entries(skillsObj)) {
      if (!k) continue;
      if (v && (v.trained || v.plus10 || v.plus20)) out.push(k);
    }
    return out;
  }

  function refreshLogs() { setLogs(logger.getLogs({ limit: 200 })); }
  function clearLogs() { logger.clearLogs(); setLogs([]); }


  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Avatar header (standalone) */}
        <div className="flex flex-col items-center bg-slate-800 rounded-xl p-4 border border-slate-600">
          <div className="w-full flex justify-center">
            <img src={picture || '/logo192.png'} alt="avatar" className="w-36 h-36 md:w-48 md:h-48 rounded-full object-cover border-4 border-slate-600 shadow-lg" />
          </div>
          <div className="mt-3 text-center">
            <div className="text-lg font-semibold">{charName || currentPlayer?.tabInfo?.charName || 'Unknown'}</div>
            <div className="text-sm text-slate-400">{playerName || currentPlayer?.name}</div>
          </div>
          {(isGMOrShopAuthed() || authedPlayer === currentPlayer?.name) && (
            <div className="mt-3 text-xs text-slate-400 text-center">
              <div className="flex flex-col items-center">
                <input type="file" accept="image/*" onChange={e=>uploadAvatarFile(e.target.files?.[0])} />
                <div className="mt-1">Max 200KB. Supported: png/jpg/gif</div>
                <input className="w-64 md:w-96 mx-auto mt-2 rounded border border-slate-600 bg-slate-800 px-2 py-1" value={picture} onChange={e=>setPicture(e.target.value)} placeholder="Or paste image URL" />
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="text-sm opacity-80">
            {/* Login status now handled globally in header */}
            <span className="italic opacity-70">Character data auto-saves when logged in</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveLocal}
              className={`px-3 py-1.5 rounded-lg border border-slate-600 text-sm ${(authedPlayer || gmOpen) ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-800 cursor-not-allowed'}`}
              disabled={!(authedPlayer || gmOpen)}
            >
              Save
            </button>
            <button onClick={() => setShowLogs(s => !s)} className="px-3 py-1.5 rounded-lg border border-slate-600 text-sm bg-slate-700 hover:bg-slate-600">{showLogs ? 'Hide Logs' : 'Show Logs'}</button>
            {saveMsg && (
              <span className="ml-2 text-xs px-2 py-1 rounded bg-slate-800 border border-slate-600">
                {saveMsg}
              </span>
            )}
          </div>
        </div>
          <div>
            <label className="text-xs uppercase opacity-70">Chapter</label>
            <input
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Chapter Demeanour</label>
            <input
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1"
              value={demeanour}
              onChange={(e) => setDemeanour(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Speciality</label>
            <input
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1"
              value={speciality}
              onChange={(e) => setSpeciality(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Rank</label>
            <input
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Power Armour History</label>
            <input
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1"
              value={powerArmour}
              onChange={(e) => setPowerArmour(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Description</label>
            <input
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Past Event</label>
            <input
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1"
              value={pastEvent}
              onChange={(e) => setPastEvent(e.target.value)}
              disabled={!(shopAuthed || gmOpen)}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Personal Demeanour</label>
            <input
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1"
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
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 border border-slate-600 text-sm"
              >
                {gmOpen ? 'Close GM Panel' : 'Open GM Panel'}
              </button>
            </div>
          )}
        </div>

        {/* Requisition Points Display */}
        <div className="rounded-xl border border-slate-600 bg-slate-900 p-3 space-y-2">
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
                  className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1"
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

        {/* Experience Points Display - Minecraft-style XP Bar */}
        <div className="rounded-xl border border-slate-600 bg-slate-900 p-3 space-y-2">
          <div className="text-lg font-medium">Experience Points (XP)</div>
          
          {/* XP Bar */}
          <div className="space-y-1">
            <XPBar 
              currentXP={currentPlayer?.tabInfo?.xp || 0}
              xpSpent={currentPlayer?.tabInfo?.xpSpent || 0}
              thresholdXP={500}
              showLabel={true}
              compact={false}
            />
            <div className="text-xs text-slate-400">
              1 Characteristic = 500 XP | 1 Skill Rank = 100 XP | 1 Talent = 50 XP
            </div>
          </div>

          {/* XP Summary */}
          <div className="mt-3">
            <XPSummary 
              currentXP={currentPlayer?.tabInfo?.xp || 0}
              xpSpent={currentPlayer?.tabInfo?.xpSpent || 0}
              thresholdXP={500}
            />
          </div>

          {/* GM Controls */}
          {isGMLoggedIn() && (
            <div className="mt-4 space-y-2 border-t border-slate-600 pt-3">
              <div className="text-sm text-slate-300 font-medium">GM Controls</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs min-w-fit">Set Total XP:</span>
                  <GmSetXP name={currentPlayer?.name} onSet={gmSetXP} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs min-w-fit">Set Spent XP:</span>
                  <GmSetXPSpent name={currentPlayer?.name} onSet={gmSetXPSpent} />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const currentXP = currentPlayer?.tabInfo?.xp || 0;
                      gmSetXP(currentPlayer.name, currentXP + 100);
                    }}
                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs"
                  >
                    +100 XP
                  </button>
                  <button
                    onClick={() => {
                      const currentXP = currentPlayer?.tabInfo?.xp || 0;
                      gmSetXP(currentPlayer.name, currentXP + 200);
                    }}
                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs"
                  >
                    +200 XP
                  </button>
                  <button
                    onClick={() => {
                      const currentXP = currentPlayer?.tabInfo?.xp || 0;
                      if (currentXP > 0) {
                        gmSetXP(currentPlayer.name, Math.max(0, currentXP - 50));
                      }
                    }}
                    className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-xs"
                  >
                    -50 XP
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Characteristics */}
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
          <div className="font-semibold mb-2">Characteristics</div>
          <div className="grid grid-cols-2 md:grid-cols-9 gap-2">
            {CHARACTERISTICS.map(c => (
              <div key={c.key} className="flex flex-col items-center">
                <label className="text-xs opacity-70 mb-1">{c.label}</label>
                <input type="number" className="w-16 text-center text-lg rounded border border-slate-600 bg-slate-800 px-2 py-1" value={characteristics[c.key]} onChange={e=>handleCharChange(c.key, parseInt(e.target.value||'0'))} />
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
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

        {/* Space Marine Abilities - hover tooltips */}
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
          <div className="font-semibold mb-2">Space Marine Abilities</div>
            <div className="text-xs opacity-80 grid grid-cols-2 md:grid-cols-3 gap-2">
            {SPACE_MARINE_ABILITIES.map(a => (
              <div key={a.name} className="p-2 bg-slate-800 rounded flex items-center justify-between">
                <span className="mr-2">{a.name}</span>
                <Tooltip text={a.desc}><span className="inline-block w-5 h-5 text-center text-black bg-white rounded-full text-xs leading-5">?</span></Tooltip>
              </div>
            ))}
          </div>
        </div>

        {/* Power Armour Abilities - hover tooltips */}
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-600 mt-4">
          <div className="font-semibold mb-2">Power Armour Abilities (standard)</div>
          <div className="text-xs opacity-80 grid grid-cols-2 md:grid-cols-3 gap-2">
            {POWER_ARMOUR_ABILITIES.map(a => (
              <div key={a.name} className="p-2 bg-slate-800 rounded flex items-center justify-between">
                <span className="mr-2">{a.name}</span>
                <Tooltip text={a.desc}><span className="inline-block w-5 h-5 text-center text-black bg-white rounded-full text-xs leading-5">?</span></Tooltip>
              </div>
            ))}
          </div>
        </div>

        {/* Gear Section */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-600">
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
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-slate-400 pb-2 border-b border-slate-600">
              <div className="col-span-5">Item Name</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-3">Notes</div>
              <div className="col-span-2">Actions</div>
            </div>
            
            {/* Gear Items */}
            {gear.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-center bg-slate-800 rounded-lg p-2">
                <input
                  className="col-span-5 rounded border border-slate-600 bg-slate-800 px-3 py-2"
                  placeholder="Item name"
                  value={item.name || ''}
                  onChange={(e) => updateGear(item.id, { name: e.target.value })}
                  disabled={!isGMOrShopAuthed()}
                />
                <input
                  type="number"
                  className="col-span-2 rounded border border-slate-600 bg-slate-800 px-3 py-2"
                  placeholder="Qty"
                  value={item.qty || 1}
                  onChange={(e) => updateGear(item.id, { qty: parseInt(e.target.value) || 1 })}
                  disabled={!isGMOrShopAuthed()}
                  min="1"
                />
                <input
                  className="col-span-3 rounded border border-slate-600 bg-slate-800 px-3 py-2"
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
          <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
            <div className="font-semibold mb-2">Weapons</div>
            {[0,1,2].map(idx => (
              <div key={idx} className="mb-2 border-b border-slate-600 pb-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-1">
                  <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Name" value={weapons[idx]?.name||''} onChange={e=>handleWeaponChange(idx,'name',e.target.value)} />
                  <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Class" value={weapons[idx]?.class||''} onChange={e=>handleWeaponChange(idx,'class',e.target.value)} />
                  <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Damage" value={weapons[idx]?.damage||''} onChange={e=>handleWeaponChange(idx,'damage',e.target.value)} />
                  <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Type" value={weapons[idx]?.type||''} onChange={e=>handleWeaponChange(idx,'type',e.target.value)} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-1">
                  <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Pen" value={weapons[idx]?.pen||''} onChange={e=>handleWeaponChange(idx,'pen',e.target.value)} />
                  <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Range" value={weapons[idx]?.range||''} onChange={e=>handleWeaponChange(idx,'range',e.target.value)} />
                  <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="RoF" value={weapons[idx]?.rof||''} onChange={e=>handleWeaponChange(idx,'rof',e.target.value)} />
                  <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Clip" value={weapons[idx]?.clip||''} onChange={e=>handleWeaponChange(idx,'clip',e.target.value)} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-1">
                  <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Rld" value={weapons[idx]?.rld||''} onChange={e=>handleWeaponChange(idx,'rld',e.target.value)} />
                  <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Special Rules" value={weapons[idx]?.special||''} onChange={e=>handleWeaponChange(idx,'special',e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
            <div className="font-semibold mb-2">Armour</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Head" value={armour.head} onChange={e=>handleArmourChange('head',e.target.value)} />
              <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Body" value={armour.body} onChange={e=>handleArmourChange('body',e.target.value)} />
              <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Right Arm" value={armour.ra} onChange={e=>handleArmourChange('ra',e.target.value)} />
              <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Left Arm" value={armour.la} onChange={e=>handleArmourChange('la',e.target.value)} />
              <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Right Leg" value={armour.rl} onChange={e=>handleArmourChange('rl',e.target.value)} />
              <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Left Leg" value={armour.ll} onChange={e=>handleArmourChange('ll',e.target.value)} />
            </div>
            <div className="mt-2">
              <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Additions/Notes" value={armour.additions} onChange={e=>handleArmourChange('additions',e.target.value)} />
            </div>
          </div>
        </div>

        {/* Talents, Psychic Powers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
            <div className="font-semibold mb-2">Talents & Traits</div>
            <textarea className="w-full h-32 rounded border border-slate-600 bg-slate-800 px-2 py-1" value={talents} onChange={e=>setTalents(e.target.value)} />
          </div>
          <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
            <div className="font-semibold mb-2">Psychic Powers</div>
            <textarea className="w-full h-32 rounded border border-slate-600 bg-slate-800 px-2 py-1" value={psychic} onChange={e=>setPsychic(e.target.value)} />
          </div>
        </div>

        {/* Wounds, Insanity, Movement, Fate, Corruption, Renown, XP */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-slate-800 rounded-xl p-3 border border-slate-600">
          <div>
            <label className="text-xs uppercase opacity-70">Wounds</label>
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 mb-1" type="number" placeholder="Total" value={wounds.total} onChange={e=>setWounds(w=>({...w,total:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 mb-1" type="number" placeholder="Current" value={wounds.current} onChange={e=>setWounds(w=>({...w,current:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1" type="number" placeholder="Fatigue" value={wounds.fatigue} onChange={e=>setWounds(w=>({...w,fatigue:parseInt(e.target.value||'0')}))} />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Insanity</label>
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 mb-1" type="number" placeholder="Current" value={insanity.current} onChange={e=>setInsanity(i=>({...i,current:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 mb-1" type="number" placeholder="Battle Fatigue" value={insanity.battleFatigue} onChange={e=>setInsanity(i=>({...i,battleFatigue:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1" type="number" placeholder="Primarch's Curse" value={insanity.primarchsCurse} onChange={e=>setInsanity(i=>({...i,primarchsCurse:parseInt(e.target.value||'0')}))} />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Movement</label>
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 mb-1" type="number" placeholder="Half" value={movement.half} onChange={e=>setMovement(m=>({...m,half:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 mb-1" type="number" placeholder="Charge" value={movement.charge} onChange={e=>setMovement(m=>({...m,charge:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1" type="number" placeholder="Full" value={movement.full} onChange={e=>setMovement(m=>({...m,full:parseInt(e.target.value||'0')}))} />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Fate</label>
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 mb-1" type="number" placeholder="Total" value={fate.total} onChange={e=>setFate(f=>({...f,total:parseInt(e.target.value||'0')}))} />
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1" type="number" placeholder="Current" value={fate.current} onChange={e=>setFate(f=>({...f,current:parseInt(e.target.value||'0')}))} />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Corruption</label>
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1" type="number" placeholder="Current" value={corruption} onChange={e=>setCorruption(parseInt(e.target.value||'0'))} />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Renown</label>
            <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 mb-1" value={renown} onChange={e=>setRenown(e.target.value)} />
            <label className="text-xs uppercase opacity-70 mt-3 block">Experience Points</label>
            <div className="mb-3">
              <XPBar currentXP={xp} xpSpent={xpSpent} thresholdXP={500} showLabel={true} compact={false} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <label className="uppercase opacity-70 block">XP Total</label>
                <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1" type="number" value={xp} onChange={e=>setXp(parseInt(e.target.value||'0'))} />
              </div>
              <div>
                <label className="uppercase opacity-70 block">XP Spent</label>
                <input className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1" type="number" value={xpSpent} onChange={e=>setXpSpent(parseInt(e.target.value||'0'))} />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
          <div className="font-semibold mb-2">Notes</div>
          <textarea className="w-full h-24 rounded border border-slate-600 bg-slate-800 px-2 py-1" value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>

        {/* GM Panel - Player Management */}
        {isGMLoggedIn() && (
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-600 mt-4">
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

        {/* Player record timestamps */}
        <div className="mt-4 text-sm text-slate-400">
          <div>Created: <span className="text-xs text-slate-300">{currentPlayer?.createdAt ? new Date(currentPlayer.createdAt).toLocaleString() : '—'}</span></div>
          <div>Updated: <span className="text-xs text-slate-300">{currentPlayer?.updatedAt ? new Date(currentPlayer.updatedAt).toLocaleString() : '—'}</span></div>
        </div>

        {/* In-app log panel */}
        {showLogs && (
          <div className="mt-4 bg-slate-800 rounded-xl p-3 border border-slate-600">
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
                <div key={l.id} className="mb-1 border-b border-slate-600 pb-1">
                  <div className="text-xs opacity-80">{l.timestamp} <span className="uppercase">{l.level}</span> <span className="opacity-60">[{l.component}]</span></div>
                  <div className="text-sm">{l.message}</div>
                  {l.data && <pre className="text-xs mt-1 whitespace-pre-wrap">{l.data}</pre>}
                </div>
              ))}
            </div>
          </div>
          )}
      </section>
    );
}

export default PlayerTab;
