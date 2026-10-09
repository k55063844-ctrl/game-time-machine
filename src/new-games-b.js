import {loadRoleArt,drawRoleSprite,roleArtPreview} from './role-art.js';

export const newGameMetaB = {
  courier: {
    no: '16', title: '时光快递', accent: '逆行都市', code: 'COURIER / CX-4', color: '#b76536',
    desc: '在不断封路的城市里取件、选路并限时送达。碰撞、超时与燃料耗尽都会终止任务。',
    stat: '完成投递', unit: '单', resource: '车辆完整度', pressure: '路网失控压力', action: '取件 / 交付',
    mission: '规划短路线，在封锁和逆向车流之间完成限时投递。',
    events: ['靠近橙色站点取件，再前往高亮目的地', '车辆碰撞会损失完整度，包裹超时会增加失控值', '第二阶段出现封路，第三阶段车流与时限同时收紧']
  },
  stealth: {
    no: '17', title: '时光潜行者', accent: '警戒网', code: 'STEALTH / S-9', color: '#497566',
    desc: '穿过巡逻视野、借掩体消除暴露，并破解终端打开下一道安全门。',
    stat: '破解终端', unit: '台', resource: '隐蔽度', pressure: '警戒搜索压力', action: '破解 / 干扰',
    mission: '读取巡逻方向，在暴露值失控前完成终端破解。',
    events: ['绿色区域可快速消除暴露，守卫视锥会持续锁定', '靠近终端按住操作键破解，远离终端则启动短时干扰', '连续警报、干扰电量耗尽或直接接触都会终止任务']
  },
  rhythm: {
    no: '18', title: '时光唱片', accent: '失真节拍', code: 'RHYTHM / 33⅓', color: '#9b4e59',
    desc: '切换四条音轨，在判定线上击中真实节拍；错拍会让整张唱片逐步失真。',
    stat: '有效命中', unit: '拍', resource: '唱片稳定度', pressure: '节拍失真压力', action: '落针',
    mission: '辨认节拍轨道，在判定窗口内完成精准落针。',
    events: ['左右切换音轨，节拍进入底部判定区时落针', '抢拍、漏拍与错轨都会累积失真', '后两阶段加入变速、双拍与更窄的完美判定区']
  },
  weather: {
    no: '19', title: '时光气象站', accent: '超级风暴', code: 'WEATHER / WX-3', color: '#3f7183',
    desc: '选择受灾城区与对应系统，在雷暴、洪峰和热浪抵达前完成调度。',
    stat: '解除威胁', unit: '次', resource: '城市完整度', pressure: '复合灾害压力', action: '执行调度',
    mission: '匹配灾害与处置系统，维持四个城区和气象站供能。',
    events: ['左右选择城区，上下切换排涝、稳压与播云系统', '错误调度会引发过载，威胁落地会损伤对应城区', '第三阶段会出现同步灾害，城区失守或能源崩溃即失败']
  }
};

export const newGameIdsB = Object.keys(newGameMetaB);

const modeCopy = {
  courier: [['极限配送 180', '限时包裹 · 逆向车流 · 动态封路'], ['无尽夜班', '投递越多，路网与车流越快'], ['本机加压', '更短时限 · 更密车流 · 独立计分']],
  stealth: [['警戒网 180', '巡逻视锥 · 多段终端 · 三次警报'], ['无尽潜入', '守卫持续增援，暴露衰减变慢'], ['本机加压', '更宽视锥 · 更少干扰电量 · 独立计分']],
  rhythm: [['失真 180', '变速节拍 · 双拍 · 收窄判定'], ['无尽唱片', '速度与密度持续上升'], ['本机加压', '起步高速 · 更高失真惩罚 · 独立计分']],
  weather: [['风暴 180', '雷暴 · 洪峰 · 热浪叠加'], ['无尽值守', '灾害频率持续上升'], ['本机加压', '更少能源 · 同步灾害 · 独立计分']]
};

const modeNames = { extreme: '炼狱 180', endless: '无尽模式', shadow: '本机加压' };

export function newGameTilesB() {
  return newGameIdsB.map(id => {
    const m = newGameMetaB[id];
    return `<article class="game-tile wave-tile ng-tile ng-${id}" style="--wave:${m.color}">
      <span class="game-number">${m.no}</span>
      <div><small>全新机制</small><h3>${m.title}：${m.accent}</h3><p>${m.desc}</p></div>
      <button data-open-new-b="${id}">进入挑战 →</button>
    </article>`;
  }).join('');
}

