// Original lane-defense simulation. Rendering is deliberately independent of RNG.
export const TOWER_TYPES = Object.freeze([
  { id: 'shooter', name: '铆钉炮', cost: 90, description: '单路持续射击，升级增加火力。' },
  { id: 'generator', name: '蓄电机', cost: 100, description: '进攻期间每 8 秒产出电力。' },
  { id: 'frost', name: '冷凝塔', cost: 125, description: '范围冷却，减缓同路尸群。' },
  { id: 'barricade', name: '路障', cost: 65, description: '阻挡并承受攻击，争取输出时间。' },
]);

const GRID = { x: 160, y: 112, cw: 88, ch: 72, rows: 5, cols: 7 };
const STEP = 1 / 30;
const SPECS = {
  shooter: { hp: 150, interval: 1.18, damage: 24 },
  generator: { hp: 130, interval: 8, income: 25 },
  frost: { hp: 160, interval: 2, damage: 8 },
  barricade: { hp: 620, interval: 1, damage: 0 },
};
const ENEMIES = {
  walker: { hp: 76, speed: 18, attack: 18, reward: 10, name: '游荡者', radius: 14 },
  runner: { hp: 62, speed: 36, attack: 16, reward: 12, name: '奔行者', radius: 12 },
  armored: { hp: 160, speed: 16, attack: 28, reward: 18, name: '铁盔客', radius: 17 },
  tank: { hp: 520, speed: 14, attack: 55, reward: 32, name: '重锤者', radius: 23 },
};
const typeOf = id => TOWER_TYPES.find(t => t.id === id);
const cx = col => GRID.x + (col + 0.5) * GRID.cw;
const cy = row => GRID.y + (row + 0.5) * GRID.ch;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function random(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}

export function createNightwatch(mode = 'extreme', seed = 1) {
  mode = ['extreme', 'endless', 'shadow'].includes(mode) ? mode : 'extreme';
  return {
    mode, seed, rng: Number(seed) >>> 0 || 1, nextId: 1, ticks: 0, accumulator: 0,
    elapsed: 0, visualTime: 0, energy: 500, incomeTimer: 0, baseHp: 5,
    wave: 0, waveTime: 0, totalWaves: mode === 'endless' ? Infinity : mode === 'shadow' ? 12 : 10,
    canStartWave: true, waveActive: false, queue: [], towers: [], zombies: [], bullets: [],
    particles: [], floats: [], breachFlash: [0, 0, 0, 0, 0], selectedCell: null,
    kills: 0, wavesCleared: 0, towersBuilt: 0, upgrades: 0, score: 0,
    over: false, won: false, reason: '', notice: '先布防，再迎击。电力只在进攻期间恢复。',
    noticeUntil: 6,
  };
}

export function nightwatchCellAt(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const col = Math.floor((x - GRID.x) / GRID.cw);
  const row = Math.floor((y - GRID.y) / GRID.ch);
  return col >= 0 && col < GRID.cols && row >= 0 && row < GRID.rows ? { row, col } : null;
}

function say(s, message, ok = true) {
  s.notice = message;
  s.noticeUntil = s.visualTime + 3.5;
  return { ok, message };
}

function upgradeCost(t) { return Math.round(typeOf(t.type).cost * (t.level * 0.8 + 0.3)); }
function sellValue(t) { return Math.floor(t.invested * 0.6 * Math.max(0.25, t.hp / t.maxHp)); }
function updateScore(s) { s.score = s.kills * 100 + s.wavesCleared * 500 + (s.won ? 3000 + s.baseHp * 200 : 0); }

function makeWave(s) {
  const n = 7 + s.wave * 2 + Math.max(0, s.wave - 3) * 2 + (s.mode === 'shadow' ? 5 : 0);
  const count = Math.min(80, n);
  const offset = Math.floor(random(s) * 5);
  const surgeLane = Math.floor(random(s) * 5);
  const gap = Math.max(0.38, 1.45 - s.wave * 0.075 - (s.mode === 'shadow' ? 0.2 : 0));
  s.queue = [];
  for (let i = 0; i < count; i++) {
    const r = random(s);
    let kind = 'walker';
    if (s.wave >= 2 && r < 0.24 + s.wave * 0.01) kind = 'runner';
    if (s.wave >= 4 && r > 0.64) kind = 'armored';
    if (s.wave >= 7 && (i % 9 === 8 || r > 0.91)) kind = 'tank';
    // Guarantee readable coverage in the opening five spawns; later groups force repositioning.
    const row = i < 5 ? (i + offset) % 5 : s.wave >= 4 && i % 3 === 0 ? surgeLane : Math.floor(random(s) * 5);
    s.queue.push({ at: 1.4 + i * gap + Math.floor(i / 7) * 1.2, row, kind });
  }
}

