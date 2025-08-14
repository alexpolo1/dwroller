import './App.css';
import DeathwatchRoller from './components/DeathwatchRoller';
import RequisitionShop from './components/RequisitionShop';
import PlayerTab from './components/PlayerTab';
import { useState } from 'react';

function App() {
  const [tab, setTab] = useState('roller');

  return (
    <div className="App">
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <div className="flex gap-2">
          <button className={`px-3 py-1.5 rounded ${tab==='roller' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'}`} onClick={()=>setTab('roller')}>Roller</button>
          <button className={`px-3 py-1.5 rounded ${tab==='shop' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'}`} onClick={()=>setTab('shop')}>Requisition Shop</button>
          <button className={`px-3 py-1.5 rounded ${tab==='player' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'}`} onClick={()=>setTab('player')}>Player</button>
        </div>
      </div>
      {tab==='roller' ? <DeathwatchRoller /> : tab==='shop' ? <RequisitionShop /> : <PlayerTab />}
    </div>
  );
}

export default App;