import {loadSubmarineArt,drawSubmarinePilot,SUBMARINE_ART_URL} from './submarine-art.js';
import {loadPlaneArt,drawPlanePilot,drawPlaneEnemy,PLANE_PLAYER_ART_URL} from './plane-art.js';
import {loadRoleArt,drawRoleSprite,roleArtPreview} from './role-art.js';

export const waveMeta={
  plane:{no:'07',title:'时光战机',accent:'禁航区',desc:'弹幕封锁天空。短点射、控温、擦弹充能，在双 Boss 合围前击穿核心。',color:'#b94b3b',icon:'✦',stat:'击破',ui:{panel:'FLIGHT CTRL',score:'击破目标',unit:'架',resource:'武器电容',pressure:'空域封锁压力',mission:'穿越禁航弹幕，击穿拦截编队',action:'短点射',actionKey:'action',control:'四向规避 · 空格短点射',stage:'AIRSPACE V1–A',stageState:'禁航雷达已锁定',signal:'威胁方位',events:['弹幕命中立即退场','持续射击消耗武器电容','末段追加复合拦截']}},
  pinball:{no:'08',title:'时光弹球',accent:'倾斜警告',desc:'一颗球，两块挡板。震台可以救命，也会让整台机器锁死。',color:'#b27624',icon:'●',stat:'连锁',ui:{panel:'TABLE CTRL',score:'连锁得分',unit:'PTS',resource:'机台稳定度',pressure:'机台故障压力',mission:'守住唯一钢球，维持连续碰撞',action:'震台',actionKey:'down',control:'左右挡板 · ↓ 震台',stage:'TABLE V1–B',stageState:'倾斜传感器已启用',signal:'倾斜余量',events:['漏球立即退场','震台会快速消耗稳定度','碰撞得分可恢复稳定度']}},
  train:{no:'09',title:'时光列车',accent:'失控换轨',desc:'刹车失灵。切换道岔、躲避对向列车，并守住货厢平衡。',color:'#586b49',icon:'▰',stat:'到站',ui:{panel:'RAIL CTRL',score:'安全避让',unit:'列',resource:'制动气压',pressure:'干线冲突压力',mission:'切换三线道岔，避开迎面列车',action:'制动',actionKey:'down',control:'← → 换轨 · ↓ 制动',stage:'MAINLINE V1–C',stageState:'前方闭塞区占用',signal:'线路信号',events:['同轨相撞立即退场','制动持续消耗气压','松开制动可缓慢回压']}},
  submarine:{no:'10',title:'时光潜艇',accent:'静默深潜',desc:'主动声呐能照亮海沟，也会把你的位置交给追猎者。',color:'#315f61',icon:'◉',stat:'深度',ui:{panel:'SONAR CTRL',score:'成功规避',unit:'枚',resource:'蓄电池',pressure:'深海追猎压力',mission:'在静默海沟中规避漂流水雷',action:'主动声呐',actionKey:'action',control:'四向航行 · 空格声呐',stage:'TRENCH V1–D',stageState:'被动声呐低可见',signal:'声呐暴露',events:['接触水雷立即退场','主动声呐会额外耗电','低电量时视野持续衰减']}},
  skate:{no:'11',title:'时光滑板',accent:'屋顶逃亡',desc:'城市在身后坍塌。压板、起跳、控制落点，失误一次就会坠落。',color:'#8c4937',icon:'↗',stat:'距离',ui:{panel:'ROOF CTRL',score:'成功越障',unit:'次',resource:'平衡余量',pressure:'屋顶坍塌压力',mission:'越过断层与障碍，保持逃亡节奏',action:'起跳',actionKey:'up',control:'← → 调整 · ↑ 起跳',stage:'ROOFTOP V1–E',stageState:'前方屋顶持续断裂',signal:'落点状态',events:['撞击或坠落立即退场','落地后才可再次起跳','末段屋顶间距持续增加']}}
};
export const waveIds=Object.keys(waveMeta);
export function waveTiles(){return waveIds.map(id=>{const m=waveMeta[id];return `<article class="game-tile wave-tile wave-${id}" style="--wave:${m.color}"><span class="game-number">${m.no}</span><div><small>全新挑战</small><h3>${m.title}：${m.accent}</h3><p>${m.desc}</p></div><button data-open-wave="${id}">进入挑战 →</button></article>`}).join('')}
const modes={plane:[['禁航 180','扇形弹幕 · 追踪弹 · 双 Boss'],['无尽空域','每 30 秒追加一种弹幕'],['本机加压','额外弹幕压力 · 独立计分']],pinball:[['倾斜 180','缩短挡板 · 双球 · 间歇熄灯'],['故障无尽','每轮保留一个永久故障'],['本机加压','额外故障压力 · 独立计分']],train:[['失控 180','对向列车 · 断轨 · 三岔口'],['无尽干线','速度持续增加，车站补制动'],['本机加压','额外车流压力 · 独立计分']],submarine:[['深潜 180','水雷 · 洋流 · 声呐失真'],['海沟无尽','压力递增，能见度恶化'],['本机加压','额外追猎压力 · 独立计分']],skate:[['逃亡 180','碎裂屋顶 · 吊车 · 雨天盲跳'],['屋顶无尽','间距与节奏持续增加'],['本机加压','额外障碍压力 · 独立计分']]};
export function waveLanding(id){const m=waveMeta[id];return `<main id="main" class="wave-landing wave-theme-${id}" style="--wave:${m.color}"><section class="wave-hero"><div><span class="status"><i></i> 规则序列 V1</span><p class="wave-index">ARCADE / ${m.no}</p><h1>${m.title}<br><span>${m.accent}</span></h1><p>${m.desc}</p><button class="primary" data-wave-start="${id}" data-wave-mode="extreme">挑战炼狱 180 →</button></div><div class="wave-machine" aria-label="${m.title}街机预览"><div class="machine-screen">${id==='plane'?`<img class="plane-character" src="${PLANE_PLAYER_ART_URL}" alt="战战驾驶红白战机，机翼佩戴 LGD 徽标" width="1254" height="1254" decoding="async">`:id==='submarine'?`<img class="submarine-character" src="${SUBMARINE_ART_URL}" alt="战战驾驶黄铜探索潜艇，佩戴 LGD 徽标" width="1607" height="979" decoding="async">`:id==='skate'?roleArtPreview('skate','战战踩着滑板向右滑行，保留 LGD 徽标'):id==='train'?roleArtPreview('train','战战驾驶红白机车，向前方轨道行进'):`<span>${m.icon}</span><i></i><i></i><i></i><b>PHASE 03</b>`}</div><div class="machine-panel"><i></i><b></b><b></b></div></div></section><section class="modes wave-modes"><header><div><span class="kicker">独立规则与记录</span><h2>选择挑战模式</h2></div><p>最后 60 秒进入复合狂暴。</p></header><div class="mode-list">${modes[id].map((x,i)=>`<button class="mode ${i===0?'wave-extreme':''}" data-wave-start="${id}" data-wave-mode="${['extreme','endless','shadow'][i]}"><span class="mode-icon ${i===1?'mint':i===2?'coral':''}">${i===0?'180':i===1?'∞':'↗'}</span><span><b>${x[0]}</b><small>${x[1]}</small></span><em>${i===0?'一命极限挑战':i===1?'独立纪录':'本机加压'}</em></button>`).join('')}</div></section></main>`}
export function waveGameView(id,mode){
 const m=waveMeta[id],u=m.ui,mn={extreme:'炼狱 180',endless:'无尽模式',shadow:'本机加压'}[mode],clock=mode==='endless'?'00:00':'03:00';
 const visibleKeys={plane:['left','up','action','down','right'],pinball:['left','down','right'],train:['left','down','right'],submarine:['left','up','action','down','right'],skate:['left','up','right']}[id];
 const glyph={left:'←',up:'↑',action:m.icon,down:'↓',right:'→'};
 const label={left:'向左',up:id==='skate'?'起跳':'向上',action:u.action,down:id==='pinball'||id==='train'?u.action:'向下',right:'向右'};
 const controls=['left','up','action','down','right'].map(key=>`<button class="${key===u.actionKey?'wave-action':''}" data-wave-key="${key}" aria-label="${label[key]}" ${visibleKeys.includes(key)?'':`hidden aria-hidden="true"`}>${key===u.actionKey?`<span>${u.action}</span>`:glyph[key]}</button>`).join('');
 return `<main id="main" class="game-page wave-game wave-play-${id}" style="--wave:${m.color}" data-wave-id="${id}">
  <header class="gamebar wave-gamebar game-command">
   <button class="icon-btn" data-wave-exit="${id}" aria-label="退出本局">×</button>
   <div class="command-identity"><span>TM–${m.no}</span><small>TIME MACHINE / LIVE RUN</small></div>
   <div class="command-title"><b>${m.title}：${m.accent}</b><span>${mn} · ${u.mission}</span></div>
   <div class="command-clock"><small>${mode==='endless'?'本局时间':'剩余时间'}</small><strong id="wave-clock">${clock}</strong></div>
   <span class="verify"><i></i>本机计分中</span>
  </header>
  <div class="wave-phase pressure-rail" aria-label="${u.pressure}">
   <span>${u.pressure}</span>
   <div class="pressure-track"><i><em id="wave-progress"></em></i><b id="wave-phase">阶段 1 / 3</b></div>
   <div class="pressure-lamps" aria-hidden="true"><i class="active"></i><i></i><i></i></div>
  </div>
  <section class="wave-cabinet cabinet-arena">
   <aside class="wave-instruments hud-column">
    <header><span>实时仪表</span><b>${u.panel}</b></header>
    <div class="hud-readout"><small>${u.score}</small><strong id="wave-score">0</strong><span>${u.unit}</span></div>
    <div class="hud-readout compact"><small>${u.resource}</small><b id="wave-resource">100%</b></div>
    <div class="resource-gauge"><span>${u.signal}</span><i><em id="wave-resource-meter" style="width:100%"></em></i></div>
    <div class="hud-signal wave-status-lamps"><span>系统状态</span><i></i><i></i><i></i><i class="off"></i></div>
   </aside>
   <section class="wave-canvas-shell stage-module">
    <header class="stage-cap"><span>${u.stage}</span><b>${u.stageState}</b></header>
    <section class="screen-frame wave-screen">
     <canvas id="wave-canvas" width="720" height="520" aria-label="${m.title}游戏画面"></canvas>
     <span class="wave-alert" id="wave-alert" data-level="ready" aria-live="polite">系统准备</span>
    </section>
    <footer class="stage-foot"><span>规则序列 V1</span><span>${mode==='extreme'?'最后 60 秒复合狂暴':'独立纪录运行中'}</span></footer>
   </section>
   <aside class="wave-help hud-column">
    <header><span>任务指令</span><b>RUN PROTOCOL</b></header>
    <div class="instruction-primary"><small>操作</small><b>${u.control}</b></div>
    <ol class="event-list">${u.events.map((event,index)=>`<li><span>0${index+1}</span>${event}</li>`).join('')}</ol>
    <div class="key-hint"><kbd>WASD</kbd><span>键盘 / 触屏控制</span></div>
   </aside>
  </section>
  <div class="control-deck wave-control-deck"><span class="control-label">${u.panel}</span><div class="wave-controls touch-controls">${controls}</div><small>${u.control}</small></div>
 </main>`
}
let run=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hit=(a,b,r=18)=>Math.hypot(a.x-b.x,a.y-b.y)<r;
export function stopWave(){if(!run)return;cancelAnimationFrame(run.raf);clearInterval(run.timer);removeEventListener('keydown',run.keydown);removeEventListener('keyup',run.keyup);run=null}
export function mountWave(id,mode,onFinish){stopWave();const canvas=document.querySelector('#wave-canvas');if(!canvas)return;const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=720*dpr;canvas.height=520*dpr;const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);const s={id,mode,t:mode==='endless'?0:180,phase:1,score:0,res:100,keys:{},p:{x:360,y:430,vx:0,vy:0},items:[],shots:[],tick:0,clockCarry:0,shotCooldown:0,paddleCooldown:0,last:performance.now(),over:false};if(id==='train')s.p.x=1;run=s;
 if(id==='submarine')void loadSubmarineArt();
 if(id==='plane')void loadPlaneArt();
 if(id==='skate'||id==='train')void loadRoleArt(id);
 const end=(win=false)=>{if(s.over)return;s.over=true;stopWave();onFinish({id,score:s.score,time:mode==='endless'?s.t:180-s.t,win})};
 const keymap=k=>({ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',' ':'action'}[k]);
 s.keydown=e=>{const k=keymap(e.key);if(k){e.preventDefault();s.keys[k]=true}};s.keyup=e=>{const k=keymap(e.key);if(k)s.keys[k]=false};addEventListener('keydown',s.keydown);addEventListener('keyup',s.keyup);
 document.querySelectorAll('[data-wave-key]').forEach(b=>{const k=b.dataset.waveKey;b.onpointerdown=()=>s.keys[k]=true;b.onpointerup=b.onpointerleave=()=>s.keys[k]=false});
 const spawn=(type,x,y,extra={})=>s.items.push({type,x,y,...extra});
 const update=(dt)=>{s.tick+=dt;s.clockCarry+=dt;while(s.clockCarry>=1&&!s.over){s.clockCarry-=1;s.t+=mode==='endless'?1:-1;if(mode!=='endless'&&s.t<=0)end(true)}if(s.over)return;const elapsed=mode==='endless'?s.t:180-s.t;s.phase=Math.min(3,1+Math.floor(elapsed/60));const speed=1+s.phase*.25+(mode==='shadow'?.22:0);
  if(id==='plane'){s.p.x=clamp(s.p.x+((s.keys.right?1:0)-(s.keys.left?1:0))*260*dt,22,698);s.p.y=clamp(s.p.y+((s.keys.down?1:0)-(s.keys.up?1:0))*240*dt,30,490);s.res=clamp(s.res+(s.keys.action?-34:18)*dt,0,100);s.shotCooldown=Math.max(0,s.shotCooldown-dt);if(s.keys.action&&s.res>5&&s.shotCooldown<=0){s.shots.push({x:s.p.x,y:s.p.y-20});s.shotCooldown=.1}s.shots.forEach(b=>b.y-=440*dt);if(Math.floor(s.tick*4*speed)!==Math.floor((s.tick-dt)*4*speed)){spawn('enemy',60+(Math.floor(s.tick*97)%600),-15,{vy:80+35*s.phase});for(let i=0;i<s.phase;i++)spawn('bullet',60+(Math.floor(s.tick*97)%600),0,{vx:(i-(s.phase-1)/2)*55,vy:120+35*s.phase})}s.items.forEach(o=>{o.x+=(o.vx||0)*dt;o.y+=(o.vy||80)*dt});s.items.filter(o=>o.type==='bullet').forEach(o=>{if(hit(s.p,o,14))end(false)});s.shots.forEach(b=>s.items.forEach(o=>{if(o.type==='enemy'&&hit(b,o,22)){o.dead=b.dead=true;s.score++}}));s.items=s.items.filter(o=>!o.dead&&o.y<550);s.shots=s.shots.filter(b=>!b.dead&&b.y>-20)}
  if(id==='pinball'){if(!s.ball)s.ball={x:360,y:180,vx:165,vy:40};const b=s.ball;s.paddleCooldown=Math.max(0,s.paddleCooldown-dt);b.vy+=270*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<18||b.x>702)b.vx*=-1;if(b.y<18)b.vy=Math.abs(b.vy);const left=s.keys.left,right=s.keys.right;if(b.vy>0&&!s.paddleCooldown&&b.y>430&&b.y<486&&((left&&b.x<355)||(right&&b.x>365))){b.vy=-Math.abs(b.vy)-120;b.vx+=(b.x-360)*.35;s.paddleCooldown=.16;s.score++;s.res=clamp(s.res+3,0,100)}if(s.keys.down){s.res-=28*dt;b.vy-=180*dt}if(s.res<=0||b.y>535)end(false);if(!s.targets)s.targets=Array.from({length:8},(_,i)=>({x:100+(i%4)*170,y:100+Math.floor(i/4)*125}));s.targets.forEach(t=>{t.flash=Math.max(0,(t.flash||0)-dt*4);t.cooldown=Math.max(0,(t.cooldown||0)-dt);if(hit(b,t,30)&&!t.cooldown){b.vy*=-1;t.flash=1;t.cooldown=.14;s.score+=10}})}
  if(id==='train'){if(s.keys.left&&!s.lock){s.p.x=clamp(s.p.x-1,0,2);s.lock=1}if(s.keys.right&&!s.lock){s.p.x=clamp(s.p.x+1,0,2);s.lock=1}if(!s.keys.left&&!s.keys.right)s.lock=0;if(s.keys.down)s.res-=22*dt;else s.res=Math.min(100,s.res+4*dt);if(Math.floor(s.tick*1.5*speed)!==Math.floor((s.tick-dt)*1.5*speed))spawn('train',Math.floor(s.tick*7)%3,-40,{vy:100+50*s.phase});s.items.forEach(o=>o.y+=o.vy*dt*(s.keys.down?.55:1));s.items.forEach(o=>{if(s.over)return;if(o.x===s.p.x&&o.y>385&&o.y<480){end(false);return}if(!o.done&&o.y>500){o.done=1;s.score++}});s.items=s.items.filter(o=>o.y<560);if(s.res<=0)end(false)}
  if(id==='submarine'){s.p.x=clamp(s.p.x+((s.keys.right?1:0)-(s.keys.left?1:0))*180*dt,25,695);s.p.y=clamp(s.p.y+((s.keys.down?1:0)-(s.keys.up?1:0))*160*dt,25,495);s.res-=dt*(1.4+s.phase*.5);if(s.keys.action&&!s.sonar){s.sonar=1;s.pulse=1;s.res-=6}if(!s.keys.action)s.sonar=0;s.pulse=Math.max(0,(s.pulse||0)-dt*.6);if(Math.floor(s.tick*1.2*speed)!==Math.floor((s.tick-dt)*1.2*speed))spawn('mine',740,40+(Math.floor(s.tick*113)%430),{vx:-75-25*s.phase});s.items.forEach(o=>o.x+=o.vx*dt);s.items.forEach(o=>{if(s.over)return;if(hit(s.p,o,23)){end(false);return}if(!o.done&&o.x<0){o.done=1;s.score++}});s.items=s.items.filter(o=>o.x>-40);if(s.res<=0)end(false)}
  if(id==='skate'){s.p.vy+=900*dt;s.p.y+=s.p.vy*dt;if(s.p.y>430){s.p.y=430;s.p.vy=0;s.ground=1}if(s.keys.up&&s.ground){s.p.vy=-430;s.ground=0}s.p.x=clamp(s.p.x+((s.keys.right?1:0)-(s.keys.left?1:0))*150*dt,80,420);if(Math.floor(s.tick*1.25*speed)!==Math.floor((s.tick-dt)*1.25*speed))spawn(Math.floor(s.tick)%2?'gap':'barrier',760,440,{vx:-190-45*s.phase,w:60+Math.floor(s.tick*13)%70});s.items.forEach(o=>o.x+=o.vx*dt);s.items.forEach(o=>{if(s.over)return;if(o.x<s.p.x+25&&o.x+o.w>s.p.x-25&&s.p.y>385){end(false);return}if(!o.done&&o.x+o.w<s.p.x-25){o.done=1;s.score++;s.res=Math.min(100,s.res+1)}});s.items=s.items.filter(o=>o.x>-160);s.res-=dt*(.8+s.phase*.3);if(s.res<=0)end(false)}
 };
 const draw=()=>{const W=720,H=520;c.clearRect(0,0,W,H);drawBackground(c,s,W,H);if(id==='plane')drawPlane(c,s);if(id==='pinball')drawPinball(c,s);if(id==='train')drawTrain(c,s);if(id==='submarine')drawSub(c,s);if(id==='skate')drawSkate(c,s)};
 const frame=now=>{if(s.over)return;const dt=Math.min(.033,(now-s.last)/1000);s.last=now;update(dt);if(s.over)return;draw();syncHud(s);s.raf=requestAnimationFrame(frame)};s.raf=requestAnimationFrame(frame)
}
function syncHud(s){
 const q=x=>document.querySelector(x),resource=Math.max(0,Math.round(s.res)),elapsed=s.mode==='endless'?s.t:180-s.t;
 const score=q('#wave-score'),resourceText=q('#wave-resource'),resourceMeter=q('#wave-resource-meter'),phase=q('#wave-phase'),clock=q('#wave-clock'),progress=q('#wave-progress'),alert=q('#wave-alert');
 if(score)score.textContent=s.score;
 if(resourceText)resourceText.textContent=`${resource}%`;
 if(resourceMeter)resourceMeter.style.width=`${resource}%`;
 if(phase)phase.textContent=`阶段 ${s.phase} / 3`;
 if(clock)clock.textContent=`${String(Math.floor(Math.max(0,s.t)/60)).padStart(2,'0')}:${String(Math.max(0,s.t%60)).padStart(2,'0')}`;
 if(progress)progress.style.width=`${Math.min(100,Math.max(0,(elapsed%60)/60*100))}%`;
 document.querySelectorAll('.wave-phase .pressure-lamps i').forEach((lamp,index)=>lamp.classList.toggle('active',index<s.phase));
 const page=document.querySelector('.wave-game');if(page&&page.dataset.phase!==String(s.phase)){page.classList.remove('phase-1','phase-2','phase-3');page.classList.add(`phase-${s.phase}`);page.dataset.phase=String(s.phase)}
 document.querySelectorAll('.wave-status-lamps i').forEach((lamp,index)=>lamp.classList.toggle('off',resource<(index+1)*24));
 let message=s.phase===3?'末段狂暴 · 全部压力叠加':s.phase===2?'第二压力已叠加':'第一阶段 · 系统稳定',level=s.phase===3?'critical':s.phase===2?'warning':'normal';
 if(resource<22){message={plane:'武器电容低 · 停火冷却',pinball:'倾斜锁死临界',train:'制动气压不足',submarine:'蓄电池临界',skate:'平衡余量临界'}[s.id];level='critical'}
 else if(s.id==='plane'&&s.keys.action){message='短点射中 · 监控电容';level='active'}
 else if(s.id==='pinball'&&s.keys.down){message='震台介入 · 稳定度下降';level='warning'}
 else if(s.id==='train'&&s.keys.down){message='制动介入 · 气压下降';level='warning'}
 else if(s.id==='submarine'&&s.pulse){message='主动声呐已发射';level='active'}
 else if(s.id==='skate'&&!s.ground){message='腾空 · 校准落点';level='active'}
 if(alert){if(alert.textContent!==message)alert.textContent=message;alert.dataset.level=level}
}