export function nightwatchAction(s, action) {
  if (!s || !action || s.over) return { ok: false, message: '本局已经结束。' };
  if (action.type === 'wave') {
    if (!s.canStartWave) return say(s, '清除当前尸群后才能迎击下一波。', false);
    s.wave++;
    s.waveTime = 0;
    s.waveActive = true;
    s.canStartWave = false;
    makeWave(s);
    return say(s, `第 ${s.wave} 波来袭 · ${s.queue.length} 个目标`);
  }
  const { row, col } = action;
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row > 4 || col < 0 || col > 6) {
    return say(s, '请选择院内的建造位置。', false);
  }
  s.selectedCell = { row, col };
  const existing = s.towers.find(t => t.row === row && t.col === col);
  if (action.type === 'build') {
    const tower = typeOf(action.tower);
    if (!tower) return say(s, '请先选择一种设施。', false);
    if (existing) return say(s, '这里已有设施，可升级或拆除。', false);
    if (s.zombies.some(z => z.row === row && Math.abs(z.x - cx(col)) < 42)) {
      return say(s, '尸群已占据此格，暂时不能施工。', false);
    }
    if (s.energy < tower.cost) return say(s, `电力不足，还需 ${Math.ceil(tower.cost - s.energy)}。`, false);
    s.energy -= tower.cost;
    const spec = SPECS[tower.id];
    s.towers.push({ id: s.nextId++, type: tower.id, row, col, x: cx(col), y: cy(row), level: 1,
      hp: spec.hp, maxHp: spec.hp, invested: tower.cost, cooldown: tower.id === 'generator' ? 8 : 0.1,
      flash: 0, hit: 0 });
    s.towersBuilt++;
    burst(s, cx(col), cy(row), '#e7c46e', 9);
    return say(s, `${tower.name}已就位。`);
  }
  if (!existing) return say(s, '此格没有可操作的设施。', false);
  if (action.type === 'upgrade') {
    if (existing.level >= 3) return say(s, '已达到最高等级。', false);
    const cost = upgradeCost(existing);
    if (s.energy < cost) return say(s, `升级还需 ${Math.ceil(cost - s.energy)} 电力。`, false);
    s.energy -= cost;
    existing.invested += cost;
    existing.level++;
    const oldMax = existing.maxHp;
    existing.maxHp = Math.round(SPECS[existing.type].hp * (1 + (existing.level - 1) * 0.55));
    existing.hp = Math.min(existing.maxHp, existing.hp + existing.maxHp - oldMax + oldMax * 0.25);
    existing.flash = 0.5;
    s.upgrades++;
    burst(s, existing.x, existing.y, '#ecd490', 12);
    return say(s, `${typeOf(existing.type).name}升至 ${existing.level} 级，已修复部分耐久。`);
  }
  if (action.type === 'sell') {
    const refund = sellValue(existing);
    s.energy += refund;
    s.towers = s.towers.filter(t => t.id !== existing.id);
    return say(s, `拆除完成，回收 ${refund} 电力。`);
  }
  return say(s, '未知操作。', false);
}

function burst(s, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996 + s.nextId;
    s.particles.push({ x, y, vx: Math.cos(a) * (20 + i * 4), vy: Math.sin(a) * (20 + i * 3) - 20,
      life: 0.35 + i % 4 * 0.08, max: 0.6, color, size: i % 3 + 2 });
  }
  if (s.particles.length > 180) s.particles.splice(0, s.particles.length - 180);
}

