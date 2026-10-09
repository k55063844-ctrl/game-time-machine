import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const sourceA=await readFile(new URL('../src/new-games-a.js',import.meta.url),'utf8');
const sourceB=await readFile(new URL('../src/new-games-b.js',import.meta.url),'utf8');
// Frozen before the skin integration, after a byte-for-byte comparison to HEAD.
// Deliberate gameplay changes should review and update these contracts separately.
for(const [source,start,end,expected] of [
  [sourceA,'function initBomb','function buildMetrics','c56cbfa97d32a15e29471fc6518554aaf94908bc51388bde1c2a0b34c3dad6f7'],
  [sourceB,'function initialiseGame','function collectMetrics','3e148f5c00ebfc1042276b4bd9a83eb259ac89eb3ba44f921ec9e60e0e34fb3b'],
  [sourceB,'function updateGame','function syncHudB','45e55fd97b2b0825062449065599adb9028c8be1c9e23e0a620b125d41a6b1c6']
]){
  const block=source.slice(source.indexOf(start),source.indexOf(end)).replace(/\r\n/g,'\n');
  assert.ok(block.startsWith(start),'simulation block is present');
  assert.equal(createHash('sha256').update(block).digest('hex'),expected,`${start}: existing game rules remain unchanged`);
  assert.doesNotMatch(block,/RoleSprite|RoleArt|movingRoleFrame/,'art cannot participate in simulation or scoring');
}

function canvas(){
  const calls=[],stack=[];
  const context=new Proxy({globalAlpha:1,
    createLinearGradient(){return {addColorStop(){}};},
    createRadialGradient(){return {addColorStop(){}};},
    save(){stack.push(this.globalAlpha);calls.push(['save']);},
    restore(){this.globalAlpha=stack.pop()??1;calls.push(['restore']);}
  },{get:(target,key)=>key==='toJSON'?undefined:key in target?target[key]:(...args)=>calls.push([key,...args])});
  return {context,calls};
}
function load(source,names){
  const calls=[],preloads=[];
  let ready=true;
  const context=vm.createContext({
    performance:{now:()=>0},
    loadRoleArt(role){preloads.push(role);return Promise.resolve(true);},
    drawRoleSprite(ctx,...args){calls.push([...args,ctx.globalAlpha??1]);return ready;},
    roleArtPreview(role){return `<figure data-role-preview="${role}">战战</figure>`;}
  });
  vm.runInContext(source.replace(/^import .*?;\r?\n/gm,'').replace(/\bexport\s+/g,'')+`\nglobalThis.api={${names.join(',')}};`,context);
  return {api:context.api,calls,preloads,setReady(value){ready=value;}};
}
const a=load(sourceA,['drawGoalie','initGoalie','updateGoalie','newGameLandingA']);
const b=load(sourceB,['drawCourier','drawStealth','initialiseGame','createBaseState','updateCourier','updateStealth','newGameLandingB']);
const freezeState=value=>{
  if(!value||typeof value!=='object')return value;
  for(const [key,child] of Object.entries(value))if(key!=='ctx')freezeState(child);
  return Object.freeze(value);
};
function stateB(id){const s=b.api.createBaseState(id,'extreme');b.api.initialiseGame(s);s.end=(win,reason)=>{s.over=true;s.reason=reason;};return s;}
function goalieState(ctx){
  const s={id:'goalie',ctx,mode:'extreme',phase:1,seed:19,keys:{},previous:{},elapsed:0,resource:100,score:0,integrity:3,chain:0};
  a.api.initGoalie(s);return s;
}

{
  const board=canvas(),s=goalieState(board.context);
  s.goalie.x=.4;s.goalie.dive=.4;s.goalie.diveDir=1;s.goalie.shot={cue:0,actual:1,timer:.2};
  freezeState(s);const before=JSON.stringify({...s,ctx:undefined});
  a.api.drawGoalie(s);
  assert.equal(JSON.stringify({...s,ctx:undefined}),before,'goalkeeper art does not modify frozen simulation state');
  assert.deepEqual(a.calls.at(-1).slice(0,7),['goalie',0,-48,-64,96,112,1]);
  assert.ok(board.calls.some(call=>call[0]==='translate'&&call[1]===454&&call[2]===330),'original keeper position is preserved');
  assert.ok(board.calls.some(call=>call[0]==='rotate'&&call[1]===.75),'original diving rotation is preserved');
  assert.ok(board.calls.some(call=>call[0]==='arc'&&call[3]===11),'the football remains drawn');
  assert.ok(!board.calls.some(call=>call[0]==='arc'&&call[1]===0&&call[2]===-44),'the old figure is suppressed only after successful sprite drawing');
  a.setReady(false);a.api.drawGoalie(s);
  assert.ok(board.calls.some(call=>call[0]==='arc'&&call[1]===0&&call[2]===-44&&call[3]===11),'missing art keeps the old goalkeeper visible');
  a.setReady(true);
}

