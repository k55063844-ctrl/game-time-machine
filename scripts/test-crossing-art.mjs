import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

// Keep the existing 10 x 14 crossing simulation independent of its new skin.
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const start=main.indexOf('function initArcade(){');
const end=main.indexOf('\nfunction startArcadeLoop()',start);
assert.ok(start>=0&&end>start,'the original arcade simulation is available');
const board={innerHTML:''},score={textContent:''},pressure={textContent:''};
const nodes=new Map([['#arcade-board',board],['#arcade-score',score],['#arcade-pressure',pressure]]);
const state={arcadeGame:'crossing'},finished=[],artCalls=[];
const game=runInNewContext(`${main.slice(start,end)}\n({initArcade,moveArcade,arcadeStep,drawArcade});`,{
 state,
 document:{querySelector:selector=>nodes.get(selector)||null},
 stopLoop(){},
 finishArcade:won=>{finished.push(won);state.playing=false;},
 applyRacerArt(){},
 applyCrossingArt:(element,player)=>artCalls.push({element,player})
});
function reset(){
 state.arcadeGame='crossing';game.initArcade();state.playing=true;
 finished.length=0;artCalls.length=0;
}
function cells(){return [...board.innerHTML.matchAll(/<i\b[^>]*class="([^"]*)"[^>]*>/g)].map(match=>match[1]);}
function assertPlayer(x,y){
 const rendered=cells();
 assert.equal(rendered.length,140,'the board keeps its logical cell count');
 assert.equal(rendered.filter(value=>value.split(/\s+/).includes('arcade-player')).length,1,'the board has exactly one player');
 assert.ok(rendered[y*10+x].split(/\s+/).includes('arcade-player'),'the skin follows the original player cell');
 assert.ok(!board.innerHTML.includes('<img'),'the skin does not add children to rebuilt grid cells');
}

reset();
const initialState=JSON.stringify(state);game.drawArcade();
assert.equal(JSON.stringify(state),initialState,'drawing the skin does not change simulation state');
assert.equal(artCalls.length,1);assert.equal(artCalls[0].element,board);
assert.equal(artCalls[0].player,state.arcadePlayer,'the renderer receives existing logical coordinates');
assertPlayer(5,13);
game.moveArcade('down');assertPlayer(5,13);
for(let i=0;i<20;i++)game.moveArcade('left');
assert.equal(state.arcadePlayer.x,0,'the left edge stays at column 0');assertPlayer(0,13);
for(let i=0;i<20;i++)game.moveArcade('right');
assert.equal(state.arcadePlayer.x,9,'the right edge stays at column 9');assertPlayer(9,13);
game.moveArcade('up');assertPlayer(9,12);
game.moveArcade('down');assertPlayer(9,13);
game.moveArcade('left');assertPlayer(8,13);
game.moveArcade('right');assertPlayer(9,13);
assert.equal(finished.length,0);

reset();
for(let arrival=1;arrival<=12;arrival++){
 for(let row=13;row>0;row--)game.moveArcade('up');
 assert.equal(state.arcadeScore,arrival,'each completed crossing awards exactly one arrival');
 assertPlayer(5,13);
 assert.equal(state.arcadePlayer.x,5);assert.equal(state.arcadePlayer.y,13,'arrival resets to the original start');
 assert.equal(finished.length,arrival===12?1:0,'the win threshold remains twelve crossings');
}
assert.deepEqual(finished,[true]);assert.equal(score.textContent,12);
const wonState=JSON.stringify(state);game.moveArcade('left');game.arcadeStep();
assert.equal(JSON.stringify(state),wonState,'the finished run ignores movement and ticks');

for(const type of ['car','truck','ghost']){
 reset();state.arcadePlayer={x:5,y:6};state.arcadeObjects=[{x:4,y:6,type,speed:1}];game.arcadeStep();
 assert.deepEqual(finished,[false],`${type} entering the player cell still collides`);
 assert.equal(state.arcadeScore,0,'collisions do not award a crossing');
}
reset();state.arcadePlayer={x:5,y:6};state.arcadeObjects=[{x:5,y:6,type:'car',speed:1}];game.arcadeStep();
assert.equal(finished.length,0,'adjacent traffic does not collide because of the decorative sprite size');
assert.equal(state.arcadeObjects[0].x,6,'traffic keeps moving one logical cell per step');
reset();state.arcadeObjects=[{x:9,y:2,type:'car',speed:1},{x:0,y:4,type:'car',speed:-1}];game.arcadeStep();
assert.equal(state.arcadeObjects[0].x,0,'rightward traffic wraps at the original boundary');
assert.equal(state.arcadeObjects[1].x,9,'leftward traffic wraps at the original boundary');
reset();state.arcadeTick=4;game.arcadeStep();
assert.equal(state.arcadeObjects.length,6,'traffic generation still populates the six road rows');
for(const object of state.arcadeObjects){
 assert.ok([2,4,6,8,10,12].includes(object.y));
 assert.equal(object.speed,object.y%4===0?-1:1,'alternating road directions remain unchanged');
}
for(const id of ['racer','miner']){
 state.arcadeGame=id;state.arcadeObjects=[];artCalls.length=0;game.drawArcade();
 assert.equal(artCalls.length,0,`${id} never receives the crossing mascot`);
 assert.equal(cells().length,140);
}

const originalImage=Object.getOwnPropertyDescriptor(globalThis,'Image');
const originalDateNow=Date.now;
let now=1800000000000;
const images=[];
const assetURL='/assets/zhanzhan-crossing-sheet.png';
class FakeImage extends EventTarget{
 constructor(){super();this.complete=false;this.naturalWidth=0;this.naturalHeight=0;images.push(this);}
 set src(value){this.source=String(value);}
 get src(){return this.source;}
 decode(){return Promise.resolve();}
 succeed(width=1536,height=1536){
  this.complete=true;this.naturalWidth=width;this.naturalHeight=height;
  const event=new Event('load');this.onload?.(event);this.dispatchEvent(event);
 }
 fail(){
  this.complete=true;this.naturalWidth=0;this.naturalHeight=0;
  const event=new Event('error');this.onerror?.(event);this.dispatchEvent(event);
 }
}
function artBoard(){
 const classes=new Set();
 return {isConnected:true,dataset:{},classes,classList:{add:(...values)=>values.forEach(value=>classes.add(value)),remove:(...values)=>values.forEach(value=>classes.delete(value)),contains:value=>classes.has(value)}};
}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
async function fixture(name){
 const before=images.length;
 const art=await import(`../src/crossing-art.js?crossing-art-test=${name}`);
 assert.equal(art.CROSSING_ART_URL,assetURL);
 assert.equal(images.length,before,'module import is lazy');
 const board=artBoard();art.applyCrossingArt(board,{x:5,y:13});
 const requested=images.slice(before);
 assert.equal(requested.length,1,'the first board requests only one atlas');
 assert.equal(requested[0].src,assetURL);
 return {art,board,image:requested[0]};
}
try{
 Date.now=()=>now;
 delete globalThis.Image;
 const nodeArt=await import('../src/crossing-art.js?crossing-art-test=node');
 assert.equal(typeof nodeArt.applyCrossingArt,'function');
 assert.doesNotThrow(()=>nodeArt.applyCrossingArt(null,{x:5,y:13}),'missing boards are harmless');
 const fallback=artBoard();nodeArt.applyCrossingArt(fallback,{x:5,y:13});
 assert.equal(fallback.classes.has('has-crossing-art'),false,'without Image the original CSS character stays visible');

 Object.defineProperty(globalThis,'Image',{configurable:true,writable:true,value:FakeImage});
 const loaded=await fixture('loaded');
 const first=loaded.board,other=artBoard(),detached=artBoard(),unrelated=artBoard();
 loaded.art.applyCrossingArt(other,{x:5,y:13});loaded.art.applyCrossingArt(detached,{x:5,y:13});detached.isConnected=false;
 loaded.art.applyCrossingArt(first,{x:5,y:13});
 assert.equal(images.length,1,'multiple boards and redraws share the one pending atlas');
 assert.equal(first.classes.has('has-crossing-art'),false,'pending loading preserves the fallback');
 loaded.image.succeed();await settle();
 assert.equal(first.classes.has('has-crossing-art'),true,'loaded atlas enables the new character');
 assert.equal(other.classes.has('has-crossing-art'),true,'the second live board receives the shared atlas');
 assert.equal(detached.classes.size,0,'an unmounted board is not asynchronously decorated');
 assert.equal(unrelated.classes.size,0,'unrelated boards are not decorated');
 const later=artBoard();loaded.art.applyCrossingArt(later,{x:5,y:13});await settle();
 assert.equal(images.length,1,'new boards reuse the cached atlas');
 assert.equal(later.classes.has('has-crossing-art'),true);
 detached.isConnected=true;loaded.art.applyCrossingArt(detached,{x:5,y:13});await settle();
 assert.equal(detached.classes.has('has-crossing-art'),true,'reconnected boards recover cached artwork');

 const moving=artBoard();
 function facing(x,y,expected,message){
  const player=Object.freeze({x,y}),before=JSON.stringify(player);
  loaded.art.applyCrossingArt(moving,player);
  assert.equal(moving.dataset.crossingFacing,expected,message);
  assert.equal(JSON.stringify(player),before,'art rendering never mutates the logical player');
 }
 facing(5,13,'up','the initial pose faces the top of the board');
 facing(5,12,'up','a step upward uses the rear-facing pose');
 facing(6,12,'right','a step right uses the right-facing pose');
 facing(6,12,'right','traffic redraws preserve the last direction');
 facing(6,13,'down','a step down uses the front-facing pose');
 facing(5,13,'left','a step left uses the left-facing pose');
 facing(5,13,'left','a stationary boundary redraw does not reverse the character');
 facing(5,1,'up','an upward multi-row displacement still faces up');
 facing(5,13,'up','the automatic return from the finish resets the pose to up');
 facing(4,13,'left','normal movement resumes after an arrival');
 const separate=artBoard();loaded.art.applyCrossingArt(separate,{x:5,y:13});
 assert.equal(separate.dataset.crossingFacing,'up','each new board has independent direction history');
 assert.equal(moving.dataset.crossingFacing,'left');

 const failed=await fixture('failed');failed.image.fail();await settle();
 assert.equal(failed.board.classes.has('has-crossing-art'),false,'a failed atlas preserves the CSS character');
 const failedCount=images.length,lateFallback=artBoard();
 failed.art.applyCrossingArt(failed.board,{x:5,y:12});failed.art.applyCrossingArt(lateFallback,{x:5,y:13});await settle();
 assert.equal(images.length,failedCount,'failed loads are not retried immediately on every redraw');
 assert.equal(lateFallback.classes.has('has-crossing-art'),false);
 now+=2999;
 failed.art.applyCrossingArt(failed.board,{x:6,y:12});await settle();
 assert.equal(images.length,failedCount,'the full three-second cooldown prevents repeated failed requests');
 assert.equal(failed.board.dataset.crossingFacing,'right','direction updates still run during the retry cooldown');
 now+=1;
 failed.art.applyCrossingArt(failed.board,{x:6,y:12});
 failed.art.applyCrossingArt(lateFallback,{x:5,y:13});
 failed.art.applyCrossingArt(failed.board,{x:6,y:12});
 assert.equal(images.length,failedCount+1,'the first draw after the cooldown starts one shared retry');
 const recovered=images.at(-1);
 assert.equal(recovered.src,assetURL,'retry uses the same atlas URL');
 assert.equal(failed.board.classes.has('has-crossing-art'),false,'retry keeps the fallback until new pixels arrive');
 recovered.succeed();await settle();
 assert.equal(failed.board.classes.has('has-crossing-art'),true,'an existing page recovers after a formerly missing atlas is installed');
 assert.equal(lateFallback.classes.has('has-crossing-art'),true,'all connected boards waiting on the retry recover together');
 now+=6000;
 failed.art.applyCrossingArt(artBoard(),{x:5,y:13});
 assert.equal(images.length,failedCount+1,'successful retry is cached across later draws and boards');

 const empty=await fixture('empty-image');empty.image.succeed(0,0);await settle();
 assert.equal(empty.board.classes.has('has-crossing-art'),false,'a load event without image pixels keeps the fallback');
 const emptyCount=images.length;
 now+=2999;empty.art.applyCrossingArt(empty.board,{x:5,y:12});
 assert.equal(images.length,emptyCount,'a zero-pixel image receives the same retry cooldown');
 now+=1;empty.art.applyCrossingArt(empty.board,{x:5,y:12});
 assert.equal(images.length,emptyCount+1,'zero-pixel loading can retry without a page refresh');
 images.at(-1).fail();await settle();
 const repeatedFailureCount=images.length;
 now+=2999;empty.art.applyCrossingArt(empty.board,{x:5,y:12});
 assert.equal(images.length,repeatedFailureCount,'each subsequent failure starts a fresh cooldown');
 now+=1;empty.art.applyCrossingArt(empty.board,{x:5,y:12});
 assert.equal(images.length,repeatedFailureCount+1,'a later redraw can recover even after consecutive failures');
 images.at(-1).succeed();await settle();
 assert.equal(empty.board.classes.has('has-crossing-art'),true);
}finally{
 Date.now=originalDateNow;
 if(originalImage)Object.defineProperty(globalThis,'Image',originalImage);else delete globalThis.Image;
}

const css=await readFile(new URL('../src/internal-games.css',import.meta.url),'utf8');
const artRules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match=>({selector:match[1].replace(/\/\*[\s\S]*?\*\//g,'').trim(),body:match[2]})).filter(rule=>rule.selector.includes('has-crossing-art'));
assert.ok(artRules.length>0,'loaded crossing artwork has scoped presentation rules');
function splitSelectors(value){
 const result=[];let depth=0,start=0;
 for(let index=0;index<value.length;index++){
  if(value[index]==='(')depth++;else if(value[index]===')')depth--;
  else if(value[index]===','&&depth===0){result.push(value.slice(start,index).trim());start=index+1;}
 }
 result.push(value.slice(start).trim());return result;
}
for(const rule of artRules)for(const selector of splitSelectors(rule.selector)){
 assert.match(selector,/^\.crossing-game\s+#arcade-board\.has-crossing-art\b/,'every skin rule is gated to crossing only');
}
assert.ok(artRules.some(rule=>rule.body.includes(assetURL)),'the CSS uses the approved direction atlas');
assert.ok(artRules.some(rule=>/background-size\s*:\s*200%\s+200%/.test(rule.body)),'the atlas is divided into its two by two pose cells');
const posePositions={right:'100% 0',down:'0 100%',left:'100% 100%'};
for(const [direction,position] of Object.entries(posePositions)){
 const rule=artRules.find(rule=>rule.selector.includes('data-crossing-facing')&&rule.selector.includes(`"${direction}"`));
 assert.ok(rule,`${direction} has a directional sprite rule`);
 assert.equal(rule.body.match(/background-position\s*:\s*([^;}]+)/)?.[1].trim(),position,`${direction} maps to the correct two by two atlas cell`);
}
const playerBody=artRules.find(rule=>rule.selector==='.crossing-game #arcade-board.has-crossing-art .arcade-player');
assert.ok(playerBody,'the player has a scoped cell-body reset');
assert.match(playerBody.body,/box-shadow\s*:\s*none\s*!important/,'the old circular outline and glow are removed');
assert.match(playerBody.body,/border-radius\s*:\s*1px\s*!important/,'the old rounded character shape becomes a normal ground cell');
assert.match(playerBody.body,/background\s*:\s*#91ad65\s*!important/,'grass and safe cells retain their ground color behind the transparent mascot');
const roadBody=artRules.find(rule=>rule.selector.includes('.arcade-player:is('));
assert.ok(roadBody,'road cells have their own ground-color restoration');
for(const type of ['lane','car','truck','ghost'])assert.ok(roadBody.selector.includes(`.cell-${type}`),`${type} does not leave a yellow traffic-colored tile under the mascot`);
assert.match(roadBody.body,/background\s*:\s*#3e514d\s*!important/,'the original road ground remains visible behind the mascot');

if(!process.argv.includes('--skip-assets')){
 const asset=await readFile(new URL(`../public${assetURL}`,import.meta.url));
 assert.ok(asset.length>128,'the direction atlas contains image data');
 assert.equal(asset.subarray(0,8).toString('hex'),'89504e470d0a1a0a','the atlas is a PNG');
 const width=asset.readUInt32BE(16),height=asset.readUInt32BE(20);
 assert.ok(width>0&&height>0&&width%2===0&&height%2===0,'the atlas has even dimensions for its two by two layout');
}

console.log('crossing-art: scoped 4-way atlas, movement, traffic, collisions, twelve arrivals, loading, caching, fallback and bounded retry passed');