function spawn(s, item) {
  const spec = ENEMIES[item.kind];
  const factor = 1 + (s.wave - 1) * 0.13 + (s.mode === 'shadow' ? 0.24 : 0);
  const hp = Math.round(spec.hp * factor);
  s.zombies.push({ id: s.nextId++, type: item.kind, row: item.row, x: 908, y: cy(item.row),
    hp, maxHp: hp, speed: spec.speed * (1 + Math.min(0.6, (s.wave - 1) * 0.027)),
    attack: spec.attack * (1 + (s.wave - 1) * 0.04), reward: spec.reward,
    radius: spec.radius, slow: 0, hit: 0, biting: false, gait: random(s) * 6.28 });
}

function finish(s, won, reason) {
  s.over = true; s.won = won; s.reason = reason; s.waveActive = false; s.canStartWave = false;
  s.notice = reason;
  updateScore(s);
}

function simulate(s) {
  s.visualTime += STEP;
  s.breachFlash = s.breachFlash.map(v => Math.max(0, v - STEP));
  for (const p of s.particles) { p.life -= STEP; p.x += p.vx * STEP; p.y += p.vy * STEP; p.vy += 90 * STEP; }
  s.particles = s.particles.filter(p => p.life > 0);
  for (const f of s.floats) { f.life -= STEP; f.y -= 17 * STEP; }
  s.floats = s.floats.filter(f => f.life > 0);
  for (const t of s.towers) { t.flash = Math.max(0, t.flash - STEP); t.hit = Math.max(0, t.hit - STEP); }
  if (!s.waveActive) return;
  s.ticks++;
  s.elapsed = s.ticks * STEP;
  s.waveTime += STEP;
  s.incomeTimer += STEP;
  if (s.incomeTimer + 1e-9 >= 5) { s.incomeTimer -= 5; s.energy = Math.min(9999, s.energy + 10); }
  while (s.queue.length && s.queue[0].at <= s.waveTime + 1e-9) spawn(s, s.queue.shift());

  for (const t of s.towers) {
    t.cooldown -= STEP;
    if (t.type === 'generator') {
      if (t.cooldown <= 1e-9) {
        const amount = 25 + (t.level - 1) * 18;
        s.energy = Math.min(9999, s.energy + amount);
        s.floats.push({ x: t.x, y: t.y - 20, text: `+${amount}`, color: '#f0d487', life: 1.2 });
        t.cooldown += 8; t.flash = 0.3;
      }
    } else if (t.type !== 'barricade') {
      const target = s.zombies.filter(z => z.row === t.row && z.hp > 0 && z.x > t.x - 12).sort((a, b) => a.x - b.x)[0];
      if (!target) { t.cooldown = Math.max(t.cooldown, 0.08); continue; }
      if (t.cooldown <= 1e-9) {
        const spec = SPECS[t.type];
        const level = t.level - 1;
        s.bullets.push({ x: t.x + 28, y: t.y - 5, row: t.row, speed: t.type === 'frost' ? 340 : 500,
          damage: spec.damage * (1 + level * 0.62), frost: t.type === 'frost', level: t.level });
        t.cooldown += spec.interval * (1 - level * 0.12); t.flash = 0.13;
      }
    }
  }

  for (const b of s.bullets) {
    const old = b.x;
    b.x += b.speed * STEP;
    const target = s.zombies.filter(z => z.hp > 0 && z.row === b.row && z.x + z.radius >= old && z.x - z.radius <= b.x)
      .sort((a, c) => a.x - c.x)[0];
    if (target) {
      target.hp -= b.damage * (target.type === 'armored' && !b.frost ? 0.68 : 1);
      target.hit = 0.12;
      if (b.frost) for (const z of s.zombies) {
        if (z.row === b.row && Math.abs(z.x - target.x) < 54 + b.level * 6) z.slow = 2.5 + b.level * 0.5;
      }
      burst(s, target.x - target.radius, target.y - 9, b.frost ? '#9dd0cd' : '#e8c578', b.frost ? 5 : 3);
      b.dead = true;
    }
  }
  s.bullets = s.bullets.filter(b => !b.dead && b.x < 965);

  for (const z of s.zombies) {
    z.hit = Math.max(0, z.hit - STEP);
    z.slow = Math.max(0, z.slow - STEP);
    if (z.hp <= 0) {
      s.kills++;
      s.energy = Math.min(9999, s.energy + z.reward);
      s.floats.push({ x: z.x, y: z.y - 28, text: `+${z.reward}`, color: '#e5c67a', life: 0.9 });
      burst(s, z.x, z.y, '#8c9d79', 9);
      z.dead = true;
      continue;
    }
    const block = s.towers.filter(t => t.row === z.row && t.hp > 0 && z.x >= t.x - 18 && z.x <= t.x + 30 + z.radius)
      .sort((a, b) => b.x - a.x)[0];
    z.biting = Boolean(block);
    if (block) {
      block.hp -= z.attack * STEP * (z.slow > 0 ? 0.72 : 1);
      block.hit = 0.08;
    } else { z.x -= z.speed * STEP * (z.slow > 0 ? 0.48 : 1); }
    if (z.x < 126) {
      s.baseHp = Math.max(0, s.baseHp - (z.type === 'tank' ? 2 : 1));
      z.dead = true;
      s.breachFlash[z.row] = 0.9;
      burst(s, 132, z.y, '#d78961', 18);
      say(s, `第 ${z.row + 1} 路失守，避难所剩余 ${s.baseHp} 层防护。`);
      if (s.baseHp <= 0) { finish(s, false, '避难所被突破'); break; }
    }
  }
  s.zombies = s.zombies.filter(z => !z.dead);
  for (const t of s.towers.filter(t => t.hp <= 0)) burst(s, t.x, t.y, '#b39970', 12);
  s.towers = s.towers.filter(t => t.hp > 0);
  if (!s.over && !s.queue.length && !s.zombies.length) {
    s.waveActive = false;
    s.wavesCleared++;
    s.bullets = [];
    if (s.wave >= s.totalWaves) finish(s, true, '天亮了，防线守住了');
    else {
      const bonus = 40 + s.wave * 5;
      s.energy = Math.min(9999, s.energy + bonus);
      s.canStartWave = true;
      say(s, `第 ${s.wave} 波清除 · 获得 ${bonus} 电力，整备后继续。`);
    }
  }
  updateScore(s);
}

