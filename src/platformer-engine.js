// A deterministic, original side-scroller. World units are independent of canvas size.
const VIEW_W = 960;
const VIEW_H = 540;
const GRAVITY = 1840;
export const PLATFORMER_SECTORS = Object.freeze([
  { id: 1, name: '风起残垣', theme: 'meadow' }, { id: 2, name: '裂缝栈道', theme: 'ruins' },
  { id: 3, name: '高炉回廊', theme: 'foundry' }, { id: 4, name: '逆风钟塔', theme: 'clockwork' },
  { id: 5, name: '深空吊桥', theme: 'astral' }, { id: 6, name: '熔心终局', theme: 'core' },
]);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const hash = (n) => { let x = (n | 0) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x21f0aaad); x = Math.imul(x ^ (x >>> 15), 0x735a2d97); return (x ^ (x >>> 15)) >>> 0; };
function random(s) { s.rng = hash(s.rng); return s.rng / 4294967296; }
function terrainRandom(s) { s.worldRng = hash(s.worldRng); return s.worldRng / 4294967296; }

function addPlatform(s, x, y, w, type = 'ground', options = {}) {
  const p = { id: s.nextId++, x, y, baseX: x, baseY: y, w, h: type === 'ground' ? 540 - y + 80 : 20, type, dx: 0, dy: 0, age: 0, broken: false, ...options };
  s.platforms.push(p);
  return p;
}
function addCoins(s, x, y, count = 4, spacing = 32, arc = false) {
  for (let i = 0; i < count; i++) s.coins.push({ x: x + spacing * i, y: y - (arc ? Math.sin(i / Math.max(1, count - 1) * Math.PI) * 54 : 0), taken: false });
}
function addEnemy(s, p, offset, type = 'beetle') {
  s.enemies.push({ x: p.x + offset, y: p.y - 28, w: 34, h: 28, left: p.x + 14, right: p.x + p.w - 48, dir: -1, speed: (type === 'spike' ? 104 : 88) + (p.sector || 0) * 13, type, alive: true, platformId: p.id });
}
function addSaw(s, x, y, axis = 'y', range = 46, phase = 0, speed = 1.8) {
  s.hazards.push({ type: 'saw', x, y, baseX: x, baseY: y, axis, range, phase, speed, radius: 19 });
}
function addVent(s, p, sector, offset = p.w - 57) {
  s.hazards.push({ type: 'vent', x: p.x + offset, y: p.y - 190, baseX: p.x + offset, baseY: p.y - 190, w: 22, h: 190,
    cycle: 4.1 - sector * .13, phase: sector * .73, warningDuration: .9, activeDuration: 1.15 + sector * .08, state: 'idle', charge: 0, sector });
}