for(const id of ['courier','stealth']){
  const board=canvas(),s=stateB(id),draw=id==='courier'?b.api.drawCourier:b.api.drawStealth;
  const states=[0,1,2,3,0,0];
  const moves=[[0,0],[3,0],[0,3],[-3,0],[0,-3],[0,0]];
  for(let i=0;i<moves.length;i++){
    s.p.x+=moves[i][0];s.p.y+=moves[i][1];const before=JSON.stringify(s);draw(board.context,s);
    assert.equal(b.calls.at(-1)[1],states[i],`${id} follows movement direction and retains idle pose`);
    assert.equal(JSON.stringify(s),before,`${id} facing memory stays outside engine state`);
  }
  s.p.x+=4;draw(board.context,s);assert.equal(b.calls.at(-1)[1],1);
  s.p.x=620;s.p.y=80;draw(board.context,s);
  s.p.x=70;s.p.y=450;draw(board.context,s);assert.equal(b.calls.at(-1)[1],0,`${id} teleport resets to forward pose`);
  const frozen=freezeState(stateB(id));draw(board.context,frozen);
  assert.equal(b.calls.at(-1)[0],id,'frozen states can be drawn without mutation');
  const dimensions=b.calls.at(-1).slice(4,6);
  assert.deepEqual(dimensions,id==='courier'?[40,48]:[40,44],`${id} remains a compact player sprite`);
}

{
  const board=canvas(),s=stateB('courier');s.invulnerable=.3;
  b.api.drawCourier(board.context,s);
  assert.equal(b.calls.at(-1).at(-1),.25,'the new vehicle retains the exact invulnerability blink');
  assert.equal(board.context.globalAlpha,1,'the vehicle blink does not leak into HUD or environment');
  b.setReady(false);b.api.drawCourier(board.context,s);
  assert.ok(board.calls.some(call=>call[0]==='fillRect'&&call[1]===-12&&call[2]===-17&&call[3]===24&&call[4]===34),'pending art keeps the original courier vehicle');
  b.setReady(true);
  const collision=stateB('courier');collision.items=[{x:338,y:283,w:24,h:34,vx:0,vy:0,near:false}];
  b.api.updateCourier(collision,0);
  assert.equal(collision.damage,66,'original 24 by 34 collision box still receives 34 damage');
  assert.equal(collision.metrics.collisions,1,'collisions still count once');
  assert.equal(collision.invulnerable,.85,'invulnerability duration remains unchanged');
  const moved=stateB('courier');moved.keys={right:true};b.api.updateCourier(moved,.1);
  assert.equal(moved.p.x,370.5,'courier movement remains 205 pixels per second');
  assert.equal(moved.metrics.deliveries,0,'moving or drawing is not a delivery');
}

{
  const board=canvas(),s=stateB('stealth');s.jammer=.15;
  b.api.drawStealth(board.context,s);
  assert.ok(board.calls.some(call=>call[0]==='arc'&&call[1]===s.p.x&&call[2]===s.p.y&&call[3]===28),'jammer range remains visible');
  assert.ok(!board.calls.some(call=>call[0]==='arc'&&call[1]===s.p.x&&call[2]===s.p.y&&call[3]===10),'old player dot is hidden when art is ready');
  b.setReady(false);b.api.drawStealth(board.context,s);
  assert.ok(board.calls.some(call=>call[0]==='arc'&&call[1]===s.p.x&&call[2]===s.p.y&&call[3]===10),'failed art preserves the player dot');
  b.setReady(true);
  for(const [distance,collides] of [[21.999,true],[22,false]]){
    const contact=stateB('stealth');contact.guards=[{x:contact.p.x+distance,y:contact.p.y,angle:0,turn:0,tagged:false}];
    b.api.updateStealth(contact,0);assert.equal(contact.over,collides,`guard collision at ${distance} preserves 22 px boundary`);
  }
  const moved=stateB('stealth');moved.keys={up:true};b.api.updateStealth(moved,.1);
  assert.equal(moved.p.y,434.5,'stealth movement remains 155 pixels per second');
  assert.equal(moved.metrics.zonesCleared,0,'moving or drawing is not a terminal completion');
}

assert.match(a.api.newGameLandingA('goalie'),/data-role-preview="goalie"/,'goalkeeper entry uses the same role art');
for(const id of ['courier','stealth'])assert.match(b.api.newGameLandingB(id),new RegExp(`data-role-preview="${id}"`),`${id} entry uses the same role art`);
for(const id of ['bomb','elevator','lighthouse'])assert.doesNotMatch(a.api.newGameLandingA(id),/data-role-preview/,'unrelated game entry stays unchanged');
for(const id of ['rhythm','weather'])assert.doesNotMatch(b.api.newGameLandingB(id),/data-role-preview/,'abstract games do not receive misleading mascots');
assert.match(sourceA,/if\(id==='goalie'\)void loadRoleArt\('goalie'\)/,'only goalkeeper mode preloads its optional art');
assert.match(sourceB,/if\(id==='courier'\|\|id==='stealth'\)void loadRoleArt\(id\)/,'only the two character games preload their optional art');
console.log('expansion-role-art: unchanged simulation, compact sprites, four-way facing, fallback, HUD effects and shared entry art passed');