function roundedRect(c,x,y,w,h,r){
 const rr=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+rr,y);c.arcTo(x+w,y,x+w,y+h,rr);c.arcTo(x+w,y+h,x,y+h,rr);c.arcTo(x,y+h,x,y,rr);c.arcTo(x,y,x+w,y,rr);c.closePath();
}
function line(c,x1,y1,x2,y2,color,width=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke()}
function drawBackground(c,s,W,H){
 c.save();
 if(s.id==='plane')drawPlaneWorld(c,s,W,H);
 if(s.id==='pinball')drawPinballWorld(c,s,W,H);
 if(s.id==='train')drawTrainWorld(c,s,W,H);
 if(s.id==='submarine')drawSubWorld(c,s,W,H);
 if(s.id==='skate')drawSkateWorld(c,s,W,H);
 c.restore();
}
function drawPlaneWorld(c,s,W,H){
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#789da0');g.addColorStop(.48,'#b6c6bd');g.addColorStop(1,'#617b75');c.fillStyle=g;c.fillRect(0,0,W,H);
 const sun=c.createRadialGradient(555,105,8,555,105,88);sun.addColorStop(0,'rgba(247,225,160,.72)');sun.addColorStop(1,'rgba(247,225,160,0)');c.fillStyle=sun;c.fillRect(455,5,200,200);
 for(let i=0;i<7;i++){const x=((i*137-s.tick*(10+i*1.7))%(W+210)+W+210)%(W+210)-105,y=75+(i%4)*64,scale=.65+(i%3)*.2;c.fillStyle=`rgba(239,235,215,${.16+(i%3)*.04})`;c.beginPath();c.ellipse(x,y,72*scale,17*scale,0,0,Math.PI*2);c.ellipse(x+48*scale,y-8,46*scale,20*scale,0,0,Math.PI*2);c.ellipse(x-45*scale,y-5,42*scale,16*scale,0,0,Math.PI*2);c.fill()}
 const horizon=170;c.save();c.strokeStyle='rgba(241,235,207,.24)';c.lineWidth=1;for(let x=-90;x<=810;x+=90)line(c,360+(x-360)*.08,horizon,x,H,'rgba(241,235,207,.24)');for(let i=0;i<10;i++){const t=i/9,y=horizon+Math.pow(t,1.7)*(H-horizon);line(c,0,y,W,y,'rgba(241,235,207,.18)')};c.restore();
 c.setLineDash([12,9]);line(c,0,116,W,116,'rgba(142,48,38,.5)',2);c.setLineDash([]);c.fillStyle='rgba(78,67,58,.64)';c.font='700 11px ui-monospace,monospace';c.fillText('NO-FLY GRID / SECTOR 07',22,101);
}
function drawPinballWorld(c,s,W,H){
 const wood=c.createLinearGradient(0,0,W,H);wood.addColorStop(0,'#6f3f2b');wood.addColorStop(.5,'#a66d36');wood.addColorStop(1,'#4b2b24');c.fillStyle=wood;c.fillRect(0,0,W,H);
 roundedRect(c,18,8,W-36,H-16,30);c.fillStyle='#392822';c.fill();c.strokeStyle='#d3a85b';c.lineWidth=5;c.stroke();
 const bed=c.createLinearGradient(0,20,0,H-20);bed.addColorStop(0,'#d6b46f');bed.addColorStop(.52,'#9f5a36');bed.addColorStop(1,'#532e29');roundedRect(c,39,19,W-78,H-38,24);c.fillStyle=bed;c.fill();
 c.strokeStyle='rgba(244,226,174,.72)';c.lineWidth=4;c.beginPath();c.arc(W/2,105,215,Math.PI,0);c.stroke();line(c,62,108,62,430,'rgba(244,226,174,.72)',4);line(c,W-62,108,W-62,430,'rgba(244,226,174,.72)',4);
 for(let i=0;i<5;i++){const x=163+i*98;c.fillStyle=i%2?'#c64f37':'#e0bd56';roundedRect(c,x,48,55,12,6);c.fill();line(c,x+27,63,x+27,91,'rgba(65,42,32,.54)',2)}
 [[105,330],[615,330],[145,395],[575,395]].forEach(([x,y])=>{c.fillStyle='#d9c48b';c.beginPath();c.arc(x,y,10,0,Math.PI*2);c.fill();c.strokeStyle='#48332a';c.lineWidth=4;c.stroke()});
 c.fillStyle='rgba(255,235,164,.16)';for(let y=85;y<405;y+=52){for(let x=95;x<650;x+=74){c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill()}}
}
function drawTrainWorld(c,s,W,H){
 const sky=c.createLinearGradient(0,0,0,210);sky.addColorStop(0,'#9aa88e');sky.addColorStop(1,'#d4cfad');c.fillStyle=sky;c.fillRect(0,0,W,210);
 c.fillStyle='#6b735f';c.beginPath();c.moveTo(0,190);for(let x=0;x<=W;x+=70)c.lineTo(x,128+(x%140?26:0));c.lineTo(W,230);c.lineTo(0,230);c.fill();
 c.fillStyle='#6a6655';c.fillRect(0,190,W,H-190);
 const near=[150,360,570],far=[330,360,390];near.forEach((center,laneIndex)=>{[-1,1].forEach(side=>line(c,far[laneIndex]+side*5,112,center+side*43,H,'#e6ddbd',4));for(let i=0;i<19;i++){const t=((i/19+s.tick*.24)%1),ease=t*t,y=112+ease*(H-112),cx=360+(near[laneIndex]-360)*ease,half=7+38*ease;line(c,cx-half,y,cx+half,y,'rgba(56,54,45,.72)',2+ease*4)}});
 for(let i=0;i<8;i++){const x=38+i*96,offset=(s.tick*55)%96;c.fillStyle='rgba(38,47,40,.38)';c.fillRect(x-offset,182,7,338);c.fillStyle='#d5bf5a';c.beginPath();c.arc(x-offset+3,203,5,0,Math.PI*2);c.fill()}
 c.fillStyle='#25322d';c.fillRect(28,232,23,54);c.fillStyle=s.phase===3?'#d5533f':'#d1af46';c.beginPath();c.arc(39,245,6,0,Math.PI*2);c.fill();c.fillStyle='rgba(244,237,210,.75)';c.font='700 10px ui-monospace,monospace';c.fillText('BLOCK 03',18,306);
}
function drawSubWorld(c,s,W,H){
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#255556');g.addColorStop(.45,'#12393c');g.addColorStop(1,'#071e24');c.fillStyle=g;c.fillRect(0,0,W,H);
 const glow=c.createRadialGradient(360,180,10,360,180,330);glow.addColorStop(0,'rgba(95,151,139,.18)');glow.addColorStop(1,'rgba(4,20,24,0)');c.fillStyle=glow;c.fillRect(0,0,W,H);
 for(let i=0;i<72;i++){const x=(i*83+(s.tick*(3+i%4)))%W,y=(i*47+s.tick*(8+i%3))%H,r=1+(i%3)*.45;c.fillStyle=`rgba(184,218,197,${.08+(i%5)*.018})`;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}
 c.fillStyle='#09272b';c.beginPath();c.moveTo(0,H);c.lineTo(0,432);c.lineTo(70,399);c.lineTo(132,452);c.lineTo(210,411);c.lineTo(295,466);c.lineTo(390,421);c.lineTo(476,448);c.lineTo(568,395);c.lineTo(642,430);c.lineTo(W,397);c.lineTo(W,H);c.fill();
 c.strokeStyle='rgba(162,211,193,.22)';c.lineWidth=1;for(let y=70;y<440;y+=74){line(c,18,y,44,y,'rgba(162,211,193,.34)',2);c.fillStyle='rgba(190,218,200,.38)';c.font='600 9px ui-monospace,monospace';c.fillText(`${800+y*3}M`,50,y+3)}
}
function drawSkateWorld(c,s,W,H){
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#d58d66');g.addColorStop(.48,'#e6b47d');g.addColorStop(1,'#65534c');c.fillStyle=g;c.fillRect(0,0,W,H);
 c.fillStyle='rgba(243,214,147,.68)';c.beginPath();c.arc(575,95,52,0,Math.PI*2);c.fill();
 const parallax=(s.tick*16)%90;for(let i=-1;i<11;i++){const x=i*82-parallax,h=70+(i*37%105);c.fillStyle=i%2?'#7a665b':'#6d5c54';c.fillRect(x,360-h,72,h+100);c.fillStyle='rgba(244,211,142,.28)';for(let wy=375-h;wy<340;wy+=23){for(let wx=x+12;wx<x+65;wx+=20)c.fillRect(wx,wy,7,10)}}
 c.fillStyle='#414846';c.fillRect(0,455,W,65);c.fillStyle='#72756a';c.fillRect(0,448,W,12);for(let x=30;x<W;x+=115){c.fillStyle='#515a56';c.fillRect(x,404,54,44);c.fillStyle='#8d8a77';c.fillRect(x+8,394,38,10)}
 c.strokeStyle='rgba(61,58,53,.45)';c.lineWidth=3;line(c,80,210,80,448,c.strokeStyle,3);line(c,62,236,98,236,c.strokeStyle,3);line(c,640,170,640,448,c.strokeStyle,3);line(c,610,205,670,205,c.strokeStyle,3);
}

