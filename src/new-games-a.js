import {loadRoleArt,drawRoleSprite,roleArtPreview} from './role-art.js';

export const newGameMetaA = {
  bomb: {
    no: '12', title: '时光拆弹', accent: '零点协议', color: '#c4563f', mark: '00',
    desc: '记住安全回路，在规则反转和伪指令中切断正确模块。一次误判，就可能让整枚装置过载。',
    scoreLabel: '拆除积分', resourceLabel: '核心温度', signalLabel: '装置完整度',
    mission: '读取安全序列，逐段切断回路', control: '左右选择回路 · 空格确认切断',
    events: ['提示熄灭后按原顺序切断', '误切、超时和核心过热都会损伤装置', '第二阶段加入逆序，末段混入伪指令']
  },
  elevator: {
    no: '13', title: '时光电梯', accent: '失控楼层', color: '#a47735', mark: '↕',
    desc: '在多楼层呼叫中调度唯一轿厢。乘客会超时，禁停层会移动，错误开门直接触发机械故障。',
    scoreLabel: '成功运送', resourceLabel: '驱动电量', signalLabel: '未处理警报',
    mission: '接送乘客并避开封锁楼层', control: '上下选择楼层 · 空格开门',
    events: ['呼叫条耗尽会记一次失约', '轿厢未停稳时开门会损伤机构', '末段禁停层轮换，乘客等待更短']
  },
  lighthouse: {
    no: '14', title: '时光灯塔', accent: '黑潮', color: '#2f7771', mark: 'LUX',
    desc: '旋转灯束锁定真正的求救船。浓雾里混有诱饵信号，强光可以救命，也会快速耗尽发电机。',
    scoreLabel: '成功救援', resourceLabel: '发电余量', signalLabel: '沿岸完整度',
    mission: '辨别求救信号并持续照明', control: '左右旋转灯束 · 空格增强光束',
    events: ['持续照中真信号才能完成救援', '强光照中诱饵会触发误报', '末段黑潮提速并压缩有效灯束']
  },
  goalie: {
    no: '15', title: '时光守门员', accent: '十二码风暴', color: '#4f6f55', mark: 'GK',
    desc: '观察助跑提示、移动站位并在最后一瞬完成扑救。假动作会改写方向，过早倒地同样致命。',
    scoreLabel: '扑救次数', resourceLabel: '体能储备', signalLabel: '失球容限',
    mission: '判断方向与时机，守住连续点球', control: '左右移动站位 · 空格扑救',
    events: ['扑救动作只有短暂有效窗口', '第二阶段出现临门变向', '连续失球或体能耗尽立即退场']
  }
};

export const newGameIdsA = Object.keys(newGameMetaA);

const modeNames = { extreme: '炼狱 180', endless: '无尽值守', shadow: '本机加压' };
const modeCopy = {
  extreme: '三段压力在 180 秒内完整叠加，撑到归零才算通关。',
  endless: '没有终点，压力按时间持续攀升，记录本机最长值守。',
  shadow: '从第二档压力起步，事件更密集，使用独立成绩记录。'
};

