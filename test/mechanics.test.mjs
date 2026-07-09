// Framework-free self-check for module/mechanics.mjs. Run: node test/mechanics.test.mjs
// (not shipped in releases — dev-only regression guard for the pure game math).
import assert from "node:assert/strict";
import {
  DIE_SIZES, STATS, BIKE_COLORS, BIKE_UPGRADES,
  dieToPct, hasDuplicateDice, defaultLadder, statFormula, ageBonusMap
} from "../module/mechanics.mjs";

// dieToPct: proportional to max face
assert.equal(dieToPct(20), 100);
assert.equal(dieToPct(4), 20);
assert.equal(dieToPct(12), 60);

// defaultLadder: all six stats, one of each die, and therefore a legal (dup-free) spread
const ladder = defaultLadder();
assert.deepEqual(Object.keys(ladder), STATS);
assert.equal(new Set(Object.values(ladder)).size, DIE_SIZES.length);
assert.equal(hasDuplicateDice(ladder), false);

// duplicate detection fires when any die repeats
assert.equal(hasDuplicateDice({ ...ladder, brawn: ladder.brains }), true);

// statFormula: exploding on max, optional flat bonus
assert.equal(statFormula(8, 0), "1d8x");
assert.equal(statFormula(20), "1d20x");
assert.equal(statFormula(6, 1), "1d6x + 1");

// ageBonusMap: teen boosts exactly brawn + fight; unknown age boosts nothing
const teen = ageBonusMap("teen");
assert.equal(teen.brawn, 1);
assert.equal(teen.fight, 1);
assert.equal(teen.brains, 0);
assert.equal(Object.values(teen).reduce((a, b) => a + b, 0), 2);
assert.equal(Object.values(ageBonusMap("nope")).reduce((a, b) => a + b, 0), 0);

// bike lists: non-empty and no duplicate keys (lang keys are derived from these)
assert.equal(BIKE_COLORS.length, 12);
assert.equal(BIKE_UPGRADES.length, 10);
assert.equal(new Set(BIKE_COLORS).size, BIKE_COLORS.length);
assert.equal(new Set(BIKE_UPGRADES).size, BIKE_UPGRADES.length);

console.log("mechanics: all assertions passed");
