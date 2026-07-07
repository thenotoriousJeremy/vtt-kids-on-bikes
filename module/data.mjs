const fields = foundry.data.fields;

export const DIE_SIZES = [4, 6, 8, 10, 12, 20];
export const STATS = ["brains", "brawn", "charm", "fight", "flight", "grit"];

// Age bracket grants +1 to two stats (numeric, added to rolls) and one auto strength.
export const AGE_BONUS = {
  child: ["charm", "flight"],
  teen: ["brawn", "fight"],
  adult: ["grit", "brains"]
};
export const AGE_STRENGTH = { child: "quick-healing", teen: "rebellious", adult: "skilled-at" };

function statField() {
  return new fields.NumberField({ required: true, integer: true, initial: 12, choices: DIE_SIZES });
}

function statsSchema() {
  return new fields.SchemaField(Object.fromEntries(STATS.map(s => [s, statField()])));
}

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      stats: statsSchema(),
      age: new fields.StringField({ required: true, initial: "teen", choices: ["child", "teen", "adult"] }),
      adversity: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      motivation: new fields.StringField({ initial: "" }),
      fear: new fields.StringField({ initial: "" }),
      obligation: new fields.StringField({ initial: "" }),
      knack: new fields.StringField({ initial: "" }),
      bike: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField(),
      notes: new fields.HTMLField()
    };
  }

  prepareDerivedData() {
    const boosted = AGE_BONUS[this.age] ?? [];
    this.statBonus = Object.fromEntries(STATS.map(s => [s, boosted.includes(s) ? 1 : 0]));
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
    return { ...super.defineSchema(), stats: statsSchema() };
  }
}

export class AspectData extends SimpleItemData {
  static defineSchema() {
    return { ...super.defineSchema(), holder: new fields.StringField({ initial: "" }) };
  }
}
