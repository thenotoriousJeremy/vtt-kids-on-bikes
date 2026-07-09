import { statFormula } from "./mechanics.mjs";

const SYSTEM_ID = "kids-on-bikes";
const SOCKET = `system.${SYSTEM_ID}`;

/**
 * Roll a stat check: 1dX, exploding recursively on the maximum face
 * (Kids on Bikes: rolling max lets you roll again and add).
 */
export async function rollStat(actor, statKey) {
  const die = actor.system.stats[statKey];
  const bonus = actor.system.statBonus?.[statKey] ?? 0;
  const roll = await new Roll(statFormula(die, bonus)).evaluate();
  const flavor = `${game.i18n.localize(`KOB.Stat.${statKey}`)} (d${die}${bonus > 0 ? ", +1 age" : ""})`;
  const content = `
    ${await roll.render()}
    <div class="kob-adversity-row">
      <button type="button" data-kob-spend>
        ${game.i18n.localize("KOB.SpendAdversity")}
      </button>
      <span class="kob-adjusted">${game.i18n.localize("KOB.Total")}:
        <strong data-kob-total>${roll.total}</strong>
        (<span data-kob-spent>0</span> ${game.i18n.localize("KOB.TokensSpent")})
      </span>
    </div>`;
  const message = await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor,
    content,
    flags: { [SYSTEM_ID]: { base: roll.total, spent: 0 } }
  }, { rollMode: game.settings.get("core", "rollMode") });

  // KOB: a 1 on the stat die earns an Adversity token. Only the initial roll can
  // be a 1 (explosions only trigger on the max face), so check the first result.
  const firstFace = roll.dice[0]?.results?.[0]?.result;
  if (firstFace === 1 && actor.isOwner) {
    const take = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("KOB.RolledOne") },
      content: `<p>${game.i18n.localize("KOB.RolledOnePrompt")}</p>`,
      rejectClose: false
    });
    if (take) {
      await actor.update({ "system.adversity": (actor.system.adversity ?? 0) + 1 });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: game.i18n.format("KOB.GainedAdversity", { name: actor.name })
      });
    }
  }

  return message;
}

/** Planned failure: take the loss, gain an adversity token, no roll. */
export async function takeLoss(actor) {
  await actor.update({ "system.adversity": actor.system.adversity + 1 });
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: game.i18n.format("KOB.TakesTheLoss", { name: actor.name })
  });
}

/** Powered Character psychic ability: 2d4 + PE tokens spent (+1 each). */
export async function rollPsychic(actor) {
  const pe = actor.system.psychicEnergy;
  if (pe < 1) return ui.notifications.warn(game.i18n.localize("KOB.NoPsychicEnergy"));
  const spend = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("KOB.UsePower") },
    content: `<div class="form-group">
        <label>${game.i18n.format("KOB.SpendPE", { pe })}</label>
        <input type="number" name="spend" value="0" min="0" max="${pe}" step="1" autofocus>
      </div>`,
    ok: {
      label: game.i18n.localize("KOB.Roll"),
      callback: (event, button) => button.form.elements.spend.valueAsNumber
    },
    rejectClose: false
  });
  if (spend === null || spend === undefined || Number.isNaN(spend)) return;
  const n = Math.clamp(Math.floor(spend), 0, pe);
  const roll = await new Roll(n > 0 ? `2d4 + ${n}` : "2d4").evaluate();
  await actor.update({ "system.psychicEnergy": pe - n });
  return roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${game.i18n.localize("KOB.PsychicRoll")}${n > 0 ? ` (+${n} PE)` : ""}`
  }, { rollMode: game.settings.get("core", "rollMode") });
}

/**
 * Apply one spent Adversity token: decrement the spender's actor pool and bump the
 * roll message's running total. Runs on a client with permission to write the flag
 * (the message author, or the GM handling a relayed request) — the GM can update any
 * actor and any message, so this is atomic with a refund on flag-write failure.
 */
async function applySpend({ messageId, actorUuid }) {
  const message = game.messages.get(messageId);
  const actor = await fromUuid(actorUuid);
  if (!message || !actor || (actor.system.adversity ?? 0) < 1) return;
  await actor.update({ "system.adversity": actor.system.adversity - 1 });
  try {
    await message.setFlag(SYSTEM_ID, "spent", (message.getFlag(SYSTEM_ID, "spent") ?? 0) + 1);
  } catch (err) {
    // Keep the spend atomic: refund the token if the flag write fails.
    await actor.update({ "system.adversity": actor.system.adversity + 1 });
    console.error("KOB | adversity spend failed, token refunded", err);
    ui.notifications.error(game.i18n.localize("KOB.SpendFailed"));
  }
}

/** Register the GM-side socket listener that applies relayed spend requests from other players. */
export function registerAdversitySocket() {
  game.socket.on(SOCKET, data => {
    if (data?.action !== "spendAdversity") return;
    // Only the single responding GM applies, so a relayed spend isn't double-counted
    // when several GMs are connected.
    if (game.users.activeGM !== game.user) return;
    applySpend(data);
  });
}

/** Wire the adversity-spend button on rendered chat cards; refresh displayed totals from flags. */
export function onRenderChatMessage(message, html) {
  const btn = html.querySelector("[data-kob-spend]");
  if (!btn) return;
  const base = message.getFlag(SYSTEM_ID, "base") ?? 0;
  const spent = message.getFlag(SYSTEM_ID, "spent") ?? 0;
  const totalEl = html.querySelector("[data-kob-total]");
  const spentEl = html.querySelector("[data-kob-spent]");
  if (totalEl) totalEl.textContent = String(base + spent);
  if (spentEl) spentEl.textContent = String(spent);
  btn.addEventListener("click", async () => {
    // KOB: you spend YOUR OWN tokens — your own roll or a same-scene ally's.
    // ponytail: source is the user's assigned character. Add an actor picker if a
    // player drives several kids. Scene membership isn't enforced — trust the table.
    const actor = game.user.character;
    if (!actor) return ui.notifications.warn(game.i18n.localize("KOB.NoAssignedCharacter"));
    if ((actor.system.adversity ?? 0) < 1) {
      return ui.notifications.warn(game.i18n.localize("KOB.NoAdversity"));
    }
    // Writing the message flag needs the author or a GM. The author/GM does it locally;
    // anyone else relays to the responding GM (who owns nothing but may write both docs).
    if (message.isAuthor || game.user.isGM) {
      await applySpend({ messageId: message.id, actorUuid: actor.uuid });
    } else if (game.users.activeGM) {
      game.socket.emit(SOCKET, { action: "spendAdversity", messageId: message.id, actorUuid: actor.uuid });
    } else {
      ui.notifications.warn(game.i18n.localize("KOB.NoActiveGM"));
    }
  });
}
