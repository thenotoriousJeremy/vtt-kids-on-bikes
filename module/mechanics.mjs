// Pure Kids on Bikes game math. NO Foundry globals here, so this module is
// safe to import under plain node -> the logic is unit-testable
// (see test/mechanics.test.mjs). data.mjs re-exports the constants.

export const DIE_SIZES = [4, 6, 8, 10, 12, 20];
export const STATS = ["brains", "brawn", "charm", "fight", "flight", "grit"];

// A bike has one color and one upgrade, each granting a riding bonus (labels + effect
// summaries live in lang/en.json under KOB.Bike.*). Keys only here — no rulebook text.
export const BIKE_COLORS = ["black", "blue", "gold", "gray", "green", "neon-pink", "orange", "purple", "red", "rusty", "silver", "white"];
export const BIKE_UPGRADES = ["banana-seat", "basket", "bell", "first-aid-kit", "milk-crate", "pegs", "tassels", "ten-speeder", "trading-cards", "pedal-powered-lights"];

// Age bracket grants +1 to two stats (numeric, added to rolls) and one auto strength.
export const AGE_BONUS = {
  child: ["charm", "flight"],
  teen: ["brawn", "fight"],
  adult: ["grit", "brains"]
};
export const AGE_STRENGTH = { child: "quick-healing", teen: "rebellious", adult: "skilled-at" };

/** Trope-card bar width (%) for a die: proportional to the die's max face. */
export const dieToPct = die => Math.round(die / 20 * 100);

/** KOB assigns each die size exactly once — flag any repeated die across the six stats. */
export const hasDuplicateDice = stats =>
  new Set(STATS.map(s => stats[s])).size !== STATS.length;

/** From-scratch default: one of each die size, in stat order (already a legal spread). */
export const defaultLadder = () => Object.fromEntries(STATS.map((s, i) => [s, DIE_SIZES[i]]));

/** Stat check: 1dX exploding on the max face, plus the flat age bonus if any. */
export const statFormula = (die, bonus = 0) => bonus > 0 ? `1d${die}x + ${bonus}` : `1d${die}x`;

/** Age bracket -> { stat: 0 | 1 } bonus map. */
export const ageBonusMap = age => {
  const boosted = AGE_BONUS[age] ?? [];
  return Object.fromEntries(STATS.map(s => [s, boosted.includes(s) ? 1 : 0]));
};
