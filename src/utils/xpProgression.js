/**
 * XP PROGRESSION RULES FOR DEATHWATCH
 * 
 * Accelerated progression for infrequent play sessions (monthly or less)
 * Based on Deathwatch Core Rulebook
 */

/**
 * Standard Deathwatch XP Costs (from core rulebook)
 */
export const XP_COSTS = {
  // Skill improvements
  SKILL_BASIC_TRAINING: 100,      // Learn a skill
  SKILL_PLUS_10: 200,             // +10 modifier
  SKILL_PLUS_20: 300,             // +20 modifier
  SKILL_PLUS_30: 400,             // +30 modifier
  
  // Characteristic increases (costs vary by characteristic)
  CHARACTERISTIC: {
    strength: 500,
    toughness: 500,
    ballistic: 500,
    agility: 500,
    intelligence: 500,
    perception: 500,
    fellowship: 500,
    willpower: 500,
  },
  
  // Talent costs
  TALENT_BASIC: 200,
  TALENT_ADVANCED: 300,
  
  // Psychic powers
  PSYCHIC_POWER: 300,
};

/**
 * ACCELERATED PROGRESSION RULES
 * For Game Masters running monthly or infrequent sessions
 * 
 * Problem: In standard Deathwatch, characters advance very slowly.
 *          With monthly sessions, a character might take 2+ years to get 1 characteristic increase.
 * 
 * Solution: Multiply base XP values by acceleration factor
 */

export const ACCELERATION_TIERS = {
  STANDARD: {
    factor: 1.0,
    description: 'Standard Deathwatch progression',
    recommendation: 'Weekly+ sessions',
    rationale: 'Players meet frequently, can take long-term advancement goals',
  },
  
  MONTHLY: {
    factor: 2.5,
    description: 'Accelerated for monthly sessions',
    recommendation: 'Sessions ~2-4 times per month',
    rationale: 'Approximately 2.5x XP awards to make meaningful progress between longer gaps',
    examples: {
      perSession: '250-500 XP per 4-hour session',
      perMonth: '500-2000 XP per month',
      charIncrease: 'Every 2-3 sessions instead of 5-8',
    }
  },
  
  BIWEEKLY: {
    factor: 1.5,
    description: 'Accelerated for biweekly sessions',
    recommendation: 'Sessions every 2 weeks',
    rationale: 'Slight acceleration for semi-regular play',
    examples: {
      perSession: '150-300 XP per 4-hour session',
      perMonth: '300-600 XP per month',
    }
  },
};

/**
 * RECOMMENDED XP AWARDS BY SESSION
 * 
 * Award XP at the end of each session based on accomplishments
 */
export const SESSION_XP_AWARDS = {
  // Base award (all players get this for showing up and participating)
  BASE: { standard: 100, monthly: 250 },
  
  // Mission/Objective completion
  OBJECTIVE_COMPLETED: { standard: 200, monthly: 500 },
  OBJECTIVE_PARTIALLY: { standard: 100, monthly: 250 },
  
  // Individual accomplishments
  EXCEPTIONAL_ROLEPLAY: { standard: 50, monthly: 125 },
  CREATIVE_SOLUTION: { standard: 100, monthly: 250 },
  TACTICAL_VICTORY: { standard: 100, monthly: 250 },
  SURVIVED_MAJOR_THREAT: { standard: 100, monthly: 250 },
  
  // Penalties (rare, for severely poor play)
  CHARACTER_DEATH: { standard: -50, monthly: -125 },
  FRIENDLY_FIRE_INCIDENT: { standard: -25, monthly: -60 },
};

/**
 * Calculate total XP award for session
 */
export function calculateSessionXP(awards = [], accelerationFactor = 1.0) {
  return awards.reduce((total, award) => total + award, 0) * accelerationFactor;
}

/**
 * XP to spend guide for new players
 */
export const XP_SPENDING_GUIDE = {
  'Quick Improvements (50-200 XP)': [
    'Increase single skill by +10 (costs vary)',
    'Basic Talent prerequisite requirements',
  ],
  'Medium Improvements (200-500 XP)': [
    'New skill training + advancement',
    'Talent acquisition',
    'Start working toward Characteristic increase',
  ],
  'Major Improvements (500+ XP)': [
    'Characteristic increase (+1 to a characteristic)',
    'Advanced talents',
    'Psychic power acquisition',
    'Multiple skill increases',
  ],
};

/**
 * Level thresholds for visual progression
 * Used by XP bar component
 */
export const XP_LEVEL_THRESHOLDS = {
  description: 'Every 500 XP represents one "level" for visual progression',
  visual: {
    0: 'Level 0 - Fresh recruit',
    500: 'Level 1 - Blooded warrior',
    1000: 'Level 2 - Proven combatant',
    1500: 'Level 3 - Experienced marine',
    2000: 'Level 4 - Hardened veteran',
    2500: 'Level 5 - Master of arms',
    3000: 'Level 6 - Chapter legend',
  },
};

/**
 * EXAMPLE: How to accelerate XP for monthly sessions
 * 
 * BEFORE:
 *   - Player gets 100 XP for completing a mission
 *   - To get 500 XP for a characteristic increase = 5 months
 * 
 * AFTER (with 2.5x acceleration):
 *   - Player gets 250 XP for completing the same mission (100 * 2.5)
 *   - To get 500 XP for a characteristic increase = 2 months
 *   - More meaningful character progression visible between sessions
 */

/**
 * IMPLEMENTATION GUIDE:
 * 
 * 1. In GM Kit, show which acceleration tier is active
 * 2. When awarding XP, multiply by the acceleration factor
 * 3. XP bar updates in real-time to show progress
 * 4. Players can see they're making progress toward meaningful upgrades
 * 
 * Example in GM action:
 *   const factor = ACCELERATION_TIERS.MONTHLY.factor;
 *   const xpToAward = 300 * factor; // 750 XP
 *   gmSetXP(playerName, currentXP + xpToAward);
 */

export default {
  XP_COSTS,
  ACCELERATION_TIERS,
  SESSION_XP_AWARDS,
  calculateSessionXP,
  XP_SPENDING_GUIDE,
  XP_LEVEL_THRESHOLDS,
};
