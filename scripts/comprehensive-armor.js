#!/usr/bin/env node

/**
 * Comprehensive armor dataset based on the 40k RPG Tools website
 */

const fs = require('fs');
const path = require('path');

// Comprehensive armor dataset based on the 40k RPG Tools website
const comprehensiveArmorData = {
  "powerArmor": [
    {
      "name": "Armour of the Remorseless Crusader",
      "req": 70,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 12,
          "arms": 12,
          "body": 12,
          "legs": 12
        },
        "source": "Deathwatch Core Rulebook p167"
      }
    },
    {
      "name": "Astartes Artificer Armour",
      "req": 60,
      "renown": "Hero",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 12,
          "arms": 12,
          "body": 12,
          "legs": 12
        },
        "source": "Deathwatch Core Rulebook p163"
      }
    },
    {
      "name": "Astartes Mk 1 Thunder Power Armour",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 0,
          "arms": 6,
          "body": 8,
          "legs": 4
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk 2 Crusade Power Armour",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 0,
          "arms": 7,
          "body": 9,
          "legs": 7
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk 3 Iron Power Armour",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 0,
          "arms": 9,
          "body": 10,
          "legs": 9
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk 4 Maximus Power Armour",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 0,
          "arms": 7,
          "body": 9,
          "legs": 7
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk 5 Heresy Power Armour",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 0,
          "arms": 8,
          "body": 9,
          "legs": 8
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk 6 Corvus Power Armour",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 0,
          "arms": 8,
          "body": 9,
          "legs": 8
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk 7 Aquilla Power Armour",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 0,
          "arms": 8,
          "body": 10,
          "legs": 8
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk 8 Errant Power Armour",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 0,
          "arms": 8,
          "body": 11,
          "legs": 8
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Power Armour",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 0,
          "arms": 8,
          "body": 10,
          "legs": 8
        },
        "source": "Deathwatch Core Rulebook p160"
      }
    },
    {
      "name": "Astartes Tactical Dreadnaught-Terminator Armour",
      "req": 100,
      "renown": "Famed",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 0,
          "arms": 14,
          "body": 14,
          "legs": 14
        },
        "source": "Deathwatch Core Rulebook p164"
      }
    },
    {
      "name": "Astartes Terminator Armour",
      "req": 100,
      "renown": "Famed",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 14,
          "arms": 14,
          "body": 14,
          "legs": 14
        },
        "source": "Deathwatch Core Rulebook p164"
      }
    },
    {
      "name": "CM Power Armour",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 8,
          "arms": 8,
          "body": 10,
          "legs": 8
        },
        "source": "Mark of the Xenos p114"
      }
    },
    {
      "name": "Dmn Armour of Chaos",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 12,
          "arms": 12,
          "body": 12,
          "legs": 12
        },
        "source": "Deathwatch Core Rulebook p362"
      }
    },
    {
      "name": "Tau XV-8 Crisis Battlesuit",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 9,
          "arms": 9,
          "body": 9,
          "legs": 9
        },
        "source": "Mark of the Xenos p9"
      }
    },
    {
      "name": "Tau XV-88 Broadside Battlesuit",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 12,
          "arms": 12,
          "body": 12,
          "legs": 12
        },
        "source": "Mark of the Xenos p6"
      }
    },
    {
      "name": "Tau XV15 Stealth Suit (Limbs)",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 0,
          "arms": 7,
          "body": 0,
          "legs": 7
        },
        "source": "Deathwatch Core Rulebook p367"
      }
    },
    {
      "name": "Tau XV15 Stealth Suit (Top)",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 8,
          "arms": 0,
          "body": 8,
          "legs": 0
        },
        "source": "Deathwatch Core Rulebook p367"
      }
    },
    {
      "name": "Tau XV8 Crisis Suit",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 9,
          "arms": 9,
          "body": 9,
          "legs": 9
        },
        "source": "Deathwatch Core Rulebook p366"
      }
    }
  ],
  "powerArmorHelms": [
    {
      "name": "Astartes Mk1 Power Armour Helm",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 6,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk2 Power Armour Helm",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 7,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk3 Power Armour Helm",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 9,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk4 Power Armour Helm",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 7,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk5 Power Armour Helm",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 8,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk6 Power Armour Helm",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 8,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk7 Power Armour Helm",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 8,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Mk8 Power Armour Helm",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 8,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Rites of Battle p151"
      }
    },
    {
      "name": "Astartes Power Armour Helm",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 8,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Deathwatch Core Rulebook p160"
      }
    },
    {
      "name": "Astartes Tactical Dreadnaught-Terminator Armour Helm",
      "req": 100,
      "renown": "Famed",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 14,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Deathwatch Core Rulebook p164"
      }
    },
    {
      "name": "Diagnostor Helmet",
      "req": 15,
      "renown": "Any",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 8,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Deathwatch Core Rulebook p165"
      }
    },
    {
      "name": "Fenris Pattern Wolf Helm",
      "req": 0,
      "renown": "Respected",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 8,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Rites of Battle p143"
      }
    },
    {
      "name": "Skull Helm",
      "req": 0,
      "renown": "Any",
      "category": "Power Armor Helm",
      "stats": {
        "type": "Power",
        "protection": {
          "head": 9,
          "arms": 0,
          "body": 0,
          "legs": 0
        },
        "source": "Rites of Battle p143"
      }
    }
  ],
  "carapaceArmor": [
    {
      "name": "Astartes Scout Armour",
      "req": 0,
      "renown": "Any",
      "category": "Carapace Armor",
      "stats": {
        "type": "Carapace",
        "protection": {
          "head": 0,
          "arms": 6,
          "body": 6,
          "legs": 0
        },
        "source": "Deathwatch Core Rulebook p163"
      }
    },
    {
      "name": "Chaos Flak Robes and Brazen Carapace",
      "req": 0,
      "renown": "Any",
      "category": "Carapace Armor",
      "stats": {
        "type": "Carapace",
        "protection": {
          "head": 5,
          "arms": 5,
          "body": 6,
          "legs": 4
        },
        "source": "Deathwatch Core Rulebook p364"
      }
    },
    {
      "name": "Deathwatch Scout Armor",
      "req": 0,
      "renown": "Any",
      "category": "Carapace Armor",
      "stats": {
        "type": "Carapace",
        "protection": {
          "head": 0,
          "arms": 6,
          "body": 6,
          "legs": 6
        },
        "source": "Rites of Battle p142"
      }
    },
    {
      "name": "Tau Fire Warrior Armour",
      "req": 0,
      "renown": "Any",
      "category": "Carapace Armor",
      "stats": {
        "type": "Carapace",
        "protection": {
          "head": 6,
          "arms": 6,
          "body": 6,
          "legs": 6
        },
        "source": "Deathwatch Core Rulebook p368"
      }
    },
    {
      "name": "Tau Pathfinder Armour",
      "req": 0,
      "renown": "Any",
      "category": "Carapace Armor",
      "stats": {
        "type": "Carapace",
        "protection": {
          "head": 7,
          "arms": 0,
          "body": 7,
          "legs": 0
        },
        "source": "Mark of the Xenos p25"
      }
    }
  ],
  "naturalArmor": [
    {
      "name": "Tau Gun Drone Armour",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 5,
          "arms": 5,
          "body": 5,
          "legs": 5
        },
        "source": "Deathwatch Core Rulebook p367"
      }
    },
    {
      "name": "Tyr Bonded Exoskeleton",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 10,
          "arms": 10,
          "body": 10,
          "legs": 10
        },
        "source": "Deathwatch Core Rulebook p370"
      }
    },
    {
      "name": "Tyr Chitinous Carapace",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 3,
          "arms": 3,
          "body": 3,
          "legs": 3
        },
        "source": "Deathwatch Core Rulebook p371"
      }
    },
    {
      "name": "Tyr Reinforced Chitin",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 8,
          "arms": 8,
          "body": 8,
          "legs": 8
        },
        "source": "Deathwatch Core Rulebook p371"
      }
    },
    {
      "name": "Tyr Exoskeleton",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 2,
          "arms": 2,
          "body": 2,
          "legs": 2
        },
        "source": "Mark of the Xenos p43"
      }
    },
    {
      "name": "Tyr Hardened Carapace",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 6,
          "arms": 6,
          "body": 6,
          "legs": 6
        },
        "source": "Mark of the Xenos p40"
      }
    },
    {
      "name": "Tyr Light Reinforced Chitin",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 4,
          "arms": 4,
          "body": 4,
          "legs": 4
        },
        "source": "Mark of the Xenos p39"
      }
    },
    {
      "name": "Tyr Medium Reinforced Chitin",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 6,
          "arms": 6,
          "body": 6,
          "legs": 6
        },
        "source": "Mark of the Xenos p37"
      }
    },
    {
      "name": "Tyr Thickened Scales",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 10,
          "arms": 10,
          "body": 10,
          "legs": 10
        },
        "source": "Mark of the Xenos p46"
      }
    },
    {
      "name": "Vespid Chitin",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 3,
          "arms": 3,
          "body": 3,
          "legs": 3
        },
        "source": "Mark of the Xenos p26"
      }
    },
    {
      "name": "Xenos Hardened Hide",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 6,
          "arms": 6,
          "body": 6,
          "legs": 6
        },
        "source": "Mark of the Xenos p66"
      }
    },
    {
      "name": "Xenos Scaly Hide",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 3,
          "arms": 3,
          "body": 3,
          "legs": 3
        },
        "source": "Mark of the Xenos p63"
      }
    },
    {
      "name": "Xenos Slimey Hide",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 2,
          "arms": 2,
          "body": 2,
          "legs": 2
        },
        "source": "Mark of the Xenos p68"
      }
    },
    {
      "name": "Xenos Thick Scales",
      "req": 0,
      "renown": "Any",
      "category": "Natural Armor",
      "stats": {
        "type": "Natural",
        "protection": {
          "head": 5,
          "arms": 5,
          "body": 5,
          "legs": 5
        },
        "source": "Mark of the Xenos p65"
      }
    }
  ],
  "primitiveArmor": [
    {
      "name": "Auran Golden Saurian Scale Armour",
      "req": 0,
      "renown": "Any",
      "category": "Primitive Armor",
      "stats": {
        "type": "Primitive",
        "protection": {
          "head": 6,
          "arms": 6,
          "body": 6,
          "legs": 6
        },
        "source": "The Emperor Protects p48"
      }
    },
    {
      "name": "Auran Saurian Scale Armour",
      "req": 0,
      "renown": "Any",
      "category": "Primitive Armor",
      "stats": {
        "type": "Primitive",
        "protection": {
          "head": 4,
          "arms": 4,
          "body": 4,
          "legs": 4
        },
        "source": "The Emperor Protects p46"
      }
    },
    {
      "name": "Scales",
      "req": 0,
      "renown": "Any",
      "category": "Primitive Armor",
      "stats": {
        "type": "Primitive",
        "protection": {
          "head": 2,
          "arms": 2,
          "body": 2,
          "legs": 2
        },
        "source": "The Emperor Protects p50"
      }
    },
    {
      "name": "Scaly Hide",
      "req": 0,
      "renown": "Any",
      "category": "Primitive Armor",
      "stats": {
        "type": "Primitive",
        "protection": {
          "head": 4,
          "arms": 4,
          "body": 4,
          "legs": 4
        },
        "source": "The Emperor Protects p46"
      }
    }
  ],
  "xenosArmor": [
    {
      "name": "Nec Metallic Exoskeleton",
      "req": 0,
      "renown": "Any",
      "category": "Xenos Armor",
      "stats": {
        "type": "Necron",
        "protection": {
          "head": 8,
          "arms": 8,
          "body": 8,
          "legs": 8
        },
        "source": "The Emperor Protects p94"
      }
    },
    {
      "name": "Nec Metallic Shell",
      "req": 0,
      "renown": "Any",
      "category": "Xenos Armor",
      "stats": {
        "type": "Necron",
        "protection": {
          "head": 10,
          "arms": 10,
          "body": 10,
          "legs": 10
        },
        "source": "The Emperor Protects p94"
      }
    },
    {
      "name": "Ork Eavy Armour",
      "req": 0,
      "renown": "Any",
      "category": "Xenos Armor",
      "stats": {
        "type": "Ork",
        "protection": {
          "head": 6,
          "arms": 4,
          "body": 6,
          "legs": 4
        },
        "source": "Mark of the Xenos p57"
      }
    },
    {
      "name": "Ork Flak Armour",
      "req": 0,
      "renown": "Any",
      "category": "Xenos Armor",
      "stats": {
        "type": "Ork",
        "protection": {
          "head": 0,
          "arms": 0,
          "body": 2,
          "legs": 0
        },
        "source": "Mark of the Xenos p57"
      }
    },
    {
      "name": "Ork Mega Armour",
      "req": 0,
      "renown": "Any",
      "category": "Xenos Armor",
      "stats": {
        "type": "Ork",
        "protection": {
          "head": 6,
          "arms": 10,
          "body": 14,
          "legs": 10
        },
        "source": "Mark of the Xenos p57"
      }
    }
  ],
  "otherArmor": [
    {
      "name": "Chaos Armour Plating",
      "req": 0,
      "renown": "Any",
      "category": "Other Armor",
      "stats": {
        "type": "Other",
        "protection": {
          "head": 6,
          "arms": 6,
          "body": 6,
          "legs": 6
        },
        "source": "Mark of the Xenos p91"
      }
    },
    {
      "name": "Chaos Bones of Subersion",
      "req": 0,
      "renown": "Any",
      "category": "Other Armor",
      "stats": {
        "type": "Other",
        "protection": {
          "head": 9,
          "arms": 9,
          "body": 9,
          "legs": 9
        },
        "source": "Mark of the Xenos p86"
      }
    },
    {
      "name": "Chaos Slinnar Obsidian Shell",
      "req": 0,
      "renown": "Any",
      "category": "Other Armor",
      "stats": {
        "type": "Other",
        "protection": {
          "head": 8,
          "arms": 8,
          "body": 8,
          "legs": 8
        },
        "source": "Mark of the Xenos p92"
      }
    },
    {
      "name": "Chaos Warded Adamantine Shell",
      "req": 0,
      "renown": "Any",
      "category": "Other Armor",
      "stats": {
        "type": "Other",
        "protection": {
          "head": 9,
          "arms": 9,
          "body": 9,
          "legs": 9
        },
        "source": "Mark of the Xenos p95"
      }
    },
    {
      "name": "Daemon Iron Hide",
      "req": 0,
      "renown": "Any",
      "category": "Other Armor",
      "stats": {
        "type": "Other",
        "protection": {
          "head": 13,
          "arms": 13,
          "body": 13,
          "legs": 13
        },
        "source": "Mark of the Xenos p101"
      }
    },
    {
      "name": "Dmn Brazen Chaos Armour",
      "req": 0,
      "renown": "Any",
      "category": "Other Armor",
      "stats": {
        "type": "Other",
        "protection": {
          "head": 12,
          "arms": 12,
          "body": 12,
          "legs": 12
        },
        "source": "The Emperor Protects p136"
      }
    },
    {
      "name": "Obliterator Warped Mechnical Flesh",
      "req": 0,
      "renown": "Any",
      "category": "Other Armor",
      "stats": {
        "type": "Other",
        "protection": {
          "head": 12,
          "arms": 12,
          "body": 12,
          "legs": 12
        },
        "source": "Mark of the Xenos p120"
      }
    },
    {
      "name": "Rad Corrupted Mechnical Flesh",
      "req": 0,
      "renown": "Any",
      "category": "Other Armor",
      "stats": {
        "type": "Other",
        "protection": {
          "head": 7,
          "arms": 7,
          "body": 7,
          "legs": 7
        },
        "source": "The Emperor Protects p91"
      }
    }
  ],
  "shields": [
    {
      "name": "Astartes Storm Shield - Protective",
      "req": 35,
      "renown": "Distinguished",
      "category": "Shield",
      "stats": {
        "type": "Shield",
        "protection": {
          "head": 0,
          "arms": "0LA 4RA",
          "body": 4,
          "legs": 0
        },
        "source": "Deathwatch Core Rulebook p166"
      }
    }
  ]
};

function main() {
  try {
    console.log('Using comprehensive armor dataset...');
    
    // Count items
    const totalItems = Object.values(comprehensiveArmorData).reduce((sum, category) => sum + category.length, 0);
    console.log(`Total armor pieces: ${totalItems}`);
    
    // Show breakdown by category
    Object.keys(comprehensiveArmorData).forEach(category => {
      console.log(`${category}: ${comprehensiveArmorData[category].length} items`);
    });
    
    // Write to file
    const outputPath = path.join(__dirname, '..', 'public', 'deathwatch-armor-comprehensive.json');
    fs.writeFileSync(outputPath, JSON.stringify(comprehensiveArmorData, null, 2));
    console.log(`Comprehensive armor data written to: ${outputPath}`);
    
    console.log('\nNext steps:');
    console.log('1. Update build-shop-db.js to use comprehensive armor data');
    console.log('2. Run: node scripts/build-shop-db.js to rebuild shop database');
    console.log('3. Run: cd database && node migrations/add-shop-tables.js to update SQLite');
    console.log('4. Restart server to see updated armor selection');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = comprehensiveArmorData;