export function newGameLandingB(id) {
  const m = newGameMetaB[id];
  if (!m) return '';
  return `<main id="main" class="wave-landing ng-landing ng-theme-${id}" style="--wave:${m.color}">
    <section class="wave-hero">
      <div><span class="status"><i></i> 规则序列 V1</span><p class="wave-index">ARCADE / ${m.no}</p>
        <h1>${m.title}<br><span>${m.accent}</span></h1><p>${m.desc}</p>
        <button class="primary" data-start-new-b="${id}" data-new-b-mode="extreme">挑战炼狱 180 →</button>
      </div>
      <div class="wave-machine" aria-label="${m.title}街机预览"><div class="machine-screen">${id==='courier'?roleArtPreview('courier','战战驾驶配送车穿行都市，保留 LGD 徽标'):id==='stealth'?roleArtPreview('stealth','战战携带干扰装置潜入警戒区，保留 LGD 徽标'):`<span style="font-size:clamp(22px,4vw,44px)">${m.code.split(' / ')[1]}</span><i></i><i></i><i></i><b>PHASE 03</b>`}</div><div class="machine-panel"><i></i><b></b><b></b></div></div>
    </section>
    <section class="modes wave-modes"><header><div><span class="kicker">独立规则与真实事件计分</span><h2>选择挑战模式</h2></div><p>每局都有三段压力，后 60 秒叠加全部失败条件。</p></header>
      <div class="mode-list">${modeCopy[id].map((x, i) => `<button class="mode ${i === 0 ? 'wave-extreme' : ''}" data-start-new-b="${id}" data-new-b-mode="${['extreme', 'endless', 'shadow'][i]}"><span class="mode-icon ${i === 1 ? 'mint' : i === 2 ? 'coral' : ''}">${i === 0 ? '180' : i === 1 ? '∞' : '++'}</span><span><b>${x[0]}</b><small>${x[1]}</small></span><em>${i === 0 ? '一命极限挑战' : i === 1 ? '独立纪录' : '本机规则'}</em></button>`).join('')}</div>
    </section>
  </main>`;
}

export function newGameViewB(id, mode = 'extreme') {
  const m = newGameMetaB[id];
  if (!m) return '';
  const controls = [
    ['left', '←', '向左'], ['up', '↑', '向上 / 上一系统'], ['action', m.action, m.action],
    ['down', '↓', '向下 / 下一系统'], ['right', '→', '向右']
  ].map(([key, text, label]) => `<button class="${key === 'action' ? 'wave-action' : ''}" data-new-b-key="${key}" aria-label="${label}">${key === 'action' ? `<span>${text}</span>` : text}</button>`).join('');
  return `<main id="main" class="game-page wave-game ng-game ng-play-${id}" style="--wave:${m.color}" data-new-b-id="${id}">
    <header class="gamebar game-command">
      <button class="icon-btn" data-exit-new-b="${id}" aria-label="退出本局">×</button>
      <div class="command-identity"><span>TM-${m.no}</span><small>${m.code}</small></div>
      <div class="command-title"><b>${m.title}：${m.accent}</b><span>${modeNames[mode]} · ${m.mission}</span></div>
      <div class="command-clock"><small>${mode === 'endless' ? '本局时间' : '剩余时间'}</small><strong id="ng-clock">${mode === 'endless' ? '00:00' : '03:00'}</strong></div>
      <span class="verify"><i></i>本机真实事件计分</span>
    </header>
    <div class="pressure-rail"><span>${m.pressure}</span><div class="pressure-track"><i><em id="ng-progress"></em></i><b id="ng-phase">阶段 1 / 3</b></div><div class="pressure-lamps" aria-hidden="true"><i class="active"></i><i></i><i></i></div></div>
    <section class="cabinet-arena wave-cabinet ng-cabinet">
      <aside class="hud-column wave-instruments"><header><span>实时仪表</span><b>${m.code}</b></header><div class="hud-readout"><small>${m.stat}</small><strong id="ng-score">0</strong><span>${m.unit}</span></div><div class="hud-readout compact"><small>${m.resource}</small><b id="ng-resource">100%</b></div><div class="resource-gauge"><span>系统余量</span><i><em id="ng-resource-meter" style="width:100%"></em></i></div><div class="hud-signal wave-status-lamps"><span>运行状态</span><i></i><i></i><i></i><i></i></div></aside>
      <section class="stage-module wave-canvas-shell"><header class="stage-cap"><span>${m.code}</span><b>RULESET V1 / LOCAL RUN</b></header><section class="screen-frame wave-screen"><canvas id="new-game-b-canvas" width="720" height="520" aria-label="${m.title}游戏画面" style="display:block;width:100%;height:auto;aspect-ratio:18/13;background:#111816"></canvas><span class="wave-alert" id="ng-alert" data-level="ready" aria-live="polite">系统准备</span></section><footer class="stage-foot"><span>规则序列 V1</span><span>${mode === 'endless' ? '无尽压力独立记录' : '最后 60 秒复合狂暴'}</span></footer></section>
      <aside class="hud-column wave-help"><header><span>任务指令</span><b>RUN PROTOCOL</b></header><div class="instruction-primary"><small>目标</small><b>${m.mission}</b></div><ol class="event-list">${m.events.map((event, i) => `<li><span>0${i + 1}</span>${event}</li>`).join('')}</ol><div class="key-hint"><kbd>WASD</kbd><span>键盘 / 触屏控制</span></div></aside>
    </section>
    <div class="control-deck wave-control-deck"><span class="control-label">${m.code}</span><div class="touch-controls wave-controls">${controls}</div><small>方向键移动或选择 · 空格执行</small></div>
  </main>`;
}