export function stepNightwatch(s, dt) {
  if (!s || s.over || !Number.isFinite(dt) || dt <= 0) return;
  s.accumulator += Math.min(dt, 2);
  while (s.accumulator + 1e-9 >= STEP && !s.over) {
    s.accumulator = Math.max(0, s.accumulator - STEP);
    simulate(s);
  }
}

export function nightwatchSummary(s) {
  const t = s.selectedCell && s.towers.find(t => t.row === s.selectedCell.row && t.col === s.selectedCell.col);
  const left = s.queue.length + s.zombies.length;
  return {
    score: s.score, primaryLabel: '守住波次', primaryValue: s.totalWaves === Infinity ? `${s.wave} / ∞` : `${s.wave} / ${s.totalWaves}`,
    secondaryLabel: '避难所防护', secondaryValue: `${s.baseHp} / 5`,
    progress: s.totalWaves === Infinity ? (s.wave % 10) * 10 : s.wavesCleared / s.totalWaves * 100,
    phase: s.canStartWave ? '战术整备' : s.over ? (s.won ? '防守成功' : '防线失守') : s.wave < 4 ? '零星侵入' : s.wave < 7 ? '多路围攻' : '尸潮压境',
    notice: s.visualTime < s.noticeUntil || s.over ? s.notice : s.canStartWave ? '补充火力与电力设施，准备下一波。' : `场上 ${s.zombies.length} 个目标 · 后续 ${s.queue.length} 个`,
    metrics: { kills: s.kills, wavesCleared: s.wavesCleared, towersBuilt: s.towersBuilt, upgrades: s.upgrades, baseHp: s.baseHp },
    energy: Math.floor(s.energy), wave: s.wave, totalWaves: s.totalWaves, baseHp: s.baseHp,
    canStartWave: s.canStartWave, remaining: left,
    selected: t ? { name: typeOf(t.type).name, type: t.type, level: t.level, hp: Math.ceil(t.hp), maxHp: t.maxHp,
      upgradeCost: t.level < 3 ? upgradeCost(t) : null, sellValue: sellValue(t), row: t.row, col: t.col } : null,
  };
}

