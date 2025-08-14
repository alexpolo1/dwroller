import { useState, useEffect, useMemo } from 'react'
import axios from 'axios';

const STORAGE_PLAYER = 'dw:player:v1'
const STORAGE_SHOP_AUTHED = 'dw:shop:authedPlayer'
const STORAGE_SHOP_PLAYERS = 'dw:shop:players:v1';


function safeGet(key) {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function safeSet(key, val) { try { if (typeof window !== 'undefined' && 'localStorage' in window) window.localStorage.setItem(key, JSON.stringify(val)) } catch {} }
function safeRemove(key) { try { if (typeof window !== 'undefined' && 'localStorage' in window) window.localStorage.removeItem(key) } catch {} }

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
function PlayerTab() {
  // helpers to read shop state
  function getShopAuthed() {
    return safeGet(STORAGE_SHOP_AUTHED) || '';
  }

  // UI state
  const init = safeGet(STORAGE_PLAYER) || {};
  const [charName, setCharName] = useState(init.charName || '');
  const [playerName, setPlayerName] = useState(init.playerName || '');
  const [shopAuthed, setShopAuthed] = useState(getShopAuthed());
  const [saveMsg, setSaveMsg] = useState('');

  const [gear, setGear] = useState(init.gear || []);
  const [chapter, setChapter] = useState(init.chapter || '');
  const [demeanour, setDemeanour] = useState(init.demeanour || '');
  const [speciality, setSpeciality] = useState(init.speciality || '');
  const [rank, setRank] = useState(init.rank || '');
  const [powerArmour, setPowerArmour] = useState(init.powerArmour || '');
  const [description, setDescription] = useState(init.description || '');
  const [pastEvent, setPastEvent] = useState(init.pastEvent || '');
  const [personalDemeanour, setPersonalDemeanour] = useState(init.personalDemeanour || '');
  const [characteristics, setCharacteristics] = useState(init.characteristics || {});
  const [skills, setSkills] = useState(init.skills || []);
  const [weapons, setWeapons] = useState(init.weapons || []);
  const [armour, setArmour] = useState(init.armour || {});
  const [talents, setTalents] = useState(init.talents || '');
  const [psychic, setPsychic] = useState(init.psychic || '');
  const [wounds, setWounds] = useState(init.wounds || {});
  const [insanity, setInsanity] = useState(init.insanity || {});
  const [movement, setMovement] = useState(init.movement || {});
  const [fate, setFate] = useState(init.fate || {});
  const [corruption, setCorruption] = useState(init.corruption || 0);
  const [renown, setRenown] = useState(init.renown || '');
  const [xp, setXp] = useState(init.xp || 0);
  const [xpSpent, setXpSpent] = useState(init.xpSpent || 0);
  const [notes, setNotes] = useState(init.notes || '');

  // Defined STORAGE_SHOP_PLAYERS and utilized setPlayers
  const [players, setPlayers] = useState(() => safeGet(STORAGE_SHOP_PLAYERS) || []);

  useEffect(() => {
    safeSet(STORAGE_SHOP_PLAYERS, players);
  }, [players]);

  const currentPlayer = useMemo(() => players.find(p => p.name === shopAuthed) || null, [players, shopAuthed]);

  useEffect(() => {
    if (!shopAuthed) {
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
      setSaveMsg('');
    }
  }, [shopAuthed]);

  useEffect(() => {
    if (shopAuthed) {
      const currentPlayer = players.find(p => p.name === shopAuthed);
      if (currentPlayer) {
        setGear(currentPlayer.inventory || []);
      }
    }
  }, [players, shopAuthed]);

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

  // Fetch players from the database
  useEffect(() => {
    async function fetchPlayers() {
      try {
        const response = await axios.get('/api/players');
        setPlayers(response.data);
      } catch (error) {
        console.error('Failed to fetch players:', error);
      }
    }
    fetchPlayers();
  }, []);

  // Update player data in the database
  async function updatePlayerData(updatedPlayer) {
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

  // Updated saveLocal to persist all player data including requisition points
  async function saveLocal() {
    if (!shopAuthed) {
      flash('Not logged in');
      return;
    }
    const playerData = {
      charName,
      playerName,
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
      rp: currentPlayer?.rp || 0,
    };
    await updatePlayerData(playerData);
    flash('Player data saved');
  }

  function logoutShop() {
    safeRemove(STORAGE_SHOP_AUTHED);
    setShopAuthed('');
    flash('Logged out');
  }

  // Added GM Panel button and Requisition Points display
  const [gmOpen, setGmOpen] = useState(false);
  const [playerPw, setPlayerPw] = useState('');

  function isGMOrShopAuthed() {
    return gmOpen || shopAuthed;
  }

  function isGMLoggedIn() {
    return gmOpen;
  }

  useEffect(() => {
    safeSet('dw:gm:session', gmOpen);
  }, [gmOpen]);

  async function handlePlayerLogin() {
    const player = players.find(p => p.name === playerName);
    if (player && player.pw === playerPw) {
      setShopAuthed(playerName);
      flash('Player logged in');
    } else {
      flash('Invalid player credentials');
    }
  }

  function handlePlayerLogout() {
    safeRemove(STORAGE_SHOP_AUTHED);
    setShopAuthed('');
    flash('Player logged out');
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Player Login Section */}
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
          <div className="text-xs uppercase opacity-70">Player Login</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select className="rounded-xl border border-white/10 bg-white/10 px-3 py-2" value={playerName} onChange={e => setPlayerName(e.target.value)}>
              <option value="">Select player</option>
              {players.map(p => (<option key={p.name} value={p.name}>{p.name}</option>))}
            </select>
            <input className="rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="password" placeholder="Password" value={playerPw} onChange={e => setPlayerPw(e.target.value)} />
            {!shopAuthed ? (
              <button onClick={handlePlayerLogin} className="rounded-xl px-3 py-2 bg-blue-600 hover:bg-blue-500">Login</button>
            ) : (
              <button onClick={handlePlayerLogout} className="rounded-xl px-3 py-2 bg-slate-700 hover:bg-slate-600">Logout ({shopAuthed})</button>
            )}
            <div className="rounded-xl bg-white/10 px-3 py-2 text-sm">
              RP: <span className="font-semibold">{currentPlayer ? (currentPlayer.rp || 0) : '-'}</span>{' '}
              <span className="opacity-70">• Renown:</span> <span className="font-semibold">{currentPlayer ? (currentPlayer.renown || 'None') : '-'}</span>
            </div>
          </div>
        </div>

        {/* Top Bar: Save + Logout */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="text-sm opacity-80">
            {shopAuthed ? (
              <>
                <span className="mr-2">
                  Logged in as <span className="font-semibold">{shopAuthed}</span>
                </span>
              </>
            ) : (
              <span className="italic opacity-70">Not logged into shop</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveLocal}
              className={`px-3 py-1.5 rounded-lg border border-white/10 text-sm ${shopAuthed ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-900/40 cursor-not-allowed'}`}
              disabled={!shopAuthed}
            >
              Save
            </button>
            <button
              onClick={logoutShop}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 border border-white/10 text-sm"
            >
              Logout
            </button>
            {saveMsg && (
              <span className="ml-2 text-xs px-2 py-1 rounded bg-white/10 border border-white/10">
                {saveMsg}
              </span>
            )}
          </div>
        </div>

        {/* Character Info Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="col-span-4">
            <h2 className="text-lg font-semibold mb-4">Character Info</h2>
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Character Name</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              disabled={!shopAuthed || gmOpen}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Player Name</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={!shopAuthed || gmOpen}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Chapter</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              disabled={gmOpen}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Chapter Demeanour</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={demeanour}
              onChange={(e) => setDemeanour(e.target.value)}
              disabled={gmOpen}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Speciality</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={speciality}
              onChange={(e) => setSpeciality(e.target.value)}
              disabled={gmOpen}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Rank</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              disabled={gmOpen}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Power Armour History</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={powerArmour}
              onChange={(e) => setPowerArmour(e.target.value)}
              disabled={gmOpen}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Description</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={gmOpen}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Past Event</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={pastEvent}
              onChange={(e) => setPastEvent(e.target.value)}
              disabled={gmOpen}
            />
          </div>
          <div>
            <label className="text-xs uppercase opacity-70">Personal Demeanour</label>
            <input
              className="w-full rounded border border-white/10 bg-white/10 px-2 py-1"
              value={personalDemeanour}
              onChange={(e) => setPersonalDemeanour(e.target.value)}
              disabled={gmOpen}
            />
          </div>
          <div className="col-span-4 flex justify-end mt-4">
            <button
              onClick={() => setGmOpen(!gmOpen)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 border border-white/10 text-sm"
            >
              {gmOpen ? 'Close GM Panel' : 'Open GM Panel'}
            </button>
          </div>
        </div>

        {/* Requisition Points Display */}
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
          <div className="text-sm font-medium">Requisition Points</div>
          <div className="text-xs opacity-70">Current RP: <span className="font-semibold">{currentPlayer ? currentPlayer.rp : 'N/A'}</span></div>
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
          <div className="font-semibold text-lg mb-4">Gear</div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
            {gear.map((item, index) => (
              <div key={index} className="flex items-center gap-6">
                <input
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 flex-1"
                  value={item.name}
                  disabled={!isGMOrShopAuthed()}
                />
                <input
                  type="number"
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 w-24"
                  value={item.qty || 1}
                  disabled={!isGMOrShopAuthed()}
                />
                <input
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 flex-1"
                  placeholder="Note"
                  value={item.note || ''}
                  onChange={(e) => updateGear(item.id, { note: e.target.value })}
                  disabled={!isGMOrShopAuthed()}
                />
                <button
                  className="rounded-xl px-4 py-3 bg-rose-600 hover:bg-rose-500"
                  onClick={() => deleteGear(item.id)}
                >
                  Remove
                </button>
              </div>
            ))}
            {isGMLoggedIn() && (
              <button
                className="rounded-xl px-4 py-3 bg-blue-600 hover:bg-blue-500"
                onClick={() => addGearItem('')}
              >
                Add gear
              </button>
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
      </div>
    </section>
  )
}

export default PlayerTab