let activeRunB = null;
// Presentation-only facing memory. Never add art fields to simulation state.
const roleFacingB = new WeakMap();
function movingRoleFrame(s) {
  const previous=roleFacingB.get(s),dx=previous?s.p.x-previous.x:0,dy=previous?s.p.y-previous.y:0;
  let frame=previous?.frame??0;
  if(Math.hypot(dx,dy)>96)frame=0; // A new room resets the pose rather than turning during a teleport.
  else if(Math.abs(dx)>.001||Math.abs(dy)>.001){
    if(Math.abs(dx)>Math.abs(dy))frame=dx>0?1:3;
    else frame=dy>0?2:0;
  }
  roleFacingB.set(s,{x:s.p.x,y:s.p.y,frame});
  return frame;
}
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const intersects = (a, b, pad = 0) => a.x + (a.w || 0) > b.x - pad && a.x < b.x + (b.w || 0) + pad && a.y + (a.h || 0) > b.y - pad && a.y < b.y + (b.h || 0) + pad;

export function stopNewGameB() {
  const s = activeRunB;
  if (!s) return;
  cancelAnimationFrame(s.raf);
  removeEventListener('keydown', s.keydown);
  removeEventListener('keyup', s.keyup);
  for (const cleanup of s.cleanups) cleanup();
  activeRunB = null;
}

function createBaseState(id, mode) {
  return {
    id, mode, elapsed: 0, remaining: mode === 'endless' ? 0 : 180, phase: 1,
    resource: mode === 'shadow' ? 82 : 100, keys: {}, pressed: {}, cleanups: [], items: [], over: false,
    last: performance.now(), spawnCarry: 0, seed: 19, alert: '系统稳定'
  };
}

function random(s) {
  s.seed = (s.seed * 1664525 + 1013904223) >>> 0;
  return s.seed / 4294967296;
}

function freshPress(s, key) {
  if (s.keys[key] && !s.pressed[key]) { s.pressed[key] = true; return true; }
  if (!s.keys[key]) s.pressed[key] = false;
  return false;
}

export function mountNewGameB(id, mode, onFinish) {
  stopNewGameB();
  if (!newGameMetaB[id]) return;
  const canvas = document.querySelector('#new-game-b-canvas');
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = 720 * dpr; canvas.height = 520 * dpr;
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if(id==='courier'||id==='stealth')void loadRoleArt(id);
  const s = createBaseState(id, mode); activeRunB = s;
  initialiseGame(s);

  const end = (win, endedReason) => {
    if (s.over) return;
    s.over = true;
    const result = { id, win, time: Number(s.elapsed.toFixed(3)), metrics: collectMetrics(s), endedReason };
    stopNewGameB();
    onFinish(result);
  };
  s.end = end;
  const keyMap = key => ({ ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ' ': 'action', Enter: 'action' }[key]);
  s.keydown = event => { const key = keyMap(event.key); if (key) { event.preventDefault(); s.keys[key] = true; } };
  s.keyup = event => { const key = keyMap(event.key); if (key) s.keys[key] = false; };
  addEventListener('keydown', s.keydown); addEventListener('keyup', s.keyup);
  document.querySelectorAll('[data-new-b-key]').forEach(button => {
    const key = button.dataset.newBKey;
    const down = event => { event.preventDefault(); s.keys[key] = true; };
    const up = event => { event.preventDefault(); s.keys[key] = false; };
    button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up); button.addEventListener('pointerleave', up);
    s.cleanups.push(() => { button.removeEventListener('pointerdown', down); button.removeEventListener('pointerup', up); button.removeEventListener('pointercancel', up); button.removeEventListener('pointerleave', up); });
  });

  const frame = now => {
    if (s.over) return;
    const dt = Math.min(0.033, Math.max(0, (now - s.last) / 1000));
    s.last = now; s.elapsed += dt;
    if (mode !== 'endless') { s.remaining = Math.max(0, 180 - s.elapsed); if (s.remaining <= 0) { end(true, 'time-cleared'); return; } }
    s.phase = Math.min(3, 1 + Math.floor(s.elapsed / 60));
    updateGame(s, dt); if (s.over) return;
    drawGame(c, s); syncHudB(s);
    s.raf = requestAnimationFrame(frame);
  };
  s.raf = requestAnimationFrame(frame);
}

function initialiseGame(s) {
  if (s.id === 'courier') Object.assign(s, {
    p: { x: 350, y: 300, w: 24, h: 34 }, fuel: s.mode === 'shadow' ? 76 : 100, damage: 100, chaos: 0,
    depots: [{ x: 90, y: 95 }, { x: 625, y: 105 }, { x: 100, y: 420 }, { x: 620, y: 410 }],
    pickup: 0, destination: 2, carrying: false, packageTime: 0, invulnerable: 0,
    metrics: { deliveries: 0, priorityDeliveries: 0, nearMisses: 0, collisions: 0, packagesExpired: 0 }
  });
  if (s.id === 'stealth') Object.assign(s, {
    p: { x: 70, y: 450 }, exposure: 0, battery: s.mode === 'shadow' ? 58 : 80, alarms: 0, hack: 0, zone: 1,
    terminal: { x: 620, y: 80 }, cover: [{ x: 145, y: 112, w: 100, h: 58 }, { x: 310, y: 330, w: 120, h: 60 }, { x: 520, y: 210, w: 86, h: 62 }],
    guards: makeGuards(s, 3), jammer: 0,
    metrics: { terminalsHacked: 0, zonesCleared: 0, guardsBypassed: 0, alarms: 0, decoysUsed: 0 }
  });
  if (s.id === 'rhythm') Object.assign(s, {
    lane: 1, notes: [], beatCarry: 0, integrity: 100, combo: 0,
    metrics: { perfect: 0, good: 0, misses: 0, maxCombo: 0, notesHit: 0 }
  });
  if (s.id === 'weather') Object.assign(s, {
    sector: 1, system: 0, energy: s.mode === 'shadow' ? 68 : 88, infrastructure: 100, districts: [100, 100, 100, 100], threats: [], threatCarry: 0, overload: 0,
    metrics: { threatsResolved: 0, districtsSaved: 0, overloads: 0, failuresPrevented: 0, energySpent: 0 }
  });
}

