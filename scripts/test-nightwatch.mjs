import assert from 'node:assert/strict';
import {
  TOWER_TYPES, createNightwatch, stepNightwatch, nightwatchAction,
  nightwatchCellAt, nightwatchSummary, drawNightwatch,
} from '../src/nightwatch-engine.js';

function advance(s, seconds, dt = 1 / 30) {
  for (let i = 0; i < Math.round(seconds / dt) && !s.over; i++) stepNightwatch(s, dt);
}
function build(s, row, col, tower = 'shooter') {
  return nightwatchAction(s, { type: 'build', row, col, tower });
}

assert.deepEqual(TOWER_TYPES.map(t => t.id), ['shooter', 'generator', 'frost', 'barricade']);
assert.deepEqual(nightwatchCellAt(160, 112), { row: 0, col: 0 });
assert.deepEqual(nightwatchCellAt(775.9, 471.9), { row: 4, col: 6 });
for (const pos of [[159, 120], [776, 120], [180, 472], [180, 111], [NaN, 160]]) {
  assert.equal(nightwatchCellAt(...pos), null, 'only playable lawn is buildable');
}

const economy = createNightwatch();
assert.equal(build(economy, 0, 0, 'generator').ok, true);
assert.equal(economy.energy, 400);
assert.equal(build(economy, 0, 0).ok, false, 'occupied cells cannot consume resources');
assert.equal(economy.energy, 400);
advance(economy, 40);
assert.equal(economy.energy, 400, 'preparation cannot farm income');
assert.equal(economy.elapsed, 0, 'preparation does not add survival time');
nightwatchAction(economy, { type: 'wave' });
advance(economy, 8);
assert.equal(economy.energy, 435, 'active generator and passive income are real timed events');
economy.energy = 0;
assert.equal(build(economy, 1, 0).ok, false, 'unaffordable build rejected');
assert.equal(economy.towers.length, 1);
economy.energy = 200;
assert.equal(nightwatchAction(economy, { type: 'upgrade', row: 0, col: 0 }).ok, true);
assert.equal(economy.towers[0].level, 2);
assert.equal(economy.upgrades, 1);
assert.equal(economy.score, 0, 'build and upgrade actions cannot farm leaderboard score');
const beforeSale = economy.energy;
const expectedRefund = nightwatchSummary(economy).selected.sellValue;
assert.equal(nightwatchAction(economy, { type: 'sell', row: 0, col: 0 }).ok, true);
assert.equal(economy.energy, beforeSale + expectedRefund);
assert.equal(economy.towers.length, 0);

const opening = createNightwatch('extreme', 42);
for (let row = 0; row < 5; row++) assert.equal(build(opening, row, 1).ok, true);
assert.equal(nightwatchAction(opening, { type: 'wave' }).ok, true);
assert.equal(nightwatchAction(opening, { type: 'wave' }).ok, false, 'cannot skip active waves');
advance(opening, 90);
assert.equal(opening.wavesCleared, 1, 'sensible opening defenses clear first wave');
assert.equal(opening.baseHp, 5);
assert.equal(opening.kills, 9);
assert.equal(opening.canStartWave, true);
assert.equal(opening.score, opening.kills * 100 + 500);

const breach = createNightwatch('extreme', 20);
nightwatchAction(breach, { type: 'wave' });
advance(breach, 100);
assert.equal(breach.over, true, 'undefended lanes eventually breach shelter');
assert.equal(breach.won, false);
assert.equal(breach.baseHp, 0);
assert.equal(breach.kills, 0);

const blocked = createNightwatch();
blocked.zombies.push({ row: 0, x: 204 });
assert.equal(build(blocked, 0, 0).ok, false, 'cannot build on top of an enemy');

function enemyFixture(x, row = 0) {
  return { id: 100, type: 'walker', row, x, y: 148 + row * 72, hp: 1000, maxHp: 1000,
    speed: 24, attack: 80, reward: 10, radius: 14, slow: 0, hit: 0, biting: false, gait: 0 };
}
const slowed = createNightwatch(), uncooled = createNightwatch();
build(slowed, 0, 0, 'frost');
for (const s of [slowed, uncooled]) {
  nightwatchAction(s, { type: 'wave' });
  s.queue = [{ at: 999, row: 4, kind: 'walker' }];
  s.zombies = [enemyFixture(500)];
  advance(s, 5);
}
assert.ok(slowed.zombies[0].slow > 0, 'cold rounds apply a real timed slow');
assert.ok(slowed.zombies[0].x > uncooled.zombies[0].x + 30, 'slow meaningfully delays the approaching enemy');

const destruction = createNightwatch();
build(destruction, 0, 0);
nightwatchAction(destruction, { type: 'wave' });
destruction.queue = [{ at: 999, row: 4, kind: 'walker' }];
destruction.zombies = [enemyFixture(244)];
advance(destruction, 3);
assert.equal(destruction.towers.length, 0, 'blocked enemies attack and destroy facilities');
assert.ok(destruction.zombies[0].x < 240, 'enemy resumes moving once its blocker is destroyed');

const a = createNightwatch('shadow', 719), b = createNightwatch('shadow', 719);
for (const s of [a, b]) {
  for (let row = 0; row < 5; row++) build(s, row, 1);
  nightwatchAction(s, { type: 'wave' });
}
advance(a, 30, 1 / 30);
advance(b, 30, 1 / 60);
const snapshot = s => ({ ...s, accumulator: 0 });
assert.deepEqual(snapshot(a), snapshot(b), 'fixed-step events are reproducible across frame rates');

// Exercise all ten wave endings and the clear bonus with an explicit strong defense fixture.
const victory = createNightwatch('extreme', 777);
victory.energy = 9000;
for (let row = 0; row < 5; row++) {
  for (const col of [0, 1, 2]) {
    build(victory, row, col);
    nightwatchAction(victory, { type: 'upgrade', row, col });
    nightwatchAction(victory, { type: 'upgrade', row, col });
  }
  build(victory, row, 3, 'frost');
  build(victory, row, 5, 'barricade');
}
for (let wave = 1; wave <= 10; wave++) {
  assert.equal(nightwatchAction(victory, { type: 'wave' }).ok, true);
  advance(victory, 120);
  assert.equal(victory.wavesCleared, wave, `wave ${wave} finishes after last target`);
}
assert.equal(victory.won, true);
assert.equal(victory.over, true);
assert.equal(victory.canStartWave, false);
assert.equal(victory.score, victory.kills * 100 + 5000 + 3000 + victory.baseHp * 200);
assert.equal(nightwatchAction(victory, { type: 'wave' }).ok, false);
const finalScore = victory.score;
advance(victory, 20);
assert.equal(victory.score, finalScore, 'finished scores are immutable');
assert.equal(createNightwatch('endless').totalWaves, Infinity);
assert.equal(createNightwatch('shadow').totalWaves, 12);

// Drawing must not mutate the deterministic simulation or depend on browser-only globals.
const gradient = { addColorStop() {} };
const noop = () => {};
const context = new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient }, {
  get: (obj, key) => key in obj ? obj[key] : noop,
  set: (obj, key, value) => { obj[key] = value; return true; },
});
const beforeDrawing = JSON.stringify(a);
drawNightwatch(context, a);
assert.equal(JSON.stringify(a), beforeDrawing);
console.log('nightwatch: economy, actions, combat, wave lifecycle, score, determinism and drawing passed');
