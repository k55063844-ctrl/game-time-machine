import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// The skin is presentation only: test the real simulation block independently
// from image loading, then exercise the loader and renderer with browser fakes.
const source=await readFile(new URL('../src/wave-games.js',import.meta.url),'utf8');
const start=source.indexOf("if(id==='plane'){s.p.x=");
const end=source.indexOf("if(id==='pinball')",start);
assert.ok(start>=0&&end>start,'the plane simulation is available for regression checks');
const simulation=source.slice(start,end);
assert.match(simulation,/hit\(s\.p,o,14\)/,'bullet collision remains 14 px');
assert.match(simulation,/hit\(b,o,22\)/,'enemy hit detection remains 22 px');
assert.doesNotMatch(simulation,/drawPlane|loadPlane|ART_URL|naturalWidth/,'art never enters simulation rules');
const step=new Function('s','dt','mode','end',`
 const id='plane';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const hit=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<r;
 const spawn=(type,x,y,extra={})=>s.items.push({type,x,y,...extra});
 const speed=1+s.phase*.25+(mode==='shadow'?.22:0);
 s.tick+=dt;
 ${simulation}
`);
const state=()=>({p:{x:360,y:430,vx:0,vy:0},keys:{},items:[],shots:[],tick:0,phase:1,res:100,score:0,shotCooldown:0});
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-7,`${label}: ${actual} vs ${expected}`);
function simulate(s,dt=0,mode='extreme'){
 const results=[];step(s,dt,mode,win=>results.push(win));return results;
}
{
 const s=state();s.keys={right:true,up:true};simulate(s,.05);
 close(s.p.x,373,'rightward speed remains 260 px/s');
 close(s.p.y,418,'upward speed remains 240 px/s');
 s.keys={left:true,down:true};simulate(s,.05);
 close(s.p.x,360,'leftward speed remains 260 px/s');
 close(s.p.y,430,'downward speed remains 240 px/s');
 assert.equal(s.score,0,'moving or loading art never earns points');
 for(const [keys,x,y,expectedX,expectedY] of [
  [{left:true,up:true},23,31,22,30],
  [{right:true,down:true},697,489,698,490]
 ]){
  s.keys=keys;s.p.x=x;s.p.y=y;simulate(s,.05);
  assert.deepEqual([s.p.x,s.p.y],[expectedX,expectedY],'movement limits are unchanged');
 }
}
{
 const s=state();s.keys.action=true;simulate(s,.01);
 assert.equal(s.shots.length,1,'holding fire emits a shot');
 close(s.shots[0].x,360,'shots originate at the player x');
 close(s.shots[0].y,405.6,'shot offset is -20 px and speed is 440 px/s');
 close(s.res,99.66,'shooting drains 34 resource units/s');
 close(s.shotCooldown,.1,'fire interval remains 100 ms');
 simulate(s,.05);assert.equal(s.shots.length,1,'cooldown prevents frame-rate based extra shots');
 simulate(s,.051);assert.equal(s.shots.length,2,'cooldown admits the next shot');
 s.keys.action=false;const before=s.res;simulate(s,.01);
 close(s.res,before+.18,'not firing restores 18 resource units/s');
 s.res=5;s.keys.action=true;s.shotCooldown=0;s.shots=[];simulate(s,0);
 assert.equal(s.shots.length,0,'firing requires resource strictly above five');
 s.res=100;s.keys.action=false;simulate(s,.01);assert.equal(s.res,100,'resource caps at 100');
 s.res=0;s.keys.action=true;simulate(s,.01);assert.equal(s.res,0,'resource floors at zero');
}
{
 for(const [distance,collides] of [[13.999,true],[14,false],[14.001,false]]){
  const s=state();s.items=[{type:'bullet',x:360+distance,y:430,vx:0,vy:155}];
  assert.equal(simulate(s).length,collides?1:0,`bullet radius boundary ${distance}`);
  assert.equal(s.score,0,'bullet contact is not a scoring event');
 }
 for(const [distance,hits] of [[21.999,true],[22,false],[22.001,false]]){
  const s=state();s.items=[{type:'enemy',x:360+distance,y:200,vy:115}];s.shots=[{x:360,y:200}];
  simulate(s);assert.equal(s.score,hits?1:0,`enemy radius boundary ${distance}`);
  assert.equal(s.items.length,hits?0:1,'hit enemy is removed');
  assert.equal(s.shots.length,hits?0:1,'hit shot is consumed');
 }
 const s=state();s.items=[{type:'enemy',x:200,y:551,vy:115}];s.shots=[{x:200,y:-21}];simulate(s);
 assert.equal(s.items.length,0);assert.equal(s.shots.length,0);
 assert.equal(s.score,0,'off-screen misses do not earn points');
}
{
 for(const phase of [1,2,3]){
  const s=state();s.phase=phase;const dt=.25;simulate(s,dt);
  const enemies=s.items.filter(item=>item.type==='enemy');
  const bullets=s.items.filter(item=>item.type==='bullet');
  assert.equal(enemies.length,1,'spawn cadence is unaffected');
  assert.equal(bullets.length,phase,'phase controls fan bullet count');
  close(enemies[0].x,60+Math.floor(dt*97)%600,'enemy launch x remains deterministic');
  close(enemies[0].y,-15+(80+35*phase)*dt,'enemy speed is unchanged');
  bullets.forEach((bullet,index)=>{
   close(bullet.vx,(index-(phase-1)/2)*55,'fan horizontal speed is unchanged');
   close(bullet.vy,120+35*phase,'fan forward speed is unchanged');
  });
 }
}