function makeGuards(s, count) {
  return Array.from({ length: count }, (_, i) => ({ x: 180 + i * 170, y: 125 + (i % 2) * 225, angle: i % 2 ? Math.PI : 0, turn: 0, tagged: false }));
}

function collectMetrics(s) {
  if (s.id === 'courier') return {
    ...s.metrics, perfectRoutes: s.metrics.priorityDeliveries, damage: Math.max(0, Math.round(100 - s.damage)),
    fuelRemaining: Math.round(s.fuel), vehicleIntegrity: Math.round(s.damage)
  };
  if (s.id === 'stealth') return {
    ...s.metrics, roomsCleared: s.metrics.zonesCleared, silentRooms: Math.max(0, s.metrics.zonesCleared - s.metrics.alarms),
    maxZone: s.zone, batteryRemaining: Math.round(s.battery)
  };
  if (s.id === 'rhythm') return {
    ...s.metrics, hits: s.metrics.notesHit, perfectHits: s.metrics.perfect, goodHits: s.metrics.good,
    stabilityRemaining: Math.round(s.integrity)
  };
  return {
    ...s.metrics, districtsProtected: s.districts.filter(value => value > 0).length,
    crisesResolved: s.metrics.threatsResolved, systemIntegrity: Math.round(s.infrastructure),
    districtsRemaining: s.districts.filter(value => value > 0).length, cityIntegrity: Math.round(s.infrastructure)
  };
}

function updateGame(s, dt) {
  if (s.id === 'courier') updateCourier(s, dt);
  if (s.id === 'stealth') updateStealth(s, dt);
  if (s.id === 'rhythm') updateRhythm(s, dt);
  if (s.id === 'weather') updateWeather(s, dt);
}

function updateCourier(s, dt) {
  const boost = s.mode === 'shadow' ? 1.18 : 1;
  const dx = (s.keys.right ? 1 : 0) - (s.keys.left ? 1 : 0), dy = (s.keys.down ? 1 : 0) - (s.keys.up ? 1 : 0);
  const norm = Math.hypot(dx, dy) || 1;
  s.p.x = clamp(s.p.x + dx / norm * 205 * dt, 24, 672); s.p.y = clamp(s.p.y + dy / norm * 205 * dt, 32, 468);
  s.fuel -= dt * (0.42 + (dx || dy ? 0.38 : 0) + s.phase * 0.07); s.invulnerable = Math.max(0, s.invulnerable - dt); s.chaos = Math.max(0, s.chaos - dt * 2.2);
  if (s.carrying) { s.packageTime -= dt; if (s.packageTime <= 0) { s.carrying = false; s.metrics.packagesExpired++; s.chaos += 42; s.pickup = (s.destination + 1) % 4; s.alert = '包裹超时，失控值上升'; } }
  const point = s.depots[s.carrying ? s.destination : s.pickup];
  if (freshPress(s, 'action') && distance(s.p, point) < 44) {
    if (!s.carrying) { s.carrying = true; s.destination = (s.pickup + 1 + Math.floor(random(s) * 2)) % 4; s.packageTime = Math.max(8, 18 - s.phase * 2 - (s.mode === 'shadow' ? 3 : 0)); s.alert = '已取件，前往高亮站点'; }
    else { const priority = s.packageTime > 8; s.metrics.deliveries++; if (priority) s.metrics.priorityDeliveries++; s.fuel = Math.min(100, s.fuel + 8); s.chaos = Math.max(0, s.chaos - 18); s.carrying = false; s.pickup = (s.destination + 1 + Math.floor(random(s) * 3)) % 4; s.alert = priority ? '优先件准时送达' : '投递完成'; }
  }
  const interval = Math.max(.42, 1.05 - s.phase * .14 - (s.mode === 'shadow' ? .18 : 0));
  s.spawnCarry += dt;
  while (s.spawnCarry >= interval) { s.spawnCarry -= interval; const horizontal = random(s) > .28; s.items.push(horizontal ? { x: random(s) > .5 ? -70 : 750, y: 70 + Math.floor(random(s) * 5) * 88, w: 62, h: 26, vx: (random(s) > .5 ? 1 : -1) * (155 + s.phase * 32) * boost, near: false } : { x: 58 + Math.floor(random(s) * 7) * 92, y: -60, w: 26, h: 58, vy: (145 + s.phase * 28) * boost, near: false }); }
  const playerBox = { x: s.p.x - 12, y: s.p.y - 17, w: 24, h: 34 };
  for (const car of s.items) {
    car.x += (car.vx || 0) * dt; car.y += (car.vy || 0) * dt;
    if (intersects(playerBox, car, 1) && s.invulnerable <= 0) { s.invulnerable = .85; s.damage -= 34; s.metrics.collisions++; s.chaos += 18; s.alert = '发生碰撞，车辆完整度下降'; }
    if (!car.near && !intersects(playerBox, car, 1) && intersects(playerBox, car, 17)) { car.near = true; s.metrics.nearMisses++; }
  }
  s.items = s.items.filter(car => car.x > -120 && car.x < 820 && car.y > -100 && car.y < 590);
  s.resource = Math.min(s.damage, s.fuel, 100 - s.chaos);
  if (s.damage <= 0) s.end(false, 'vehicle-destroyed'); else if (s.fuel <= 0) s.end(false, 'fuel-empty'); else if (s.chaos >= 100) s.end(false, 'delivery-collapse');
}