function rounded(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
function label(ctx, text, x, y, size = 14, color = '#e7e1c9', align = 'left') {
  ctx.font = `600 ${size}px "Microsoft YaHei", system-ui, sans-serif`; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function bar(ctx, x, y, w, ratio, color) {
  rounded(ctx, x, y, w, 4, 2, '#263633');
  rounded(ctx, x, y, w * clamp(ratio, 0, 1), 4, 2, color);
}

function drawDistrict(ctx, s) {
  ctx.fillStyle = '#273d3e'; ctx.fillRect(0, 0, 960, 540);
  const sky = ctx.createLinearGradient(0, 0, 0, 112);
  sky.addColorStop(0, '#455554'); sky.addColorStop(1, '#8c8a70');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 112);
  ellipse(ctx, 773, 33, 19, 19, '#d6c99b');
  for (let i = 0; i < 10; i++) {
    const x = i * 111 - 30, h = 30 + (i * 17) % 42;
    ctx.fillStyle = i % 2 ? '#3d4b46' : '#43524b'; ctx.fillRect(x, 100 - h, 99, h);
    ctx.beginPath(); ctx.moveTo(x - 5, 100 - h); ctx.lineTo(x + 49, 76 - h); ctx.lineTo(x + 104, 100 - h); ctx.closePath(); ctx.fill();
    for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 3 ? '#9d986e' : '#293c39'; ctx.fillRect(x + 15 + j * 27, 106 - h, 10, 13); }
  }
  ctx.fillStyle = '#202f30'; ctx.fillRect(0, 91, 960, 20);
  ctx.fillStyle = '#667264'; ctx.fillRect(0, 106, 960, 7);
  // A deep sidewalk frames the actual building area; the road at right is the spawn source.
  ctx.fillStyle = '#586754'; ctx.fillRect(145, 112, 642, 360);
  for (let row = 0; row < 5; row++) {
    ctx.fillStyle = row % 2 ? '#4b624e' : '#53694f'; ctx.fillRect(160, 112 + row * 72, 616, 72);
    ctx.fillStyle = '#879079'; ctx.fillRect(151, 112 + row * 72, 9, 72);
    ctx.fillStyle = '#7d8870'; ctx.fillRect(776, 112 + row * 72, 10, 72);
    ctx.fillStyle = 'rgba(32,48,36,.2)'; ctx.fillRect(160, 145 + row * 72, 616, 28);
    for (let col = 0; col < 7; col++) {
      const x = 160 + col * 88, y = 112 + row * 72;
      ctx.strokeStyle = 'rgba(224,226,185,.12)'; ctx.strokeRect(x + 1, y + 1, 86, 70);
      for (let k = 0; k < 4; k++) {
        const gx = x + 13 + (k * 21 + row * 7) % 68, gy = y + 17 + (col * 19 + k * 11) % 45;
        ctx.strokeStyle = '#71805a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx - 3, gy + 3); ctx.lineTo(gx, gy - 2); ctx.lineTo(gx + 2, gy + 2); ctx.stroke();
      }
    }
    if (s.breachFlash[row] > 0) {
      ctx.fillStyle = `rgba(218,114,76,${s.breachFlash[row] * 0.25})`; ctx.fillRect(126, 112 + row * 72, 658, 72);
    }
    label(ctx, String(row + 1).padStart(2, '0'), 141, 155 + row * 72, 12, '#ded8b4', 'right');
  }
  ctx.fillStyle = '#485353'; ctx.fillRect(787, 112, 173, 360);
  ctx.fillStyle = '#899184'; ctx.fillRect(787, 112, 17, 360);
  ctx.fillStyle = '#343f40'; ctx.fillRect(913, 112, 47, 360);
  ctx.strokeStyle = '#919587'; ctx.lineWidth = 3; ctx.setLineDash([19, 17]); ctx.beginPath(); ctx.moveTo(866, 120); ctx.lineTo(866, 467); ctx.stroke(); ctx.setLineDash([]);
  // Cracks, drains and roadside weeds add place without competing with enemies.
  for (let i = 0; i < 5; i++) {
    rounded(ctx, 792, 153 + i * 65, 10, 22, 1, '#303b39');
    ctx.strokeStyle = '#59635d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(900, 133 + i * 66); ctx.lineTo(894, 142 + i * 66); ctx.lineTo(902, 146 + i * 66); ctx.stroke();
  }
  ctx.fillStyle = '#303f38'; ctx.fillRect(0, 472, 960, 68);
  ctx.fillStyle = '#6c7865'; ctx.fillRect(142, 472, 646, 9);
  for (let i = 0; i < 27; i++) {
    ctx.fillStyle = '#60705d'; ctx.fillRect(151 + i * 24, 479, 6, 29);
    ctx.fillStyle = '#889078'; ctx.fillRect(151 + i * 24, 479, 2, 26);
  }
  ctx.fillStyle = '#5c6a58'; ctx.fillRect(145, 494, 648, 5);
  for (const x of [143, 786]) {
    ctx.fillStyle = '#263b37'; ctx.fillRect(x - 3, 62, 6, 53);
    rounded(ctx, x - 10, 63, 20, 13, 3, '#e0c784', '#ac995f');
    const lamp = ctx.createRadialGradient(x, 92, 5, x, 92, 90);
    lamp.addColorStop(0, 'rgba(234,210,140,.13)'); lamp.addColorStop(1, 'rgba(234,210,140,0)');
    ctx.fillStyle = lamp; ctx.fillRect(x - 90, 20, 180, 150);
  }
  // The refuge is a physical building with five shutters that track real integrity.
  ctx.fillStyle = '#344542'; ctx.fillRect(12, 125, 101, 339);
  ctx.fillStyle = '#7c8470'; ctx.fillRect(20, 119, 84, 346);
  ctx.fillStyle = '#b2a78a'; ctx.fillRect(27, 125, 68, 336);
  for (let i = 0; i < 5; i++) {
    rounded(ctx, 38, 137 + i * 64, 44, 48, 4, i < s.baseHp ? '#526653' : '#3c4037', '#797c62');
    ctx.fillStyle = i < s.baseHp ? '#d4bd78' : '#796850'; ctx.fillRect(45, 145 + i * 64, 30, 12);
    for (let j = 0; j < 3; j++) { ctx.fillStyle = '#394b3e'; ctx.fillRect(44, 165 + i * 64 + j * 5, 31, 2); }
  }
  label(ctx, '避难所', 62, 99, 16, '#eee6c9', 'center');
  label(ctx, 'NIGHT WATCH', 26, 31, 13, '#e9e0bf');
  label(ctx, '橡树街区 · 最后一夜', 26, 52, 15, '#dddcc3');
  label(ctx, '侵入方向', 868, 100, 12, '#f0dfbb', 'center');
  label(ctx, '←', 927, 101, 24, '#e0bd82', 'center');
}