const styleBlock = `<style id="new-games-a-style">
  .ng-game,.ng-landing{--ng:#b24d3b;--ng-ink:#e9e3cf;--ng-panel:#17231f;color:var(--ng-ink)}
  .ng-landing .ng-blueprint{position:relative;min-height:290px;border:1px solid color-mix(in srgb,var(--ng) 62%,#26332e);border-radius:28px;background:#17231f;overflow:hidden;display:grid;place-items:center;color:#eee4ca}
  .ng-blueprint::before{content:"";position:absolute;inset:18px;border:1px solid rgba(238,228,202,.2);border-radius:18px;background:linear-gradient(rgba(238,228,202,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(238,228,202,.045) 1px,transparent 1px);background-size:24px 24px}
  .ng-blueprint-mark{position:relative;width:154px;aspect-ratio:1;border:2px solid var(--ng);border-radius:50%;display:grid;place-items:center;font:600 32px/1 ui-monospace,monospace;letter-spacing:.08em;box-shadow:inset 0 0 0 16px #17231f,inset 0 0 0 17px rgba(238,228,202,.16)}
  .ng-blueprint-mark::before,.ng-blueprint-mark::after{content:"";position:absolute;background:var(--ng)}
  .ng-blueprint-mark::before{width:220px;height:1px}.ng-blueprint-mark::after{height:220px;width:1px}
  .ng-blueprint small{position:absolute;left:28px;bottom:25px;font:500 11px/1.4 ui-monospace,monospace;letter-spacing:.12em;color:rgba(238,228,202,.62)}
  .ng-game .cabinet-arena{grid-template-columns:minmax(170px,.72fr) minmax(440px,2.45fr) minmax(180px,.8fr)}
  .ng-game .screen-frame{background:#101b18;isolation:isolate}.ng-game canvas{display:block;width:100%;height:auto;aspect-ratio:38/25;touch-action:none}
  .ng-readout strong,.ng-clock{font-variant-numeric:tabular-nums}.ng-readout{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end;padding:17px 0;border-bottom:1px solid rgba(235,225,199,.15)}
  .ng-readout small{grid-column:1/-1;color:rgba(235,225,199,.58)}.ng-readout strong{font:600 35px/.92 ui-monospace,monospace;color:#f1d166}.ng-readout span{font:600 10px/1 ui-monospace,monospace;color:rgba(235,225,199,.55)}
  .ng-gauge{padding:15px 0}.ng-gauge>span{display:flex;justify-content:space-between;margin-bottom:8px;font-size:12px}.ng-gauge i{display:block;height:7px;border:1px solid rgba(235,225,199,.2);padding:2px}.ng-gauge em{display:block;height:100%;background:var(--ng);transform-origin:left center}
  .ng-mini{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:12px}.ng-mini div{border:1px solid rgba(235,225,199,.15);padding:9px}.ng-mini small{display:block;color:rgba(235,225,199,.5);font-size:10px}.ng-mini b{font:600 16px/1.4 ui-monospace,monospace}
  .ng-alert{position:absolute;left:18px;bottom:18px;max-width:calc(100% - 36px);padding:8px 11px;border:1px solid rgba(238,228,202,.22);background:rgba(15,25,22,.9);font:600 11px/1.3 ui-monospace,monospace;letter-spacing:.06em;color:#e8dfc4}.ng-alert[data-level="danger"]{border-color:#cf5a43;color:#f3b59f}.ng-alert[data-level="active"]{border-color:#d8b858;color:#f1d56f}
  .ng-controls{display:flex;align-items:center;justify-content:center;gap:10px}.ng-controls button{min-width:66px;min-height:48px;border:1px solid rgba(235,225,199,.28);border-radius:9px;background:#25332e;color:#eee4ca;font:600 14px/1 system-ui,sans-serif;touch-action:manipulation}.ng-controls button[data-ng-key="action"]{min-width:132px;background:var(--ng);border-color:color-mix(in srgb,var(--ng) 76%,white);color:#fff}.ng-controls button:active{transform:translateY(1px)}.ng-controls button:focus-visible{outline:2px solid #f1d166;outline-offset:3px}
  .ng-pressure .pressure-track em{background:var(--ng)}.ng-stage-cap b{color:color-mix(in srgb,var(--ng) 65%,#f2e7c7)}
  @media(max-width:940px){.ng-game .cabinet-arena{grid-template-columns:1fr}.ng-game .hud-column{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ng-game .hud-column header{grid-column:1/-1}}
  @media(max-width:560px){.ng-game .hud-column{grid-template-columns:1fr}.ng-controls{gap:6px}.ng-controls button{min-width:58px}.ng-controls button[data-ng-key="action"]{min-width:108px}.ng-landing .ng-blueprint{min-height:220px}}
</style>`;

export function newGameTilesA() {
  return newGameIdsA.map(id => {
    const m = newGameMetaA[id];
    return `<article class="game-tile ng-tile ng-${id}" style="--ng:${m.color}"><span class="game-number">${m.no}</span><div><small>全新挑战</small><h3>${m.title}：${m.accent}</h3><p>${m.desc}</p></div><button data-open-new-game="${id}">进入挑战 →</button></article>`;
  }).join('');
}

export function newGameLandingA(id) {
  const m = newGameMetaA[id];
  if (!m) return '';
  return `<main id="main" class="wave-landing ng-landing ng-${id}" style="--ng:${m.color}">${styleBlock}
<section class="wave-hero"><div><span class="status"><i></i> 规则序列 V1</span><p class="wave-index">TIME MACHINE / ${m.no}</p><h1>${m.title}<br><span>${m.accent}</span></h1><p>${m.desc}</p><button class="primary" data-new-game-start="${id}" data-new-game-mode="extreme">挑战炼狱 180 →</button></div>${id==='goalie'?`<div class="wave-machine" aria-label="战战守门员街机预览"><div class="machine-screen">${roleArtPreview('goalie','战战戴着守门手套守住球门，保留 LGD 徽标')}</div><div class="machine-panel"><i></i><b></b><b></b></div></div>`:`<div class="ng-blueprint" aria-label="${m.title}控制台示意"><div class="ng-blueprint-mark">${m.mark}</div><small>${m.mission}<br>LOCAL RULESET / V1</small></div>`}</section>
    <section class="modes wave-modes"><header><div><span class="kicker">独立规则与真实计分</span><h2>选择挑战模式</h2></div><p>每种模式分开保存成绩，不展示虚构玩家。</p></header><div class="mode-list">${['extreme','endless','shadow'].map((mode,index)=>`<button class="mode ${index===0?'wave-extreme':''}" data-new-game-start="${id}" data-new-game-mode="${mode}"><span class="mode-icon ${index===1?'mint':index===2?'coral':''}">${index===0?'180':index===1?'∞':'Ⅱ'}</span><span><b>${modeNames[mode]}</b><small>${modeCopy[mode]}</small></span><em>${index===0?'一命极限':index===1?'本机纪录':'强化规则'}</em></button>`).join('')}</div></section>
  </main>`;
}

