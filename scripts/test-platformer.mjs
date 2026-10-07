import assert from 'node:assert/strict';
import { createPlatformer, stepPlatformer, platformerSummary, drawPlatformer } from '../src/platformer-engine.js';
const advance = (s, seconds, input = {}) => { for (let i = 0; i < Math.round(seconds * 120); i++) stepPlatformer(s, 1 / 120, input); };
const idle = createPlatformer(); advance(idle, 1); assert.equal(idle.player.y, 388); assert.equal(idle.player.health, 2);
const jump = createPlatformer(); advance(jump, .17, { jump: true }); assert.ok(jump.player.y < 320); advance(jump, 1, { jump: true }); assert.ok(jump.player.grounded, 'holding jump does not auto-bounce');
const shortJump = createPlatformer(), fullJump = createPlatformer(); stepPlatformer(shortJump, 1 / 120, { jump: true }); advance(shortJump, .17, {}); advance(fullJump, .18, { jump: true }); assert.ok(shortJump.player.y > fullJump.player.y + 25);
const coyote = createPlatformer(); Object.assign(coyote.player, {x:441,y:388,vx:310,grounded:true}); stepPlatformer(coyote,1/120,{right:true}); assert.equal(coyote.player.grounded,false); stepPlatformer(coyote,1/120,{right:true,jump:true}); assert.ok(coyote.player.vy < -600,'late jump uses 105ms coyote window');
const buffered = createPlatformer(); Object.assign(buffered.player,{y:383,vy:300,grounded:false,coyote:0}); stepPlatformer(buffered,1/120,{jump:true}); advance(buffered,.04,{jump:true}); assert.ok(buffered.player.vy < -550,'jump buffered before landing fires on next grounded step');
const authored = createPlatformer();
assert.equal(authored.sectors.length, 6); assert.equal(authored.platforms.length, 73); assert.ok(authored.goalX > 24000, 'hell course is at least triple old length');
assert.equal(authored.checkpointFlags.length, 2, 'only two checkpoints');
assert.ok(authored.route.filter(r => r.requiresDash).length >= 8);
assert.ok(authored.platforms.filter(p => p.type === 'crumble' && p.w <= 94).length >= 16);
assert.ok(authored.hazards.filter(h => h.type === 'vent').length >= 8);
assert.equal(platformerSummary(authored).progress, 0);
const a = createPlatformer('endless', 183), b = createPlatformer('endless', 183), c = createPlatformer('endless', 184); assert.deepEqual(a.platforms, b.platforms); assert.notDeepEqual(a.platforms, c.platforms);
for (let i = 0; i < 400; i++) { const input = { right: true, jump: i % 100 < 36, dash: i % 179 === 0 }; stepPlatformer(a, 1 / 120, input); stepPlatformer(b, 1 / 120, input); } assert.deepEqual(a, b);
const fall = createPlatformer(); fall.player.y = 700; stepPlatformer(fall, 1 / 120); assert.equal(fall.player.health, 1); assert.equal(fall.metrics.deaths, 1); assert.equal(fall.player.x, 94); assert.equal(fall.over, false);
const hardcore = createPlatformer('shadow'); hardcore.player.y = 700; stepPlatformer(hardcore, 1 / 120); assert.equal(hardcore.over, true); assert.equal(hardcore.won, false);
const checkpoint = createPlatformer(); const firstFlag = checkpoint.checkpointFlags[0]; checkpoint.player.x = firstFlag.x + 4; checkpoint.player.y = firstFlag.y - 46; checkpoint.player.health = 1;
stepPlatformer(checkpoint, 1 / 120); assert.equal(checkpoint.metrics.checkpoints, 1); assert.equal(checkpoint.checkpoint.x, firstFlag.x + 10); assert.equal(checkpoint.player.health, 1, 'checkpoint never heals');
advance(checkpoint, .1); assert.equal(checkpoint.metrics.checkpoints, 1, 'checkpoint cannot be farmed');
const finish = createPlatformer(); finish.player.x = finish.goalX - 10; finish.player.y = finish.goalY - 46; stepPlatformer(finish, 1 / 120); assert.equal(finish.won, true); assert.equal(finish.over, true); assert.ok(finish.score > 5000); const frozen = finish.elapsed; stepPlatformer(finish, 1); assert.equal(finish.elapsed, frozen);
const enemy = createPlatformer(); const e = enemy.enemies.find(e => e.type === 'beetle'); enemy.player.x = e.x; enemy.player.y = e.y - enemy.player.h - 1; enemy.player.vy = 220; stepPlatformer(enemy, .02); assert.equal(e.alive, false); assert.equal(enemy.metrics.stomps, 1);
const spike = createPlatformer('shadow'); const se = spike.enemies.find(e => e.type === 'spike'); spike.player.x = se.x; spike.player.y = se.y - 38; spike.player.vy = 200; stepPlatformer(spike, .02); assert.equal(spike.over, true);
const coin = createPlatformer(); coin.player.x = coin.coins[0].x - 15; coin.player.y = coin.coins[0].y - 23; stepPlatformer(coin, 1 / 120); assert.equal(coin.metrics.coins, 1); const before = coin.metrics.coins; stepPlatformer(coin, 1 / 120); assert.equal(coin.metrics.coins, before);
coin.player.y = 700; stepPlatformer(coin, 1 / 120); assert.equal(coin.coins[0].taken, true, 'death never restores scored collectibles'); assert.equal(coin.metrics.coins, before);