function drawTower(ctx, t, time) {
  ctx.save(); ctx.translate(t.x, t.y);
  ellipse(ctx, 2, 19, t.type === 'barricade' ? 31 : 26, 9, 'rgba(20,37,28,.35)');
  if (t.type === 'barricade') {
    rounded(ctx, -29, -22, 58, 43, 4, '#938767', '#b1a27b');
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 ? '#736d57' : '#a1936d'; ctx.fillRect(-25, -17 + i * 12, 50, 9);
      ctx.fillStyle = '#4c5144'; ctx.fillRect(-18, -14 + i * 12, 3, 3); ctx.fillRect(14, -14 + i * 12, 3, 3);
    }
    ctx.fillStyle = '#bd9860'; ctx.fillRect(-4, -25, 8, 48);
    ctx.save(); ctx.rotate(-0.28); ctx.fillStyle = '#d6ba71'; ctx.fillRect(-25, -4, 50, 7); ctx.restore();
  } else {
    rounded(ctx, -25, -12, 48, 34, 6, '#263e3a', '#718270');
    rounded(ctx, -22, -15, 44, 29, 5, t.type === 'generator' ? '#bc9a55' : t.type === 'frost' ? '#648f8a' : '#758874', '#bbc19b');
    for (const sx of [-16, 16]) { ellipse(ctx, sx, 5, 2.3, 2.3, '#d3c9a0'); }
    if (t.type === 'generator') {
      rounded(ctx, -16, -23, 25, 30, 4, '#ddd2a4', '#756c4e');
      ctx.fillStyle = '#827a51'; ctx.fillRect(-10, -17, 12, 16);
      ctx.fillStyle = '#dcc267'; ctx.fillRect(-7, -14, 6, 10);
      ctx.strokeStyle = '#4e5f4b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(11, -13); ctx.lineTo(18, -13); ctx.lineTo(18, -27); ctx.stroke();
      ctx.save(); ctx.translate(18, -29); ctx.rotate(time * 2); ctx.fillStyle = '#dfcc8b'; ctx.fillRect(-10, -2, 20, 4); ctx.fillRect(-2, -10, 4, 20); ctx.restore();
      ellipse(ctx, 12, 5, 3, 3, t.flash ? '#fff0a0' : '#e4bd64');
    } else if (t.type === 'frost') {
      ellipse(ctx, -2, -10, 15, 14, '#3e6765');
      rounded(ctx, -11, -30, 18, 25, 5, '#c0d6c1', '#e0e0ba');
      ctx.fillStyle = '#8eaf9f'; ctx.fillRect(-6, -24, 8, 13);
      rounded(ctx, 3, -16, 30, 11, 3, '#859f8c', '#d3d4ad');
      ctx.fillStyle = '#c9dec5'; ctx.fillRect(27, -18, 6, 15);
    } else {
      ellipse(ctx, -2, -12, 17, 16, '#9baa87');
      ellipse(ctx, -2, -12, 11, 10, '#667c65');
      const kick = t.flash > 0 ? -3 : 0;
      rounded(ctx, 1 + kick, -19, 30, 12, 3, '#c1b786', '#e0d8ad');
      ctx.fillStyle = '#414e42'; ctx.fillRect(24 + kick, -18, 9, 10);
      ctx.fillStyle = '#b27b4e'; ctx.fillRect(-16, -23, 7, 15);
      if (t.flash > 0) { ctx.fillStyle = '#f0d38b'; ctx.beginPath(); ctx.moveTo(34, -20); ctx.lineTo(48, -13); ctx.lineTo(34, -7); ctx.closePath(); ctx.fill(); }
    }
  }
  for (let i = 0; i < t.level; i++) { ctx.fillStyle = '#e1c170'; ctx.fillRect(-8 + i * 8, 17, 4, 4); }
  if (t.hp < t.maxHp) bar(ctx, -24, -37, 48, t.hp / t.maxHp, t.hp / t.maxHp < .3 ? '#e08a67' : '#b6c68b');
  ctx.restore();
}