export function newGameViewA(id, mode = 'extreme') {
  const m = newGameMetaA[id];
  if (!m) return '';
  const clock = mode === 'endless' ? '00:00' : '03:00';
  const controls = id === 'bomb' || id === 'lighthouse' || id === 'goalie'
    ? [['left','向左'],['action',id==='bomb'?'切断':id==='lighthouse'?'增强光束':'扑救'],['right','向右']]
    : [['up','上层'],['action','开门'],['down','下层']];
  return `<main id="main" class="game-page ng-game ng-${id}" style="--ng:${m.color}" data-ng-id="${id}">${styleBlock}
    <header class="gamebar game-command"><button class="icon-btn" data-new-game-exit="${id}" aria-label="退出本局">×</button><div class="command-identity"><span>TM—${m.no}</span><small>LOCAL RUN / RULESET V1</small></div><div class="command-title"><b>${m.title}：${m.accent}</b><span>${modeNames[mode]} · ${m.mission}</span></div><div class="command-clock"><small>${mode==='endless'?'本局时间':'剩余时间'}</small><strong class="ng-clock" id="ng-clock">${clock}</strong></div><span class="verify"><i></i>本机真实计分</span></header>
    <div class="pressure-rail ng-pressure" aria-label="三阶段压力"><span>任务压力</span><div class="pressure-track"><i><em id="ng-progress"></em></i><b id="ng-phase">阶段 1 / 3</b></div><div class="pressure-lamps" aria-hidden="true"><i class="active"></i><i></i><i></i></div></div>
    <section class="cabinet-arena"><aside class="hud-column"><header><span>实时仪表</span><b>FIELD DATA</b></header><div class="ng-readout"><small>${m.scoreLabel}</small><strong id="ng-score">0</strong><span>PTS</span></div><div class="ng-gauge"><span><b>${m.resourceLabel}</b><b id="ng-resource">100%</b></span><i><em id="ng-resource-meter" style="width:100%"></em></i></div><div class="ng-mini"><div><small id="ng-metric-a-label">有效事件</small><b id="ng-metric-a">0</b></div><div><small id="ng-metric-b-label">失误</small><b id="ng-metric-b">0</b></div></div></aside>
      <section class="stage-module"><header class="stage-cap ng-stage-cap"><span>${m.title.toUpperCase()} / V1</span><b>${m.accent}</b></header><section class="screen-frame"><canvas id="ng-canvas" width="760" height="500" aria-label="${m.title}游戏画面"></canvas><span class="ng-alert" id="ng-alert" data-level="normal" aria-live="polite">系统准备</span></section><footer class="stage-foot"><span>所有动画与计时使用同一运行时钟</span><span>${mode==='endless'?'无尽压力持续递增':'每 60 秒提升一档压力'}</span></footer></section>
      <aside class="hud-column"><header><span>任务指令</span><b>RUN PROTOCOL</b></header><div class="instruction-primary"><small>操作</small><b>${m.control}</b></div><ol class="event-list">${m.events.map((event,index)=>`<li><span>0${index+1}</span>${event}</li>`).join('')}</ol><div class="key-hint"><kbd>WASD</kbd><span>键盘 / 触屏控制</span></div><div class="ng-mini"><div><small>${m.signalLabel}</small><b id="ng-integrity">3 / 3</b></div><div><small>当前连段</small><b id="ng-chain">0</b></div></div></aside>
    </section>
    <div class="control-deck"><span class="control-label">CONTROL DECK</span><div class="ng-controls">${controls.map(([key,label])=>`<button data-ng-key="${key}" aria-label="${label}">${key==='left'?'←':key==='right'?'→':key==='up'?'↑':key==='down'?'↓':label}</button>`).join('')}</div><small>${m.control}</small></div>
  </main>`;
}

let activeRun = null;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const TAU = Math.PI * 2;
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const rect = (ctx,x,y,w,h,r=8) => { const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath(); };
const line = (ctx,x1,y1,x2,y2,color,width=1) => {ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};

function makeSeed() {
  try { const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]||1; } catch { return (Date.now()>>>0)||1; }
}
function random(s) { s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296; }
function randInt(s, max) { return Math.floor(random(s)*max); }
function pressed(s,key) { return Boolean(s.keys[key]&&!s.previous[key]); }

export function stopNewGameA() {
  const s=activeRun;
  if (!s) return;
  cancelAnimationFrame(s.raf);
  removeEventListener('keydown',s.keydown);
  removeEventListener('keyup',s.keyup);
  s.touchButtons?.forEach(button=>{
    button.onpointerdown=null;button.onpointerup=null;button.onpointercancel=null;button.onpointerleave=null;
  });
  activeRun=null;
}