function updateStealth(s, dt) {
  const speed = 155, dx = (s.keys.right ? 1 : 0) - (s.keys.left ? 1 : 0), dy = (s.keys.down ? 1 : 0) - (s.keys.up ? 1 : 0), norm = Math.hypot(dx, dy) || 1;
  s.p.x = clamp(s.p.x + dx / norm * speed * dt, 22, 698); s.p.y = clamp(s.p.y + dy / norm * speed * dt, 24, 496);
  const inCover = s.cover.some(area => s.p.x > area.x && s.p.x < area.x + area.w && s.p.y > area.y && s.p.y < area.y + area.h);
  const nearTerminal = distance(s.p, s.terminal) < 48;
  if (s.keys.action && nearTerminal) { s.hack += dt * (s.phase === 3 ? 19 : 24); s.alert = `终端破解 ${Math.floor(s.hack)}%`; }
  else if (s.keys.action && !inCover && s.battery > 0) { s.jammer = .15; s.battery -= dt * 19; }
  else { s.jammer = Math.max(0, s.jammer - dt); s.battery = Math.min(80, s.battery + dt * 3.2); }
  if (freshPress(s, 'action') && !nearTerminal && !inCover && s.battery > 12) { s.metrics.decoysUsed++; }
  if (s.hack >= 100) { s.metrics.terminalsHacked++; s.metrics.zonesCleared++; s.zone++; s.hack = 0; s.p.x = 70; s.p.y = 450; s.terminal = { x: 570 + random(s) * 90, y: 55 + random(s) * 80 }; s.guards = makeGuards(s, Math.min(7, 2 + s.phase + Math.floor(s.zone / 2))); s.exposure = Math.max(0, s.exposure - 35); s.alert = `安全门 ${s.zone - 1} 已开启`; }
  let seen = false;
  for (const guard of s.guards) {
    guard.turn += dt; guard.angle += Math.sin(guard.turn * .9 + guard.x) * dt * .55; guard.x += Math.cos(guard.angle) * (42 + s.phase * 7) * dt; guard.y += Math.sin(guard.angle) * (42 + s.phase * 7) * dt;
    if (guard.x < 35 || guard.x > 685) guard.angle = Math.PI - guard.angle;
    if (guard.y < 35 || guard.y > 485) guard.angle = -guard.angle;
    const d = distance(s.p, guard), bearing = Math.atan2(s.p.y - guard.y, s.p.x - guard.x), angleDelta = Math.atan2(Math.sin(bearing - guard.angle), Math.cos(bearing - guard.angle));
    const cone = .42 + s.phase * .09 + (s.mode === 'shadow' ? .1 : 0);
    if (!inCover && s.jammer <= 0 && d < 160 + s.phase * 14 && Math.abs(angleDelta) < cone) seen = true;
    if (d < 22) { s.end(false, 'guard-contact'); return; }
    if (!guard.tagged && d < 75 && Math.abs(angleDelta) > 1.7) { guard.tagged = true; s.metrics.guardsBypassed++; }
  }
  s.exposure += dt * (seen ? 42 + s.phase * 10 : -(inCover ? 28 : 12)); s.exposure = clamp(s.exposure, 0, 100);
  if (s.exposure >= 100) { s.exposure = 38; s.alarms++; s.metrics.alarms++; s.alert = `警报 ${s.alarms} / 3`; if (s.alarms >= 3) { s.end(false, 'alarm-limit'); return; } }
  s.resource = Math.min(100 - s.exposure, s.battery + 20, 100 - s.alarms * 25);
  if (s.battery <= 0 && s.keys.action && !nearTerminal) s.end(false, 'jammer-depleted');
}

