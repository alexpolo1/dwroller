import React, { useState, useEffect, useMemo } from 'react'

const STORAGE_ENEMIES = 'dw:enemies:v1'

function prettyProfile(p){ if(!p) return '';
  return `WS ${p.ws} / BS ${p.bs} / S ${p.s} / T ${p.t} / Ag ${p.ag} / Int ${p.int} / Per ${p.per} / WP ${p.wp} / Fel ${p.fel}`
}

function normalizeEntry(en){
  // Consolidate possible shapes so the UI can render consistently.
  const stats = en.stats || {}
  const profile = en.profile || stats.profile || null
  const wounds = en.wounds ?? (stats.wounds !== undefined ? stats.wounds : null)
  
  // Helper to format arrays and objects into readable strings
  const formatField = (field) => {
    if (!field) return null
    if (Array.isArray(field)) return field.join(', ')
    if (typeof field === 'object') return JSON.stringify(field)
    return String(field)
  }
  
  return {
    name: en.name || en.bestiaryName || stats.bestiaryName || stats.name || en.pdf || '<no-name>',
    book: en.book || en.source || en.pdf || '',
    pdf: en.pdf || '',
    page: en.page ?? stats.page ?? null,
    profile,
    wounds,
    movement: formatField(en.movement || stats.movement),
    toughness: formatField(en.toughness || stats.toughness),
    armour: formatField(en.armour || stats.armour),
    skills: formatField(en.skills || stats.skills),
    talents: formatField(en.talents || stats.talents),
    traits: formatField(en.traits || stats.traits),
    weapons: formatField(en.weapons || stats.weapons),
    gear: formatField(en.gear || stats.gear),
    snippet: formatField(en.snippet || stats.snippet),
    stats
  }
}