function keyName(key) {
  return ({ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',' ':'action',Enter:'action'}[key]);
}

export function mountNewGameA(id, mode = 'extreme', onFinish = () => {}) {
  stopNewGameA();
  if (!newGameMetaA[id] || !['extreme','endless','shadow'].includes(mode)) return;
  const canvas=document.querySelector('#ng-canvas');
  if (!canvas) return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=760*dpr;canvas.height=500*dpr;
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  if(id==='goalie')void loadRoleArt('goalie');
  const s={id,mode,ctx,seed:makeSeed(),elapsed:0,remaining:180,phase:mode==='shadow'?2:1,score:0,resource:100,integrity:3,chain:0,keys:{},previous:{},last:performance.now(),over:false,alert:'系统准备',alertLevel:'normal'};
  if (id==='bomb') initBomb(s);
  if (id==='elevator') initElevator(s);
  if (id==='lighthouse') initLighthouse(s);
  if (id==='goalie') initGoalie(s);
  activeRun=s;

  const finish=(win,endedReason)=>{
    if(s.over)return;
    s.over=true;
    const result={id,win,time:Number(s.elapsed.toFixed(3)),metrics:buildMetrics(s),endedReason};
    stopNewGameA();onFinish(result);
  };
  s.finish=finish;
  s.keydown=e=>{const key=keyName(e.key);if(key){e.preventDefault();s.keys[key]=true;}};
  s.keyup=e=>{const key=keyName(e.key);if(key)s.keys[key]=false;};
  addEventListener('keydown',s.keydown);addEventListener('keyup',s.keyup);
  s.touchButtons=[...document.querySelectorAll('[data-ng-key]')];
  s.touchButtons.forEach(button=>{const key=button.dataset.ngKey;const release=()=>s.keys[key]=false;button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);s.keys[key]=true;};button.onpointerup=release;button.onpointercancel=release;button.onpointerleave=release;});

  const frame=now=>{
    if(s.over)return;
    const dt=Math.min(.034,Math.max(0,(now-s.last)/1000));s.last=now;
    s.elapsed+=dt;if(mode!=='endless')s.remaining=Math.max(0,180-s.elapsed);
    const phaseTime=mode==='endless'?s.elapsed/48:s.elapsed/60;
    s.phase=Math.min(3,Math.max(mode==='shadow'?2:1,1+Math.floor(phaseTime)));
    if(mode!=='endless'&&s.remaining<=0){finish(true,'survived');return;}
    if(id==='bomb')updateBomb(s,dt);
    if(id==='elevator')updateElevator(s,dt);
    if(id==='lighthouse')updateLighthouse(s,dt);
    if(id==='goalie')updateGoalie(s,dt);
    if(s.over)return;
    drawGame(s);syncHud(s);
    s.previous={...s.keys};s.raf=requestAnimationFrame(frame);
  };
  s.raf=requestAnimationFrame(frame);
}

