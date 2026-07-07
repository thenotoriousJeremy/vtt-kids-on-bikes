// One-shot generator: emits Foundry item JSON sources for the compendium packs.
// Run: node packs/_source/generate.mjs   (then compile with foundryvtt-cli)
// All description text here is original paraphrase — no rulebook text.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Stat spreads are game mechanics (verified from public references); text is original.
const TROPES = [
  ["Brilliant Mathlete", { brains: 20, brawn: 4, charm: 8, fight: 6, flight: 12, grit: 10 }, "Numbers make sense; people are harder. The smartest kid in the room, and everyone knows it."],
  ["Brutish Jock", { brains: 4, brawn: 20, charm: 6, fight: 12, flight: 8, grit: 10 }, "Solves most problems with muscle. Not much for homework."],
  ["Funny Sidekick", { brains: 8, brawn: 4, charm: 20, fight: 6, flight: 12, grit: 10 }, "Always has a joke ready, especially when things get scary."],
  ["Loner Weirdo", { brains: 8, brawn: 10, charm: 4, fight: 12, flight: 6, grit: 20 }, "Keeps to themselves and endures more than anyone suspects."],
  ["Blue-Collar Worker", { brains: 6, brawn: 20, charm: 8, fight: 12, flight: 4, grit: 10 }, "Hard hands, long shifts, and no patience for nonsense."],
  ["Popular Kid", { brains: 10, brawn: 12, charm: 20, fight: 6, flight: 4, grit: 8 }, "Everyone wants to sit at their table. Charm opens every door in town."],
  ["Adventurous Scout", { brains: 20, brawn: 8, charm: 10, fight: 4, flight: 6, grit: 12 }, "Prepared for anything, with a badge to prove it."],
  ["Conspiracy Theorist", { brains: 20, brawn: 4, charm: 6, fight: 12, flight: 10, grit: 8 }, "Saw the pattern before anyone else. Nobody believes them — yet."],
  ["Reclusive Eccentric", { brains: 12, brawn: 8, charm: 4, fight: 6, flight: 20, grit: 10 }, "The strange one in the old house at the edge of town."],
  ["Stoic Professional", { brains: 12, brawn: 8, charm: 10, fight: 4, flight: 6, grit: 20 }, "Calm, capable, and impossible to rattle."],
  ["Seasoned Babysitter", { brains: 8, brawn: 4, charm: 6, fight: 10, flight: 12, grit: 20 }, "Has handled worse than monsters: bedtime."]
];

const STRENGTHS = [
  ["Cool Under Pressure", "Stays steady when everything goes wrong."],
  ["Easygoing", "Hard to fluster, quick to bounce back."],
  ["Gross", "Willing and able to be truly disgusting when it helps."],
  ["Heroic", "First through the door when someone needs saving."],
  ["Intuitive", "Reads people and situations at a glance."],
  ["Loyal", "Never abandons a friend, no matter the cost."],
  ["Lucky", "Things have a way of breaking their direction."],
  ["Prepared", "Always has the right thing in the bag."],
  ["Protective", "Fierce when the people they love are threatened."],
  ["Quick Healing", "Shrugs off scrapes and bruises fast."],
  ["Rebellious", "Rules are more like suggestions."],
  ["Skilled at ___", "Genuinely good at one particular thing — fill in the blank."],
  ["Tough", "Takes a hit and keeps moving."],
  ["Treasure Hunter", "Finds what's hidden, lost, or buried."],
  ["Unassuming", "Easy to overlook — which is exactly the point."],
  ["Wealthy", "Money is rarely the obstacle."]
];

const FLAWS = [
  "Absent-minded", "Blunt", "Boastful", "Callous", "Capricious", "Clumsy",
  "Cowardly", "Deceitful", "Demanding", "Dogmatic", "Envious", "Flippant",
  "Gluttonous", "Greedy", "Gullible", "Hot-tempered", "Ignorant", "Impatient",
  "Insecure", "Lazy", "Messy", "Nosey", "Oversensitive", "Paranoid",
  "Patronizing", "Petty", "Picky", "Prejudiced", "Rambunctious", "Reckless",
  "Resentful", "Restless", "Rude", "Self-centered", "Self-pitying", "Spoiled",
  "Superstitious", "Vain", "Vindictive", "Weak-willed"
];

function makeId(prefix, i) {
  return (prefix + String(i).padStart(2, "0") + "0000000000000000").slice(0, 16);
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function writeItem(dir, doc) {
  mkdirSync(join(here, dir), { recursive: true });
  writeFileSync(join(here, dir, `${slug(doc.name)}.json`), JSON.stringify(doc, null, 2) + "\n");
}

function baseItem(id, name, type, img, system) {
  return {
    _id: id,
    _key: `!items!${id}`,
    name,
    type,
    img,
    system,
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {}
  };
}

TROPES.forEach(([name, stats, desc], i) =>
  writeItem("tropes", baseItem(makeId("kobtrope", i), name, "trope", "icons/svg/mystery-man.svg",
    { description: `<p>${desc}</p>`, stats })));

STRENGTHS.forEach(([name, desc], i) =>
  writeItem("strengths", baseItem(makeId("kobstren", i), name, "strength", "icons/svg/upgrade.svg",
    { description: `<p>${desc}</p>` })));

FLAWS.forEach((name, i) =>
  writeItem("flaws", baseItem(makeId("kobflaw0", i), name, "flaw", "icons/svg/downgrade.svg",
    { description: "" })));

console.log(`Wrote ${TROPES.length} tropes, ${STRENGTHS.length} strengths, ${FLAWS.length} flaws.`);