function updateRhythm(s, dt) {
  if (freshPress(s, 'left')) s.lane = (s.lane + 3) % 4;
  if (freshPress(s, 'right')) s.lane = (s.lane + 1) % 4;
  if (freshPress(s, 'up')) s.lane = (s.lane + 2) % 4;
  const speed = 165 + s.phase * 34 + (s.mode === 'shadow' ? 28 : 0);
  const beat = Math.max(.28, .72 - s.phase * .1 - (s.mode === 'shadow' ? .09 : 0));
  s.beatCarry += dt;
  while (s.beatCarry >= beat) { s.beatCarry -= beat; const lane = Math.floor(random(s) * 4); s.notes.push({ lane, y: 38, hit: false }); if (s.phase === 3 && random(s) > .64) s.notes.push({ lane: (lane + 2) % 4, y: 18, hit: false }); }
  for (const note of s.notes) note.y += speed * dt;
  if (freshPress(s, 'action')) {
    const candidates = s.notes.filter(note => !note.hit && note.lane === s.lane).sort((a, b) => Math.abs(a.y - 442) - Math.abs(b.y - 442));
    const note = candidates[0], delta = note ? Math.abs(note.y - 442) : 999;
    const perfectWindow = s.phase === 3 ? 13 : 17;
    if (note && delta <= 42) { note.hit = true; s.metrics.notesHit++; s.combo++; if (delta <= perfectWindow) { s.metrics.perfect++; s.integrity = Math.min(100, s.integrity + 2.2); s.alert = 'PERFECT'; } else { s.metrics.good++; s.integrity = Math.min(100, s.integrity + .7); s.alert = 'GOOD'; } s.metrics.maxCombo = Math.max(s.metrics.maxCombo, s.combo); }
    else { rhythmMiss(s, '抢拍 / 错轨'); }
  }
  for (const note of s.notes) if (!note.hit && note.y > 486) { note.hit = true; rhythmMiss(s, '漏拍'); }
  s.notes = s.notes.filter(note => !note.hit && note.y < 520);
  s.integrity -= dt * (.45 + s.phase * .18); s.resource = s.integrity;
  if (s.integrity <= 0) s.end(false, 'record-distorted'); else if (s.metrics.misses >= 12) s.end(false, 'miss-limit');
}

function rhythmMiss(s, reason) {
  s.metrics.misses++; s.combo = 0; s.integrity -= 8 + s.phase * 2 + (s.mode === 'shadow' ? 3 : 0); s.alert = reason;
}

function updateWeather(s, dt) {
  if (freshPress(s, 'left')) s.sector = (s.sector + 3) % 4;
  if (freshPress(s, 'right')) s.sector = (s.sector + 1) % 4;
  if (freshPress(s, 'up')) s.system = (s.system + 2) % 3;
  if (freshPress(s, 'down')) s.system = (s.system + 1) % 3;
  const interval = Math.max(.48, 1.35 - s.phase * .2 - (s.mode === 'shadow' ? .2 : 0));
  s.threatCarry += dt;
  while (s.threatCarry >= interval) { s.threatCarry -= interval; const lane = Math.floor(random(s) * 4), type = Math.floor(random(s) * 3); s.threats.push({ lane, type, y: 48, resolved: false }); if (s.phase === 3 && random(s) > .68) s.threats.push({ lane: (lane + 1 + Math.floor(random(s) * 2)) % 4, type: (type + 1) % 3, y: 28, resolved: false }); }
  const speed = 44 + s.phase * 12 + (s.mode === 'shadow' ? 9 : 0);
  for (const threat of s.threats) threat.y += speed * dt;
  if (freshPress(s, 'action')) {
    const target = s.threats.filter(threat => !threat.resolved && threat.lane === s.sector).sort((a, b) => b.y - a.y)[0];
    const cost = 8 + s.phase;
    if (!target || target.y < 170) { s.energy -= 5; s.overload += 9; s.alert = '空调度，系统产生回流'; }
    else if (target.type === s.system) { target.resolved = true; s.energy -= cost; s.metrics.energySpent += cost; s.metrics.threatsResolved++; if (target.y > 390) s.metrics.failuresPrevented++; s.overload = Math.max(0, s.overload - 12); s.alert = target.y > 390 ? '临界处置成功' : '威胁已解除'; }
    else { s.energy -= cost + 5; s.metrics.energySpent += cost + 5; s.metrics.overloads++; s.overload += 28; s.alert = '系统不匹配，发生过载'; }
  }
  for (const threat of s.threats) if (!threat.resolved && threat.y > 485) { threat.resolved = true; s.districts[threat.lane] = Math.max(0, s.districts[threat.lane] - 34); s.infrastructure -= 10; s.alert = `城区 ${threat.lane + 1} 遭受灾害`; }
  s.threats = s.threats.filter(threat => !threat.resolved && threat.y < 510);
  s.energy = clamp(s.energy + dt * (3.4 - s.phase * .35), 0, 100); s.overload = Math.max(0, s.overload - dt * 4);
  s.resource = Math.min(s.infrastructure, s.energy, 100 - s.overload);
  const lost = s.districts.filter(value => value <= 0).length;
  if (lost >= 2) s.end(false, 'districts-lost'); else if (s.infrastructure <= 0) s.end(false, 'city-collapse'); else if (s.energy <= 0 || s.overload >= 100) s.end(false, 'station-overload');
}