function initBomb(s){s.resource=18;s.bomb={selected:0,sequence:[],index:0,preview:0,deadline:0,roundDelay:0,reverse:false,correctCuts:0,modulesDefused:0,falseCuts:0,overloads:0,maxStreak:0};startBombRound(s);}
function startBombRound(s){const b=s.bomb,len=2+s.phase,pool=[0,1,2,3,4,5];for(let i=pool.length-1;i>0;i--){const j=randInt(s,i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}b.displaySequence=pool.slice(0,len);b.index=0;b.preview=Math.max(.72,1.42-s.phase*.17);b.deadline=Math.max(2.2,4.5-s.phase*.62);b.roundDelay=0;b.reverse=s.phase>=2&&randInt(s,3)===0;b.sequence=b.reverse?[...b.displaySequence].reverse():[...b.displaySequence];s.alert=b.reverse?'协议翻转：按提示的倒序切断':'记忆安全回路';s.alertLevel=b.reverse?'active':'normal';}
function updateBomb(s,dt){const b=s.bomb;s.resource=clamp(s.resource-dt*(.45+s.phase*.18),0,100);if(pressed(s,'left'))b.selected=(b.selected+5)%6;if(pressed(s,'right'))b.selected=(b.selected+1)%6;if(b.roundDelay>0){b.roundDelay-=dt;if(b.roundDelay<=0)startBombRound(s);return;}if(b.preview>0){b.preview-=dt;return;}b.deadline-=dt;if(pressed(s,'action')){if(b.selected===b.sequence[b.index]){b.correctCuts++;b.index++;s.chain++;b.maxStreak=Math.max(b.maxStreak,s.chain);s.resource=clamp(s.resource-2.5,0,100);s.alert='回路确认，继续';s.alertLevel='active';if(b.index>=b.sequence.length){b.modulesDefused++;s.score+=100+s.phase*35+s.chain*4;s.resource=clamp(s.resource-13,0,100);b.roundDelay=.55;s.alert='模块解除，装置重新布线';}}else{b.falseCuts++;s.integrity--;s.chain=0;s.resource=clamp(s.resource+22,0,100);b.roundDelay=.7;s.alert='误切回路，完整度下降';s.alertLevel='danger';}}if(b.deadline<=0){b.overloads++;s.integrity--;s.chain=0;s.resource=clamp(s.resource+28,0,100);b.roundDelay=.7;s.alert='响应超时，核心脉冲';s.alertLevel='danger';}if(s.resource>=100)s.finish(false,'core_overheat');else if(s.integrity<=0)s.finish(false,'device_breach');}

function initElevator(s){s.elevator={floor:2,target:2,velocity:0,requests:[],spawnIn:1.2,door:0,missed:0,delivered:0,pickups:0,doorFaults:0,totalWait:0,closedFloor:-1,closedEpoch:-1};s.alert='选择楼层，前往第一个呼叫';}
function spawnRequest(s){const e=s.elevator;let floor=randInt(s,6),dest=randInt(s,6);while(dest===floor)dest=randInt(s,6);e.requests.push({floor,dest,ttl:Math.max(4.3,8.5-s.phase*.9),wait:0,state:'waiting'});}
function updateElevator(s,dt){const e=s.elevator;if(pressed(s,'up'))e.target=clamp(e.target+1,0,5);if(pressed(s,'down'))e.target=clamp(e.target-1,0,5);const distance=e.target-e.floor;const moving=Math.abs(distance)>.025;if(moving){e.velocity=Math.sign(distance)*(1.12+s.phase*.13);e.floor+=e.velocity*dt;if(Math.sign(e.target-e.floor)!==Math.sign(distance))e.floor=e.target;s.resource=clamp(s.resource-dt*(1.25+s.phase*.28),0,100);}else{s.resource=clamp(s.resource+dt*2.5,0,100);e.velocity=0;}e.door=Math.max(0,e.door-dt);const epoch=Math.floor(s.elapsed/7);if(s.phase===3&&epoch!==e.closedEpoch){e.closedEpoch=epoch;e.closedFloor=randInt(s,6);}else if(s.phase<3)e.closedFloor=-1;if(pressed(s,'action')){const stopped=Math.abs(e.floor-e.target)<.04&&Math.abs(e.velocity)<.05;if(!stopped||e.closedFloor===e.target){e.doorFaults++;s.integrity--;s.resource=clamp(s.resource-14,0,100);s.alert=e.closedFloor===e.target?'禁停层开门，机械锁受损':'轿厢未停稳，门机故障';s.alertLevel='danger';}else{e.door=.8;let acted=false;e.requests.filter(r=>r.state==='onboard'&&r.dest===e.target).forEach(r=>{r.done=true;e.delivered++;s.chain++;s.score+=160+s.phase*30+s.chain*5;acted=true;});const load=e.requests.filter(r=>r.state==='onboard'&&!r.done).length;e.requests.filter(r=>r.state==='waiting'&&r.floor===e.target).slice(0,Math.max(0,3-load)).forEach(r=>{r.state='onboard';r.ttl=14-s.phase;e.pickups++;e.totalWait+=r.wait;acted=true;});s.alert=acted?'乘客交接完成':'本层没有有效呼叫';s.alertLevel=acted?'active':'normal';}}
  e.spawnIn-=dt;if(e.spawnIn<=0){spawnRequest(s);e.spawnIn=Math.max(1.45,4.3-s.phase*.72-(s.mode==='shadow'?.45:0));}
  e.requests.forEach(r=>{if(r.done)return;r.ttl-=dt;if(r.state==='waiting')r.wait+=dt;if(r.ttl<=0){r.done=true;e.missed++;s.integrity--;s.chain=0;s.alert=r.state==='waiting'?'乘客等待超时':'乘客被困超时';s.alertLevel='danger';}});e.requests=e.requests.filter(r=>!r.done);if(s.resource<=0)s.finish(false,'drive_depleted');else if(s.integrity<=0||e.missed>=3)s.finish(false,'service_collapse');}

function initLighthouse(s){s.lighthouse={beam:-Math.PI/2,signals:[],spawnIn:.8,rescued:0,falseLocks:0,shipsLost:0,lockMs:0,maxChain:0};s.alert='旋转灯束，寻找真实求救信号';}
function spawnSignal(s){const l=s.lighthouse;const decoy=s.phase>=2&&random(s)<(.18+s.phase*.08);l.signals.push({angle:random(s)*TAU,distance:1,real:!decoy,hold:0,flagged:false,speed:.035+s.phase*.008+random(s)*.012});}
function updateLighthouse(s,dt){const l=s.lighthouse;const turn=((s.keys.right?1:0)-(s.keys.left?1:0))*1.55*dt;l.beam=(l.beam+turn+TAU)%TAU;const boost=s.keys.action&&s.resource>0;s.resource=clamp(s.resource+dt*(boost?-(9+s.phase*2.5):3.1),0,100);l.spawnIn-=dt;if(l.spawnIn<=0){spawnSignal(s);l.spawnIn=Math.max(.8,2.7-s.phase*.45-(s.mode==='shadow'?.25:0));}const width=(boost?.25:.13)-(s.phase===3?.025:0);l.signals.forEach(sig=>{sig.distance-=sig.speed*dt;const lit=Math.abs(angleDelta(l.beam,sig.angle))<width;if(lit){sig.hold+=dt*(boost?1.8:1);if(sig.real){l.lockMs+=dt*1000;if(sig.hold>.82){sig.done=true;l.rescued++;s.chain++;l.maxChain=Math.max(l.maxChain,s.chain);s.score+=140+s.phase*35+s.chain*6;s.alert='救援航线已确认';s.alertLevel='active';}}else if(boost&&sig.hold>.42&&!sig.flagged){sig.flagged=true;l.falseLocks++;s.integrity--;s.chain=0;s.alert='诱饵信号，沿岸暴露';s.alertLevel='danger';}}else sig.hold=Math.max(0,sig.hold-dt*.42);if(sig.distance<=0&&!sig.done){sig.done=true;if(sig.real){l.shipsLost++;s.integrity--;s.chain=0;s.alert='船只触礁，沿岸完整度下降';s.alertLevel='danger';}}});l.signals=l.signals.filter(sig=>!sig.done);if(s.integrity<=0)s.finish(false,'coast_breached');else if(s.resource<=0&&s.keys.action)s.finish(false,'generator_blackout');}

function initGoalie(s){s.goalie={x:0,dive:0,diveDir:0,diveAge:99,shot:null,nextShot:.9,saves:0,perfectSaves:0,goalsAllowed:0,shotsFaced:0,maxStreak:0,earlyDives:0};s.alert='观察射门提示，等待最后时机';}
function makeShot(s){const g=s.goalie;const actual=randInt(s,3)-1;let cue=actual;if(s.phase>=2&&random(s)<.42)cue=clamp(actual+(random(s)<.5?-1:1),-1,1);g.shot={actual,cue,timer:Math.max(.8,1.42-s.phase*.13),initial:1.42,switched:false};s.alert=cue<0?'助跑重心偏左':cue>0?'助跑重心偏右':'助跑重心居中';s.alertLevel='normal';}
function updateGoalie(s,dt){const g=s.goalie;g.x=clamp(g.x+((s.keys.right?1:0)-(s.keys.left?1:0))*1.75*dt,-1,1);g.dive=Math.max(0,g.dive-dt);g.diveAge+=dt;s.resource=clamp(s.resource+dt*(g.dive?1.2:4.2),0,100);if(pressed(s,'action')&&g.dive<=0){g.dive=.5;g.diveAge=0;g.diveDir=g.x<-.28?-1:g.x>.28?1:0;s.resource=clamp(s.resource-15,0,100);if(!g.shot||g.shot.timer>.58){g.earlyDives++;s.chain=0;s.alert='起扑过早，射手仍可调整';s.alertLevel='danger';}}
  if(!g.shot){g.nextShot-=dt;if(g.nextShot<=0)makeShot(s);}else{const shot=g.shot;shot.timer-=dt;if(s.phase>=2&&!shot.switched&&shot.timer<.42){shot.switched=true;if(shot.cue!==shot.actual){shot.cue=shot.actual;s.alert=shot.actual<0?'临门变向：左':shot.actual>0?'临门变向：右':'临门变向：中';s.alertLevel='active';}}if(shot.timer<=0){g.shotsFaced++;const saved=g.dive>0&&g.diveDir===shot.actual;if(saved){g.saves++;s.chain++;g.maxStreak=Math.max(g.maxStreak,s.chain);const perfect=g.diveAge<=.23;if(perfect)g.perfectSaves++;s.score+=perfect?240+s.phase*30:140+s.phase*20;s.alert=perfect?'极限扑救，完全封住角度':'完成扑救';s.alertLevel='active';}else{g.goalsAllowed++;s.integrity--;s.chain=0;s.alert='失球，防线容限下降';s.alertLevel='danger';}g.shot=null;g.nextShot=Math.max(.48,1.15-s.phase*.18);}}
  if(s.resource<=0)s.finish(false,'stamina_depleted');else if(s.integrity<=0||g.goalsAllowed>=3)s.finish(false,'goal_limit');}

function buildMetrics(s){
  if(s.id==='bomb'){const b=s.bomb;return {modulesDisarmed:b.modulesDefused,perfectChains:b.maxStreak,correctCuts:b.correctCuts,mistakes:b.falseCuts+b.overloads,falseCuts:b.falseCuts,overloads:b.overloads};}
  if(s.id==='elevator'){const e=s.elevator;return {passengersDelivered:e.delivered,emergencyStops:e.doorFaults,pickups:e.pickups,missedCalls:e.missed,averageWaitMs:e.pickups?Math.round(e.totalWait/e.pickups*1000):0};}
  if(s.id==='lighthouse'){const l=s.lighthouse;return {rescues:l.rescued,falseSignals:l.falseLocks,maxLockStreak:l.maxChain,lockMs:Math.round(l.lockMs),shipsLost:l.shipsLost};}
  const g=s.goalie;return {saves:g.saves,perfectSaves:g.perfectSaves,goalsConceded:g.goalsAllowed,maxStreak:g.maxStreak,shotsFaced:g.shotsFaced,earlyDives:g.earlyDives};
}

function syncHud(s){const q=id=>document.querySelector(id);const total=s.mode==='endless'?s.elapsed:s.remaining;const mins=Math.floor(total/60),secs=Math.floor(total%60);q('#ng-clock')?.replaceChildren(document.createTextNode(`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`));q('#ng-score')?.replaceChildren(document.createTextNode(String(s.score)));q('#ng-resource')?.replaceChildren(document.createTextNode(`${Math.round(s.resource)}%`));const meter=q('#ng-resource-meter');if(meter)meter.style.width=`${clamp(s.resource,0,100)}%`;q('#ng-phase')?.replaceChildren(document.createTextNode(`阶段 ${s.phase} / 3`));const progress=q('#ng-progress');if(progress)progress.style.width=`${((s.elapsed%(s.mode==='endless'?48:60))/(s.mode==='endless'?48:60))*100}%`;q('#ng-integrity')?.replaceChildren(document.createTextNode(`${Math.max(0,s.integrity)} / 3`));q('#ng-chain')?.replaceChildren(document.createTextNode(String(s.chain)));const alert=q('#ng-alert');if(alert){alert.textContent=s.alert;alert.dataset.level=s.alertLevel;}document.querySelectorAll('.ng-pressure .pressure-lamps i').forEach((lamp,index)=>lamp.classList.toggle('active',index<s.phase));let a=0,b=0,al='有效事件',bl='失误';if(s.id==='bomb'){a=s.bomb.modulesDefused;b=s.bomb.falseCuts+s.bomb.overloads;al='解除模块';bl='误切 / 超时';}if(s.id==='elevator'){a=s.elevator.delivered;b=s.elevator.missed+s.elevator.doorFaults;al='送达乘客';bl='失约 / 故障';}if(s.id==='lighthouse'){a=s.lighthouse.rescued;b=s.lighthouse.falseLocks+s.lighthouse.shipsLost;al='完成救援';bl='误报 / 触礁';}if(s.id==='goalie'){a=s.goalie.saves;b=s.goalie.goalsAllowed;al='成功扑救';bl='失球';}q('#ng-metric-a')?.replaceChildren(document.createTextNode(String(a)));q('#ng-metric-b')?.replaceChildren(document.createTextNode(String(b)));q('#ng-metric-a-label')?.replaceChildren(document.createTextNode(al));q('#ng-metric-b-label')?.replaceChildren(document.createTextNode(bl));}

function drawGame(s){const c=s.ctx;c.clearRect(0,0,760,500);if(s.id==='bomb')drawBomb(s);if(s.id==='elevator')drawElevator(s);if(s.id==='lighthouse')drawLighthouse(s);if(s.id==='goalie')drawGoalie(s);}
function backdrop(c,top,bottom){const g=c.createLinearGradient(0,0,0,500);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,760,500);c.strokeStyle='rgba(238,228,202,.07)';c.lineWidth=1;for(let x=20;x<760;x+=40)line(c,x,0,x,500,c.strokeStyle);for(let y=20;y<500;y+=40)line(c,0,y,760,y,c.strokeStyle);}

