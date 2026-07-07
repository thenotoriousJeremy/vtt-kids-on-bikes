# Kids on Bikes 2E (Unofficial) — Foundry VTT System

An unofficial, fan-made [Foundry Virtual Tabletop](https://foundryvtt.com) system for playing **Kids on Bikes** (Second Edition).

> **Disclaimer:** This is an unofficial fan-made system. Kids on Bikes is © Hunters Entertainment / Renegade Game Studios. This system contains no rulebook text; the rulebook is required to play. Not affiliated with or endorsed by the publishers.

## Features

- **Character sheet** (kids, teens, adults, and NPCs): six stat dice (Brains, Brawn, Charm, Fight, Flight, Grit), age bracket, trope, strengths, flaws, backpack, motivation, fear, and notes.
- **Powered Character sheet**: everything above plus psychic energy tokens and shared Aspect cards (with card-holder tracking).
- **Exploding stat checks**: click a stat to roll its die; maximum rolls explode and add, recursively.
- **Adversity tokens**: automatic token gain on "Take the Loss", and a *Spend Adversity (+1)* button right on the chat card that decrements your pool and bumps the roll total.
- **Psychic ability rolls**: 2d4 plus optional psychic energy spend, deducted automatically.
- **Compendia**: 11 tropes with suggested stat spreads, 16 strengths, and 40 flaws (names and short original summaries only — see disclaimer).

## Installation

In Foundry's **Game Systems** tab, choose **Install System** and paste this manifest URL:

```
https://github.com/thenotoriousJeremy/vtt-kids-on-bikes/releases/latest/download/system.json
```

## Compatibility

- Minimum: Foundry VTT v13
- Verified: Foundry VTT v14

## Development

No build step. Clone into your Foundry `Data/systems/kids-on-bikes` folder (the folder name must match the system id), or junction it:

```powershell
New-Item -ItemType Junction -Path "$env:LOCALAPPDATA\FoundryVTT\Data\systems\kids-on-bikes" -Target "C:\path\to\vtt-kids-on-bikes"
```

Compendium content lives as JSON in `packs/_source/`. After editing, regenerate and recompile (Foundry must be closed):

```
node packs/_source/generate.mjs
npx @foundryvtt/foundryvtt-cli package pack tropes --in packs/_source/tropes --out packs
npx @foundryvtt/foundryvtt-cli package pack strengths --in packs/_source/strengths --out packs
npx @foundryvtt/foundryvtt-cli package pack flaws --in packs/_source/flaws --out packs
```

## License

Code licensed under [MIT](LICENSE). Kids on Bikes and all related game IP remain the property of Hunters Entertainment / Renegade Game Studios.
