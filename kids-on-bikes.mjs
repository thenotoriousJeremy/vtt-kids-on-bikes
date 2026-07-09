import { CharacterData, PoweredData, SimpleItemData, TropeData, AspectData } from "./module/data.mjs";
import { KOBCharacterSheet, KOBPoweredSheet, KOBItemSheet } from "./module/sheets.mjs";
import { onRenderChatMessage, registerAdversitySocket } from "./module/rolls.mjs";
import { registerCreatorButton } from "./module/creator.mjs";

Hooks.once("init", () => {
  // World toggle for the optional bike subsystem. When off, the sheet hides the bike
  // fields and the creation wizard drops its Bike step. Re-render open windows on change.
  game.settings.register("kids-on-bikes", "useBikes", {
    name: "KOB.Settings.UseBikes.Name",
    hint: "KOB.Settings.UseBikes.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => { for (const app of foundry.applications.instances.values()) app.render(); }
  });

  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.powered = PoweredData;
  CONFIG.Item.dataModels.trope = TropeData;
  CONFIG.Item.dataModels.strength = SimpleItemData;
  CONFIG.Item.dataModels.flaw = SimpleItemData;
  CONFIG.Item.dataModels.backpack = SimpleItemData;
  CONFIG.Item.dataModels.aspect = AspectData;

  // Expose bundled retro fonts to the editor font picker (also declared in css/fonts.css).
  CONFIG.fontDefinitions["Bangers"] = {
    editor: true,
    fonts: [{ urls: ["systems/kids-on-bikes/fonts/Bangers-Regular.ttf"] }]
  };
  CONFIG.fontDefinitions["Press Start 2P"] = {
    editor: true,
    fonts: [{ urls: ["systems/kids-on-bikes/fonts/PressStart2P-Regular.ttf"] }]
  };

  const { Actors, Items } = foundry.documents.collections;
  Actors.registerSheet("kids-on-bikes", KOBCharacterSheet, { types: ["character"], makeDefault: true, label: "KOB.SheetCharacter" });
  Actors.registerSheet("kids-on-bikes", KOBPoweredSheet, { types: ["powered"], makeDefault: true, label: "KOB.SheetPowered" });
  Items.registerSheet("kids-on-bikes", KOBItemSheet, { makeDefault: true, label: "KOB.SheetItem" });

  registerCreatorButton();
});

// Tag <body> so the global accent theme (css/kids-on-bikes.css) only skins the core UI when this system is active.
Hooks.once("ready", () => {
  document.body.classList.add("kob-theme");
  registerAdversitySocket();
});

Hooks.on("renderChatMessageHTML", onRenderChatMessage);
