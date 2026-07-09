import { DIE_SIZES, STATS, AGE_BONUS, AGE_STRENGTH, BIKE_COLORS, BIKE_UPGRADES, ageBonusMap } from "./mechanics.mjs";

const fields = foundry.data.fields;

// Re-export so existing importers (sheets, creator, rolls) keep their import paths.
export { DIE_SIZES, STATS, AGE_BONUS, AGE_STRENGTH, BIKE_COLORS, BIKE_UPGRADES };

function statField() {
  return new fields.NumberField({ required: true, integer: true, initial: 12, choices: DIE_SIZES });
}

function statsSchema() {
  return new fields.SchemaField(Object.fromEntries(STATS.map(s => [s, statField()])));
}

// Bike color/upgrade: one of the known keys, or blank for a bike not yet configured (NPCs, WIP).
const bikeColorField = () => new fields.StringField({ choices: BIKE_COLORS, blank: true, initial: "" });
const bikeUpgradeField = () => new fields.StringField({ choices: BIKE_UPGRADES, blank: true, initial: "" });

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      stats: statsSchema(),
      age: new fields.StringField({ required: true, initial: "teen", choices: ["child", "teen", "adult"] }),
      adversity: new fields.NumberField({ required: true, integer: true, min: 0, initial: 3 }),
      motivation: new fields.StringField({ initial: "" }),
      fear: new fields.StringField({ initial: "" }),
      obligation: new fields.StringField({ initial: "" }),
      knack: new fields.StringField({ initial: "" }),
      bike: new fields.StringField({ initial: "" }),          // free-text bike name / description
      bikeColor: bikeColorField(),
      bikeUpgrade: bikeUpgradeField(),
      description: new fields.HTMLField(),
      notes: new fields.HTMLField()
    };
  }

  prepareDerivedData() {
    this.statBonus = ageBonusMap(this.age);
  }
}

export class PoweredData extends CharacterData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      psychicEnergy: new fields.NumberField({ required: true, integer: true, min: 0, initial: 7 })
    };
  }
}

// Shared model for strength / flaw / backpack — identical shape.
export class SimpleItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { description: new fields.HTMLField() };
  }
}

export class TropeData extends SimpleItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      stats: statsSchema(),
      // Recommended starter bike for this trope (rulebook pre-gens one per trope). Blank = none.
      bikeColor: bikeColorField(),
      bikeUpgrade: bikeUpgradeField()
    };
  }
}

export class AspectData extends SimpleItemData {
  static defineSchema() {
    return { ...super.defineSchema(), holder: new fields.StringField({ initial: "" }) };
  }
}