// Warning is nondamaging; every beam has a safe wait ledge and > 1s off window.
for (const originalVent of authored.hazards.filter(h => h.type === 'vent')) {
  assert.ok(originalVent.cycle - originalVent.warningDuration - originalVent.activeDuration >= 1);
  const ground = authored.platforms.find(p => p.type === 'ground' && originalVent.x >= p.x && originalVent.x <= p.x + p.w);
  assert.ok(ground && originalVent.x - ground.x >= 125);
  const s = createPlatformer(), vent = s.hazards.find(h => h.x === originalVent.x && h.type === 'vent');
  const off = vent.cycle - vent.warningDuration - vent.activeDuration;
  s.elapsed = off - vent.phase + .01; if (s.elapsed < 0) s.elapsed += vent.cycle;
  Object.assign(s.player, { x: vent.x, y: vent.y + vent.h - 46, vx: 0, vy: 0 });
  stepPlatformer(s, 1 / 120); assert.equal(vent.state, 'warning'); assert.equal(s.metrics.deaths, 0);
  s.elapsed += vent.warningDuration; stepPlatformer(s, 1 / 120); assert.equal(vent.state, 'active'); assert.equal(s.metrics.deaths, 1); assert.equal(s.player.x, 94);
}
function syncPlatforms(s, time) {
  s.elapsed = time;
  for (const p of s.platforms) if (p.type === 'moving') { const wave = Math.sin(time * p.speed + p.phase) * p.range; p.x = p.baseX + (p.axis === 'x' ? wave : 0); p.y = p.baseY + (p.axis === 'y' ? wave : 0); }
}
function findCrossing(index, time, dashAllowed = true) {
  for (const dashAt of dashAllowed ? [-1, 18, 27, 36, 43] : [-1]) for (const edge of [34, 23, 13]) {
    const s = createPlatformer(), from = s.platforms[index], to = s.platforms[index + 1];
    s.enemies = []; s.hazards = []; syncPlatforms(s, time);
    Object.assign(s.player, { x: from.x + from.w - edge, y: from.y - 46, groundId: from.id, vx: 310, grounded: true });
    for (let frame = 0; frame < 145 && !s.metrics.deaths; frame++) { stepPlatformer(s, 1 / 120, { right: true, jump: frame < 95, dash: frame === dashAt }); if (s.player.groundId === to.id) return { dashAt, edge }; }
  }
  return null;
}
// Test actual physics at four different moving-platform phases. Hazard safe
// windows are checked separately so this isolates impossible authored geometry.
for (let index = 0; index < authored.route.length; index++) for (const time of [0, .8, 1.7, 2.6]) {
  assert.ok(findCrossing(index, time, authored.route[index].requiresDash), `platform ${index + 1} → ${index + 2} is reachable at lift time ${time}`);
  if (authored.route[index].requiresDash) assert.equal(authored.platforms[index].type,'ground','mandatory dash has stable takeoff to await cooldown');
}
for (const [index, transition] of authored.route.entries()) if (transition.requiresDash) assert.equal(findCrossing(index, 0, false), null, `marked dash gap ${index} really requires a dash`);
const canvas = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) }, { get: (obj, key) => key in obj ? obj[key] : () => {}, set: (obj, key, value) => { obj[key] = value; return true; } }); const state = JSON.stringify(a); drawPlatformer(canvas, a); assert.equal(JSON.stringify(a), state);
assert.ok(Number.isFinite(platformerSummary(a).score)); console.log('Platformer: 6 sectors / 73 platforms; physics, 288 gap-phase crossings, mandatory dash spans, vent warnings, modes, no farming, checkpoints and render purity passed.');