function syncHudB(s) {
  const q = selector => document.querySelector(selector);
  const primary = s.id === 'courier' ? s.metrics.deliveries : s.id === 'stealth' ? s.metrics.terminalsHacked : s.id === 'rhythm' ? s.metrics.notesHit : s.metrics.threatsResolved;
  const time = s.mode === 'endless' ? s.elapsed : s.remaining, minutes = Math.floor(Math.max(0, time) / 60), seconds = Math.floor(Math.max(0, time) % 60);
  const score = q('#ng-score'), resource = q('#ng-resource'), meter = q('#ng-resource-meter'), phase = q('#ng-phase'), clock = q('#ng-clock'), progress = q('#ng-progress'), alert = q('#ng-alert');
  if (score) score.textContent = primary;
  if (resource) resource.textContent = `${Math.max(0, Math.round(s.resource))}%`;
  if (meter) meter.style.width = `${Math.max(0, Math.round(s.resource))}%`;
  if (phase) phase.textContent = `阶段 ${s.phase} / 3`;
  if (clock) clock.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  if (progress) progress.style.width = `${Math.min(100, (s.elapsed % 60) / 60 * 100)}%`;
  document.querySelectorAll('.pressure-lamps i').forEach((lamp, index) => lamp.classList.toggle('active', index < s.phase));
  document.querySelectorAll('.wave-status-lamps i').forEach((lamp, index) => lamp.classList.toggle('off', s.resource < (index + 1) * 22));
  const page = document.querySelector('.ng-game'); if (page && page.dataset.phase !== String(s.phase)) { page.classList.remove('phase-1', 'phase-2', 'phase-3'); page.classList.add(`phase-${s.phase}`); page.dataset.phase = String(s.phase); }
  if (alert) { alert.textContent = s.phase === 3 && s.alert === '系统稳定' ? '第三阶段：复合压力全部启用' : s.alert; alert.dataset.level = s.resource < 25 ? 'critical' : s.phase === 3 ? 'warning' : 'active'; }
}

function drawGame(c, s) {
  c.clearRect(0, 0, 720, 520);
  if (s.id === 'courier') drawCourier(c, s);
  if (s.id === 'stealth') drawStealth(c, s);
  if (s.id === 'rhythm') drawRhythm(c, s);
  if (s.id === 'weather') drawWeather(c, s);
}

function line(c, x1, y1, x2, y2, color, width = 1) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
function circle(c, x, y, r, fill, stroke = null, width = 1) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); } }
function label(c, text, x, y, color = '#dce2d7', size = 11, align = 'left') { c.fillStyle = color; c.font = `600 ${size}px ui-monospace,monospace`; c.textAlign = align; c.fillText(text, x, y); }

function drawCourier(c, s) {
  c.fillStyle = '#26322f'; c.fillRect(0, 0, 720, 520);
  c.fillStyle = '#3c4943'; for (let x = 20; x < 720; x += 92) c.fillRect(x, 0, 54, 520); for (let y = 18; y < 520; y += 88) c.fillRect(0, y, 720, 48);
  c.setLineDash([12, 13]); for (let x = 47; x < 720; x += 92) line(c, x, 0, x, 520, 'rgba(226,206,132,.34)'); for (let y = 42; y < 520; y += 88) line(c, 0, y, 720, y, 'rgba(226,206,132,.34)'); c.setLineDash([]);
  s.depots.forEach((point, index) => { const active = index === (s.carrying ? s.destination : s.pickup); circle(c, point.x, point.y, active ? 18 : 11, active ? '#e1b956' : '#728179', '#f1dcc0', 2); label(c, active ? (s.carrying ? '交付' : '取件') : `D${index + 1}`, point.x, point.y + 35, active ? '#f4d16c' : '#9da8a1', 10, 'center'); });
  for (const car of s.items) { c.save(); c.translate(car.x, car.y); c.fillStyle = car.near ? '#c57242' : '#8c5141'; c.fillRect(0, 0, car.w, car.h); c.fillStyle = '#c9d0ba'; if (car.w > car.h) { c.fillRect(12, 4, car.w - 24, car.h - 8); } else c.fillRect(4, 12, car.w - 8, car.h - 24); c.restore(); }
  c.save(); c.translate(s.p.x, s.p.y); c.globalAlpha = s.invulnerable > 0 && Math.floor(s.invulnerable * 12) % 2 ? .25 : 1;
  if(!drawRoleSprite(c,'courier',movingRoleFrame(s),-20,-24,40,48)){
    c.fillStyle = '#e5c154'; c.fillRect(-12, -17, 24, 34); c.fillStyle = '#22302c'; c.fillRect(-8, -10, 16, 14); c.fillStyle = '#d95b45'; c.fillRect(-9, 12, 5, 3); c.fillRect(4, 12, 5, 3);
  }
  c.restore();
  label(c, s.carrying ? `包裹时限 ${Math.max(0, s.packageTime).toFixed(1)}s` : '前往高亮站点取件', 20, 30, '#f0d276', 12);
}

