import React, { useState } from 'react';

export default function GMKit({ authedPlayer }) {
  const [activeTable, setActiveTable] = useState('difficulty');

  if (authedPlayer !== 'gm') return (
    <div className="p-6 rounded-lg bg-red-900/20 border border-red-500/30">
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
    }
  };

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h2 className="text-2xl font-semibold mb-4 text-white">GM Kit - Reference Tables</h2>
      <p className="text-sm text-slate-300 mb-6">Quick reference tables for Deathwatch gameplay.</p>
      
      {/* Table Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(tables).map(([key, table]) => (
          <button
            key={key}
            onClick={() => setActiveTable(key)}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              activeTable === key 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700/50 text-slate-200 hover:bg-slate-600/50'
            }`}
          >
            {table.name}
          </button>
        ))}
      </div>

      {/* Active Table Display */}
      <div className="bg-white/3 rounded-lg p-4 border border-white/5">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">{tables[activeTable].name}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {tables[activeTable].data[0].map((header, index) => (
                  <th key={index} className="px-3 py-2 text-left text-slate-300 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tables[activeTable].data.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-white/5">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-slate-200">
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
Trivial
Elementary
Simple
Easy
Routine
Ordinary
Challenging
Difficult
Hard
Very Hard
Arduous
Punishing
Hellish
Test
Modifier
+60
+50
+40
+30
+20
+10
+0
–10
–20
–30
–40
–50
–60
Hit Locations
Roll
01–10
11–20
21–30
31–70
71–85
86–00
Location
Head
Right Arm
Left Arm
Body
Right Leg
Left Leg
Critical Tables
Energy
Explosive
Impact
Rending
(page 252 to 253)
(page 254 to 255)
(page 256 to 257)
(page 258 to 259)
Weapon
Craftsmanship
–10 to hit. Jam on
any failed to hit roll.
Good +5 to hit.
+10 to hit, +1
Best
Damage.
Poor
Ranged Weapons
Name
Bolt Weapons
Class
Range RoF
Dmg
Combat Actions
Pen Clip Rld
Astartes Bolt Pistol
Pistol
30m
S/3/– 2d10+5 X 5
14
Full
Tearing
Astartes Bolter (Godwyn) Basic
100m S/2/4 2d10+5 X 5
28
Full
Tearing
Astartes Boltgun (Stalker) Basic
200m S/–/– 2d10+5 X 5
24
Full
Accurate, Tearing
100m S/2/4 2d10+5 X 5
28
Full
Tearing
Astartes Combi-Weapon†† Basic
Astartes Heavy Bolter
Heavy
150m –/–/10 2d10+10 X 6
60
Full
Tearing
Astartes Storm Bolter
Basic
100m S/2/4 2d10+5 X 5
60
2 Full Storm, Tearing
†
Profile is for the primary bolter. Secondary weapon has RoF: S/–/– and Clip: 1, with all other statistics as per the weapon’s entry.
Plasma Weapons
Astartes Plasma Cannon
Astartes Plasma Gun
(Ragefire)
Astartes Plasma Pistol
Heavy150mS/–/–2d10+11 E 10165 FullBlast (1), Volatile
Basic100mS/2/–1d10+9 E8404 FullVolatile
Pistol30mS/2/–1d10+8 E8123 FullVolatile
Melta Weapons
Astartes Infernus Pistol
Astartes Meltagun
(Vulkan)
Astartes Multi-melta
(Maxima)
Pistol
10m
S/–/–
2d10+8 E
13
4
Adds extra AP to locations
hidden by cover.
Cover Type
AP
Light Wood, Armour-glas,
4
Light Metal
Heavy Wood, Flakboard,
8
Sandbags, Ice
Rockcrete, Thick Iron,
16
Stone
Plasteel, Armaplas
32
Full
–
Basic20mS/–/–2d10+8 E1362 Full–
Heavy60mS/–/–4d10+6 E13122 FullBlast (1)
Flame Weapons
Astartes Flamer
Astartes Hand Flamer
Astartes Heavy Flamer
Basic
Pistol
Heavy
20m
10m
30mS/–/–
S/–/–
S/–/–2d10+2 E
2d10+2 E
2d10+6 E3
3
66
4
102 Full
2 Full
2 FullFlame
Flame
Flame
150m
30m
90m
30m–/–/10
S/2/–
S/3/10
S/–/63d10+6 I
2d10+3 I
1d10+3 I
1d10+2 I6
0
0
0200
18
30
183 Full
Full
2 Full
FullTearing
Reliable, Scatter
–
–
Solid Projectile Weapons
Astartes Assault Cannon
Astartes Shotgun
Autogun
Autopistol
Mounted
Basic
Basic
Pistol
Las Weapons
Astartes Lascannon
Lasgun
Laspistol
Heavy
Basic
Pistol
300m
100m
30m
S/–/–
S/3/–
S/–/–6d10+10 E 10
1d10+3 E 0
1d10+2 E 06
60
302 Full
Full
Full–
Reliable
Reliable
S/2/–†††††123 Full††
S/–/–†††††8Full††
Launchers
Astartes Cyclone Missile
Mounted 300m
Launcher
Astartes Missile Launcher
Heavy
250m
(Soundstrike)
Auxiliary Grenade
n/a
45m
Launcher
††
Varies with ammunition
S/–/–
††
†††
4
0–19
20–39
40–59
60-79
80+
Initiated: You have recently sworn your oaths of
duty to the Deathwatch.
Respected: You have proven your prowess
repeatedly through bravery and blood.
Distinguished: You have earned an impressive
number of victories safeguarding humanity
against its enemies.
Famed: Your reputation precedes you, and your
deeds are known to Battle-Brothers across the
Reach.
Hero: Your name echoes to your Chapter and
beyond as a paragon of strength and valour.
© Games Workshop Limited 2010. Games Workshop, Warhammer 40,000, Warhammer 40,000 Role Play, Deathwatch and all associated marks ®, TM and/
or © Games Workshop Ltd 2000-2010, variably registered in the UK and other countries around the world.
2 Full
4
††
8
Half
Called ShotFull
Charge
Defensive Stance
Delay
Disengage
Dodge
Feint
Focus Power
Full Auto Burst
Grapple
Guarded Attack
Jump or Leap
Knock-Down
Manoeuvre
Move
Multiple Attacks
Overwatch
Parry
Ready
Reload
Run
Semi-Auto Burst
Stand/Mount
Standard Attack
Stun
Suppressing Fire
Tactical Advance
Use a SkillFull
Full
Half
Full
Reaction
Half
Varies
Full
Half/Full
Full
Full
Half
Half
Half/Full
Full
Full
Reaction
Half
Varies
Full
Full
Half
Half
Full
Full
Full
Varies
Accurate:
Balanced:
Blast (X):
3
5
Target
6-7
Type
Half/Full
Full
Subtype(s)
Concentration
Attack, Melee
Miscellaneous
Attack, Concentration, Melee
or Ranged
Attack, Melee, Movement
Concentration, Melee
Miscellaneous
Movement
Movement
Attack, Melee
Varies
Attack, Ranged
Attack, Melee
Attack, Concentration, Melee
Movement
Attack, Melee
Attack, Melee, Movement
Movement
Attack, Melee or Ranged
Attack, Concentration, Ranged
Defence, Melee
Miscellaneous
Miscellaneous
Movement
Attack, Ranged
Movement
Attack, Melee or Ranged
Attack, Melee
Attack, Ranged
Concentration, Movement
Concentration, Miscellaneous
9-0
Scatter Diagram
Melee Weapons
Description
+10 bonus to hit as a Half Action or +20 to hit as a Full Action on your next attack.
+20 to WS, cannot Dodge or Parry.Name
Chain WeaponsClass
Astartes ChainswordMelee
Prepare to fire a heavy weapon.Power Weapons
Attack a specific location on your target with a –20 to WS or BS.
Must move 4 metres, +10 to WS.
Gain an additional Reaction, opponents suffer –20 to WS.
Before your next Turn take any Half Action.
Break off from melee and move.
Test Dodge to negate a hit.
Opposed WS Test, if you win, your next attack cannot be Dodged or Parried.
Use a Psychic Power.
+20 to BS, additional hit for every degree of success.
Affect a Grappled opponent or escape from a Grapple.
–10 WS, +10 to Parry and Dodge.
Jump vertically or leap horizontally.
Try and knock an opponent to the ground.
Opposed WS Test, if you win, move enemy 1 metre.
Move up to your movement as a Half Action or twice your movement as a Full Action.
Attack more than once in the same round—requires two weapons or a talent.
Shoot targets coming into a set kill zone, –20 to BS.
Test Weapon Skill to negate a hit.
Ready a weapon or item.
Reload a ranged weapon.
Move triple, enemies –20 BS and +20 WS.
+10 to BS, additional hit for every two degrees of success.
Stand up or mount a riding animal.
Make one melee or ranged attack.
Try to Stun an opponent.
Force opponents to take cover, –20 to BS.
Move from cover to cover.
You may use a Skill.
Weapon Qualities
2
1
Renown
Renown Rating Renown Rank
Cover Types
Special
Action
Aim
All Out Attack
Brace Heavy
Weapon
Additional +10 to hit when used with an Aim Action.
+10 to Parry.
All within the weapon’s blast radius in metres is hit. Roll Hit
Location and Damage individually for each person affected.
Concussive: Target must pass a Toughness Test (–10 per Degree of
Success on the attack) or is Stunned for 1 Round. Target is
possibly knocked down.
efensive:
+15 to Parry, –10 to hit.
evastating (X): The weapon does one additional point of Cohesion
Damage. If the target is a Horde, the Horde suffers
additional hits equal to the number in parenthesis.
Felling (X):
The weapon ignores a number of levels of Unnatural
Toughness possessed by the target equal to the number in
parenthesis.
Flame:
No BS Test. All creatures in a 30 degree arc make Agility
Test or be struck by flame and take Damage. If Damage is
taken, the target must
succeed on second Agility Test or
catch fire.
Gyro-Stabilised: This weapon never counts its target as being further
than Long Range. Heavy Weapons only suffer a –20 when
not braced.
Haywire (X): This weapon generates a field that troubles the machine
spirits of technology. See page 143 for details.
Overheats:
Unmodified roll of 91 or more on to hit roll causes
Overheat, see page 129.
Power Field: When Parrying an attack made with a weapon that lacks this
quality, there is a 75% chance of destroying the attacker’s
weapon.
Primitive:
AP doubled, unless armour also has Primitive quality.
Razor Sharp: If the attack roll results in two or more degrees of success,
double the weapon’s Penetration.
Recharge:
Can only fire every-other Round.
Reliable:
If Jam, roll 1d10 and only on roll of 10 has it Jammed.
Sanctified:
This weapon deals Holy damage, which has certain effects
on Daemonic and warp creatures.
Scatter:
At Point Blank range, each 2 degrees of success scores
another hit. AP doubled at Long and Extreme ranges.
Shocking:
If weapon causes Damage, Test Toughness or Stunned (+10
bonus per AP).
Smoke:
Creates smoke screen 3d10 metres in diameter, lasts 2d10
Rounds.
Snare:
The target must make an Agility Test or be immobilised. An
immobilised target can attempt no other Actions except to
try to escape the bonds. He can attempt to burst the bonds
(a Strength Test) or wriggle free (an Agility Test) in his Turn.
The target is considered helpless until he escapes.
Storm:
Doubles the number of hits inflicted on the target.
Tearing:
Roll two dice for Damage, take the best result.
Toxic:
If weapon causes Damage, Test Toughness at –5 for every
point of Damage taken, if failed take extra 1d10 Impact
Damage (no reduction for armour or Toughness).
Twin-linked: +20 to hit, may score one additional hit if the attack roll
succeeds by two or more degrees of success.
Unbalanced: –10 when used to Parry.
Unwieldy:
Cannot be used to Parry.
Volatile:
If a 10 is rolled for Damage on a weapon with the Volatile
Quality, Rightous Fury occurs automatically.
Astartes Chainfist
Astartes Lightning Claw
Astartes Power Axe
Astartes Power Fist
Astartes Power Sword
Dmg
Pen Special
1d10+3 R4Balanced, Tearing
Mounted 2d10† E
Melee
1d10+6 E
Melee
1d10+8 E
Melee
2d10† E
Melee
1d10+6 E10
8
6
9
6Power Field, Tearing
Power Field, Special, Tearing
Power Field, Unbalanced
Power Field, Unwieldy
Balanced, Power Field
Power Field, Concussive,
Unwieldy
Astartes Thunder Hammer Melee
2d10+5 E
8
Omnissian Axe (Astartes-
Melee
2d10+6 E
6
Power Field, Unbalanced
Pattern) ††
†
Chainfists and Power Fists double the wielder’s Strength Bonus when adding to Melee Damage.
††
Only Techmarines are entrusted with this weapon.
raditional Weapons
Astartes Combat Knife
Ceremonial Sword†††
Sacris Claymore†††
Melee
Melee
Melee1d10+2 R
1d10+3 R
2d10+2 R2
2
2–
Balanced
Unbalanced
Melee
Melee1d10+1 I
1d10+2 R0
2Balanced, Special
Balanced, Special
Force Weapons
Astartes Force Staff
Astartes Force Sword
Other Melee Weapons
Primitive Weapons
Melee
1d10 I
0
Primitive
Improvised
Melee
1d10–2 I
0
Primitive, Unbalanced
†††
See Page 170 for description
Note: Characters using melee weapons add their SB to the Damage they inflict.
Combat Difficulty Summary
Difficulty
Easy
Skill Modifier Example
+30
Routine+20
Ordinary+10
Challenging+0
Difficult–10
Hard
Very Hard
–20
–30
Attacking a Surprised or Unaware target.
Shooting a Massive target.
Shooting a target at Point Blank Range.
Attacking a Stunned opponent.
Shooting an Enormous target.
Melee attacks against a foe who is outnumbered two to one.
Attacking a Prone opponent with a melee weapon.
Attacking from higher ground.
Shooting a Hulking target.
Shooting a target at Short Range.
A Standard Attack.
Any test whilst Fatigued.
Attacking or Dodging whilst in the mud or heavy rain.
Shooting a target at Long Range.
Shooting a Prone target.
Shooting a Scrawny target.
Shooting into melee combat.
Dodging whilst Prone.
Making an unarmed attack against an armed opponent.
Melee attacks in darkness.
Shooting at a target in fog, mist, shadow or smoke.
Shooting a Puny target.
Using a weapon without the correct Talent.
Attacking or Dodging in deep snow.
Firing a heavy weapon that has not been Braced.
Shooting a target at Extreme range.
Shooting at a completely concealed target.
Shooting at a target in darkness.
Armour
Weapon JamsSemi-Automatic Weapons
An unmodified roll of 96–00 weapon Jams. Full
Action and BS Test to clear. Semi- and Full Auto
Fire Jams on a 94–00.+10 BS, for every 2 degrees of success gain another hit, as indicated on
Multiple Hits Table (page 239), or can be allocated to another target within
2m. Result of 94–00 on BS test indicates weapon has Jammed.
Two-Weapon FightingFull Automatic Weapons
Only one-handed weapons. Either make a single
attack with either weapon (–20 for off-hand), or if
you have the Two Weapon Wielder Talent, spend
a Full Action to attack with both weapons, but
at –20 to each (drops to –10 with Ambidextrous
Talent). If shooting with a gun in each hand, your
targets must be within 10m of each other.
Using Weapons without Talent
–20 penalty when using a weapon without
the appropriate Talent. In the case of Flame
weapons, targets receive +30 to Agility Test to
avoid being hit.
Unarmed Combat
WS to hit, inflicts 1d5–3 I+SB. Armour Points
count as double. In addition, inflicting damage
greater than or equal to your target’s Toughness
Bonus also inflicts 1 level of Fatigue.
+20 BS, for every degree of success gain another hit, as indicated on
Multiple Hits Table (page 239), or can be allocated to another target within
2m. Result of 94–00 on BS Test indicates weapon has Jammed.
Overwatch
You take a Full Action to establish a kill zone 45-degrees from your facing
and up to the Range of the weapon. You may spend subsequent Turns
waiting for targets to enter the zone. You may take the Full Auto Burst
Action, Semi-Auto Burst Action, or Suppressing Fire to shoot any targets
entering the zone, targets must make a Hard (–20) Willpower Test or
become Pinned. Overwatch may be maintained up to your WP Bonus in
hours, or until the Full Burst Action has been used.
Damage
Critical Damage is cumulative.
Fatigue
Can suffer a number Fatigue equal to TB. Fatigued
characters –10 all Tests. If you suffer more Fatigue
than TB, fall unconscious for 10–TB minutes.
Each hour of complete rest removes 1 level of
Fatigue; after 8 hours, Fatigue is reduced to 0.
Stunned
You can suppress an area 45-degrees from your facing and up to half the
Range of the weapon. Targets within this area must make a Hard (–20)
Willpower Test or become Pinned. Make a Hard (–20) Ballistic Skill Test to
determine if anyone in area has been hit, GM assigns hit to random target.
An extra hit is scored for every 2 degrees of success. Result of 94–00 on
BS test indicates weapon has Jammed.
Stunned characters cannot take Actions (including
free ones), opponents receive +20 to hit.
Lightly Damaged
Heavily Damaged
If Damage taken is more than twice TB.
Blood Loss
10% chance of death each Round unless treated.
Pinned targets have Half Action only and suffer –20 BS and must keep
cover between them and the shooter. Test Willpower to recover at the end
of the Turn, +30 if not shot at. If engaged in melee, automatically escape.
Location Second ThirdFourthFifthEach
Additional Hit
HeadHeadArmBodyArmBody
ArmArmBodyHeadBodyArm
BodyBodyArmHeadArmBody
LegLegBodyArmHeadBody
Movement (metres/round)
Half Move
1/2
1
2
3
4
5
6
7
8
9
10
Full Move
1
2
4
6
8
10
12
14
16
18
20
Hordes
Charge
2
3
6
9
12
15
18
21
24
27
30
A character can damage a Horde by shooting it with ranged
weapons or attacking it in melee. These attacks are treated
as if they are against a single creature even though they may
represent mowing down ranks of enemies or scything through
many foes.
Characters must still roll to hit a Horde, but the appropriate size
bonus should apply to these tests based on the Horde’s Magnitude.
Weapons that can fire on full, or semi-auto will cause additional hits.
These hits must be allocated against the Horde and not any individual
Lieutenants or Masters that may also be present.
Damaging a Horde
Multiple Hits From
Semi and Full auto fire
AB
0
1
2
3
4
5
6
7
8
9
10
Locations Covered AP
Astartes Power Armour
All
8/10
Astartes Artificer Armour
All
12
Astartes Scout Armour
Body, Arms
6
Astartes Terminator Armour
All
14
Primitive Armour
Varies
Varies
Carapace Armour
All
6
Diagnostor Helmet
Head
8
Masking Screen
–
–
Flak Armour
All
4
†
Artificer armour is not available on a per-mission basis; it must be obtained as
Signature Gear.
Attacking a Horde
Suppressive Fire
Pinning
When a character has sustained Damage equal
to their Wounds, all further Damage is Critical
Damage. When Critical Damage is suffered,
consult the relevant Critical Table (pages 252–
259), determined by the type of Damage (Energy,
Impact, Rending or Explosive) and the Hit
Location of the attack, and apply the effect. All
Name
Run
3
6
12
18
24
30
36
42
48
54
60
• Each hit that causes any amount of damage reduces a Horde’s
Magnitude by one. Therefore, an attack that, after accounting
for armour and Toughness Bonus, causes 15 points of
damage reduces the Horde’s Magnitude by 1. The deliberate
consequence of this is that sustained fire and blast weapons are
much more effective against Hordes than weapons which fire
only one shot; a lascannon is a weapon for destroying tanks, not
mowing down large numbers of infantry.
• Weapons that inflict Explosive Damage (X) gain a bonus against
Hordes, and count as having inflicted one additional Hit.
• Locations are not used when fighting a Horde.
• A Horde has a single armour value at is applied to all damage
rather than different armour values for different locations.
• Hordes may be Pinned as normal (with the entire Horde making
a single Willpower Test). However, Hordes gain a bonus to their
Willpower Tests to resist pinning equal to its Magnitude.
Melee: When fighting against a Horde in Melee, a Space Marine
inflicts one hit for every two Degrees of Success on his Weapon
Skill Test. Melee weapons with the Power Field Quality inflict one
additional hit.
Blast Weapons: A Blast weapon that hits a Horde hits a number
of times equal to its Blast value. So a grenade with Blast (4) will
automatically hit four times if successfully lobbed into the Horde.