import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createPlatformer,stepPlatformer,platformerSummary} from '../src/platformer-engine.js';
import {createNightwatch,stepNightwatch,nightwatchAction,nightwatchSummary,TOWER_TYPES} from '../src/nightwatch-engine.js';
import {mountAdventure,stopAdventure,adventureIds,adventureMeta,adventureGameView} from '../src/adventure-games.js';
import {recordRun,listRuns,clearLocalRuns,calculateRunScore} from '../src/score-store.js';

const settledInput=(id,s,summary)=>({gameId:id,mode:s.mode,outcome:s.won?'clear':'failed',durationMs:Math.round(s.elapsed*1000),metrics:summary(s).metrics});
clearLocalRuns();

const endlessView=adventureGameView('platformer','endless');
assert.ok(!endlessView.includes('aria-label="六段群岛路线"'),'endless must not promise a finite six-sector route');
assert.ok(endlessView.includes('没有终点，只有更远'),'endless start prompt reflects its actual goal');
assert.ok(adventureGameView('platformer','shadow').includes('只有一次机会'),'shadow start prompt reflects one life');
assert.ok(createPlatformer('shadow',17).notice.includes('一枚机芯'),'shadow initial notice reflects one life');
assert.ok(createPlatformer('endless',17).notice.includes('无尽裂隙'),'endless initial notice names the active mode');

// The body also carries data-page as a styling hook. Binding it as a navigation
// control used to restart the mounted game whenever any gameplay click bubbled.
const mainSource=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const bindStart=mainSource.indexOf('function bind(){'),bindEnd=mainSource.indexOf('\nfunction spawn()',bindStart);
assert.ok(bindStart>=0&&bindEnd>bindStart,'main navigation binding is available for regression verification');
const bodyRouteFixture={dataset:{page:'adventure-game'}},homeRouteFixture={dataset:{page:'home'}};
let routeRenders=0,routeStops=0;
const routeState={page:'adventure-game'};
const selectRoutes=(selector,insideApp)=>selector==='[data-page]'?(insideApp?[homeRouteFixture]:[bodyRouteFixture,homeRouteFixture]):selector==='button[data-page]'?[homeRouteFixture]:[];
runInNewContext(`${mainSource.slice(bindStart,bindEnd)}\nbind();`,{
 app:{querySelectorAll:selector=>selectRoutes(selector,true)},
 document:{querySelectorAll:selector=>selectRoutes(selector,false)},
 state:routeState,stopLoop:()=>routeStops++,render:()=>routeRenders++
});
assert.equal(bodyRouteFixture.onclick,undefined,'the body styling hook must never receive the navigation click handler');
bodyRouteFixture.onclick?.({target:{dataset:{advKey:'jump'}}});
assert.equal(routeRenders,0,'a gameplay click bubbling to the body must not remount the game');
assert.equal(routeStops,0,'a gameplay click must not stop the game loop');
homeRouteFixture.onclick();
assert.equal(routeState.page,'home','real navigation buttons still change routes');
assert.equal(routeRenders,1);
assert.equal(routeStops,1);

// Drive the real simulations, then persist their summaries through the same score contract as the UI.
for(const mode of ['extreme','endless','shadow']){
 const s=createPlatformer(mode,184);
 for(let i=0;i<120*40&&!s.over;i++)stepPlatformer(s,1/120,{right:true});
 assert.ok(s.metrics.distance>0,'walking produces actual progress');
 const input=settledInput('platformer',s,platformerSummary),run=recordRun(input);
 assert.equal(run.score,s.score,`platformer ${mode}: engine, HUD and saved score agree`);
 assert.equal(run.metrics.distance,platformerSummary(s).metrics.distance);
 assert.equal(run.mode,mode);
 assert.equal(run.verification.status,'local');
}
// A controlled final-gate fixture isolates the clear transition and fractional-time bonus.
for(const mode of ['extreme','shadow']){
 const s=createPlatformer(mode,184);
 s.player.x=s.goalX-20;s.player.y=360;s.player.vy=0;s.elapsed=90.517;
 stepPlatformer(s,1/120,{});
 assert.equal(s.won,true,'crossing the final gate triggers a real clear');
 const run=recordRun(settledInput('platformer',s,platformerSummary));
 assert.equal(run.score,s.score,'fractional clear duration uses the same rounding in all score surfaces');
}

for(const mode of ['extreme','endless','shadow']){
 const s=createNightwatch(mode,184);
 for(let row=0;row<5;row++)assert.equal(nightwatchAction(s,{type:'build',tower:'shooter',row,col:0}).ok,true);
 const preparation=nightwatchSummary(s);
 stepNightwatch(s,2);
 assert.equal(s.energy,preparation.energy,'preparation cannot farm electricity');
 assert.equal(calculateRunScore(settledInput('nightwatch',s,nightwatchSummary)),0,'building and waiting do not award points');
 assert.equal(nightwatchAction(s,{type:'wave'}).ok,true);
 for(let i=0;i<30*150&&!s.over&&!s.canStartWave;i++)stepNightwatch(s,1/30);
 assert.ok(s.kills>0,'towers must actually defeat approaching enemies');
 const input=settledInput('nightwatch',s,nightwatchSummary),run=recordRun(input);
 assert.equal(run.score,s.score,`nightwatch ${mode}: engine and saved score agree`);
 assert.ok(run.score>0);
 assert.equal(run.metrics.towersBuilt,5);
 assert.equal(run.mode,mode);
}
assert.deepEqual(new Set(listRuns({gameId:'platformer'}).map(r=>r.mode)),new Set(['extreme','endless','shadow']));
assert.deepEqual(new Set(listRuns({gameId:'nightwatch'}).map(r=>r.mode)),new Set(['extreme','endless','shadow']));
for(const id of adventureIds)assert.deepEqual(Object.keys(adventureMeta[id].modes),['extreme','endless','shadow']);