export default function BestiaryTab(){
  const [q, setQ] = useState('')
  const [enemies, setEnemies] = useState(() => {
    try{
      const raw = localStorage.getItem(STORAGE_ENEMIES)
      if(!raw) return []
      const parsed = JSON.parse(raw)
      const arr = Array.isArray(parsed) ? parsed : (parsed.results || [])
      return arr.map(normalizeEntry)
    }catch(e){ return [] }
  })
  // Database / retry UI state
  const WARNING_DISMISS_KEY = 'dw:warning-dismiss-until:v1'
  const [dbDown, setDbDown] = useState(false)
  const [dismissUntil, setDismissUntil] = useState(() => {
    try{ const v = Number(localStorage.getItem(WARNING_DISMISS_KEY)); return isNaN(v) ? 0 : v }catch(e){ return 0 }
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const retryRef = React.useRef(null)

  // hydrate from storage on mount
  useEffect(()=>{ try{ const raw = localStorage.getItem(STORAGE_ENEMIES); if(raw){ const parsed = JSON.parse(raw); const arr = Array.isArray(parsed) ? parsed : (parsed.results || []); setEnemies(arr.map(normalizeEntry)) } }catch(e){} },[])

  // loadData attempts to fetch packaged JSON; on failure it will fall back to cache and set dbDown
  async function loadData(force = false){
    setIsRefreshing(true)
    const cacheParam = force ? '?_=' + Date.now() : ''
    const endpoints = ['/deathwatch-bestiary-extracted.json','/public/deathwatch-bestiary-extracted.json','/build/deathwatch-bestiary-extracted.json']
    for(const ep of endpoints){
      try{
        const res = await fetch(ep + cacheParam, { cache: force ? 'no-store' : 'default' })
        if(!res.ok) throw new Error('bad')
        const json = await res.json()
        let list = []
        if(Array.isArray(json)) list = json
        else if(Array.isArray(json.results)) list = json.results
        else continue
        const norm = list.map(normalizeEntry)
        setEnemies(norm)
        try{ localStorage.setItem(STORAGE_ENEMIES, JSON.stringify(norm)) }catch(e){}
        setDbDown(false)
        setIsRefreshing(false)
        // clear any retry if present
        if(retryRef.current){ clearInterval(retryRef.current); retryRef.current = null }
        return
      }catch(e){
        continue
      }
    }

    // If we reach here, all endpoints failed
    setDbDown(true)
    setIsRefreshing(false)
    // Try reading from cache
    try{
      const raw = localStorage.getItem(STORAGE_ENEMIES)
      if(raw){ const parsed = JSON.parse(raw); const arr = Array.isArray(parsed) ? parsed : (parsed.results || []); setEnemies(arr.map(normalizeEntry)) }
    }catch(e){}

    // ensure a background retry is scheduled
    if(!retryRef.current){
      retryRef.current = setInterval(()=>{ loadData(true).catch(()=>{}); }, 30000)
    }
  }

  async function updateFromDatabase() {
    setIsRefreshing(true)
    try {
      // Try to call a copy script endpoint if available
      const response = await fetch('/api/copy-bestiary', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        // If the endpoint exists, wait a moment then refresh
        setTimeout(() => loadData(true), 1000)
      } else {
        // Fallback to regular refresh
        await loadData(true)
      }
    } catch (e) {
      // Fallback to regular refresh
      await loadData(true)
    }
  }

  useEffect(()=>{
    // Only attempt network load on mount if we have no cached enemies.
    if(enemies && enemies.length>0) return
    loadData().catch(()=>{})
    return ()=>{ if(retryRef.current){ clearInterval(retryRef.current); retryRef.current = null } }
  },[])

  const filtered = useMemo(()=>{
    if(!q) return enemies
    const n = q.toLowerCase()
    return enemies.filter(e => {
      const searchFields = [
        e.name, e.book, e.pdf, e.skills, e.talents, e.traits, 
        e.weapons, e.gear, e.movement, e.armour, e.snippet
      ]
      return searchFields.some(field => 
        field && String(field).toLowerCase().includes(n)
      )
    })
  },[q,enemies])

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Bestiary</h2>
          <div className="flex items-center gap-3">
            <input 
              className="px-3 py-2 rounded bg-white/5 border border-white/10 text-white placeholder-slate-400" 
              value={q} 
              onChange={e=>setQ(e.target.value)} 
            />
            <button 
              className={`px-4 py-2 rounded font-medium transition-colors ${isRefreshing ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'} text-white`}
              onClick={()=>{ loadData(true).catch(()=>{}); }}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button 
              className={`px-4 py-2 rounded font-medium transition-colors ${isRefreshing ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'} text-white`}
              onClick={updateFromDatabase}
              disabled={isRefreshing}
              title="Update from database files"
            >
              {isRefreshing ? 'Updating...' : 'Update from DB'}
            </button>
          </div>
        </div>

        {dbDown && Date.now() < (dismissUntil || 0) ? null : dbDown ? (
          <div className="mb-4 p-3 rounded bg-yellow-900/30 text-yellow-300 flex items-center justify-between" role="status" aria-live="polite">
            <div>Database unreachable — showing cached data and retrying in background.</div>
            <div className="ml-3">
              <button
                className="text-sm underline"
                aria-label="Dismiss database warning for 5 minutes"
                onClick={()=>{ try{ const until = Date.now() + 5*60*1000; localStorage.setItem(WARNING_DISMISS_KEY, String(until)); setDismissUntil(until) }catch(e){} }}
              >Dismiss</button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4">
          {filtered.map((en, idx) => {
            const d = normalizeEntry(en)
            return (
            <div key={d.name + idx} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-white">{d.name}</h3>
                    <div className="text-lg font-semibold text-red-400">
                      Wounds: {d.wounds ?? '—'}
                    </div>
                  </div>
                  
                  {d.profile && (
                    <div className="mb-3 p-3 rounded bg-slate-800/50 border border-slate-700">
                      <div className="text-sm font-semibold text-slate-300 mb-1">Profile</div>
                      <div className="text-sm text-slate-200 font-mono">{prettyProfile(d.profile)}</div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {d.movement && (
                      <div className="bg-slate-800/30 p-2 rounded border border-slate-700">
                        <strong className="text-blue-300">Movement:</strong>
                        <div className="text-slate-200 mt-1">{d.movement}</div>
                      </div>
                    )}
                    {d.toughness && (
                      <div className="bg-slate-800/30 p-2 rounded border border-slate-700">
                        <strong className="text-green-300">Toughness:</strong>
                        <div className="text-slate-200 mt-1">{d.toughness}</div>
                      </div>
                    )}
                    {d.armour && (
                      <div className="bg-slate-800/30 p-2 rounded border border-slate-700">
                        <strong className="text-yellow-300">Armour:</strong>
                        <div className="text-slate-200 mt-1">{d.armour}</div>
                      </div>
                    )}
                    {d.skills && (
                      <div className="bg-slate-800/30 p-2 rounded border border-slate-700">
                        <strong className="text-purple-300">Skills:</strong>
                        <div className="text-slate-200 mt-1">{d.skills}</div>
                      </div>
                    )}
                    {d.talents && (
                      <div className="bg-slate-800/30 p-2 rounded border border-slate-700">
                        <strong className="text-orange-300">Talents:</strong>
                        <div className="text-slate-200 mt-1">{d.talents}</div>
                      </div>
                    )}
                    {d.traits && (
                      <div className="bg-slate-800/30 p-2 rounded border border-slate-700">
                        <strong className="text-pink-300">Traits:</strong>
                        <div className="text-slate-200 mt-1">{d.traits}</div>
                      </div>
                    )}
                    {d.weapons && (
                      <div className="bg-slate-800/30 p-2 rounded border border-slate-700">
                        <strong className="text-red-300">Weapons:</strong>
                        <div className="text-slate-200 mt-1">{d.weapons}</div>
                      </div>
                    )}
                    {d.gear && (
                      <div className="bg-slate-800/30 p-2 rounded border border-slate-700">
                        <strong className="text-cyan-300">Gear:</strong>
                        <div className="text-slate-200 mt-1">{d.gear}</div>
                      </div>
                    )}
                  </div>
                  
                  {d.snippet && (
                    <div className="mt-3 p-3 rounded bg-slate-800/50 border border-slate-700">
                      <div className="text-sm font-semibold text-slate-300 mb-1">Description</div>
                      <div className="text-xs text-slate-400 leading-relaxed">{d.snippet}</div>
                    </div>
                  )}
                </div>
                
                <div className="w-48 flex-shrink-0 text-sm text-slate-400">
                  <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                    <div className="font-semibold text-slate-300 mb-2">Source</div>
                    <div className="text-slate-200 mb-1">{d.book}</div>
                    <div className="text-xs">Page: {d.page ?? '—'}</div>
                    {d.pdf && <div className="text-xs mt-1 truncate" title={d.pdf}>{d.pdf}</div>}
                    {d.stats && d.stats.chosenOffset !== undefined && (
                      <div className="text-xs mt-2">Offset: {d.stats.chosenOffset}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
