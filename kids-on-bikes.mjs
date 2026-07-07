import { CharacterData, PoweredData, SimpleItemData, TropeData, AspectData } from "./module/data.mjs";
import { KOBCharacterSheet, KOBPoweredSheet, KOBItemSheet } from "./module/sheets.mjs";
import { onRenderChatMessage } from "./module/rolls.mjs";

Hooks.once("init", () => {
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.powered = PoweredData;
  CONFIG.Item.dataModels.trope = TropeData;
  CONFIG.Item.dataModels.strength = SimpleItemData;
  CONFIG.Item.dataModels.flaw = SimpleItemData;
  CONFIG.Item.dataModels.backpack = SimpleItemData;
  CONFIG.Item.dataModels.aspect = AspectData;

  const { Actors, Items } = foundry.documents.collections;
  Actors.registerSheet("kids-on-bikes", KOBCharacterSheet, { types: ["character"], makeDefault: true, label: "KOB.SheetCharacter" });
  Actors.registerSheet("kids-on-bikes", KOBPoweredSheet, { types: ["powered"], makeDefault: true, label: "KOB.SheetPowered" });
  Items.registerSheet("kids-on-bikes", KOBItemSheet, { makeDefault: true, label: "KOB.SheetItem" });
});

Hooks.on("renderChatMessageHTML", onRenderChatMessage);
