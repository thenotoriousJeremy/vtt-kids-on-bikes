import { DIE_SIZES, STATS } from "./data.mjs";
import { rollStat, rollPsychic, takeLoss } from "./rolls.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;

const PATH = "systems/kids-on-bikes/templates";

export class KOBCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["kids-on-bikes", "actor"],
    position: { width: 640, height: 720 },
    form: { submitOnChange: true },
    window: { resizable: true },
    actions: {
      rollStat: KOBCharacterSheet.#onRollStat,
      takeLoss: KOBCharacterSheet.#onTakeLoss,
      adjustCounter: KOBCharacterSheet.#onAdjustCounter,
      createItem: KOBCharacterSheet.#onCreateItem,
      editItem: KOBCharacterSheet.#onEditItem,
      deleteItem: KOBCharacterSheet.#onDeleteItem
    }
  };

  static PARTS = {
    header: { template: `${PATH}/actor/header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: `${PATH}/actor/main.hbs` },
    traits: { template: `${PATH}/actor/traits.hbs` },
    notes: { template: `${PATH}/actor/notes.hbs` }
  };

  static TABS = {
    primary: {
      tabs: [{ id: "main" }, { id: "traits" }, { id: "notes" }],
      initial: "main",
      labelPrefix: "KOB.Tabs"
    }
  };

  get isPowered() {
    return this.actor.type === "powered";
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.system = this.actor.system;
    context.systemFields = this.actor.system.schema.fields;
    context.isPowered = this.isPowered;
    context.dieSizes = DIE_SIZES;
    context.stats = STATS.map(key => ({
      key,
      label: game.i18n.localize(`KOB.Stat.${key}`),
      die: this.actor.system.stats[key],
      bonus: this.actor.system.statBonus?.[key] ?? 0
    }));
    context.ages = ["child", "teen", "adult"].map(key => ({
      key,
      label: game.i18n.localize(`KOB.Age.${key}`)
    }));
    context.trope = this.actor.items.find(i => i.type === "trope");
    context.strengths = this.actor.items.filter(i => i.type === "strength");
    context.flaws = this.actor.items.filter(i => i.type === "flaw");
    context.backpack = this.actor.items.filter(i => i.type === "backpack");
    context.aspects = this.actor.items.filter(i => i.type === "aspect");
    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation
      .enrichHTML(this.actor.system.description, { relativeTo: this.actor });
    context.enrichedNotes = await foundry.applications.ux.TextEditor.implementation
      .enrichHTML(this.actor.system.notes, { relativeTo: this.actor });
    return context;
  }

  async _preparePartContext(partId, context) {
    if (context.tabs && partId in context.tabs) context.tab = context.tabs[partId];
    return context;
  }

  /** Dropping a trope offers to apply its stat dice and replaces any existing trope. */
  async _onDropItem(event, item) {
    const doc = item instanceof Item ? item : await Item.implementation.fromDropData(item);
    if (doc?.type === "trope" && this.actor.isOwner) {
      const existing = this.actor.items.filter(i => i.type === "trope").map(i => i.id);
      if (existing.length) await this.actor.deleteEmbeddedDocuments("Item", existing);
      const created = await super._onDropItem(event, item);
      const apply = await foundry.applications.api.DialogV2.confirm({
        window: { title: doc.name },
        content: `<p>${game.i18n.localize("KOB.ApplyTropeStats")}</p>`,
        rejectClose: false
      });
      if (apply) await this.actor.update({ "system.stats": doc.system.stats });
      return created;
    }
    return super._onDropItem(event, item);
  }

  static async #onRollStat(event, target) {
    return rollStat(this.actor, target.dataset.stat);
  }

  static async #onTakeLoss() {
    return takeLoss(this.actor);
  }

  static async #onAdjustCounter(event, target) {
    const field = target.dataset.field;
    const delta = Number(target.dataset.delta);
    const value = Math.max(0, foundry.utils.getProperty(this.actor, `system.${field}`) + delta);
    return this.actor.update({ [`system.${field}`]: value });
  }

  static async #onCreateItem(event, target) {
    const type = target.dataset.type;
    return Item.implementation.create(
      { name: game.i18n.localize(`TYPES.Item.${type}`), type },
      { parent: this.actor }
    );
  }

  static async #onEditItem(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]").dataset.itemId);
    return item?.sheet.render(true);
  }

  static async #onDeleteItem(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]").dataset.itemId);
    return item?.delete();
  }
}

export class KOBPoweredSheet extends KOBCharacterSheet {
  static DEFAULT_OPTIONS = {
    actions: {
      rollPsychic: KOBPoweredSheet.#onRollPsychic
    }
  };

  static async #onRollPsychic() {
    return rollPsychic(this.actor);
  }
}

export class KOBItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["kids-on-bikes", "item"],
    position: { width: 480, height: 460 },
    form: { submitOnChange: true },
    window: { resizable: true }
  };

  static PARTS = {
    body: { template: `${PATH}/item-sheet.hbs` }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.systemFields = this.item.system.schema.fields;
    context.isTrope = this.item.type === "trope";
    context.isAspect = this.item.type === "aspect";
    context.dieSizes = DIE_SIZES;
    if (context.isTrope) {
      context.stats = STATS.map(key => ({
        key,
        label: game.i18n.localize(`KOB.Stat.${key}`),
        die: this.item.system.stats[key]
      }));
    }
    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation
      .enrichHTML(this.item.system.description, { relativeTo: this.item });
    return context;
  }
}
