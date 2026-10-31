/* ============================================================
   KINGDOM — event templates.
   Each event: id, weight, condition(gs), build(gs, rng) -> {
     title, text, choices: [{ label, hint, effect(gs)->log, req? }]
   }
   Effects mutate a *copy* via the logic layer's applyChoice.
   Kept declarative & deterministic; the rng only selects.
   ============================================================ */

export const EVENTS = [
  {
    id: 'drought', weight: 8, minTurn: 3,
    title: '☀️ A Withering Drought',
    text: 'The rains have failed. Wells run low and the fields crack under a merciless sun. Your farmers look to you.',
    choices: [
      { label: 'Open the granary reserves', hint: 'Spend food to keep people fed', effect: (gs) => { gs.res.food = Math.max(0, gs.res.food - 60); gs.happy += 4; return 'You emptied reserves to feed the people. Food −60, happiness rises.'; } },
      { label: 'Dig new wells', hint: 'Costs gold & wood, prevents worse', cost: { gold: 60, wood: 30 }, req: (gs) => gs.res.gold >= 60 && gs.res.wood >= 30, effect: (gs) => { gs.res.gold -= 60; gs.res.wood -= 30; gs.flags.wells = 2; return 'New wells secured water. Future food production protected for a time.'; } },
      { label: 'Do nothing and pray', hint: 'Risk starvation', effect: (gs, rng) => { const loss = 40 + Math.floor(rng.next() * 40); gs.res.food = Math.max(0, gs.res.food - loss); gs.happy -= 10; return `The drought bit deep. Food −${loss}, the people suffer.`; } },
    ],
  },
  {
    id: 'merchant', weight: 12, minTurn: 1,
    title: '🐫 A Traveling Merchant',
    text: 'A caravan rolls into your market square, its wagons heavy with exotic goods and rare metals. The merchant bows low.',
    choices: [
      { label: 'Buy iron & stone', hint: 'Trade gold for materials', cost: { gold: 80 }, req: (gs) => gs.res.gold >= 80, effect: (gs) => { gs.res.gold -= 80; gs.res.iron += 30; gs.res.stone += 40; return 'You traded 80 gold for 30 iron & 40 stone.'; } },
      { label: 'Sell surplus food', hint: 'Trade food for gold', req: (gs) => gs.res.food >= 80, effect: (gs) => { gs.res.food -= 80; gs.res.gold += 70; return 'You sold 80 food for 70 gold.'; } },
      { label: 'Wave them along', hint: 'No cost, no gain', effect: () => 'The caravan trundles onward to the next town.' },
    ],
  },
  {
    id: 'bandits', weight: 10, minTurn: 2,
    title: '🏴‍☠️ Bandits on the Roads',
    text: 'Outlaws have been raiding trade caravans and outlying farms. The people demand protection.',
    choices: [
      { label: 'Send the militia', hint: 'Fight — outcome depends on your army', req: (gs) => gs.army.total > 0, effect: (gs, rng) => { const win = gs.armyPower * (0.6 + rng.next() * 0.5) > 30; if (win) { gs.res.gold += 45; return 'Your soldiers crushed the bandits and recovered 45 gold in loot!'; } else { gs.army.militia = Math.max(0, gs.army.militia - 3); gs.happy -= 4; return 'The raid was bloody. You lost 3 militia and the bandits escaped.'; } } },
      { label: 'Pay them off', hint: 'Bribe for peace', cost: { gold: 50 }, req: (gs) => gs.res.gold >= 50, effect: (gs) => { gs.res.gold -= 50; return 'You paid 50 gold. The raids stop — for now.'; } },
      { label: 'Fortify and endure', hint: 'Lose some resources', effect: (gs, rng) => { const loss = 20 + Math.floor(rng.next() * 30); gs.res.gold = Math.max(0, gs.res.gold - loss); gs.happy -= 6; return `Bandits picked at your edges. Gold −${loss}, morale dips.`; } },
    ],
  },
  {
    id: 'plague', weight: 6, minTurn: 5,
    title: '🤢 The Grey Fever',
    text: 'A sickness spreads through the crowded quarters — the fictional Grey Fever. Healers are overwhelmed.',
    choices: [
      { label: 'Quarantine the sick', hint: 'Hurts happiness, saves lives', effect: (gs) => { gs.happy -= 8; gs.flags.quarantine = 2; return 'Streets are sealed. Grim, but the fever is contained.'; } },
      { label: 'Fund the healers', hint: 'Spend gold to treat all', cost: { gold: 90 }, req: (gs) => gs.res.gold >= 90, effect: (gs) => { gs.res.gold -= 90; gs.happy += 3; return 'Your gold bought medicine and rest. The fever breaks with few deaths.'; } },
      { label: 'Let it run its course', hint: 'Population loss', effect: (gs, rng) => { const heal = gs.mods.health || 0; const deaths = Math.floor((25 + rng.next() * 45) * (1 - heal)); gs.pop = Math.max(20, gs.pop - deaths); gs.happy -= 14; return `The fever raged. ${deaths} souls lost.`; } },
    ],
  },
  {
    id: 'festival', weight: 9, minTurn: 2,
    title: '🎉 A Season of Plenty',
    text: 'The harvest was kind and the people wish to celebrate. A festival could lift every heart — at a price.',
    choices: [
      { label: 'Host a grand festival', hint: 'Costs gold, big happiness', cost: { gold: 70, food: 40 }, req: (gs) => gs.res.gold >= 70 && gs.res.food >= 40, effect: (gs) => { gs.res.gold -= 70; gs.res.food -= 40; gs.happy += 18; gs.loyalty = Math.min(1, gs.loyalty + 0.08); return 'A magnificent festival! Happiness soars, loyalty deepens.'; } },
      { label: 'A modest gathering', hint: 'Small cost, small joy', cost: { gold: 20 }, req: (gs) => gs.res.gold >= 20, effect: (gs) => { gs.res.gold -= 20; gs.happy += 7; return 'A humble feast. The people are content.'; } },
      { label: 'Focus on work', hint: 'No celebration', effect: (gs) => { gs.happy -= 3; return 'You bid them back to work. Some grumble at your severity.'; } },
    ],
  },
  {
    id: 'ore', weight: 7, minTurn: 3,
    title: '💎 A Rich Vein Discovered',
    text: 'Miners have struck a deep vein of ore in the hills beyond your walls. Word is already spreading.',
    choices: [
      { label: 'Invest in the mine', hint: 'Big iron & stone haul', cost: { gold: 60 }, req: (gs) => gs.res.gold >= 60, effect: (gs) => { gs.res.gold -= 60; gs.res.iron += 50; gs.res.stone += 40; return 'The investment paid off richly. Iron +50, Stone +40!'; } },
      { label: 'Claim a modest share', hint: 'Free resources', effect: (gs) => { gs.res.iron += 15; gs.res.stone += 12; return 'You take a careful share. Iron +15, Stone +12.'; } },
    ],
  },
  {
    id: 'rebellion', weight: 5, minTurn: 6, condition: (gs) => gs.happy < 40,
    title: '🔥 Unrest in the Streets',
    text: 'Discontent has curdled into open defiance. Crowds gather; some carry torches. Your grip on the people is slipping.',
    choices: [
      { label: 'Address the crowd yourself', hint: 'Charisma vs the mob', effect: (gs, rng) => { if (rng.next() < 0.5 + (gs.loyalty - 0.5)) { gs.happy += 12; gs.loyalty = Math.min(1, gs.loyalty + 0.06); return 'Your words moved them. The anger cools into hope.'; } else { gs.happy -= 6; return 'They shouted you down. The unrest festers.'; } } },
      { label: 'Lower taxes at once', hint: 'Buy back goodwill', effect: (gs) => { gs.policies.tax = 'low'; gs.happy += 10; return 'You slash taxes. Coffers will thin, but the streets calm.'; } },
      { label: 'Crush the rebellion', hint: 'Force — costs lives & loyalty', req: (gs) => gs.army.total > 0, effect: (gs) => { gs.pop = Math.max(20, gs.pop - 15); gs.happy -= 10; gs.loyalty = Math.max(0, gs.loyalty - 0.12); return 'Soldiers cleared the square. Order restored, at a dark cost.'; } },
    ],
  },
  {
    id: 'refugees', weight: 8, minTurn: 3,
    title: '🚪 Refugees at the Gates',
    text: 'A column of weary refugees from a war-torn land begs entry. They could bolster your numbers — or strain your food.',
    choices: [
      { label: 'Welcome them all', hint: 'Population up, food strained', effect: (gs) => { gs.pop += 45; gs.res.food = Math.max(0, gs.res.food - 30); gs.happy += 3; return 'You open the gates. +45 people, but food is stretched.'; } },
      { label: 'Accept only skilled workers', hint: 'Balanced growth', effect: (gs) => { gs.pop += 18; gs.res.gold += 10; return 'You take the artisans. +18 people, +10 gold from their trade.'; } },
      { label: 'Turn them away', hint: 'Protect your stores', effect: (gs) => { gs.happy -= 5; return 'You bar the gates. Some call it wisdom; others, cruelty.'; } },
    ],
  },
  {
    id: 'assassin', weight: 4, minTurn: 8,
    title: '🗡️ A Blade in the Night',
    text: 'Your guards have seized an assassin outside your chambers. Under questioning, they hint at a foreign paymaster.',
    choices: [
      { label: 'Interrogate ruthlessly', hint: 'Learn who sent them', effect: (gs, rng) => { gs.flags.knowEnemy = true; gs.happy -= 3; return 'The assassin talked. You now know a rival hand is moving against you.'; } },
      { label: 'Show mercy, turn them', hint: 'Gain a spy', effect: (gs) => { gs.flags.spy = true; return 'You spare them. They swear to serve you as an agent in the shadows.'; } },
      { label: 'Public execution', hint: 'A warning to enemies', effect: (gs) => { gs.happy += 4; gs.loyalty = Math.min(1, gs.loyalty + 0.04); return 'Justice done in the square. The people feel their ruler is protected.'; } },
    ],
  },
];

/** Pick an eligible event given game state + rng. Returns null if none fit. */
export function rollEvent(gs, rng) {
  const eligible = EVENTS.filter((e) =>
    (gs.turn >= (e.minTurn || 0)) &&
    (!e.condition || e.condition(gs)) &&
    (e.id !== gs.lastEventId),
  );
  if (!eligible.length) return null;
  return rng.weighted(eligible.map((e) => ({ item: e, weight: e.weight })));
}
