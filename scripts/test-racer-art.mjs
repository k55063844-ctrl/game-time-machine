import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

// Exercise the existing grid simulation without importing main.js's browser UI.
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const start=main.indexOf('function initArcade(){');
const end=main.indexOf('\nfunction startArcadeLoop()',start);
assert.ok(start>=0&&end>start,'the original arcade simulation remains available');
const board={innerHTML:''},score={textContent:''},pressure={textContent:''};
const nodes=new Map([['#arcade-board',board],['#arcade-score',score],['#arcade-pressure',pressure]]);
const state={arcadeGame:'racer'},finished=[],artCalls=[];
const game=runInNewContext(`${main.slice(start,end)}\n({initArcade,moveArcade,arcadeStep,drawArcade});`,{
 state,
 document:{querySelector:selector=>nodes.get(selector)||null},
 stopLoop(){},
 finishArcade:won=>{finished.push(won);state.playing=false;},
 applyRacerArt:element=>artCalls.push(element)
});
function reset(){
 state.arcadeGame='racer';game.initArcade();state.playing=true;
 finished.length=0;artCalls.length=0;
}
function cells(){return [...board.innerHTML.matchAll(/<i\b[^>]*class="([^"]*)"[^>]*>/g)].map(match=>match[1]);}
function assertPlayer(x){
 const rendered=cells();
 assert.equal(rendered.length,140,'the board retains its 10 by 14 logical grid');
 assert.equal(rendered.filter(value=>value.split(/\s+/).includes('arcade-player')).length,1,'exactly one cell represents the player');
 assert.ok(rendered[13*10+x].split(/\s+/).includes('arcade-player'),'visual player follows its original grid coordinate');
 assert.ok(!board.innerHTML.includes('<img'),'presentation does not add image children to rebuilt cells');
}

reset();game.drawArcade();
assert.equal(state.arcadePlayer.x,5);assert.equal(state.arcadePlayer.y,13);
assertPlayer(5);
assert.equal(artCalls.length,1,'a racer draw applies the optional art');
assert.equal(artCalls[0],board,'art is attached to the existing board');
for(let i=0;i<12;i++)game.moveArcade('left');
assert.equal(state.arcadePlayer.x,1,'left boundary is still column 1');assertPlayer(1);
for(let i=0;i<20;i++)game.moveArcade('right');
assert.equal(state.arcadePlayer.x,8,'right boundary is still column 8');assertPlayer(8);
game.moveArcade('up');game.moveArcade('down');
assert.equal(state.arcadePlayer.x,8);assert.equal(state.arcadePlayer.y,13,'racer movement remains horizontal');

for(const type of ['car','truck','ghost']){
 reset();state.arcadeObjects=[{x:5,y:12,type}];game.arcadeStep();
 assert.deepEqual(finished,[false],`${type} entering the same logical cell still ends the run`);
 assert.equal(state.arcadeScore,0,'a collision does not award an overtake');
}
reset();state.arcadeObjects=[{x:6,y:12,type:'car'}];game.arcadeStep();
assert.equal(finished.length,0,'an adjacent cell is not a collision, regardless of sprite size');
assert.equal(state.arcadeScore,0,'approaching traffic is not scored early');
game.arcadeStep();
assert.equal(finished.length,0);
assert.equal(state.arcadeScore,1,'passing beyond row 13 awards exactly one overtake');
assert.equal(state.arcadeObjects.length,0,'off-road traffic is removed');
assert.equal(score.textContent,1,'the HUD receives the simulation score');

reset();state.arcadeObjects=['car','truck','ghost','empty'].map((type,x)=>({x,y:13,type}));
game.arcadeStep();
assert.equal(state.arcadeScore,3,'only the existing traffic types award overtakes');
assert.equal(state.arcadeObjects.length,0);
for(const id of ['miner','crossing']){
 state.arcadeGame=id;state.arcadeObjects=[];artCalls.length=0;game.drawArcade();
 assert.equal(artCalls.length,0,`${id} never receives racer art`);
 assert.equal(cells().length,140);
}

// The loader must be inert in Node and must preserve the old CSS car on failure.
const originalImage=Object.getOwnPropertyDescriptor(globalThis,'Image');
const images=[];
const playerURL='/assets/zhanzhan-racer-player-rear.png';
const fleetURLs=['gold','blue','green'].map(color=>`/assets/zhanzhan-racer-traffic-${color}.png`);
const assetURLs=[playerURL,...fleetURLs];
class FakeImage extends EventTarget{
 constructor(){super();this.complete=false;this.naturalWidth=0;this.naturalHeight=0;images.push(this);}
 set src(value){this.source=String(value);}
 get src(){return this.source;}
 decode(){return Promise.resolve();}
 succeed(){
  this.complete=true;this.naturalWidth=1024;this.naturalHeight=1024;
  const event=new Event('load');this.onload?.(event);this.dispatchEvent(event);
 }
 fail(){
  this.complete=true;this.naturalWidth=0;this.naturalHeight=0;
  const event=new Event('error');this.onerror?.(event);this.dispatchEvent(event);
 }
}
function artBoard(){
 const classes=new Set();
 return {isConnected:true,classes,classList:{add:(...values)=>values.forEach(value=>classes.add(value)),remove:(...values)=>values.forEach(value=>classes.delete(value)),contains:value=>classes.has(value)}};
}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
async function loaderFixture(name){
 const before=images.length;
 const art=await import(`../src/racer-art.js?racer-art-test=${name}`);
 assert.equal(images.length,before,'importing the module does not eagerly request art');
 const board=artBoard();art.applyRacerArt(board);
 const requested=images.slice(before);
 assert.equal(requested.length,4,'the first racer board lazily requests four images');
 assert.deepEqual(requested.map(image=>image.src).sort(),[...assetURLs].sort(),'player and fleet use the four dedicated assets');
 const byURL=new Map(requested.map(image=>[image.src,image]));
 return {art,board,requested,player:byURL.get(playerURL),fleet:fleetURLs.map(url=>byURL.get(url))};
}
try{
 delete globalThis.Image;
 const nodeArt=await import('../src/racer-art.js?racer-art-test=node');
 assert.equal(typeof nodeArt.applyRacerArt,'function','art module can be imported without browser Image');
 assert.doesNotThrow(()=>nodeArt.applyRacerArt(artBoard()),'an unavailable Image API leaves the fallback usable');
 Object.defineProperty(globalThis,'Image',{configurable:true,writable:true,value:FakeImage});
 const loaded=await loaderFixture('loaded');
 const first=loaded.board,other=artBoard(),detached=artBoard(),unrelated=artBoard();
 loaded.art.applyRacerArt(other);loaded.art.applyRacerArt(detached);detached.isConnected=false;
 assert.equal(images.length,4,'all mounted boards share the same four requests');
 assert.equal(first.classes.has('has-racer-art'),false,'pending art keeps the original car visible');
 assert.equal(first.classes.has('has-racer-fleet'),false,'pending fleet keeps the original traffic visible');
 loaded.art.applyRacerArt(first);assert.equal(images.length,4,'repeated grid redraws share pending requests');
 loaded.player.succeed();await settle();
 assert.equal(first.classes.has('has-racer-art'),true,'the player activates without waiting for traffic');
 assert.equal(other.classes.has('has-racer-art'),true,'another live board receives the cached player');
 assert.equal(first.classes.has('has-racer-fleet'),false,'the player does not prematurely activate traffic');
 loaded.fleet[0].succeed();loaded.fleet[1].succeed();await settle();
 assert.equal(first.classes.has('has-racer-fleet'),false,'one missing traffic image keeps the entire fleet on its fallback');
 loaded.fleet[2].succeed();await settle();
 assert.equal(first.classes.has('has-racer-fleet'),true,'all three traffic images activate the fleet together');
 assert.equal(other.classes.has('has-racer-fleet'),true);
 assert.equal(detached.classes.size,0,'asynchronous loading never decorates an unmounted board');
 assert.equal(unrelated.classes.size,0,'a board not passed to the loader remains untouched');
 detached.isConnected=true;loaded.art.applyRacerArt(detached);
 assert.equal(detached.classes.has('has-racer-art'),true,'a reconnected board immediately recovers the cached player');
 assert.equal(detached.classes.has('has-racer-fleet'),true,'a reconnected board immediately recovers the cached fleet');
 assert.equal(images.length,4,'reconnecting an existing board does not request art again');
 const second=artBoard();loaded.art.applyRacerArt(second);await settle();
 assert.equal(images.length,4,'later boards reuse all four cached images');
 assert.equal(second.classes.has('has-racer-art'),true,'later boards receive the ready player');
 assert.equal(second.classes.has('has-racer-fleet'),true,'later boards receive the ready fleet');

 const playerFailure=await loaderFixture('player-failed');
 playerFailure.fleet.forEach(image=>image.succeed());await settle();
 assert.equal(playerFailure.board.classes.has('has-racer-fleet'),true,'traffic can activate while the player is still loading');
 assert.equal(playerFailure.board.classes.has('has-racer-art'),false);
 playerFailure.player.fail();await settle();
 assert.equal(playerFailure.board.classes.has('has-racer-art'),false,'a failed player retains its original CSS even with a ready fleet');
 const playerFallback=artBoard(),playerFailureCount=images.length;
 playerFailure.art.applyRacerArt(playerFallback);await settle();
 assert.equal(images.length,playerFailureCount,'later boards do not retry a failed player every frame');
 assert.equal(playerFallback.classes.has('has-racer-art'),false);
 assert.equal(playerFallback.classes.has('has-racer-fleet'),true);

 for(let failedIndex=0;failedIndex<3;failedIndex++){
  const failed=await loaderFixture(`traffic-failed-${failedIndex}`);
  failed.player.succeed();failed.fleet.forEach((image,index)=>index===failedIndex?image.fail():image.succeed());await settle();
  assert.equal(failed.board.classes.has('has-racer-art'),true,'a traffic failure does not suppress the player');
  assert.equal(failed.board.classes.has('has-racer-fleet'),false,'any failed traffic image preserves the full CSS fleet');
  const before=images.length,lateBoard=artBoard();
  assert.doesNotThrow(()=>failed.art.applyRacerArt(failed.board),'a subsequent redraw tolerates failed loading');
  failed.art.applyRacerArt(lateBoard);await settle();
  assert.equal(images.length,before,'failed fleet results are cached across redraws and new boards');
  assert.equal(lateBoard.classes.has('has-racer-art'),true);
  assert.equal(lateBoard.classes.has('has-racer-fleet'),false);
 }
 const allFailed=await loaderFixture('all-failed');
 allFailed.requested.forEach(image=>image.fail());await settle();
 assert.equal(allFailed.board.classes.size,0,'a completely unavailable sprite set leaves every CSS fallback intact');
}finally{
 if(originalImage)Object.defineProperty(globalThis,'Image',originalImage);else delete globalThis.Image;
}

const css=await readFile(new URL('../src/internal-games.css',import.meta.url),'utf8');
const artRules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match=>({selector:match[1].replace(/\/\*[\s\S]*?\*\//g,'').trim(),body:match[2]})).filter(rule=>/has-racer-(?:art|fleet)/.test(rule.selector));
assert.ok(artRules.length>0,'the successful-load class has a presentation rule');
function splitSelectors(value){
 const result=[];let depth=0,start=0;
 for(let index=0;index<value.length;index++){
  if(value[index]==='(')depth++;else if(value[index]===')')depth--;
  else if(value[index]===','&&depth===0){result.push(value.slice(start,index).trim());start=index+1;}
 }
 result.push(value.slice(start).trim());return result;
}
for(const rule of artRules)for(const selector of splitSelectors(rule.selector)){
 assert.match(selector,/^\.racer-game\s+#arcade-board\.has-racer-(?:art|fleet)\b/,'all mascot styling stays behind a racer-only board load gate');
}
const fleetRules=artRules.filter(rule=>rule.selector.includes('has-racer-fleet'));
assert.ok(fleetRules.length>0,'the fleet has its independent style gate');
for(const rule of fleetRules)for(const selector of splitSelectors(rule.selector)){
 assert.ok(selector.includes(':not(.arcade-player)'),'every fleet selector excludes a cell also occupied by the player');
 assert.ok(!selector.replaceAll(':not(.arcade-player)','').includes('.arcade-player'),'fleet rules never select the player positively');
 assert.ok(!/\banimation\s*:/.test(rule.body),'fleet presentation preserves the ghost car animation');
}
for(const type of ['car','truck','ghost']){
 const rules=fleetRules.filter(rule=>rule.selector.includes(`.cell-${type}`));
 assert.ok(rules.some(rule=>!rule.selector.includes('::')&&/background\s*:\s*transparent\s*!important/.test(rule.body)&&/box-shadow\s*:\s*none\s*!important/.test(rule.body)&&/transform\s*:\s*none/.test(rule.body)),`${type} resets its old body without changing grid geometry`);
 assert.ok(rules.some(rule=>rule.selector.includes('::before')&&/inset\s*:\s*auto/.test(rule.body)&&/background\s*:\s*var\(--racer-traffic-sprite\)/.test(rule.body)),`${type} replaces the old windshield with the fleet sprite`);
 assert.ok(rules.some(rule=>rule.selector.includes('::after')&&/content\s*:\s*none/.test(rule.body)),`${type} removes the old light overlay`);
}
const paintRules=fleetRules.filter(rule=>/--racer-traffic-sprite\s*:/.test(rule.body)).map(rule=>{
 const url=rule.body.match(/--racer-traffic-sprite\s*:\s*url\(['"]?([^'")]+)['"]?\)/)?.[1];
 assert.ok(fleetURLs.includes(url),'traffic paint uses one of the three approved assets');
 const columns=[...rule.selector.matchAll(/:nth-child\(([^)]+)\)/g)].map(match=>{
  assert.match(match[1],/^10n\+(?:[1-9]|10)$/,'traffic paint varies by column, never by moving row');
  return Number(match[1].split('+')[1]);
 });
 return {url,columns};
});
function paintAt(index){
 let result;
 for(const rule of paintRules)if(!rule.columns.length||rule.columns.some(column=>index>=column&&(index-column)%10===0))result=rule.url;
 return result;
}
assert.deepEqual(new Set(paintRules.map(rule=>rule.url)),new Set(fleetURLs),'all three traffic paints are used');
for(let x=0;x<10;x++)for(let y=0;y<14;y++)assert.equal(paintAt(y*10+x+1),paintAt(x+1),'a car keeps its paint when its row changes');
assert.equal(new Set(Array.from({length:10},(_,x)=>paintAt(x+1))).size,3,'the ten columns visibly distribute all three paints');
const playerRule=artRules.find(rule=>rule.selector.includes('has-racer-art')&&rule.selector.includes('::before'));
assert.ok(playerRule?.body.includes(playerURL),'the player uses the new upward-facing rear-view sprite');
assert.ok(!playerRule.body.includes('--racer-traffic-sprite'),'the player never inherits a traffic paint');

if(!process.argv.includes('--skip-assets'))for(const url of assetURLs){
 const asset=await readFile(new URL(`../public${url}`,import.meta.url));
 assert.ok(asset.length>128,`${url} exists and contains image data`);
 assert.equal(asset.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`${url} is a PNG`);
}

console.log('racer-art: scoped player/fleet, stable paint, grid movement, collisions, scoring, independent loading and fallback passed');
