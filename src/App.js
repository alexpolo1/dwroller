import './App.css';
import DeathwatchRoller from './components/DeathwatchRoller';
import RequisitionShop from './components/RequisitionShop';
import PlayerTab from './components/PlayerTab';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { debug, info, warn, error, logApiCall, logApiError, logUserAction } from './utils/logger';

function App() {
  const [tab, setTab] = useState('roller');
  // Global login/session state
  const [authedPlayer, setAuthedPlayer] = useState(() => localStorage.getItem('dw:shop:authedPlayer') ? JSON.parse(localStorage.getItem('dw:shop:authedPlayer')) : '');
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('dw:shop:sessionId') ? JSON.parse(localStorage.getItem('dw:shop:sessionId')) : '');
  const [loginName, setLoginName] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [players, setPlayers] = useState([]);
  const [playersError, setPlayersError] = useState('');



  // Fetch player list for login (exposed so UI can refresh)
  async function fetchPlayers() {
    try {
      setPlayersError('')
      const res = await axios.get('/api/players');
      setPlayers(res.data || []);
    } catch (err) {
      console.error('fetchPlayers failed', err);
      setPlayers([]);
      setPlayersError('Failed to load users — is the backend running? Check console/network.');
    }
  }

  // Validate session on mount/refresh
  useEffect(() => {
    async function validate() {
      if (sessionId) {
        try {
          debug(`Validating session: ${sessionId}`, 'auth');
          const res = await axios.post('/api/sessions/validate', { sessionId });
          logApiCall('POST', '/api/sessions/validate', { sessionId }, res.status);
          
          if (res.data && res.data.playerName) {
            setAuthedPlayer(res.data.playerName);
            localStorage.setItem('dw:shop:authedPlayer', JSON.stringify(res.data.playerName));
            info(`Session validation successful for: ${res.data.playerName}`, 'auth');
          } else {
            warn('Session validation failed - invalid response', 'auth');
            setAuthedPlayer('');
            setSessionId('');
            localStorage.removeItem('dw:shop:authedPlayer');
            localStorage.removeItem('dw:shop:sessionId');
          }
        } catch (err) {
          logApiError('POST', '/api/sessions/validate', err);
          error(`Session validation error: ${err.message}`, 'auth');
          setAuthedPlayer('');
          setSessionId('');
          localStorage.removeItem('dw:shop:authedPlayer');
          localStorage.removeItem('dw:shop:sessionId');
        }
      } else {
        debug('No session ID found for validation', 'auth');
      }
    }
    validate();
  }, [sessionId]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    try {
      logUserAction('user', 'Login attempt', { username: loginName });
      const response = await axios.post('/api/sessions/login', { 
        username: loginName, 
        password: loginPw 
      });
      
      logApiCall('POST', '/api/sessions/login', { username: loginName }, response.status);
      
      if (response.data.success) {
        // Update global state with session info
        setAuthedPlayer(response.data.playerName);
        setSessionId(response.data.sessionId);
        localStorage.setItem('dw:shop:authedPlayer', JSON.stringify(response.data.playerName));
        localStorage.setItem('dw:shop:sessionId', JSON.stringify(response.data.sessionId));
        
        info(`Login successful for user: ${loginName}`, 'auth');
        logUserAction('user', 'Login successful', { username: loginName });
        setLoginMsg('Login successful!');
        setLoginName('');
        setLoginPw('');
        
        // Clear success message after 3 seconds
        setTimeout(() => setLoginMsg(''), 3000);
      } else {
        warn(`Login failed for user: ${loginName} - ${response.data.message}`, 'auth');
        setLoginMsg(response.data.message || 'Login failed');
        
        // Clear error message after 5 seconds
        setTimeout(() => setLoginMsg(''), 5000);
      }
    } catch (err) {
      logApiError('POST', '/api/sessions/login', err);
      error(`Login error for user: ${loginName} - ${err.message}`, 'auth');
      setLoginMsg('Login failed. Please check your credentials and try again.');
      
      // Clear error message after 5 seconds
      setTimeout(() => setLoginMsg(''), 5000);
    }
  };

  async function handleLogout() {
    logUserAction('user', 'Logout attempt', { username: authedPlayer });
    if (sessionId) {
      try { 
        await axios.post('/api/sessions/logout', { sessionId }); 
        info(`Logout successful for user: ${authedPlayer}`, 'auth');
      } catch (err) {
        warn(`Logout API call failed: ${err.message}`, 'auth');
      }
    }
    setAuthedPlayer('');
    setSessionId('');
    localStorage.removeItem('dw:shop:authedPlayer');
    localStorage.removeItem('dw:shop:sessionId');
    setLoginMsg('Logged out successfully');
    info('User logged out successfully', 'auth');
    
    // Clear logout message after 3 seconds
    setTimeout(() => setLoginMsg(''), 3000);
  }

  // GM session is now handled through the regular login

  return (
    <div className="App min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Persistent Header */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-4">
          {/* Title and Login Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-white">Deathwatch Roller</h1>
            
            {/* Login Section */}
            <div className="flex-shrink-0">
              {authedPlayer ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm font-medium text-white">Logged in as {authedPlayer}</span>
                  </div>
                  <button onClick={handleLogout} className="rounded-lg px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
                    Logout
                  </button>
                  {loginMsg && <span className="ml-2 text-xs px-2 py-1 rounded bg-green-500/20 border border-green-500/30 text-green-300">{loginMsg}</span>}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 text-sm" 
                    type="text" 
                    placeholder="Username" 
                    value={loginName} 
                    onChange={e=>setLoginName(e.target.value)} 
                    onKeyPress={handleKeyPress}
                  />
                  <input 
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 text-sm" 
                    type="password" 
                    placeholder="Password (all users: 1234)" 
                    value={loginPw} 
                    onChange={e=>setLoginPw(e.target.value)} 
                    onKeyPress={handleKeyPress}
                  />
                  <button onClick={handleLogin} className="rounded-lg px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                    Login
                  </button>
                  {loginMsg && <span className="ml-2 text-xs px-2 py-1 rounded bg-red-500/20 border border-red-500/30 text-red-300">{loginMsg}</span>}
                </div>
              )}
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-1">
            <button 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${tab==='roller' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700/50 text-slate-200 hover:bg-slate-600/50'}`} 
              onClick={()=>{logUserAction('navigation', 'Tab switch', { from: tab, to: 'roller' }); setTab('roller')}}
            >
              Dice Roller
            </button>
            <button 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${tab==='shop' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700/50 text-slate-200 hover:bg-slate-600/50'}`} 
              onClick={()=>{logUserAction('navigation', 'Tab switch', { from: tab, to: 'shop' }); setTab('shop')}}
            >
              Requisition Shop
            </button>
            <button 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${tab==='player' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700/50 text-slate-200 hover:bg-slate-600/50'}`} 
              onClick={()=>{logUserAction('navigation', 'Tab switch', { from: tab, to: 'player' }); setTab('player')}}
            >
              Character Sheet
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* User Info Card for easy access */}
        {!authedPlayer && (
          <div className="mb-6 p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-300">Available Users</h3>
              <div className="flex items-center gap-2">
                <button onClick={fetchPlayers} className="text-xs px-2 py-1 rounded bg-slate-700/30 hover:bg-slate-700/50">Refresh</button>
              </div>
            </div>
            {playersError ? (
              <div className="text-xs text-red-400 mb-2">
                {playersError}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 text-xs">
              {players && players.length > 0 ? players.map(player => (
                <button
                  key={player.name}
                  onClick={() => {setLoginName(player.name); setLoginPw('1234');}}
                  className="px-2 py-1 rounded bg-blue-700/30 text-blue-200 hover:bg-blue-600/40 transition-colors"
                >
                  {player.name}
                </button>
              )) : (
                <div className="text-xs text-blue-200/60">No users found. Click Refresh or check backend.</div>
              )}
            </div>
            <p className="text-xs text-blue-300/70 mt-2">Password for all users: <code className="bg-blue-800/40 px-1 rounded">1234</code></p>
          </div>
        )}
        
        {tab==='roller' ? <DeathwatchRoller /> : tab==='shop' ? <RequisitionShop authedPlayer={authedPlayer} sessionId={sessionId} /> : <PlayerTab 
          authedPlayer={authedPlayer} 
          sessionId={sessionId}
        />}
      </div>
    </div>
  );
}

export default App;