function buildAuthored(s) {
  // Six deliberate obstacle phrases, not a repeated short course. Each tuple is
  // [gap,width,top,type,obstacle]; wide dash spans are surrounded by reset ledges.
  const courses = [
    [[145,170,418,'ground','beetle'],[166,110,390,'crumble'],[155,118,354,'moving'],[170,200,402,'ground','spike'],[178,92,376,'crumble'],[184,102,344,'moving'],[164,230,408,'ground','vent'],[278,146,410,'ground','dash'],[172,94,373,'crumble'],[180,110,346,'moving'],[185,220,408,'ground','beetle'],[164,260,426,'ground']],
    [[180,102,388,'crumble'],[190,98,356,'moving'],[186,184,402,'ground','spike'],[284,144,418,'ground','dash'],[182,88,382,'crumble'],[176,94,349,'crumble'],[186,222,406,'ground','vent'],[196,94,372,'moving'],[187,170,398,'ground','beetle'],[178,90,356,'crumble'],[188,112,376,'moving'],[184,340,428,'ground','checkpoint']],
    [[188,188,416,'ground','vent'],[180,92,379,'crumble'],[176,106,348,'moving'],[182,180,396,'ground','spike'],[289,142,416,'ground','dash'],[182,90,374,'crumble'],[188,104,354,'moving'],[187,230,402,'ground','vent'],[196,92,369,'crumble'],[198,104,345,'moving'],[180,184,398,'ground','saw'],[182,260,424,'ground']],
    [[182,92,390,'moving'],[190,88,350,'crumble'],[190,180,398,'ground','saw'],[292,138,420,'ground','dash'],[184,86,382,'crumble'],[196,92,352,'moving'],[186,224,402,'ground','vent'],[193,84,374,'crumble'],[190,100,352,'moving'],[194,174,398,'ground','spike'],[194,92,378,'crumble'],[184,340,428,'ground','checkpoint']],
    [[184,92,390,'moving'],[202,80,360,'crumble'],[191,184,402,'ground','saw'],[294,132,420,'ground','dash'],[193,82,382,'crumble'],[191,94,352,'moving'],[190,224,402,'ground','vent'],[194,84,374,'crumble'],[190,92,350,'moving'],[196,170,396,'ground','spike'],[290,130,420,'ground','dash'],[190,260,424,'ground']],
    [[194,84,390,'crumble'],[192,94,358,'moving'],[190,220,408,'ground','vent'],[296,128,424,'ground','dash'],[194,80,384,'crumble'],[196,90,354,'moving'],[193,180,402,'ground','saw'],[190,82,370,'crumble'],[190,88,346,'moving'],[194,220,406,'ground','vent'],[292,130,426,'ground','dash'],[190,360,426,'ground']],
  ];
  let previous = addPlatform(s, 0, 434, 440, 'ground', { sector: 0, challenge: 'start' });
  addCoins(s, 220, 385, 4);
  for (let sector = 0; sector < courses.length; sector++) {
    const zone = { ...PLATFORMER_SECTORS[sector], start: sector ? previous.baseX + previous.w : 0, end: 0 };
    s.sectors.push(zone);
    for (let index = 0; index < courses[sector].length; index++) {
      const [gap,w,y,type,challenge = 'precision'] = courses[sector][index];
      const x = previous.baseX + previous.w + gap;
      const options = { sector, challenge, crumbleDelay: .5 - sector * .022 };
      if (type === 'moving') Object.assign(options, { axis: index % 3 === 0 ? 'x' : 'y', range: 14 + sector * 2, speed: 1.8 + sector * .19, phase: index * .77 + sector * .41 });
      const p = addPlatform(s, x, y, w, type, options);
      s.route.push({ fromId: previous.id, toId: p.id, gap, requiresDash: challenge === 'dash', sector });
      addCoins(s, x + 24, y - (challenge === 'spike' ? 105 : 54), Math.max(2, Math.floor(w / 52)), 35, challenge === 'spike');
      if (challenge === 'beetle' || challenge === 'spike') addEnemy(s, p, Math.max(45, w - 70), challenge);
      if (challenge === 'saw') { addSaw(s, x + w * .58, y - 68, 'y', 50, sector * .6, 2.05 + sector * .17); if (sector >= 4) addEnemy(s, p, 28); }
      if (challenge === 'vent') addVent(s, p, sector);
      if (challenge === 'dash') addCoins(s, x - gap + 45, y - 96, 5, (gap - 75) / 4, true);
      if (challenge === 'checkpoint') s.checkpointFlags.push({ x: x + 80, y, active: false, label: sector === 1 ? '余烬驿站' : '深空驿站' });
      previous = p;
    }
    zone.end = previous.baseX + previous.w;
  }
  s.goalX = previous.baseX + previous.w - 94;
  s.goalY = previous.y;
  s.worldEnd = previous.baseX + previous.w;
}
function extendEndless(s, until) {
  if (!s.generatedX) { addPlatform(s, 0, 434, 440, 'ground', { sector: 0 }); addCoins(s, 200, 380, 5); s.generatedX = 440; }
  while (s.generatedX < until) {
    const i = s.chunk++;
    const difficulty = Math.min(1, i / 45), sector = Math.min(5, Math.floor(i / 9));
    const dash = i % 8 === 5;
    const checkpoint = i % 24 === 23;
    const gap = dash ? 278 + difficulty * 16 : 162 + Math.floor(terrainRandom(s) * 24) + difficulty * 12;
    const type = dash || i % 4 === 3 ? 'ground' : i % 4 === 2 ? 'crumble' : 'moving';
    const width = dash ? 150 : type === 'ground' ? 230 : 116 - difficulty * 32;
    const previous = s.platforms[s.platforms.length - 1];
    const y = dash ? 416 : clamp(previous.baseY + Math.floor(terrainRandom(s) * 57) - 28, 350, 426);
    const p = addPlatform(s, s.generatedX + gap, y, width, type, { sector, challenge: checkpoint ? 'checkpoint' : dash ? 'dash' : 'precision', crumbleDelay: .49 - difficulty * .12,
      ...(type === 'moving' ? { axis: 'y', range: 14 + difficulty * 8, speed: 1.8 + difficulty, phase: terrainRandom(s) * 6.28 } : {}) });
    s.route.push({ fromId: previous.id, toId: p.id, gap, requiresDash: dash, sector });
    addCoins(s, p.x + 25, y - 80, Math.max(2, Math.floor(width / 50)), 37, true);
    if (type === 'ground' && !dash && !checkpoint) { if (i % 12 === 7) addVent(s, p, sector); else addEnemy(s, p, width - 90, i % 3 === 0 ? 'spike' : 'beetle'); }
    if (i > 14 && i % 12 === 3) addSaw(s, p.x + width / 2, y - 90, 'y', 36, i, 2.3);
    if (checkpoint) s.checkpointFlags.push({ x: p.x + 35, y, active: false, label: '无尽驿站' });
    s.generatedX = p.x + p.w;
  }
  s.worldEnd = s.generatedX;
}