function drawZombie(ctx, z, time) {
  ctx.save(); ctx.translate(z.x, z.y);
  const big = z.type === 'tank', run = z.type === 'runner';
  const k = big ? 1.32 : run ? .86 : 1;
  ctx.scale(k, k);
  ellipse(ctx, 1, 22, 19, 6, 'rgba(18,33,28,.4)');
  const gait = Math.sin(time * (run ? 12 : 5) + z.gait) * (z.biting ? 1.4 : 4.4);
  ctx.lineCap = 'round'; ctx.lineWidth = big ? 10 : 7;
  ctx.strokeStyle = '#344441';
  ctx.beginPath(); ctx.moveTo(-6, 7); ctx.lineTo(-7 + gait, 21); ctx.moveTo(6, 7); ctx.lineTo(7 - gait, 21); ctx.stroke();
  ctx.fillStyle = '#243631'; ctx.fillRect(-14 + gait, 18, 12, 5); ctx.fillRect(1 - gait, 18, 12, 5);
  const coat = z.slow ? '#789d94' : z.type === 'armored' ? '#797c70' : run ? '#a28158' : big ? '#746d59' : '#667d67';
  rounded(ctx, -13, -17, 26, 30, 5, z.hit > 0 ? '#ddd6b1' : coat, '#263d34');
  ctx.fillStyle = '#b39a74'; ctx.fillRect(-11, 2, 22, 4);
  if (big) { ctx.fillStyle = '#9b8e6b'; ctx.fillRect(-10, -12, 20, 9); }
  ctx.strokeStyle = z.slow ? '#a6c7b8' : '#96a17b'; ctx.lineWidth = big ? 8 : 6;
  ctx.beginPath(); ctx.moveTo(-10, -9); ctx.lineTo(-23 - (z.biting ? Math.sin(time * 15) * 3 : 0), -6); ctx.moveTo(9, -9); ctx.lineTo(-12, -15); ctx.stroke();
  ellipse(ctx, -3, -24, 10, 12, z.hit > 0 ? '#ece0b2' : z.slow ? '#aec7b2' : '#a0ac83');
  ctx.fillStyle = '#263b32'; ctx.fillRect(-11, -26, 3, 3); ctx.fillRect(-4, -26, 3, 3); ctx.fillRect(-10, -19, 8, 2);
  if (z.type === 'armored') {
    ctx.fillStyle = '#aaab92'; ctx.beginPath(); ctx.arc(-3, -28, 13, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(-17, -28, 27, 5);
    ctx.fillStyle = '#676f61'; ctx.fillRect(-5, -42, 5, 18);
  } else if (run) { ctx.fillStyle = '#b39463'; ctx.fillRect(-12, -34, 17, 4); }
  else if (big) { ctx.fillStyle = '#807b64'; ctx.fillRect(-11, -35, 17, 5); }
  if (z.slow > 0) {
    ctx.strokeStyle = '#bbd7c4'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const x = -18 + i * 18; ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, 16); ctx.moveTo(x - 4, 12); ctx.lineTo(x + 4, 12); ctx.stroke(); }
  }
  ctx.restore();
  if (z.hp < z.maxHp || big) bar(ctx, z.x - 19, z.y - (big ? 59 : 48), 38, z.hp / z.maxHp, z.slow ? '#a3d0c2' : '#d3aa74');
}