function drawBomb(s){const c=s.ctx,b=s.bomb;backdrop(c,'#27342f','#111b19');c.fillStyle='rgba(234,222,189,.7)';c.font='600 11px ui-monospace,monospace';c.fillText('ZERO-POINT DEVICE / CIRCUIT BUS',24,28);const cx=380,cy=218;c.strokeStyle='#715c43';c.lineWidth=14;c.beginPath();c.arc(cx,cy,103,0,TAU);c.stroke();c.strokeStyle=b.preview>0?'#d0b651':'#59483b';c.lineWidth=3;c.beginPath();c.arc(cx,cy,82,0,TAU);c.stroke();for(let i=0;i<6;i++){const a=-Math.PI/2+i*TAU/6,x=cx+Math.cos(a)*151,y=cy+Math.sin(a)*151,active=i===b.selected,order=b.preview>0?b.displaySequence.indexOf(i):-1;line(c,cx+Math.cos(a)*92,cy+Math.sin(a)*92,x,y,active?'#e5c45b':'#7e6246',active?6:3);c.fillStyle=active?'#e4c45d':'#24312d';c.beginPath();c.arc(x,y,32,0,TAU);c.fill();c.strokeStyle=active?'#f1deb0':'#9a7350';c.lineWidth=3;c.stroke();c.fillStyle=active?'#17231f':'#d8ccb0';c.font='600 18px ui-monospace,monospace';c.textAlign='center';c.fillText(String(i+1),x,y+6);if(order>=0){c.fillStyle='#f2d66d';c.font='600 12px ui-monospace,monospace';c.fillText(String(order+1),x,y-43);}}c.textAlign='start';c.fillStyle='#111a18';c.beginPath();c.arc(cx,cy,58,0,TAU);c.fill();c.fillStyle=s.resource>74?'#d66046':'#e6c75e';c.font='600 25px ui-monospace,monospace';c.textAlign='center';c.fillText(`${Math.round(s.resource)}°`,cx,cy+8);c.fillStyle='rgba(235,225,199,.62)';c.font='500 10px ui-monospace,monospace';c.fillText(b.preview>0?'MEMORIZE':`${b.index} / ${b.sequence.length}`,cx,cy+30);c.textAlign='start';const remain=Math.max(0,b.deadline);c.fillStyle='#d9c589';c.fillRect(235,424,290,8);c.fillStyle='#c55740';c.fillRect(235,424,290*clamp(remain/4.5,0,1),8);c.fillStyle='rgba(235,225,199,.68)';c.font='600 10px ui-monospace,monospace';c.fillText(b.reverse?'REVERSE PROTOCOL':'STANDARD PROTOCOL',24,470);}