const names=['Image','Date','performance'];
const originals=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
const install=(name,value)=>Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
const NativeDate=Date;
let now=10000;
const images=[];
class FakeImage{
 constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;images.push(this);}
 set src(value){this.url=String(value);}
 get src(){return this.url;}
 succeed(width=1536,height=1024){this.complete=true;this.naturalWidth=width;this.naturalHeight=height;this.onload?.();}
 fail(){this.complete=true;this.naturalWidth=0;this.naturalHeight=0;this.onerror?.();}
}
class ClockDate extends NativeDate{static now(){return now;}}
function canvas(){
 const calls=[];
 return {calls,context:new Proxy({
  drawImage(...args){calls.push(['drawImage',...args]);},
  save(){calls.push(['save']);},restore(){calls.push(['restore']);},
  translate(...args){calls.push(['translate',...args]);},rotate(...args){calls.push(['rotate',...args]);}
 },{get:(target,key)=>target[key]??(()=>{})})};
}
function freezeDeep(value){
 if(value&&typeof value==='object'){for(const child of Object.values(value))freezeDeep(child);Object.freeze(value);}
 return value;
}
const frozen=freezeDeep({...state(),tick:7,keys:{left:true,action:true}});
const frozenJSON=JSON.stringify(frozen);
const fresh=tag=>import(`../src/plane-art.js?plane-art-test=${tag}`);
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
const draws=board=>board.calls.filter(call=>call[0]==='drawImage');
try{
 // Importing the optional art module is safe outside a browser.
 const art=await fresh('success');
 install('Image',FakeImage);install('Date',ClockDate);install('performance',{now:()=>now});
 assert.equal(art.PLANE_PLAYER_ART_URL,'/assets/zhanzhan-plane.png');
 assert.equal(art.PLANE_ENEMY_ART_URL,'/assets/plane-enemy-fleet.png');
 const board=canvas(),before=images.length;
 const pending=art.loadPlaneArt();
 assert.equal(images.length,before+2,'player and enemy sprites load separately');
 const player=images.find(image=>image.url===art.PLANE_PLAYER_ART_URL);
 const enemy=images.find(image=>image.url===art.PLANE_ENEMY_ART_URL);
 assert.ok(player&&enemy,'both loader URLs resolve to their own image');
 assert.equal(art.drawPlanePilot(board.context,frozen),false,'pending player requests fallback');
 assert.equal(art.drawPlaneEnemy(board.context,freezeDeep({type:'enemy',x:60,y:100})),false,'pending enemy requests fallback');
 assert.equal(draws(board).length,0,'pending images are not drawn');
 const again=art.loadPlaneArt();
 assert.equal(images.length,before+2,'concurrent requests share the two loads');
 player.succeed(1024,1536);enemy.succeed(1536,1024);
 await pending;await again;await settle();
 assert.equal(art.drawPlanePilot(board.context,frozen),true,'loaded mascot replaces vector pilot');
 const pilotDraw=draws(board).at(-1);assert.equal(pilotDraw[1],player);
 pilotDraw.slice(2).forEach(value=>assert.ok(Number.isFinite(value),'player dimensions are finite'));
 const crops=new Set();
 for(const x of [60,91,140,217,310,421,550,658]){
  const item=freezeDeep({type:'enemy',x,y:42,vy:115});
  const snapshot=JSON.stringify(item);
  assert.equal(art.drawPlaneEnemy(board.context,item),true);
  const first=draws(board).at(-1);
  assert.equal(first[1],enemy);assert.equal(first.length,10,'enemies use an atlas source rectangle');
  first.slice(2).forEach(value=>assert.ok(Number.isFinite(value),'enemy dimensions are finite'));
  const crop=first.slice(2,6);crops.add(JSON.stringify(crop));
  art.drawPlaneEnemy(board.context,freezeDeep({...item,y:420}));
  assert.deepEqual(draws(board).at(-1).slice(2,6),crop,'enemy skin stays fixed while flying');
  assert.equal(JSON.stringify(item),snapshot,'enemy drawing never writes gameplay state');
 }
 assert.ok(crops.size>=2,'fleet rendering uses more than one aircraft variant');
 assert.equal(JSON.stringify(frozen),frozenJSON,'pilot drawing never writes gameplay state');
 assert.equal(images.length,before+2,'render frames reuse decoded images');
 assert.equal(board.calls.filter(call=>call[0]==='save').length,board.calls.filter(call=>call[0]==='restore').length,'drawing restores canvas state');

 const failed=await fresh('recovery'),count=images.length,failedBoard=canvas();
 const failedPending=failed.loadPlaneArt();
 const failedPlayer=images[count],workingEnemy=images[count+1];
 assert.equal(failedPlayer.url,failed.PLANE_PLAYER_ART_URL);assert.equal(workingEnemy.url,failed.PLANE_ENEMY_ART_URL);
 failedPlayer.fail();workingEnemy.succeed();await failedPending;await settle();
 assert.equal(failed.drawPlanePilot(failedBoard.context,frozen),false,'failed player keeps vector fallback');
 assert.equal(failed.drawPlaneEnemy(failedBoard.context,{type:'enemy',x:180,y:200}),true,'enemy art works despite player load failure');
 const countAfterFailure=images.length;
 for(let i=0;i<20;i++)failed.drawPlanePilot(failedBoard.context,frozen);
 assert.equal(images.length,countAfterFailure,'failed assets do not retry on every frame');
 now+=2999;failed.drawPlanePilot(failedBoard.context,frozen);
 assert.equal(images.length,countAfterFailure,'retry cooldown lasts three seconds');
 now+=2;failed.drawPlanePilot(failedBoard.context,frozen);
 assert.equal(images.length,countAfterFailure+1,'next draw retries a failed image after cooldown');
 assert.equal(images.at(-1).url,failed.PLANE_PLAYER_ART_URL,'successful enemy is not reloaded');
 images.at(-1).succeed(1024,1536);await settle();
 assert.equal(failed.drawPlanePilot(failedBoard.context,frozen),true,'late recovery replaces fallback without restarting gameplay');

 const invalid=await fresh('zero-size'),invalidStart=images.length;
 const invalidPending=invalid.loadPlaneArt();
 images[invalidStart].succeed(0,0);images[invalidStart+1].fail();await invalidPending;await settle();
 const invalidBoard=canvas();
 assert.equal(invalid.drawPlanePilot(invalidBoard.context,frozen),false,'zero-size images remain fallback');
 assert.equal(invalid.drawPlaneEnemy(invalidBoard.context,{type:'enemy',x:100,y:200}),false,'failed atlas remains fallback');
 assert.equal(draws(invalidBoard).length,0,'invalid images never reach drawImage');
}finally{
 for(const [name,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
}

assert.ok(/if\(id==='plane'\)\s*void loadPlaneArt\(\)/.test(source),'plane mount preloads art without blocking gameplay');
assert.ok(/drawPlanePilot\(c,s\)/.test(source),'player renderer is connected to the game');
assert.ok(/drawPlaneEnemy\(c,o\)/.test(source),'enemy renderer is connected to the game');
{
 // The sprite helpers use absolute game coordinates. A leftover outer translate
 // would offset aircraft twice while leaving their collision centers behind.
 const drawStart=source.indexOf('function drawPlane(c,s){');
 const drawEnd=source.indexOf('function drawPinball(c,s){',drawStart);
 assert.ok(drawStart>=0&&drawEnd>drawStart);
 let transform=[0,0];const stack=[],renderCalls=[],bulletArcs=[];
 const c=new Proxy({
  save(){stack.push([...transform]);},
  restore(){transform=stack.pop();assert.ok(transform,'canvas save/restore stays balanced');},
  translate(x,y){transform[0]+=x;transform[1]+=y;},
  arc(x,y,r){bulletArcs.push([x+transform[0],y+transform[1],r]);},
  createLinearGradient(){return {addColorStop(){}};}
 },{get:(target,key)=>target[key]??(()=>{})});
 const draw=new Function('drawPlanePilot','drawPlaneEnemy','line',`${source.slice(drawStart,drawEnd)};return drawPlane;`)(
  (ctx,s)=>{assert.deepEqual(transform,[0,0],'player helper is called in global coordinates');renderCalls.push(['player',s.p.x,s.p.y]);return true;},
  (ctx,o)=>{assert.deepEqual(transform,[0,0],'enemy helper is called in global coordinates');renderCalls.push(['enemy',o.x,o.y]);return true;},
  ()=>{}
 );
 const s=freezeDeep({...state(),items:[{type:'enemy',x:100,y:200,vy:115},{type:'bullet',x:200,y:300,vy:155}],shots:[{x:360,y:400}]});
 draw(c,s);
 assert.deepEqual(renderCalls,[['enemy',100,200],['player',360,430]],'only aircraft use sprite rendering');
 assert.ok(bulletArcs.some(([x,y,r])=>x===200&&y===304&&r===5),'bullet drawing remains unchanged and aligned');
 assert.equal(stack.length,0,'render integration restores the outer canvas state');
}
if(!process.argv.includes('--skip-assets')){
 for(const file of ['zhanzhan-plane.png','plane-enemy-fleet.png']){
  const bytes=await readFile(new URL(`../public/assets/${file}`,import.meta.url));
  assert.equal(bytes.subarray(1,4).toString(),'PNG',`${file} is a real PNG`);
  assert.ok(bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0,`${file} has valid dimensions`);
  assert.equal(bytes[25],6,`${file} has an alpha channel`);
 }
}
console.log('plane-art: movement, fire, resources, collision, scoring, atlas, fallback/recovery and state isolation passed');