function drawPlane(c,s){
 c.save();
 // Aircraft first; hostile rounds stay on top so detailed wings never hide them.
 s.items.filter(o=>o.type!=='bullet').forEach(o=>{
  if(drawPlaneEnemy(c,o))return;
  c.save();c.translate(o.x,o.y);c.shadowColor='rgba(43,35,31,.35)';c.shadowBlur=8;c.fillStyle='#744136';c.beginPath();c.moveTo(0,20);c.lineTo(-24,-10);c.lineTo(-9,-7);c.lineTo(0,-21);c.lineTo(9,-7);c.lineTo(24,-10);c.closePath();c.fill();c.fillStyle='#d1b779';c.fillRect(-3,-12,6,15);c.strokeStyle='#362f2b';c.lineWidth=2;c.stroke();c.restore();
 });
 if(!drawPlanePilot(c,s)){
  c.save();c.translate(s.p.x,s.p.y);const flame=18+Math.sin(s.tick*24)*5;c.fillStyle='rgba(243,190,69,.78)';c.beginPath();c.moveTo(-8,15);c.lineTo(0,15+flame);c.lineTo(8,15);c.fill();c.fillStyle='#304a46';c.beginPath();c.moveTo(0,-27);c.lineTo(-12,-5);c.lineTo(-31,17);c.lineTo(-9,12);c.lineTo(0,22);c.lineTo(9,12);c.lineTo(31,17);c.lineTo(12,-5);c.closePath();c.fill();c.fillStyle='#d9d1a4';c.beginPath();c.ellipse(0,-9,5,12,0,0,Math.PI*2);c.fill();c.fillStyle='#b74839';c.fillRect(-24,11,8,4);c.fillRect(16,11,8,4);c.restore();
 }
 c.save();c.shadowColor='#f3cf56';c.shadowBlur=10;s.shots.forEach(b=>{const grad=c.createLinearGradient(b.x,b.y-15,b.x,b.y+7);grad.addColorStop(0,'rgba(255,244,174,0)');grad.addColorStop(1,'#f3cf56');c.fillStyle=grad;c.fillRect(b.x-2,b.y-16,4,22)});c.restore();
 s.items.filter(o=>o.type==='bullet').forEach(o=>{c.save();c.translate(o.x,o.y);c.shadowColor='#d94c37';c.shadowBlur=12;c.strokeStyle='rgba(255,214,151,.45)';c.lineWidth=2;line(c,0,-17,0,2,c.strokeStyle,2);c.fillStyle='#d64c39';c.beginPath();c.arc(0,4,5,0,Math.PI*2);c.fill();c.fillStyle='#f4d16d';c.beginPath();c.arc(-1,2,2,0,Math.PI*2);c.fill();c.restore()});
 c.restore();
}
function drawPinball(c,s){
 c.save();if(s.keys.down)c.translate(Math.sin(s.tick*52)*2.5,0);
 c.strokeStyle='#f0d58c';c.lineWidth=4;[[92,122,142,74],[628,122,578,74],[115,310,182,350],[605,310,538,350]].forEach(([x1,y1,x2,y2])=>{c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo((x1+x2)/2,y1-30,x2,y2);c.stroke()});
 (s.targets||[]).forEach((t,index)=>{c.save();c.translate(t.x,t.y);c.shadowColor=t.flash?'#ffe483':'rgba(30,20,16,.3)';c.shadowBlur=t.flash?22:8;c.fillStyle='#4a3028';c.beginPath();c.arc(0,0,31,0,Math.PI*2);c.fill();c.fillStyle=t.flash?'#f5d45d':index%2?'#c1513b':'#ddb44e';c.beginPath();c.arc(0,0,23,0,Math.PI*2);c.fill();c.strokeStyle='#f0ddb0';c.lineWidth=4;c.stroke();c.fillStyle='rgba(255,248,210,.78)';c.beginPath();c.arc(-7,-8,6,0,Math.PI*2);c.fill();c.restore()});
 const flipper=(x,y,ex,ey)=>{c.strokeStyle='#3b2924';c.lineWidth=21;c.lineCap='round';line(c,x,y,ex,ey,c.strokeStyle,21);c.strokeStyle='#f0dca8';c.lineWidth=13;line(c,x,y,ex,ey,c.strokeStyle,13);c.fillStyle='#bf4b38';c.beginPath();c.arc(x,y,11,0,Math.PI*2);c.fill()};flipper(165,465,s.keys.left?340:290,430);flipper(555,465,s.keys.right?380:430,430);c.lineCap='butt';
 if(s.ball){const b=s.ball;c.fillStyle='rgba(255,242,205,.16)';c.beginPath();c.arc(b.x-b.vx*.045,b.y-b.vy*.045,17,0,Math.PI*2);c.fill();const ball=c.createRadialGradient(b.x-5,b.y-6,2,b.x,b.y,15);ball.addColorStop(0,'#fffbe8');ball.addColorStop(.35,'#d8d4c5');ball.addColorStop(1,'#5b625f');c.shadowColor='#fff3bc';c.shadowBlur=12;c.fillStyle=ball;c.beginPath();c.arc(b.x,b.y,13,0,Math.PI*2);c.fill()}
 c.restore();
}
function trainProjection(lane,y){const t=clamp((y+40)/600,0,1),ease=t*t,near=[150,360,570];return{x:360+(near[lane]-360)*ease,y:112+ease*408,scale:.25+ease*.88}}
function drawTrainBody(c,x,y,scale,color,player=false){
 c.save();c.translate(x,y);c.scale(scale,scale);c.shadowColor='rgba(24,27,22,.38)';c.shadowBlur=14;c.shadowOffsetY=8;roundedRect(c,-48,-55,96,116,16);c.fillStyle=color;c.fill();c.strokeStyle='#222b27';c.lineWidth=4;c.stroke();c.shadowColor='transparent';c.fillStyle=player?'#d4bc57':'#d6d0ac';roundedRect(c,-33,-39,66,31,7);c.fill();c.fillStyle='#263b37';roundedRect(c,-27,-34,24,20,3);c.fill();roundedRect(c,3,-34,24,20,3);c.fill();c.fillStyle=player?'#f0d45c':'#f2bd5d';c.beginPath();c.arc(-28,31,7,0,Math.PI*2);c.arc(28,31,7,0,Math.PI*2);c.fill();c.fillStyle='#202724';c.fillRect(-50,49,100,11);c.fillStyle='rgba(245,237,208,.68)';c.font='700 10px ui-monospace,monospace';c.textAlign='center';c.fillText(player?'TM LOCAL':'EXPRESS',0,13);c.restore();
}
function drawTrain(c,s){
 [...s.items].sort((a,b)=>a.y-b.y).forEach(o=>{const p=trainProjection(o.x,o.y);drawTrainBody(c,p.x,p.y,p.scale,'#a84b3b')});
 // Use the actual rail center at the player's depth, not its off-screen near end.
 const playerY=442,near=[150,360,570],far=[330,360,390],trackT=(playerY-112)/(520-112),playerX=far[s.p.x]+(near[s.p.x]-far[s.p.x])*trackT;
 // The physical lane index and lower clearance remain unchanged.
 if(!drawRoleSprite(c,'train',0,playerX-54,380,108,126))drawTrainBody(c,playerX,442,1.05,'#384b45',true);
 c.fillStyle='rgba(246,237,202,.8)';c.font='700 11px ui-monospace,monospace';c.textAlign='center';['LINE 1','LINE 2','LINE 3'].forEach((label,index)=>c.fillText(label,[150,360,570][index],516));
 c.textAlign='start';
}
function drawSub(c,s){
 c.save();c.strokeStyle='rgba(150,205,187,.14)';c.lineWidth=1;[80,160,240].forEach(r=>{c.beginPath();c.arc(s.p.x,s.p.y,r,0,Math.PI*2);c.stroke()});
 if(s.pulse){const radius=(1-s.pulse)*360;c.strokeStyle=`rgba(207,230,170,${Math.max(.15,s.pulse)})`;c.lineWidth=4;c.shadowColor='#d9e3a4';c.shadowBlur=12;c.beginPath();c.arc(s.p.x,s.p.y,radius,0,Math.PI*2);c.stroke();c.shadowBlur=0;c.fillStyle=`rgba(194,221,172,${s.pulse*.055})`;c.beginPath();c.moveTo(s.p.x,s.p.y);c.arc(s.p.x,s.p.y,radius,-.55,.55);c.closePath();c.fill()}
 s.items.forEach(o=>{const visible=Math.max(.12,s.pulse||0),near=Math.hypot(o.x-s.p.x,o.y-s.p.y)<120;c.save();c.translate(o.x,o.y);c.globalAlpha=near?Math.max(.45,visible):visible;c.strokeStyle='#d4c65d';c.lineWidth=3;for(let a=0;a<Math.PI*2;a+=Math.PI/4)line(c,Math.cos(a)*14,Math.sin(a)*14,Math.cos(a)*25,Math.sin(a)*25,c.strokeStyle,3);c.fillStyle='#b7a843';c.beginPath();c.arc(0,0,15,0,Math.PI*2);c.fill();c.fillStyle='#343e35';c.beginPath();c.arc(-4,-3,3,0,Math.PI*2);c.arc(5,4,3,0,Math.PI*2);c.fill();c.restore()});
 c.save();c.translate(s.p.x,s.p.y);const wake=c.createLinearGradient(-75,0,-25,0);wake.addColorStop(0,'rgba(175,220,202,0)');wake.addColorStop(1,'rgba(175,220,202,.36)');c.fillStyle=wake;c.beginPath();c.moveTo(-28,-8);c.lineTo(-92,-20);c.lineTo(-92,20);c.lineTo(-28,8);c.fill();c.restore();
 if(!drawSubmarinePilot(c,s)){c.save();c.translate(s.p.x,s.p.y);c.strokeStyle='#99bda9';c.lineWidth=4;c.beginPath();c.arc(-36,0,12,-Math.PI/2,Math.PI/2);c.stroke();c.fillStyle='#aec99e';c.beginPath();c.ellipse(0,0,38,17,0,0,Math.PI*2);c.fill();c.fillStyle='#789987';c.beginPath();c.moveTo(3,-15);c.lineTo(20,-30);c.lineTo(29,-14);c.closePath();c.fill();c.fillRect(-5,-28,10,13);c.strokeStyle='#d2dda8';c.lineWidth=3;c.beginPath();c.arc(-14,-2,5,0,Math.PI*2);c.arc(3,-2,5,0,Math.PI*2);c.arc(20,-2,5,0,Math.PI*2);c.stroke();c.fillStyle='#d6c855';c.fillRect(30,-3,9,6);c.restore();}
 if(s.res<35){const danger=c.createRadialGradient(s.p.x,s.p.y,80,s.p.x,s.p.y,430);danger.addColorStop(0,'rgba(3,16,20,0)');danger.addColorStop(1,`rgba(2,11,14,${(35-s.res)/55})`);c.fillStyle=danger;c.fillRect(0,0,720,520)}c.restore();
}
function drawSkate(c,s){
 c.save();
 s.items.forEach(o=>{if(o.type==='gap'){c.fillStyle='#182322';c.fillRect(o.x,446,o.w,74);const edge='#c8a66b';line(c,o.x,446,o.x+12,467,edge,4);line(c,o.x+o.w,446,o.x+o.w-12,467,edge,4);c.fillStyle='rgba(202,169,104,.45)';for(let x=o.x+10;x<o.x+o.w-8;x+=22)c.fillRect(x,449,9,5)}else{c.fillStyle='#393f3c';roundedRect(c,o.x,382,o.w,69,5);c.fill();c.strokeStyle='#1f2825';c.lineWidth=4;c.stroke();c.save();roundedRect(c,o.x,382,o.w,69,5);c.clip();c.strokeStyle='#d3a94e';c.lineWidth=9;for(let x=o.x-55;x<o.x+o.w+40;x+=34)line(c,x,452,x+55,382,c.strokeStyle,9);c.restore();c.fillStyle='#bd4d3b';c.fillRect(o.x+8,389,o.w-16,9)}});
 const shadowWidth=48+Math.min(28,Math.abs(430-s.p.y)*.08);c.fillStyle=`rgba(25,31,29,${.26-Math.min(.18,Math.abs(430-s.p.y)/500)})`;c.beginPath();c.ellipse(s.p.x,456,shadowWidth,7,0,0,Math.PI*2);c.fill();
 c.save();c.translate(s.p.x,s.p.y);const airborne=!s.ground,tilt=clamp(s.p.vy/900,-.28,.28);c.rotate(tilt);
 // Square frames keep the wheel contact line at the original local y + 37.
 if(!drawRoleSprite(c,'skate',airborne?1:0,-46,-55,92,92)){
  c.strokeStyle='#2d3734';c.lineCap='round';c.lineWidth=8;c.beginPath();c.arc(0,-42,11,0,Math.PI*2);c.stroke();c.strokeStyle='#efd38d';c.lineWidth=7;c.beginPath();c.moveTo(0,-31);c.lineTo(airborne?6:0,3);c.lineTo(airborne?-22:-16,22);c.moveTo(2,-18);c.lineTo(airborne?26:21,-6);c.moveTo(2,-18);c.lineTo(-19,-7);c.stroke();c.strokeStyle='#252f2d';c.lineWidth=5;line(c,-28,28,31,28,c.strokeStyle,5);c.fillStyle='#d1b252';c.beginPath();c.arc(-20,33,4,0,Math.PI*2);c.arc(22,33,4,0,Math.PI*2);c.fill();
 }
 c.restore();
 c.fillStyle='rgba(244,226,182,.7)';c.font='700 10px ui-monospace,monospace';c.fillText(s.ground?'CONTACT / STABLE':'AIRBORNE / ALIGN',24,34);c.restore();
}