export function createPlatformer(mode = 'extreme', seed = 1) {
  if (!['extreme', 'endless', 'shadow'].includes(mode)) mode = 'extreme';
  const numericSeed = typeof seed === 'number' ? seed : [...String(seed)].reduce((a, c) => Math.imul(a, 31) + c.charCodeAt(0), 1);
  const s = {
    mode, seed, rng: hash(numericSeed), worldRng: hash(numericSeed + 173), nextId: 1, elapsed: 0, over: false, won: false, reason: '', score: 0,
    player: { x: 94, y: 388, w: 30, h: 46, vx: 0, vy: 0, facing: 1, grounded: true, groundId: 1, coyote: .1, buffer: 0, health: mode === 'shadow' ? 1 : 2, invincible: 0, dashTime: 0, dashCooldown: 0, airDash: true, jumpHeld: false, dashHeld: false, runCycle: 0 },
    platforms: [], coins: [], enemies: [], hazards: [], checkpointFlags: [], particles: [], floats: [],
    checkpoint: { x: 94, y: 388 }, metrics: { distance: 0, coins: 0, stomps: 0, checkpoints: 0, deaths: 0 },
    maxX: 94, camera: 0, notice: mode === 'shadow' ? '一命绝境：仅有一枚机芯。六区连闯，没有第二次机会。' : mode === 'endless' ? '无尽裂隙：仅有两枚机芯，危险持续升级。长跳配合冲刺跨越断层。' : '地狱远征：六区连闯，仅有两枚机芯。长跳配合冲刺跨越红色断桥。', noticeTime: 6.5, shake: 0, chunk: 0, goalX: Infinity,
    sectors: [], sectorIndex: 0, route: [],
  };
  if (mode === 'endless') extendEndless(s, 2500); else buildAuthored(s);
  return s;
}