// Minimal DOM adapters exercise the real mount's event/RAF lifecycle without a browser dependency.
const names=['window','document','devicePixelRatio','requestAnimationFrame','cancelAnimationFrame','performance'];
const original=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
let time=0,nextFrame=1,frames=new Map(),nodes=new Map(),collections=new Map();
const gradient={addColorStop(){}};
const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:()=>({width:10})},{get:(target,key)=>target[key]||(()=>{})});
class Node extends EventTarget{
 constructor(){super();this.dataset={};this.style={};this.textContent='';this.hidden=false;this.disabled=false;this.className='';this.classList={add(){},remove(){},toggle(){}};}
 setAttribute(){} focus(){} setPointerCapture(){} getContext(){return ctx;}
 getBoundingClientRect(){return {left:0,top:0,width:960,height:540};}
 after(el){if('advSettle' in el.dataset)nodes.set('[data-adv-settle]',el);}
}
function dom(){
 nodes=new Map();collections=new Map();
 for(const selector of ['#adventure-canvas','#adv-overlay','#adv-overlay-title','#adv-overlay-copy','#adv-clock','#adv-score','#adv-primary-label','#adv-primary','#adv-secondary-label','#adv-secondary','#adv-stage','#adv-progress','#adv-notice','#tower-selection-copy','[data-adv-resume]','[data-adv-pause]','[data-adv-sound]','[data-tower-action="upgrade"]','[data-tower-action="sell"]','[data-tower-wave]'])nodes.set(selector,new Node());
 collections.set('[data-adv-key]',['left','right','jump','dash'].map(key=>{const el=new Node();el.dataset.advKey=key;return el;}));
 collections.set('[data-tower]',TOWER_TYPES.map(t=>{const el=new Node();el.dataset.tower=t.id;return el;}));
 collections.set('[data-tower-action]',['upgrade','sell'].map(type=>{const el=nodes.get(`[data-tower-action="${type}"]`);el.dataset.towerAction=type;return el;}));
 const document=new Node();document.querySelector=selector=>nodes.get(selector)||null;document.querySelectorAll=selector=>collections.get(selector)||[];document.createElement=()=>new Node();document.hidden=false;
 Object.defineProperty(globalThis,'document',{configurable:true,value:document});
 Object.defineProperty(globalThis,'window',{configurable:true,value:new Node()});
}
function fire(target,type,properties={}){const event=new Event(type,{cancelable:true});Object.assign(event,properties);target.dispatchEvent(event);}
function click(selector){fire(nodes.get(selector),'click');}
function advance(seconds){for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=.05){time+=50;const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(time);}}
Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,value:1});
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>time}});
Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,value:callback=>{const id=nextFrame++;frames.set(id,callback);return id;}});
Object.defineProperty(globalThis,'cancelAnimationFrame',{configurable:true,value:id=>frames.delete(id)});
try{
 for(const id of adventureIds){
  dom();let finished=[];
  mountAdventure(id,'endless',result=>finished.push(result),'1015');
  advance(2);
  assert.equal(nodes.get('#adv-clock').textContent,'00:00',`${id} begins paused`);
  click('[data-adv-resume]');
  if(id==='platformer'){
   fire(window,'keydown',{code:'ArrowRight',key:'ArrowRight',repeat:false});advance(.6);
   fire(window,'keyup',{code:'ArrowRight',key:'ArrowRight'});
  }else{
   for(let row=0;row<5;row++)fire(nodes.get('#adventure-canvas'),'pointerdown',{clientX:204,clientY:148+row*72});
   click('[data-tower-wave]');advance(30);
  }
  click('[data-adv-pause]');
  const pausedClock=nodes.get('#adv-clock').textContent,pausedScore=nodes.get('#adv-score').textContent;
  assert.equal(nodes.get('#adv-overlay').hidden,false);
  advance(4);
  assert.equal(nodes.get('#adv-clock').textContent,pausedClock,`${id} timer stops while paused`);
  assert.equal(nodes.get('#adv-score').textContent,pausedScore,`${id} score stops while paused`);
  click('[data-adv-resume]');advance(.2);
  fire(window,'blur');
  assert.equal(nodes.get('#adv-overlay').hidden,false,`${id} pauses on focus loss`);
  click('[data-adv-settle]');
  assert.equal(finished.length,1,`${id} settles once`);
  const result=finished[0];
  assert.equal(result.endedReason,'retired');assert.equal(result.mode,'endless');assert.equal(result.win,false);
  const run=recordRun({gameId:result.id,mode:result.mode,durationMs:Math.round(result.time*1000),outcome:'failed',metrics:result.metrics});
  assert.equal(run.score,calculateRunScore(run),`${id} wrapper result contains complete score-store metrics`);
  assert.equal(frames.size,0,`${id} finish cancels animation`);
  click('[data-adv-settle]');advance(2);
  assert.equal(finished.length,1,`${id} removed listeners prevent duplicate settlements`);
  stopAdventure();
  dom();mountAdventure(id,'shadow',()=>{throw new Error('stopped runs must not finish later');},'1015');
  click('[data-adv-resume]');stopAdventure();advance(2);
  assert.equal(frames.size,0,`${id} navigation cleanup leaves no live animation`);
 }
}finally{
 stopAdventure();
 for(const [name,descriptor] of original){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
 clearLocalRuns();
}
console.log('adventure-integration: score contracts, mode isolation, pause/resume, settlement and cleanup passed');