function drawElevator(s){const c=s.ctx,e=s.elevator;backdrop(c,'#28322c','#121b18');const shaftX=305,shaftW=150;c.fillStyle='#111917';c.fillRect(shaftX,36,shaftW,420);c.strokeStyle='#8a7047';c.lineWidth=4;c.strokeRect(shaftX,36,shaftW,420);for(let floor=0;floor<6;floor++){const y=418-floor*70;c.strokeStyle=floor===e.closedFloor?'#c65340':'rgba(230,219,186,.2)';c.lineWidth=floor===e.closedFloor?4:2;line(c,105,y,655,y,c.strokeStyle,c.lineWidth);c.fillStyle=floor===e.closedFloor?'#e06a50':'rgba(235,225,199,.7)';c.font='600 12px ui-monospace,monospace';c.fillText(`0${floor+1}`,70,y+4);const waiting=e.requests.filter(r=>r.state==='waiting'&&r.floor===floor);waiting.forEach((r,index)=>{const x=510+index*28;c.fillStyle='#d9bf6a';c.beginPath();c.arc(x,y-15,7,0,TAU);c.fill();c.fillRect(x-6,y-7,12,16);c.fillStyle='#c65540';c.fillRect(x-10,y+13,20*clamp(r.ttl/8,0,1),3);});}const carY=418-e.floor*70-48;c.fillStyle='#b28e4d';rect(c,shaftX+20,carY,shaftW-40,50,6);c.fill();c.strokeStyle='#e3d19a';c.lineWidth=3;c.stroke();c.fillStyle=e.door>0?'#d9c37d':'#26312d';c.fillRect(shaftX+70,carY+7,20,36);c.fillStyle='#e8dcae';c.font='600 12px ui-monospace,monospace';c.fillText(`TARGET 0${e.target+1}`,24,34);c.fillStyle='#d7c45f';c.beginPath();c.moveTo(270,418-e.target*70);c.lineTo(290,408-e.target*70);c.lineTo(290,428-e.target*70);c.closePath();c.fill();const onboard=e.requests.filter(r=>r.state==='onboard'&&!r.done);onboard.forEach((r,index)=>{c.fillStyle='#f0d16b';c.beginPath();c.arc(338+index*22,carY+24,6,0,TAU);c.fill();});c.fillStyle='rgba(235,225,199,.55)';c.font='500 10px ui-monospace,monospace';c.fillText(`CABIN LOAD ${onboard.length} / 3`,570,472);}

