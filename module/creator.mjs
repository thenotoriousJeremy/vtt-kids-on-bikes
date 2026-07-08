import { DIE_SIZES, STATS, AGE_BONUS, AGE_STRENGTH } from "./data.mjs";
import { dieToPct, hasDuplicateDice, defaultLadder } from "./mechanics.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const AGES = ["child", "teen", "adult"];
const STEPS = ["trope", "age", "stats", "strengths", "flaw", "details"];

/**
 * Guided Kids on Bikes character-creation wizard.
 * Standalone ApplicationV2 that assembles an Actor + embedded Items on finish.
 */
export class KOBCreator extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "kob-creator",
    classes: ["kids-on-bikes", "kob-creator"],
    tag: "form",
    position: { width: 640, height: 720 },
    window: { title: "KOB.Creator.Title", resizable: true },
    actions: {
      pickTrope: KOBCreator.#onPickTrope,
      pickAge: KOBCreator.#onPickAge,
      toggleStrength: KOBCreator.#onToggleStrength,
      pickFlaw: KOBCreator.#onPickFlaw,
      back: KOBCreator.#onBack,
      next: KOBCreator.#onNext,
      finish: KOBCreator.#onFinish
    },
    form: { handler: KOBCreator.#onChangeForm, submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = {
    body: { template: "systems/kids-on-bikes/templates/creator.hbs" }
  };

  step = 0;

  // Accumulated choices.
  data = {
    tropeId: null,       // compendium _id, or null for "from scratch"
    tropeName: "",
    age: "teen",
    stats: null,         // { brains: 8, ... } — set on trope pick or defaulted
    strengthIds: [],     // chosen (max 2)
    flawId: null,
    first: "",
    last: "",
    motivation: "",
    fear: "",
    obligation: "",
    knack: "",
    backpack: "",
    bike: ""
  };

  // Pack documents are stable for the wizard's lifetime; load each pack once
  // (every pick/toggle re-renders, which used to re-fetch all docs each time).
  #packCache = {};
  async #packDocs(id) {
    this.#packCache[id] ??= Array.from(await game.packs.get(`kids-on-bikes.${id}`).getDocuments())
      .sort((a, b) => a.name.localeCompare(b.name));
    return this.#packCache[id];
  }

  async _prepareContext() {
    const packDocs = id => this.#packDocs(id);

    const ctx = {
      step: STEPS[this.step],
      stepIndex: this.step,
      stepCount: STEPS.length,
      steps: STEPS.map((id, i) => ({ id, label: game.i18n.localize(`KOB.Creator.Step.${id}`), active: i === this.step, done: i < this.step })),
      isFirst: this.step === 0,
      isLast: this.step === STEPS.length - 1,
      data: this.data
    };

    const stepId = STEPS[this.step];
    if (stepId === "trope") {
      ctx.tropes = (await packDocs("tropes")).map(t => ({
        id: t.id, name: t.name, img: t.img,
        selected: t.id === this.data.tropeId,
        stats: STATS.map(s => {
          const die = t.system.stats[s];
          return { key: s, die, pct: dieToPct(die) };
        })
      }));
    } else if (stepId === "age") {
      ctx.ages = AGES.map(a => ({
        key: a,
        label: game.i18n.localize(`KOB.Age.${a}`),
        selected: a === this.data.age,
        bonuses: AGE_BONUS[a].map(s => game.i18n.localize(`KOB.Stat.${s}`)).join(", "),
        strength: game.i18n.localize(`KOB.Creator.AgeStrength.${a}`)
      }));
    } else if (stepId === "stats") {
      const stats = this.#currentStats();
      const boosted = AGE_BONUS[this.data.age];
      ctx.stats = STATS.map(s => ({
        key: s,
        label: game.i18n.localize(`KOB.Stat.${s}`),
        value: stats[s],
        boosted: boosted.includes(s),
        options: DIE_SIZES.map(d => ({ d, selected: d === stats[s] }))
      }));
      ctx.dupWarning = this.#statsHaveDuplicates(stats);
    } else if (stepId === "strengths") {
      const chosen = this.data.strengthIds;
      ctx.autoStrength = game.i18n.localize(`KOB.Creator.AgeStrength.${this.data.age}`);
      ctx.strengths = (await packDocs("strengths")).map(s => ({
        id: s.id, name: s.name,
        checked: chosen.includes(s.id),
        disabled: chosen.length >= 2 && !chosen.includes(s.id)
      }));
      ctx.chosenCount = chosen.length;
    } else if (stepId === "flaw") {
      ctx.flaws = (await packDocs("flaws")).map(f => ({
        id: f.id, name: f.name, selected: f.id === this.data.flawId
      }));
    }
    return ctx;
  }

  // ---- stat helpers ----

  #currentStats() {
    return this.data.stats ?? defaultLadder();
  }

  #statsHaveDuplicates(stats) {
    return hasDuplicateDice(stats);
  }

  // ---- step validation ----

  #canAdvance() {
    switch (STEPS[this.step]) {
      case "trope": return true; // trope optional (from scratch allowed)
      case "age": return AGES.includes(this.data.age);
      case "stats": return !this.#statsHaveDuplicates(this.#currentStats());
      case "strengths": return this.data.strengthIds.length === 2;
      case "flaw": return !!this.data.flawId;
      case "details": return this.data.first.trim().length > 0;
      default: return true;
    }
  }

  // ---- actions ----

  static async #onPickTrope(event, target) {
    const id = target.dataset.tropeId || null;
    this.data.tropeId = id;
    if (id) {
      const doc = await game.packs.get("kids-on-bikes.tropes").getDocument(id);
      this.data.tropeName = doc.name;
      this.data.stats = { ...doc.system.stats };
    } else {
      this.data.tropeName = "";
      this.data.stats = null;
    }
    this.render();
  }

  static #onPickAge(event, target) {
    this.data.age = target.dataset.age;
    this.render();
  }

  static #onToggleStrength(event, target) {
    const id = target.dataset.strengthId;
    const list = this.data.strengthIds;
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else if (list.length < 2) list.push(id);
    this.render();
  }

  static #onPickFlaw(event, target) {
    this.data.flawId = target.dataset.flawId;
    this.render();
  }

  static #onBack() {
    if (this.step > 0) this.step--;
    this.render();
  }

  static #onNext() {
    if (!this.#canAdvance()) return ui.notifications.warn(game.i18n.localize("KOB.Creator.CompleteStep"));
    if (this.step < STEPS.length - 1) this.step++;
    this.render();
  }

  /** Capture free-text inputs and stat selects on every change. */
  static #onChangeForm(event, form, formData) {
    const d = formData.object;
    for (const k of ["first", "last", "motivation", "fear", "obligation", "knack", "backpack", "bike"]) {
      if (k in d) this.data[k] = d[k];
    }
    // Stat selects (stats step). FormDataExtended.object expands "stat.brains" -> d.stat.brains
    if (STEPS[this.step] === "stats" && d.stat) {
      const stats = { ...this.#currentStats() };
      for (const s of STATS) {
        if (s in d.stat) stats[s] = Number(d.stat[s]);
      }
      this.data.stats = stats;
      this.render(); // refresh duplicate warning / Next gate
    }
  }

  static async #onFinish() {
    if (!this.#canAdvance()) return ui.notifications.warn(game.i18n.localize("KOB.Creator.NameRequired"));

    const name = `${this.data.first} ${this.data.last}`.trim();
    const stats = this.#currentStats();

    // Default the character portrait to the chosen trope's artwork (from-scratch keeps Foundry's default).
    const tropeDoc = this.data.tropeId
      ? await game.packs.get("kids-on-bikes.tropes").getDocument(this.data.tropeId)
      : null;

    const actor = await Actor.create({
      name,
      type: "character",
      ...(tropeDoc?.img ? { img: tropeDoc.img, prototypeToken: { texture: { src: tropeDoc.img } } } : {}),
      system: {
        stats,
        age: this.data.age,
        motivation: this.data.motivation,
        fear: this.data.fear,
        obligation: this.data.obligation,
        knack: this.data.knack,
        bike: this.data.bike
      }
    });

    const items = [];
    const grab = async (packId, docId) => {
      if (!docId) return null;
      const doc = await game.packs.get(`kids-on-bikes.${packId}`).getDocument(docId);
      return doc ? doc.toObject() : null;
    };

    const trope = tropeDoc ? tropeDoc.toObject() : null;
    if (trope) items.push(trope);
    for (const sid of this.data.strengthIds) {
      const s = await grab("strengths", sid);
      if (s) items.push(s);
    }
    // Auto age strength (by slug -> find in pack)
    const ageSlug = AGE_STRENGTH[this.data.age];
    const strengthPack = game.packs.get("kids-on-bikes.strengths");
    const ageDoc = Array.from(await strengthPack.getDocuments()).find(d => d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === ageSlug);
    if (ageDoc && !this.data.strengthIds.includes(ageDoc.id)) items.push(ageDoc.toObject());
    const flaw = await grab("flaws", this.data.flawId);
    if (flaw) items.push(flaw);
    // Backpack: split textarea lines into backpack items
    for (const line of (this.data.backpack || "").split("\n").map(l => l.trim()).filter(Boolean)) {
      items.push({ name: line, type: "backpack", img: "icons/svg/item-bag.svg", system: { description: "" } });
    }

    if (items.length) await actor.createEmbeddedDocuments("Item", items);

    ui.notifications.info(game.i18n.format("KOB.Creator.Created", { name }));
    this.close();
    actor.sheet.render(true);
  }
}

/** Inject the launch button into the Actors sidebar header. */
export function registerCreatorButton() {
  Hooks.on("renderActorDirectory", (app, html) => {
    const root = html instanceof HTMLElement ? html : html[0];
    const header = root.querySelector(".directory-header .header-actions") ?? root.querySelector(".directory-header");
    if (!header || header.querySelector(".kob-create-btn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "kob-create-btn";
    btn.innerHTML = `<i class="fas fa-bicycle"></i> ${game.i18n.localize("KOB.Creator.Launch")}`;
    btn.addEventListener("click", () => new KOBCreator().render(true));
    header.append(btn);
  });
}
