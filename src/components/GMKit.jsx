import React, { useState } from 'react';

export default function GMKit({ authedPlayer }) {
  const [activeTable, setActiveTable] = useState('difficulty');

  if (authedPlayer !== 'gm') return (
    <div className="p-6 rounded-lg bg-red-800 border border-red-700">
      <h2 className="text-xl font-bold text-red-300 mb-2">Access Denied</h2>
      <p className="text-red-200">The GM Kit is only accessible to Game Masters. Please log in as a GM.</p>
    </div>
  );

  const tables = {
    difficulty: {
      name: 'Test Difficulty',
      data: [
        ['Difficulty', 'Test Modifier'],
        ['Trivial', '+60'],
        ['Elementary', '+50'],
        ['Simple', '+40'],
        ['Easy', '+30'],
        ['Routine', '+20'],
        ['Ordinary', '+10'],
        ['Challenging', '+0'],
        ['Difficult', '–10'],
        ['Hard', '–20'],
        ['Very Hard', '–30'],
        ['Arduous', '–40'],
        ['Punishing', '–50'],
        ['Hellish', '–60']
      ]
    },
    hitLocations: {
      name: 'Hit Locations',
      data: [
        ['Roll', 'Location'],
        ['01–10', 'Head'],
        ['11–20', 'Right Arm'],
        ['21–30', 'Left Arm'],
        ['31–70', 'Body'],
        ['71–85', 'Right Leg'],
        ['86–00', 'Left Leg']
      ]
    },
    combatActions: {
      name: 'Combat Actions',
      data: [
        ['Action', 'Type', 'Subtype(s)', 'Description'],
        ['Aim', 'Half/Full', 'Concentration', '+10 bonus to hit as a Half Action or +20 to hit as a Full Action on your next attack.'],
        ['All Out Attack', 'Full', 'Attack, Melee', '+20 to WS, cannot Dodge or Parry.'],
        ['Brace Heavy Weapon', 'Half', 'Miscellaneous', 'Prepare to fire a heavy weapon.'],
        ['Called Shot', 'Full', 'Attack, Concentration, Melee or Ranged', 'Attack a specific location on your target with a –20 to WS or BS.'],
        ['Charge', 'Full', 'Attack, Melee, Movement', 'Must move 4 metres, +10 to WS.'],
        ['Defensive Stance', 'Half', 'Concentration, Melee', 'Gain an additional Reaction, opponents suffer –20 to WS.'],
        ['Delay', 'Reaction', 'Miscellaneous', 'Before your next Turn take any Half Action.'],
        ['Disengage', 'Half', 'Movement', 'Break off from melee and move.'],
        ['Dodge', 'Varies', 'Movement', 'Test Dodge to negate a hit.'],
        ['Feint', 'Full', 'Attack, Melee', 'Opposed WS Test, if you win, your next attack cannot be Dodged or Parried.'],
        ['Focus Power', 'Half/Full', 'Varies', 'Use a Psychic Power.'],
        ['Full Auto Burst', 'Full', 'Attack, Ranged', '+20 to BS, additional hit for every degree of success.'],
        ['Grapple', 'Full', 'Attack, Melee', 'Affect a Grappled opponent or escape from a Grapple.'],
        ['Guarded Attack', 'Full', 'Attack, Concentration, Melee', '–10 WS, +10 to Parry and Dodge.'],
        ['Jump or Leap', 'Half', 'Movement', 'Jump vertically or leap horizontally.'],
        ['Knock-Down', 'Half', 'Attack, Melee', 'Try and knock an opponent to the ground.'],
        ['Manoeuvre', 'Half/Full', 'Attack, Melee, Movement', 'Opposed WS Test, if you win, move enemy 1 metre.'],
        ['Move', 'Full', 'Movement', 'Move up to your movement as a Half Action or twice your movement as a Full Action.'],
        ['Multiple Attacks', 'Full', 'Attack, Melee or Ranged', 'Attack more than once in the same round—requires two weapons or a talent.'],
        ['Overwatch', 'Full', 'Attack, Concentration, Ranged', 'Shoot targets coming into a set kill zone, –20 to BS.'],
        ['Parry', 'Reaction', 'Defence, Melee', 'Test Weapon Skill to negate a hit.'],
        ['Ready', 'Half', 'Miscellaneous', 'Ready a weapon or item.'],
        ['Reload', 'Varies', 'Miscellaneous', 'Reload a ranged weapon.'],
        ['Run', 'Full', 'Movement', 'Move triple, enemies –20 BS and +20 WS.'],
        ['Semi-Auto Burst', 'Full', 'Attack, Ranged', '+10 to BS, additional hit for every two degrees of success.'],
        ['Stand/Mount', 'Half', 'Movement', 'Stand up or mount a riding animal.'],
        ['Standard Attack', 'Half', 'Attack, Melee or Ranged', 'Make one melee or ranged attack.'],
        ['Stun', 'Full', 'Attack, Melee', 'Try to Stun an opponent.'],
        ['Suppressing Fire', 'Full', 'Attack, Ranged', 'Force opponents to take cover, –20 to BS.'],
        ['Tactical Advance', 'Full', 'Concentration, Movement', 'Move from cover to cover.'],
        ['Use a Skill', 'Varies', 'Concentration, Miscellaneous', 'You may use a Skill.']
      ]
    },
    rangedWeapons: {
      name: 'Ranged Weapons',
      data: [
        ['Name', 'Class', 'Range', 'RoF', 'Dmg', 'Pen', 'Clip', 'Rld', 'Special'],
        // Bolt Weapons
        ['Astartes Bolt Pistol', 'Pistol', '30m', 'S/3/–', '2d10+5 X', '5', '14', 'Full', 'Tearing'],
        ['Astartes Bolter (Godwyn)', 'Basic', '100m', 'S/2/4', '2d10+5 X', '5', '28', 'Full', 'Tearing'],
        ['Astartes Boltgun (Stalker)', 'Basic', '200m', 'S/–/–', '2d10+5 X', '5', '24', 'Full', 'Accurate, Tearing'],
        ['Astartes Combi-Weapon', 'Basic', '100m', 'S/2/4', '2d10+5 X', '5', '28', 'Full', 'Tearing'],
        ['Astartes Heavy Bolter', 'Heavy', '150m', '–/–/10', '2d10+10 X', '6', '60', 'Full', 'Tearing'],
        ['Astartes Storm Bolter', 'Basic', '100m', 'S/2/4', '2d10+5 X', '5', '60', '2 Full', 'Storm, Tearing'],
        // Plasma Weapons
        ['Astartes Plasma Cannon', 'Heavy', '150m', 'S/–/–', '2d10+11 E', '10', '16', '5 Full', 'Blast (1), Volatile'],
        ['Astartes Plasma Gun (Ragefire)', 'Basic', '100m', 'S/2/–', '1d10+9 E', '8', '40', '4 Full', 'Volatile'],
        ['Astartes Plasma Pistol', 'Pistol', '30m', 'S/2/–', '1d10+8 E', '8', '12', '3 Full', 'Volatile'],
        // Melta Weapons
        ['Astartes Infernus Pistol', 'Pistol', '10m', 'S/–/–', '2d10+8 E', '13', '4', 'Full', '–'],
        ['Astartes Meltagun (Vulkan)', 'Basic', '20m', 'S/–/–', '2d10+8 E', '13', '6', '2 Full', '–'],
        ['Astartes Multi-melta (Maxima)', 'Heavy', '60m', 'S/–/–', '4d10+6 E', '13', '12', '2 Full', 'Blast (1)'],
        // Flame Weapons
        ['Astartes Flamer', 'Basic', '20m', 'S/–/–', '2d10+2 E', '3', '6', '2 Full', 'Flame'],
        ['Astartes Hand Flamer', 'Pistol', '10m', 'S/–/–', '2d10+2 E', '3', '4', '2 Full', 'Flame'],
        ['Astartes Heavy Flamer', 'Heavy', '30m', 'S/–/–', '2d10+6 E', '6', '10', '2 Full', 'Flame'],
        // Solid Projectile Weapons
        ['Astartes Assault Cannon', 'Mounted', '150m', '–/–/10', '3d10+6 I', '6', '200', '3 Full', 'Tearing'],
        ['Astartes Shotgun', 'Basic', '30m', 'S/2/–', '2d10+3 I', '0', '18', 'Full', 'Reliable, Scatter'],
        ['Autogun', 'Basic', '90m', 'S/3/10', '1d10+3 I', '0', '30', '2 Full', '–'],
        ['Autopistol', 'Pistol', '30m', 'S/–/6', '1d10+2 I', '0', '18', 'Full', '–'],
        // Las Weapons
        ['Astartes Lascannon', 'Heavy', '300m', 'S/–/–', '6d10+10 E', '10', '6', '2 Full', '–'],
        ['Lasgun', 'Basic', '100m', 'S/3/–', '1d10+3 E', '0', '60', 'Full', 'Reliable'],
        ['Laspistol', 'Pistol', '30m', 'S/–/–', '1d10+2 E', '0', '30', 'Full', 'Reliable'],
        // Launchers
        ['Astartes Cyclone Missile Launcher', 'Mounted', '300m', 'S/2/–', '††', '††', '12', '3 Full', '††'],
        ['Astartes Missile Launcher (Soundstrike)', 'Heavy', '250m', 'S/–/–', '††', '††', '8', 'Half', '††'],
        ['Auxiliary Grenade Launcher', 'n/a', '45m', 'S/–/–', '††', '††', '4', 'Full', 'Called Shot']
      ]
    },
    meleeWeapons: {
      name: 'Melee Weapons',
      data: [
        ['Name', 'Class', 'Dmg', 'Pen', 'Special'],
        // Chain Weapons
        ['Astartes Chainsword', 'Melee', '1d10+3 R', '4', 'Balanced, Tearing'],
        // Power Weapons
        ['Astartes Chainfist', 'Mounted', '2d10† E', '10', 'Power Field, Tearing'],
        ['Astartes Lightning Claw', 'Melee', '1d10+6 E', '8', 'Power Field, Special, Tearing'],
        ['Astartes Power Axe', 'Melee', '1d10+8 E', '6', 'Power Field, Unbalanced'],
        ['Astartes Power Fist', 'Melee', '2d10† E', '9', 'Power Field, Unwieldy'],
        ['Astartes Power Sword', 'Melee', '1d10+6 E', '6', 'Balanced, Power Field'],
        ['Astartes Thunder Hammer', 'Melee', '2d10+5 E', '8', 'Power Field, Concussive, Unwieldy'],
        ['Omnissian Axe (Astartes-Pattern)', 'Melee', '2d10+6 E', '6', 'Power Field, Unbalanced'],
        // Traditional Weapons
        ['Astartes Combat Knife', 'Melee', '1d10+2 R', '2', '–'],
        ['Ceremonial Sword', 'Melee', '1d10+3 R', '2', 'Balanced'],
        ['Sacris Claymore', 'Melee', '2d10+2 R', '2', 'Unbalanced'],
        // Force Weapons
        ['Astartes Force Staff', 'Melee', '1d10+1 I', '0', 'Balanced, Special'],
        ['Astartes Force Sword', 'Melee', '1d10+2 R', '2', 'Balanced, Special'],
        // Other Melee Weapons
        ['Primitive Weapons', 'Melee', '1d10 I', '0', 'Primitive'],
        ['Improvised', 'Melee', '1d10–2 I', '0', 'Primitive, Unbalanced']
      ]
    },
    armour: {
      name: 'Armour',
      data: [
        ['Name', 'Locations Covered', 'AP'],
        ['Astartes Power Armour', 'All', '8/10'],
        ['Astartes Artificer Armour', 'All', '12'],
        ['Astartes Scout Armour', 'Body, Arms', '6'],
        ['Astartes Terminator Armour', 'All', '14'],
        ['Primitive Armour', 'Varies', 'Varies'],
        ['Carapace Armour', 'All', '6'],
        ['Diagnostor Helmet', 'Head', '8'],
        ['Masking Screen', '–', '–'],
        ['Flak Armour', 'All', '4']
      ]
    },
    criticalHits: {
      name: 'Critical Hit Tables',
      data: [
        ['Damage Type', 'Page Reference'],
        ['Energy', 'page 252 to 253'],
        ['Explosive', 'page 254 to 255'],
        ['Impact', 'page 256 to 257'],
        ['Rending', 'page 258 to 259']
      ]
    },
    weaponQualities: {
      name: 'Weapon Qualities',
      data: [
        ['Quality', 'Description'],
        ['Accurate', 'Additional +10 to hit when used with an Aim Action.'],
        ['Balanced', '+10 to Parry.'],
        ['Blast (X)', 'All within the weapon\'s blast radius in metres is hit. Roll Hit Location and Damage individually for each person affected.'],
        ['Concussive', 'Target must pass a Toughness Test (–10 per Degree of Success on the attack) or is Stunned for 1 Round. Target is possibly knocked down.'],
        ['Defensive', '+15 to Parry, –10 to hit.'],
        ['Devastating (X)', 'The weapon does one additional point of Cohesion Damage. If the target is a Horde, the Horde suffers additional hits equal to the number in parenthesis.'],
        ['Felling (X)', 'The weapon ignores a number of levels of Unnatural Toughness possessed by the target equal to the number in parenthesis.'],
        ['Flame', 'No BS Test. All creatures in a 30 degree arc make Agility Test or be struck by flame and take Damage. If Damage is taken, the target must succeed on second Agility Test or catch fire.'],
        ['Gyro-Stabilised', 'This weapon never counts its target as being further than Long Range. Heavy Weapons only suffer a –20 when not braced.'],
        ['Haywire (X)', 'This weapon generates a field that troubles the machine spirits of technology. See page 143 for details.'],
        ['Overheats', 'Unmodified roll of 91 or more on to hit roll causes Overheat, see page 129.'],
        ['Power Field', 'When Parrying an attack made with a weapon that lacks this quality, there is a 75% chance of destroying the attacker\'s weapon.'],
        ['Primitive', 'AP doubled, unless armour also has Primitive quality.'],
        ['Razor Sharp', 'If the attack roll results in two or more degrees of success, double the weapon\'s Penetration.'],
        ['Recharge', 'Can only fire every-other Round.'],
        ['Reliable', 'If Jam, roll 1d10 and only on roll of 10 has it Jammed.'],
        ['Sanctified', 'This weapon deals Holy damage, which has certain effects on Daemonic and warp creatures.'],
        ['Scatter', 'At Point Blank range, each 2 degrees of success scores another hit. AP doubled at Long and Extreme ranges.'],
        ['Shocking', 'If weapon causes Damage, Test Toughness or Stunned (+10 bonus per AP).'],
        ['Smoke', 'Creates smoke screen 3d10 metres in diameter, lasts 2d10 Rounds.'],
        ['Snare', 'The target must make an Agility Test or be immobilised. An immobilised target can attempt no other Actions except to try to escape the bonds.'],
        ['Storm', 'Doubles the number of hits inflicted on the target.'],
        ['Tearing', 'Roll two dice for Damage, take the best result.'],
        ['Toxic', 'If weapon causes Damage, Test Toughness at –5 for every point of Damage taken, if failed take extra 1d10 Impact Damage (no reduction for armour or Toughness).'],
        ['Twin-linked', '+20 to hit, may score one additional hit if the attack roll succeeds by two or more degrees of success.'],
        ['Unbalanced', '–10 when used to Parry.'],
        ['Unwieldy', 'Cannot be used to Parry.'],
        ['Volatile', 'If a 10 is rolled for Damage on a weapon with the Volatile Quality, Rightous Fury occurs automatically.']
      ]
    },
    coverTypes: {
      name: 'Cover Types',
      data: [
        ['Cover Type', 'AP'],
        ['Light Wood, Armour-glas, Light Metal', '4'],
        ['Heavy Wood, Flakboard, Sandbags, Ice', '8'],
        ['Rockcrete, Thick Iron, Stone', '16'],
        ['Plasteel, Armaplas', '32']
      ]
    },
    renown: {
      name: 'Renown',
      data: [
        ['Renown Rating', 'Renown Rank', 'Description'],
        ['0–19', 'Initiated', 'You have recently sworn your oaths of duty to the Deathwatch.'],
        ['20–39', 'Respected', 'You have proven your prowess repeatedly through bravery and blood.'],
        ['40–59', 'Distinguished', 'You have earned an impressive number of victories safeguarding humanity against its enemies.'],
        ['60-79', 'Famed', 'Your reputation precedes you, and your deeds are known to Battle-Brothers across the Reach.'],
        ['80+', 'Hero', 'Your name echoes to your Chapter and beyond as a paragon of strength and valour.']
      ]
    },
    combatDifficulty: {
      name: 'Combat Difficulty Summary',
      data: [
        ['Difficulty', 'Skill Modifier', 'Examples'],
        ['Easy', '+30', 'Attacking a Surprised or Unaware target, Shooting a Massive target, Shooting a target at Point Blank Range'],
        ['Routine', '+20', 'Attacking a Stunned opponent, Shooting an Enormous target, Melee attacks against a foe who is outnumbered two to one'],
        ['Ordinary', '+10', 'Attacking a Prone opponent with a melee weapon, Attacking from higher ground, Shooting a Hulking target, Shooting a target at Short Range'],
        ['Challenging', '+0', 'A Standard Attack'],
        ['Difficult', '–10', 'Any test whilst Fatigued, Attacking or Dodging whilst in the mud or heavy rain, Shooting a target at Long Range, Shooting a Prone target, Shooting a Scrawny target'],
        ['Hard', '–20', 'Shooting into melee combat, Dodging whilst Prone, Making an unarmed attack against an armed opponent, Melee attacks in darkness, Shooting at a target in fog, mist, shadow or smoke, Shooting a Puny target'],
        ['Very Hard', '–30', 'Using a weapon without the correct Talent, Attacking or Dodging in deep snow, Firing a heavy weapon that has not been Braced, Shooting a target at Extreme range, Shooting at a completely concealed target, Shooting at a target in darkness']
      ]
    },
    weaponCraftsmanship: {
      name: 'Weapon Craftsmanship',
      data: [
        ['Quality', 'Effect'],
        ['Poor', '–10 to hit. Jam on any failed to hit roll.'],
        ['Good', '+5 to hit.'],
        ['Best', '+10 to hit, +1 Damage.']
      ]
    },
    movement: {
      name: 'Movement (metres/round)',
      data: [
        ['AB', 'Half Move', 'Full Move', 'Charge', 'Run'],
        ['0', '1/2', '1', '2', '3'],
        ['1', '1', '2', '3', '6'],
        ['2', '2', '4', '6', '12'],
        ['3', '3', '6', '9', '18'],
        ['4', '4', '8', '12', '24'],
        ['5', '5', '10', '15', '30'],
        ['6', '6', '12', '18', '36'],
        ['7', '7', '14', '21', '42'],
        ['8', '8', '16', '24', '48'],
        ['9', '9', '18', '27', '54'],
        ['10', '10', '20', '30', '60']
      ]
    },
    weaponJams: {
      name: 'Weapon Jams',
      data: [
        ['Weapon Type', 'Jam Condition', 'Clear Jam'],
        ['Semi-Automatic Weapons', 'Unmodified roll of 96–00 weapon Jams', 'Full Action and BS Test to clear'],
        ['Full Auto Fire', 'Semi- and Full Auto Fire Jams on a 94–00', 'Full Action and BS Test to clear']
      ]
    },
    twoWeaponFighting: {
      name: 'Two-Weapon Fighting',
      data: [
        ['Rule', 'Description'],
        ['Weapon Restriction', 'Only one-handed weapons'],
        ['Single Attack Option', 'Make a single attack with either weapon (–20 for off-hand)'],
        ['Full Action Option', 'If you have the Two Weapon Wielder Talent, spend a Full Action to attack with both weapons, but at –20 to each (drops to –10 with Ambidextrous Talent)'],
        ['Shooting Restriction', 'If shooting with a gun in each hand, your targets must be within 10m of each other']
      ]
    },
    weaponsWithoutTalent: {
      name: 'Using Weapons without Talent',
      data: [
        ['Weapon Type', 'Penalty', 'Special'],
        ['All Weapons', '–20 penalty when using a weapon without the appropriate Talent', ''],
        ['Flame Weapons', '–20 penalty to hit', 'Targets receive +30 to Agility Test to avoid being hit']
      ]
    },
    unarmedCombat: {
      name: 'Unarmed Combat',
      data: [
        ['Aspect', 'Rule'],
        ['To Hit', 'WS to hit'],
        ['Damage', 'Inflicts 1d5–3 I+SB'],
        ['Armour Effect', 'Armour Points count as double'],
        ['Fatigue Effect', 'Inflicting damage greater than or equal to your target\'s Toughness Bonus also inflicts 1 level of Fatigue']
      ]
    },
    overwatchRules: {
      name: 'Overwatch Rules',
      data: [
        ['Aspect', 'Rule'],
        ['Setup', 'You take a Full Action to establish a kill zone 45-degrees from your facing and up to the Range of the weapon'],
        ['Waiting', 'You may spend subsequent Turns waiting for targets to enter the zone'],
        ['Available Actions', 'You may take the Full Auto Burst Action, Semi-Auto Burst Action, or Suppressing Fire to shoot any targets entering the zone'],
        ['Target Effect', 'Targets must make a Hard (–20) Willpower Test or become Pinned'],
        ['Duration', 'Overwatch may be maintained up to your WP Bonus in hours, or until the Full Burst Action has been used']
      ]
    },
    statusEffects: {
      name: 'Status Effects',
      data: [
        ['Status', 'Effect', 'Recovery'],
        ['Critical Damage', 'Critical Damage is cumulative', 'Consult relevant Critical Table (pages 252–259)'],
        ['Fatigued', 'Can suffer a number Fatigue equal to TB. Fatigued characters –10 all Tests', 'Each hour of complete rest removes 1 level of Fatigue; after 8 hours, Fatigue is reduced to 0'],
        ['Heavily Fatigued', 'If you suffer more Fatigue than TB, fall unconscious for 10–TB minutes', 'Rest as above'],
        ['Stunned', 'Stunned characters cannot take Actions (including free ones), opponents receive +20 to hit', 'Automatic recovery conditions vary'],
        ['Lightly Damaged', 'When a character has sustained Damage equal to their Wounds, all further Damage is Critical Damage', 'Healing'],
        ['Blood Loss', '10% chance of death each Round unless treated', 'Medical treatment']
      ]
    },
    suppressiveFire: {
      name: 'Suppressive Fire',
      data: [
        ['Aspect', 'Rule'],
        ['Area Effect', 'You can suppress an area 45-degrees from your facing and up to half the Range of the weapon'],
        ['Target Effect', 'Targets within this area must make a Hard (–20) Willpower Test or become Pinned'],
        ['Hit Determination', 'Make a Hard (–20) Ballistic Skill Test to determine if anyone in area has been hit, GM assigns hit to random target'],
        ['Multiple Hits', 'An extra hit is scored for every 2 degrees of success'],
        ['Jam Risk', 'Result of 94–00 on BS test indicates weapon has Jammed']
      ]
    },
    pinningRules: {
      name: 'Pinning Rules',
      data: [
        ['Aspect', 'Rule'],
        ['Effect', 'Pinned targets have Half Action only and suffer –20 BS and must keep cover between them and the shooter'],
        ['Recovery Test', 'Test Willpower to recover at the end of the Turn, +30 if not shot at'],
        ['Melee Escape', 'If engaged in melee, automatically escape']
      ]
    },
    multipleHits: {
      name: 'Multiple Hits From Semi and Full Auto Fire',
      data: [
        ['Location', 'Second Hit', 'Third Hit', 'Fourth Hit', 'Fifth Hit', 'Each Additional Hit'],
        ['Head', 'Head', 'Arm', 'Body', 'Arm', 'Body'],
        ['Arm', 'Arm', 'Body', 'Head', 'Body', 'Arm'],
        ['Body', 'Body', 'Arm', 'Head', 'Arm', 'Body'],
        ['Leg', 'Leg', 'Body', 'Arm', 'Head', 'Body']
      ]
    },
    hordeRules: {
      name: 'Horde Rules',
      data: [
        ['Aspect', 'Rule'],
        ['Basic Concept', 'A character can damage a Horde by shooting it with ranged weapons or attacking it in melee. These attacks are treated as if they are against a single creature even though they may represent mowing down ranks of enemies or scything through many foes'],
        ['Hit Rolls', 'Characters must still roll to hit a Horde, but the appropriate size bonus should apply to these tests based on the Horde\'s Magnitude'],
        ['Auto Fire', 'Weapons that can fire on full, or semi-auto will cause additional hits'],
        ['Hit Allocation', 'These hits must be allocated against the Horde and not any individual Lieutenants or Masters that may also be present']
      ]
    },
    hordeDamage: {
      name: 'Damaging a Horde',
      data: [
        ['Rule', 'Description'],
        ['Magnitude Reduction', 'Each hit that causes any amount of damage reduces a Horde\'s Magnitude by one. Therefore, an attack that, after accounting for armour and Toughness Bonus, causes 15 points of damage reduces the Horde\'s Magnitude by 1'],
        ['Weapon Effectiveness', 'The deliberate consequence of this is that sustained fire and blast weapons are much more effective against Hordes than weapons which fire only one shot; a lascannon is a weapon for destroying tanks, not mowing down large numbers of infantry'],
        ['Explosive Bonus', 'Weapons that inflict Explosive Damage (X) gain a bonus against Hordes, and count as having inflicted one additional Hit'],
        ['No Locations', 'Locations are not used when fighting a Horde'],
        ['Single Armour', 'A Horde has a single armour value at is applied to all damage rather than different armour values for different locations'],
        ['Pinning Resistance', 'Hordes may be Pinned as normal (with the entire Horde making a single Willpower Test). However, Hordes gain a bonus to their Willpower Tests to resist pinning equal to its Magnitude']
      ]
    },
    hordeMelee: {
      name: 'Horde Melee Combat',
      data: [
        ['Combat Type', 'Rule'],
        ['Melee Hits', 'When fighting against a Horde in Melee, a Space Marine inflicts one hit for every two Degrees of Success on his Weapon Skill Test'],
        ['Power Field Bonus', 'Melee weapons with the Power Field Quality inflict one additional hit'],
        ['Blast Weapons', 'A Blast weapon that hits a Horde hits a number of times equal to its Blast value. So a grenade with Blast (4) will automatically hit four times if successfully lobbed into the Horde']
      ]
    },
    autoFireRules: {
      name: 'Auto Fire Rules',
      data: [
        ['Fire Mode', 'Bonus', 'Hit Generation', 'Jam Risk'],
        ['Semi-Auto Burst', '+10 BS', 'For every 2 degrees of success gain another hit, as indicated on Multiple Hits Table (page 239), or can be allocated to another target within 2m', 'Result of 94–00 on BS test indicates weapon has Jammed'],
        ['Full Auto Burst', '+20 BS', 'For every degree of success gain another hit, as indicated on Multiple Hits Table (page 239), or can be allocated to another target within 2m', 'Result of 94–00 on BS Test indicates weapon has Jammed']
      ]
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-600">
      <h2 className="text-2xl font-semibold mb-4 text-white">GM Kit - Reference Tables</h2>
      <p className="text-sm text-slate-300 mb-6">Comprehensive Deathwatch reference tables for quick gameplay lookup.</p>
      
      {/* Table Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(tables).map(([key, table]) => (
          <button
            key={key}
            onClick={() => setActiveTable(key)}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              activeTable === key 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            }`}
          >
            {table.name}
          </button>
        ))}
      </div>

      {/* Active Table Display */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">{tables[activeTable].name}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600">
                {tables[activeTable].data[0].map((header, index) => (
                  <th key={index} className="px-3 py-2 text-left text-slate-300 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tables[activeTable].data.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-600 hover:bg-slate-800">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-slate-200 text-xs">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
