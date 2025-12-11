/**
 * XP Bar Component - Minecraft-style progress bar for experience points
 * Shows progress toward next "level" with customizable thresholds
 */

export function XPBar({ 
  currentXP = 0, 
  xpSpent = 0, 
  thresholdXP = 500,
  showLabel = true,
  compact = false 
}) {
  // Available XP is current minus spent
  const availableXP = Math.max(0, currentXP - xpSpent);
  
  // Calculate progress toward next threshold
  // Each "level" is thresholdXP points
  const currentLevel = Math.floor(currentXP / thresholdXP);
  const nextLevelThreshold = (currentLevel + 1) * thresholdXP;
  const xpIntoLevel = currentXP % thresholdXP;
  const progress = (xpIntoLevel / thresholdXP) * 100;
  
  const barHeight = compact ? 'h-2' : 'h-4';
  const textSize = compact ? 'text-xs' : 'text-sm';
  
  return (
    <div className={`w-full ${compact ? 'space-y-1' : 'space-y-2'}`}>
      {/* XP Bar */}
      <div className="relative w-full bg-slate-800 rounded overflow-hidden border border-slate-700">
        {/* Green fill */}
        <div 
          className={`${barHeight} bg-green-500 transition-all duration-300 ease-out flex items-center justify-center`}
          style={{ width: `${progress}%` }}
        >
          {/* Optional inner glow effect */}
          {progress > 10 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-300 to-transparent opacity-40"></div>
          )}
        </div>
        
        {/* Label overlay */}
        {showLabel && (
          <div className={`absolute inset-0 flex items-center justify-center text-white font-semibold ${textSize} pointer-events-none`}>
            <span className="drop-shadow-lg">
              {currentXP}/{nextLevelThreshold} XP
              {availableXP > 0 && <span className="text-green-300 ml-1">({availableXP} avail)</span>}
            </span>
          </div>
        )}
      </div>
      
      {/* Debug info - only show if spent XP is tracked */}
      {xpSpent > 0 && !compact && (
        <div className="text-xs text-slate-400 flex justify-between">
          <span>Lvl {currentLevel}</span>
          <span>Spent: {xpSpent}</span>
        </div>
      )}
    </div>
  );
}

/**
 * XP Summary Card - Shows overall player XP status
 */
export function XPSummary({ currentXP = 0, xpSpent = 0, thresholdXP = 500 }) {
  const availableXP = Math.max(0, currentXP - xpSpent);
  const currentLevel = Math.floor(currentXP / thresholdXP);
  
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-slate-700/50 rounded p-2">
          <div className="text-xs text-slate-400">Total XP</div>
          <div className="text-lg font-bold text-green-400">{currentXP}</div>
        </div>
        <div className="bg-slate-700/50 rounded p-2">
          <div className="text-xs text-slate-400">Available XP</div>
          <div className="text-lg font-bold text-green-300">{availableXP}</div>
        </div>
        <div className="bg-slate-700/50 rounded p-2 col-span-2">
          <div className="text-xs text-slate-400">Current Level</div>
          <div className="text-lg font-bold text-blue-400">Level {currentLevel}</div>
        </div>
      </div>
      {xpSpent > 0 && (
        <div className="text-xs text-slate-400">
          Spent: {xpSpent} XP | Remaining: {availableXP} XP
        </div>
      )}
    </div>
  );
}

export default XPBar;