function burst(s, x, y, color, count = 9, velocity = 130) {
  for (let i = 0; i < count; i++) { const a = random(s) * Math.PI * 2, v = velocity * (.4 + random(s) * .6); s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 35, life: .3 + random(s) * .35, color, size: 2 + Math.floor(random(s) * 3) }); }
}
function notify(s, text) { s.notice = text; s.noticeTime = 3; }
function hurt(s, fall, sourceX = s.player.x, vent = false) {
  const p = s.player;
  if (s.over || (!fall && p.invincible > 0)) return;
  s.maxX = Math.max(s.maxX, p.x);
  p.health--; s.metrics.deaths++; s.shake = .18;
  burst(s, p.x + 15, p.y + 23, '#e88c65', 16, 220);
  if (p.health <= 0) { s.over = true; s.reason = vent ? '高炉脉冲击穿机芯，跃迁中断。' : fall ? '坠落深谷，发条停止。' : '机芯受损，跃迁中断。'; p.vx = 0; p.vy = 0; return; }
  if (fall) { p.x = s.checkpoint.x; p.y = s.checkpoint.y; p.vx = 0; p.vy = 0; p.grounded = false; p.groundId = null; s.camera = Math.max(0, p.x - 260); for (const platform of s.platforms) if (platform.type === 'crumble') { platform.broken = false; platform.age = 0; } notify(s, '回到驿站。还剩 ' + p.health + ' 枚机芯。'); }
  else { p.vx = p.x < sourceX ? -280 : 280; p.vy = -360; p.grounded = false; notify(s, '机芯受损。借短暂无敌重新站稳。'); }
  p.invincible = 1.5; p.dashTime = 0; p.airDash = true;
}