export function drawNightwatch(ctx, s, w = 960, h = 540) {
  ctx.save(); ctx.scale(w / 960, h / 540);
  drawDistrict(ctx, s);
  const selected = s.selectedCell;
  if (selected) {
    const x = GRID.x + selected.col * GRID.cw, y = GRID.y + selected.row * GRID.ch;
    rounded(ctx, x + 3, y + 3, 82, 66, 5, 'rgba(229,204,135,.12)', '#e7cd88');
    ctx.strokeStyle = '#f0dda0'; ctx.lineWidth = 3;
    for (const [ax, ay, dx, dy] of [[x + 3, y + 3, 1, 1], [x + 85, y + 3, -1, 1], [x + 3, y + 69, 1, -1], [x + 85, y + 69, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(ax + dx * 10, ay); ctx.lineTo(ax, ay); ctx.lineTo(ax, ay + dy * 10); ctx.stroke();
    }
  }
  for (let row = 0; row < 5; row++) {
    for (const t of s.towers.filter(t => t.row === row)) drawTower(ctx, t, s.visualTime);
    for (const z of s.zombies.filter(z => z.row === row).sort((a, b) => b.x - a.x)) drawZombie(ctx, z, s.visualTime);
  }
  for (const b of s.bullets) {
    ctx.strokeStyle = b.frost ? '#b5d5c8' : '#e2c37f'; ctx.lineWidth = b.frost ? 4 : 3;
    ctx.beginPath(); ctx.moveTo(b.x - 11, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    if (b.frost) ellipse(ctx, b.x, b.y, 5, 5, '#d0e2d0');
  }
  for (const p of s.particles) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
  ctx.globalAlpha = 1;
  for (const f of s.floats) { ctx.globalAlpha = Math.min(1, f.life * 2); label(ctx, f.text, f.x, f.y, 14, f.color, 'center'); }
  ctx.globalAlpha = 1;
  rounded(ctx, 165, 18, 257, 40, 5, 'rgba(32,48,43,.85)', '#82917a');
  label(ctx, s.canStartWave ? '整备阶段 · 选择设施后点击空地' : `第 ${s.wave} 波 · 尚有 ${s.queue.length + s.zombies.length} 个目标`, 180, 44, 15, '#eee4bf');
  rounded(ctx, 524, 18, 164, 40, 5, 'rgba(32,48,43,.85)', '#82917a');
  label(ctx, `击退 ${String(s.kills).padStart(3, '0')}`, 606, 44, 16, '#eee4bf', 'center');
  const hint = s.canStartWave ? (s.wave ? '下一波前可自由整备 · 整备期间不产生电力' : '建议：各路布置铆钉炮，后排建立蓄电机') : '铆钉炮输出 · 冷凝塔控场 · 路障阻挡 · 蓄电机供能';
  label(ctx, hint, 479, 529, 14, '#e4e1c9', 'center');
  if (s.over) {
    ctx.fillStyle = 'rgba(22,36,32,.3)'; ctx.fillRect(0, 0, 960, 540);
    rounded(ctx, 278, 224, 404, 82, 8, '#2c4239', '#b4b695');
    label(ctx, s.reason, 480, 272, 28, s.won ? '#e4d495' : '#e5b797', 'center');
  }
  ctx.restore();
}