function drawStealth(c, s) {
  c.fillStyle = '#16221f'; c.fillRect(0, 0, 720, 520);
  c.strokeStyle = 'rgba(117,153,135,.18)'; for (let x = 0; x < 720; x += 40) line(c, x, 0, x, 520, c.strokeStyle); for (let y = 0; y < 520; y += 40) line(c, 0, y, 720, y, c.strokeStyle);
  for (const area of s.cover) { c.fillStyle = '#263c34'; c.fillRect(area.x, area.y, area.w, area.h); c.strokeStyle = '#668778'; c.strokeRect(area.x, area.y, area.w, area.h); label(c, '掩体', area.x + 8, area.y + 18, '#9bb6a8', 9); }
  for (const guard of s.guards) { const range = 160 + s.phase * 14, cone = .42 + s.phase * .09; c.fillStyle = 'rgba(214,175,80,.11)'; c.beginPath(); c.moveTo(guard.x, guard.y); c.arc(guard.x, guard.y, range, guard.angle - cone, guard.angle + cone); c.closePath(); c.fill(); circle(c, guard.x, guard.y, 11, '#bd714d', '#e5c787', 2); line(c, guard.x, guard.y, guard.x + Math.cos(guard.angle) * 23, guard.y + Math.sin(guard.angle) * 23, '#f5d889', 3); }
  circle(c, s.terminal.x, s.terminal.y, 21, '#364a45', '#8dc0a6', 3); label(c, `${Math.floor(s.hack)}%`, s.terminal.x, s.terminal.y + 4, '#cde4d2', 10, 'center');
  if(!drawRoleSprite(c,'stealth',movingRoleFrame(s),s.p.x-20,s.p.y-22,40,44))circle(c, s.p.x, s.p.y, 10, '#d8c25c', '#f3e8b5', 2);
  if (s.jammer > 0) circle(c, s.p.x, s.p.y, 28, 'rgba(0,0,0,0)', '#9dd6c4', 2);
  label(c, `暴露 ${Math.round(s.exposure)}%  /  警报 ${s.alarms}/3  /  干扰 ${Math.round(s.battery)}%`, 18, 28, '#b9cec2', 11);
}

function drawRhythm(c, s) {
  const gradient = c.createLinearGradient(0, 0, 0, 520); gradient.addColorStop(0, '#251c25'); gradient.addColorStop(1, '#121918'); c.fillStyle = gradient; c.fillRect(0, 0, 720, 520);
  const left = 126, laneW = 117;
  for (let lane = 0; lane < 4; lane++) { c.fillStyle = lane === s.lane ? 'rgba(166,79,94,.2)' : 'rgba(255,255,255,.025)'; c.fillRect(left + lane * laneW, 0, laneW - 3, 520); line(c, left + lane * laneW, 0, left + lane * laneW, 520, 'rgba(205,195,180,.18)'); label(c, `TR-${lane + 1}`, left + lane * laneW + laneW / 2, 30, lane === s.lane ? '#f0c7c6' : '#817c7c', 10, 'center'); }
  c.fillStyle = 'rgba(232,198,91,.12)'; c.fillRect(left, 420, laneW * 4, 45); line(c, left, 442, left + laneW * 4, 442, '#e4c45c', 3);
  for (const note of s.notes) { const x = left + note.lane * laneW + laneW / 2; c.fillStyle = note.lane === s.lane ? '#d98082' : '#99707b'; c.fillRect(x - 28, note.y - 7, 56, 14); c.fillStyle = '#ead7c0'; c.fillRect(x - 20, note.y - 2, 40, 3); }
  const needleX = left + s.lane * laneW + laneW / 2; c.fillStyle = '#e6c55a'; c.beginPath(); c.moveTo(needleX, 486); c.lineTo(needleX - 12, 510); c.lineTo(needleX + 12, 510); c.closePath(); c.fill();
  label(c, `COMBO ${s.combo}  /  MISS ${s.metrics.misses}/12  /  STABILITY ${Math.round(s.integrity)}%`, 360, 500, '#d6d1c5', 11, 'center');
}

function drawWeather(c, s) {
  const gradient = c.createLinearGradient(0, 0, 0, 520); gradient.addColorStop(0, '#304b57'); gradient.addColorStop(1, '#142326'); c.fillStyle = gradient; c.fillRect(0, 0, 720, 520);
  const names = ['北区', '东区', '南区', '港区'], systems = ['排涝', '稳压', '播云'], colors = ['#68a9c5', '#e2bd5a', '#bd7459'];
  for (let lane = 0; lane < 4; lane++) { const x = 50 + lane * 165; c.fillStyle = lane === s.sector ? 'rgba(119,177,190,.18)' : 'rgba(255,255,255,.025)'; c.fillRect(x, 45, 145, 430); c.strokeStyle = lane === s.sector ? '#9ec7cc' : 'rgba(190,210,207,.17)'; c.strokeRect(x, 45, 145, 430); label(c, `${names[lane]} ${Math.round(s.districts[lane])}%`, x + 72, 70, s.districts[lane] > 30 ? '#d4dfda' : '#ef9b82', 11, 'center'); }
  for (const threat of s.threats) { const x = 50 + threat.lane * 165 + 72; circle(c, x, threat.y, 18, colors[threat.type], '#edf0dc', 2); label(c, systems[threat.type], x, threat.y + 4, '#17211f', 9, 'center'); }
  c.fillStyle = '#273634'; c.fillRect(50, 482, 640, 28); label(c, `当前系统：${systems[s.system]}   能源 ${Math.round(s.energy)}%   过载 ${Math.round(s.overload)}%`, 360, 501, colors[s.system], 11, 'center');
  const selectedX = 50 + s.sector * 165; c.fillStyle = colors[s.system]; c.fillRect(selectedX, 474, 145, 5);
}