export function stepPlatformer(s, dt, input = {}) {
  if (s.over || !Number.isFinite(dt) || dt <= 0) return s;
  // Split long frames to keep collision quality stable and avoid tunnelling.
  let remaining = Math.min(dt, .1);
  while (remaining > 1e-7 && !s.over) { const h = Math.min(remaining, 1 / 120); simulate(s, h, input); remaining -= h; }
  return s;
}
function simulate(s, dt, input) {
  s.elapsed += dt; s.noticeTime = Math.max(0, s.noticeTime - dt); s.shake = Math.max(0, s.shake - dt);
  const p = s.player, oldY = p.y;
  if (s.mode === 'endless') extendEndless(s, p.x + 1800);
  for (const plat of s.platforms) {
    const px = plat.x, py = plat.y;
    if (plat.type === 'moving') { const wave = Math.sin(s.elapsed * plat.speed + plat.phase) * plat.range; plat.x = plat.baseX + (plat.axis === 'x' ? wave : 0); plat.y = plat.baseY + (plat.axis === 'y' ? wave : 0); }
    if (plat.type === 'crumble' && plat.age > 0) { plat.age += dt; if (plat.age > (plat.crumbleDelay || .44)) { if (!plat.broken) burst(s, plat.x + plat.w / 2, plat.y, '#be9870', 10, 100); plat.broken = true; } }
    plat.dx = plat.x - px; plat.dy = plat.y - py;
    if (p.grounded && p.groundId === plat.id && !plat.broken) { p.x += plat.dx; p.y += plat.dy; }
  }
  p.invincible = Math.max(0, p.invincible - dt); p.dashCooldown = Math.max(0, p.dashCooldown - dt); p.dashTime = Math.max(0, p.dashTime - dt);
  p.buffer = Math.max(0, p.buffer - dt);
  if (input.jump && !p.jumpHeld) p.buffer = .13;
  if (!input.jump && p.jumpHeld && p.vy < -230) p.vy *= .48;
  p.jumpHeld = !!input.jump;
  p.coyote = p.grounded ? .105 : Math.max(0, p.coyote - dt);
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (direction) p.facing = direction;
  if (input.dash && !p.dashHeld && p.dashCooldown <= 0 && p.airDash) { p.dashTime = .15; p.dashCooldown = .95; p.airDash = false; p.vy = Math.min(p.vy, -85); burst(s, p.x + 15, p.y + 26, '#efc265', 6, 70); }
  p.dashHeld = !!input.dash;
  if (p.buffer > 0 && p.coyote > 0) { p.vy = -655; p.buffer = 0; p.coyote = 0; p.grounded = false; p.groundId = null; burst(s, p.x + 15, p.y + p.h, '#c7d7b4', 6, 55); }
  if (p.dashTime > 0) { p.vx = p.facing * 590; p.vy += GRAVITY * .25 * dt; }
  else { const acceleration = p.grounded ? 2600 : 1650; p.vx += clamp(direction * 310 - p.vx, -acceleration * dt, acceleration * dt); p.vy = Math.min(780, p.vy + GRAVITY * dt); }
  p.x += p.vx * dt;
  for (const plat of s.platforms) if (plat.type === 'ground' && intersects(p, plat) && oldY + p.h > plat.y + 5) {
    if (p.vx > 0 && p.x + p.w - p.vx * dt <= plat.x + 1) { p.x = plat.x - p.w; p.vx = 0; }
    else if (p.vx < 0 && p.x - p.vx * dt >= plat.x + plat.w - 1) { p.x = plat.x + plat.w; p.vx = 0; }
  }
  p.x = Math.max(0, p.x);
  const beforeBottom = p.y + p.h;
  p.y += p.vy * dt;
  p.grounded = false; p.groundId = null;
  if (p.vy >= 0) for (const plat of s.platforms) {
    if (plat.broken || p.x + p.w <= plat.x + 2 || p.x >= plat.x + plat.w - 2) continue;
    if (beforeBottom <= plat.y + Math.max(5, Math.abs(plat.dy) + 1) && p.y + p.h >= plat.y) {
      p.y = plat.y - p.h; p.vy = 0; p.grounded = true; p.groundId = plat.id; p.airDash = true;
      if (plat.type === 'crumble' && plat.age === 0) plat.age = dt;
    }
  }
  if (p.y > VIEW_H + 95) hurt(s, true);
  for (const e of s.enemies) {
    if (!e.alive) continue;
    e.x += e.speed * e.dir * dt;
    if (e.x < e.left) { e.x = e.left; e.dir = 1; } else if (e.x > e.right) { e.x = e.right; e.dir = -1; }
    if (intersects(p, e)) {
      if (e.type !== 'spike' && p.vy > 30 && oldY + p.h <= e.y + 14) { e.alive = false; p.vy = input.jump ? -540 : -390; p.airDash = true; s.metrics.stomps++; burst(s, e.x + 17, e.y + 12, '#e2b863', 12); s.floats.push({ x: e.x, y: e.y, text: '+150', life: .85 }); }
      else hurt(s, false, e.x + 17);
    }
  }
  for (const h of s.hazards) {
    if (h.type === 'vent') {
      const cycleTime = (s.elapsed + h.phase) % h.cycle;
      const offDuration = h.cycle - h.warningDuration - h.activeDuration;
      h.state = cycleTime < offDuration ? 'idle' : cycleTime < offDuration + h.warningDuration ? 'warning' : 'active';
      h.charge = h.state === 'idle' ? cycleTime / offDuration : h.state === 'warning' ? (cycleTime - offDuration) / h.warningDuration : 1;
      if (h.state === 'active' && p.invincible <= 0 && intersects({ x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 }, h)) hurt(s, true, h.x, true);
      continue;
    }
    h.x = h.baseX + (h.axis === 'x' ? Math.sin(s.elapsed * (h.speed || 1.8) + h.phase) * h.range : 0);
    h.y = h.baseY + (h.axis === 'y' ? Math.sin(s.elapsed * (h.speed || 1.8) + h.phase) * h.range : 0);
    const nearX = clamp(h.x, p.x + 3, p.x + p.w - 3), nearY = clamp(h.y, p.y + 3, p.y + p.h - 3);
    if ((h.x - nearX) ** 2 + (h.y - nearY) ** 2 < (h.radius - 3) ** 2) hurt(s, false, h.x);
  }
  for (const c of s.coins) if (!c.taken && Math.abs(c.x - (p.x + 15)) < 25 && Math.abs(c.y - (p.y + 23)) < 33) { c.taken = true; s.metrics.coins++; burst(s, c.x, c.y, '#f4d57c', 6, 90); }
  for (const flag of s.checkpointFlags) if (!flag.active && p.x + p.w > flag.x && p.x < flag.x + 48 && p.y + p.h > flag.y - 80 && p.y < flag.y) {
    flag.active = true; s.metrics.checkpoints++;
    if (s.mode !== 'shadow') s.checkpoint = { x: flag.x + 10, y: flag.y - p.h };
    notify(s, s.mode === 'shadow' ? flag.label + '通过。一命继续。' : flag.label + '已点亮，坠落将从这里继续。'); burst(s, flag.x + 5, flag.y - 74, '#c7e3ac', 22, 160);
  }
  s.maxX = Math.max(s.maxX, p.x); s.metrics.distance = Math.max(0, Math.floor(s.maxX - 94));
  const nextSector = s.mode === 'endless' ? Math.floor(p.x / 3600) : Math.max(0, s.sectors.findLastIndex(zone => p.x >= zone.start));
  if (nextSector !== s.sectorIndex) { s.sectorIndex = nextSector; notify(s, s.mode === 'endless' ? `第 ${nextSector + 1} 重无尽群岛 · 裂隙继续收窄` : `第 ${nextSector + 1} 区 · ${s.sectors[nextSector].name}`); }
  if (p.x + p.w >= s.goalX && p.y + p.h > 320 && !s.over) { s.over = true; s.won = true; s.reason = '六重禁区全部贯通，熔心航标重新点亮。'; burst(s, s.goalX, 288, '#f4d57c', 36, 260); }
  const scoreSeconds = Math.floor(Math.round(s.elapsed * 1000) / 1000);
  s.score = Math.max(0, Math.floor(s.metrics.distance / 10) + s.metrics.coins * 100 + s.metrics.stomps * 150 + s.metrics.checkpoints * 500 - s.metrics.deaths * 200 + (s.won ? 3000 + Math.max(0, 180 - scoreSeconds) * 10 : 0));
  const cameraTarget = Math.max(0, p.x - 282 + p.vx * .13);
  s.camera += (Math.min(cameraTarget, Math.max(0, s.worldEnd - VIEW_W)) - s.camera) * Math.min(1, dt * 7);
  p.runCycle += Math.abs(p.vx) * dt / 25;
  for (const particle of s.particles) { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 350 * dt; particle.life -= dt; }
  s.particles = s.particles.filter(f => f.life > 0);
  for (const f of s.floats) { f.y -= 34 * dt; f.life -= dt; }
  s.floats = s.floats.filter(f => f.life > 0);
}

export function platformerSummary(s) {
  const phase = s.sectorIndex + 1;
  return { score: s.score, primaryLabel: '跃迁距离', primaryValue: `${Math.floor(s.metrics.distance / 10)} m`, secondaryLabel: '剩余机芯', secondaryValue: `${s.player.health} / ${s.mode === 'shadow' ? 1 : 2}`, progress: s.mode === 'endless' ? (s.metrics.distance % 3600) / 36 : clamp(s.metrics.distance / (s.goalX - 94) * 100, 0, 100), phase, sectorName: s.sectors[s.sectorIndex]?.name || `无尽第 ${phase} 区`, totalSectors: s.mode === 'endless' ? null : 6, notice: s.noticeTime > 0 ? s.notice : s.player.dashCooldown > 0 ? '冲刺回充中 · 脆桥将在半秒内坍塌' : '冲刺就绪 · 高炉亮黄预警，红色脉冲不可穿越', metrics: { ...s.metrics } };
}

export {drawPlatformer} from './platformer-renderer.js';
