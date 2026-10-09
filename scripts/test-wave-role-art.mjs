import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const source=readFileSync(new URL('../src/wave-games.js',import.meta.url),'utf8');
const simulation=text=>{const normalized=text.replaceAll('\r\n','\n');return normalized.slice(normalized.indexOf(' const update=(dt)=>'),normalized.indexOf(' const draw=()=>'));};
assert.ok(simulation(source).length>2000,'The simulation block must be found.');
// Fixed pre-art simulation fingerprint: survives commits and source ZIPs without .git.
const gameplayBaseline='13b9b5b2c54c591f7fa83a9f9f69988716eb6b4f5e0ae3dbe90c4b0926bab3ef';
assert.equal(createHash('sha256').update(simulation(source)).digest('hex'),gameplayBaseline,'Role artwork must not change physics, collisions, spawning, timing or scores.');
assert.ok(!source.includes('s.p.ground'),'Skate presentation must read the actual root-level ground flag.');
assert.match(source,/if\(id==='skate'\|\|id==='train'\)void loadRoleArt\(id\)/);

let available=true;
const roleCalls=[],preloadCalls=[],previewCalls=[],canvasCalls=[];
const canvasContext=new Proxy({}, {
 get(target,key){
  if(key in target)return target[key];
  const method=(...args)=>{canvasCalls.push({method:key,args});if(String(key).startsWith('create'))return {addColorStop(){}};};
  target[key]=method;return method;
 },
 set(target,key,value){target[key]=value;return true;},
});
const nodes=new Map();
const makeNode=()=>({textContent:'',dataset:{},style:{},classList:{toggle(){},add(){},remove(){}}});
for(const selector of ['#wave-clock','#wave-score','#wave-resource','#wave-resource-meter','#wave-phase','#wave-progress','#wave-alert','.wave-game'])nodes.set(selector,makeNode());
nodes.set('#wave-canvas',{getContext:()=>canvasContext});
let rafId=0;
const context=vm.createContext({
 Math,console,performance:{now:()=>0},window:{devicePixelRatio:1},
 document:{querySelector:selector=>nodes.get(selector)||null,querySelectorAll:()=>[]},
 requestAnimationFrame:()=>++rafId,cancelAnimationFrame(){},clearInterval(){},addEventListener(){},removeEventListener(){},
 loadSubmarineArt:()=>Promise.resolve(false),drawSubmarinePilot:()=>false,SUBMARINE_ART_URL:'/assets/zhanzhan-submarine.png',
 loadPlaneArt:()=>Promise.resolve(false),drawPlanePilot:()=>false,drawPlaneEnemy:()=>false,PLANE_PLAYER_ART_URL:'/assets/zhanzhan-plane.png',
 loadRoleArt:role=>{preloadCalls.push(role);return Promise.resolve(available);},
 drawRoleSprite:(c,...args)=>{roleCalls.push(args);return available;},
 roleArtPreview:(role,alt)=>{previewCalls.push({role,alt});return `<div data-role-preview="${role}" role="img" aria-label="${alt}"></div>`;},
});
vm.runInContext(source.replace(/^import .+;\r?\n/gm,'').replace(/^export /gm,'')+'\nglobalThis.testWave={drawTrain,drawSkate,syncHud,waveLanding,mountWave,stopWave,getRun:()=>run};',context);
const api=context.testWave;
const resetCalls=()=>{roleCalls.length=0;canvasCalls.length=0;};
const base=id=>({id,mode:'extreme',t:180,phase:1,score:0,res:100,keys:{},p:{x:id==='train'?1:240,y:430,vx:0,vy:0},items:[],shots:[],tick:0,ground:1});

// Every visual lane center matches the actual rails at player depth, without moving its logical index.
for(const lane of [0,1,2]){
 resetCalls();available=true;
 const state=base('train');state.p.x=lane;state.items=[{x:2,y:170},{x:0,y:50}];
 const before=JSON.stringify(state);
 api.drawTrain(canvasContext,state);
 const railCenter=[330,360,390][lane]+([150,360,570][lane]-[330,360,390][lane])*((442-112)/(520-112));
 assert.deepEqual(roleCalls,[['train',0,railCenter-54,380,108,126]]);
 assert.equal(roleCalls[0][3]+roleCalls[0][5],506,'Train art must not move the lower anchor.');
 const laneLabels=canvasCalls.filter(x=>x.method==='fillText'&&/^LINE [123]$/.test(x.args[0]));
 assert.equal(laneLabels.length,3);
 assert.ok(laneLabels.every(x=>x.args[2]===516),'Lane labels sit below the player body.');
 assert.ok(!canvasCalls.some(x=>x.method==='moveTo'&&x.args[1]===474),'The old arrow must not cover the player body.');
 assert.equal(canvasCalls.filter(x=>x.method==='fillText'&&x.args[0]==='EXPRESS').length,2,'Opponent trains keep their established renderer.');
 assert.equal(canvasCalls.filter(x=>x.method==='fillText'&&x.args[0]==='TM LOCAL').length,0,'Ready art replaces, not overlays, the old player train.');
 assert.equal(JSON.stringify(state),before,'Rendering must not mutate game state.');
}
resetCalls();available=false;
api.drawTrain(canvasContext,base('train'));
assert.ok(canvasCalls.some(x=>x.method==='fillText'&&x.args[0]==='TM LOCAL'),'The player train remains visible before art is ready.');

// Ground and jump frames follow s.ground, never the non-existent s.p.ground.
for(const ground of [1,0]){
 resetCalls();available=true;
 const state=base('skate');state.ground=ground;state.p.ground=!ground;state.p.vy=ground?0:-430;
 const before=JSON.stringify(state);
 api.drawSkate(canvasContext,state);
 assert.deepEqual(roleCalls,[['skate',ground?0:1,-46,-55,92,92]]);
 assert.equal(roleCalls[0][3]+roleCalls[0][5],37,'The wheel baseline stays at player y + 37.');
 assert.ok(canvasCalls.some(x=>x.method==='translate'&&x.args[0]===240&&x.args[1]===430));
 assert.ok(canvasCalls.some(x=>x.method==='fillText'&&x.args[0]===(ground?'CONTACT / STABLE':'AIRBORNE / ALIGN')));
 assert.ok(!canvasCalls.some(x=>x.method==='arc'&&x.args[1]===-42),'Loaded sprite suppresses the old stick figure.');
 assert.equal(JSON.stringify(state),before);
 api.syncHud(state);
 assert.equal(nodes.get('#wave-alert').textContent,ground?'第一阶段 · 系统稳定':'腾空 · 校准落点');
}
resetCalls();available=false;
api.drawSkate(canvasContext,base('skate'));
assert.ok(canvasCalls.some(x=>x.method==='arc'&&x.args[1]===-42),'The original skater is kept as a loading/error fallback.');

// Other wave games must not eagerly request the new assets.
for(const id of ['plane','pinball','train','submarine','skate']){
 preloadCalls.length=0;
 api.mountWave(id,'extreme',()=>{});
 assert.deepEqual(preloadCalls,['train','skate'].includes(id)?[id]:[]);
 assert.equal(api.getRun().p.y,430);
 api.stopWave();
}
for(const role of ['skate','train']){
 const html=api.waveLanding(role);
 assert.match(html,new RegExp(`data-role-preview="${role}"`));
 assert.equal((html.match(/data-wave-mode=/g)||[]).length,4,'All mode entry points remain available.');
 assert.ok(previewCalls.at(-1).alt.includes('战战'));
}
console.log('Wave role artwork checks passed: lazy loading, previews, fallback, facing frames, ground display, anchors and unchanged gameplay.');