function drawLighthouse(s){const c=s.ctx,l=s.lighthouse;const g=c.createRadialGradient(380,260,30,380,260,410);g.addColorStop(0,'#244542');g.addColorStop(1,'#071716');c.fillStyle=g;c.fillRect(0,0,760,500);for(let r=75;r<330;r+=55){c.strokeStyle='rgba(177,211,190,.12)';c.lineWidth=1;c.beginPath();c.arc(380,260,r,0,TAU);c.stroke();}const width=(s.keys.action?.25:.13)-(s.phase===3?.025:0);c.fillStyle=s.keys.action?'rgba(242,216,118,.28)':'rgba(234,220,151,.15)';c.beginPath();c.moveTo(380,260);c.arc(380,260,360,l.beam-width,l.beam+width);c.closePath();c.fill();l.signals.forEach(sig=>{const radius=80+sig.distance*270,x=380+Math.cos(sig.angle)*radius,y=260+Math.sin(sig.angle)*radius,lit=Math.abs(angleDelta(l.beam,sig.angle))<width,pulse=.42+.22*Math.sin(s.elapsed*(sig.real?3.2:7.8));c.save();c.translate(x,y);c.globalAlpha=lit?1:pulse;c.strokeStyle=sig.flagged?'#c45a45':'#dfc361';c.lineWidth=2;c.beginPath();c.arc(0,0,10,0,TAU);c.stroke();c.beginPath();c.arc(0,0,17+Math.sin(s.elapsed*(sig.real?3.2:7.8))*3,0,TAU);c.stroke();if(lit){c.fillStyle=sig.flagged?'#d8664e':'#f1d76d';c.beginPath();c.arc(0,0,5,0,TAU);c.fill();}c.restore();});c.fillStyle='#ddd09c';c.beginPath();c.moveTo(345,335);c.lineTo(415,335);c.lineTo(402,215);c.lineTo(358,215);c.closePath();c.fill();c.fillStyle='#26342f';c.fillRect(351,201,58,28);c.fillStyle='#f0cf60';c.fillRect(360,208,40,12);c.fillStyle='rgba(226,216,185,.62)';c.font='600 10px ui-monospace,monospace';c.fillText('BLACK TIDE / COASTAL GRID',22,28);}

function drawGoalie(s){const c=s.ctx,g=s.goalie;const grass=c.createLinearGradient(0,0,0,500);grass.addColorStop(0,'#648060');grass.addColorStop(1,'#263d32');c.fillStyle=grass;c.fillRect(0,0,760,500);for(let i=0;i<8;i++){c.fillStyle=i%2?'rgba(228,219,171,.025)':'rgba(20,45,35,.06)';c.fillRect(i*95,0,95,500);}c.strokeStyle='rgba(239,229,199,.72)';c.lineWidth=5;c.strokeRect(100,73,560,280);c.lineWidth=2;for(let x=120;x<660;x+=28)line(c,x,73,x,353,'rgba(239,229,199,.14)');for(let y=94;y<353;y+=28)line(c,100,y,660,y,'rgba(239,229,199,.14)');const px=380+g.x*185,py=330;c.save();c.translate(px,py);if(g.dive>0)c.rotate(g.diveDir*.75);if(!drawRoleSprite(c,'goalie',0,-48,-64,96,112)){c.strokeStyle='#f0d894';c.lineWidth=10;c.lineCap='round';c.beginPath();c.arc(0,-44,11,0,TAU);c.moveTo(0,-32);c.lineTo(0,15);c.moveTo(0,-16);c.lineTo(-28,-2);c.moveTo(0,-16);c.lineTo(28,-2);c.moveTo(0,15);c.lineTo(-20,42);c.moveTo(0,15);c.lineTo(20,42);c.stroke();}c.restore();if(g.shot){const shot=g.shot,tx=380+shot.cue*185,alpha=.32+.28*Math.sin(s.elapsed*12);c.fillStyle=`rgba(215,81,58,${alpha})`;c.beginPath();c.arc(tx,115,31,0,TAU);c.fill();c.strokeStyle='#f2d16d';c.lineWidth=3;c.stroke();const actualX=380+shot.actual*185,travel=1-clamp(shot.timer/1.42,0,1),ballY=444-(travel*travel)*315,ballX=380+(actualX-380)*travel;c.fillStyle='#eee6ca';c.beginPath();c.arc(ballX,ballY,11,0,TAU);c.fill();c.strokeStyle='#26342e';c.lineWidth=3;c.stroke();}c.fillStyle='rgba(236,225,193,.68)';c.font='600 10px ui-monospace,monospace';c.fillText('PENALTY LINE / SINGLE KEEPER',24,28);c.fillText('LEFT',122,385);c.fillText('CENTER',355,385);c.fillText('RIGHT',600,385);c.lineCap='butt';}
