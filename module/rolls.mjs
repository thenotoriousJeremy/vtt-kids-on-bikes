const SYSTEM_ID = "kids-on-bikes";

/**
 * Roll a stat check: 1dX, exploding recursively on the maximum face
 * (Kids on Bikes: rolling max lets you roll again and add).
 */
export async function rollStat(actor, statKey) {
  const die = actor.system.stats[statKey];
  const bonus = actor.system.statBonus?.[statKey] ?? 0;
  const roll = await new Roll(bonus > 0 ? `1d${die}x + ${bonus}` : `1d${die}x`).evaluate();
  const flavor = `${game.i18n.localize(`KOB.Stat.${statKey}`)} (d${die}${bonus > 0 ? ", +1 age" : ""})`;
  const content = `
    ${await roll.render()}
    <div class="kob-adversity-row">
      <button type="button" data-kob-spend data-actor-uuid="${actor.uuid}">
        ${game.i18n.localize("KOB.SpendAdversity")}
      </button>
      <span class="kob-adjusted">${game.i18n.localize("KOB.Total")}:
        <strong data-kob-total>${roll.total}</strong>
        (<span data-kob-spent>0</span> ${game.i18n.localize("KOB.TokensSpent")})
      </span>
    </div>`;
  return roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor,
    content,
    flags: { [SYSTEM_ID]: { base: roll.total, spent: 0 } }
  }, { rollMode: game.settings.get("core", "rollMode") });
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
  btn.addEventListener("click", async ev => {
    const actor = await fromUuid(ev.currentTarget.dataset.actorUuid);
    if (!actor?.isOwner) return;
    if ((actor.system.adversity ?? 0) < 1) {
      return ui.notifications.warn(game.i18n.localize("KOB.NoAdversity"));
    }
    await actor.update({ "system.adversity": actor.system.adversity - 1 });
    // ponytail: only the message author or GM can bump the total — matches the
    // rule that you spend tokens on your own roll; token gifts happen socially.
    await message.setFlag(SYSTEM_ID, "spent", (message.getFlag(SYSTEM_ID, "spent") ?? 0) + 1);
  });
}
