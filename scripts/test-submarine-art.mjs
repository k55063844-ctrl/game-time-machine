import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mountWave,stopWave} from '../src/wave-games.js';

// Importing the game above must remain safe in Node, where Image does not exist.
// The art is optional presentation; loading it must not change the simulation.
const source=await readFile(new URL('../src/wave-games.js',import.meta.url),'utf8');
const updateStart=source.indexOf("if(id==='submarine'){s.p.x=");
const updateEnd=source.indexOf("if(id==='skate')",updateStart);
assert.ok(updateStart>=0&&updateEnd>updateStart,'submarine simulation remains available');
const submarineUpdate=source.slice(updateStart,updateEnd);
assert.match(submarineUpdate,/hit\(s\.p,o,23\)/,'art replacement preserves the 23 px collision radius');
assert.match(submarineUpdate,/if\(!o\.done&&o\.x<0\)\{o\.done=1;s\.score\+\+\}/,'only avoided mines award points');

const globalNames=['window','document','Image','performance','requestAnimationFrame','cancelAnimationFrame','addEventListener','removeEventListener'];
const original=new Map(globalNames.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
const install=(name,value)=>Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
let now=0,nextFrame=1,simulationSeconds=0;
const frames=new Map(),listeners=new Map(),images=[],arcs=[],imageDraws=[];
const gradient={addColorStop(){}};
const context=new Proxy({
 createLinearGradient:()=>gradient,
 createRadialGradient:()=>gradient,
 arc(...args){arcs.push(args);},
 drawImage(...args){imageDraws.push(args);}
},{get:(target,key)=>target[key]??(()=>{})});
const node=()=>({dataset:{},style:{},textContent:'',classList:{add(){},remove(){},toggle(){}}});
const canvas={...node(),getContext:()=>context};
const nodes=new Map([
 ['#wave-canvas',canvas],['.wave-game',node()],
 ...['clock','score','resource','resource-meter','phase','progress','alert'].map(id=>[`#wave-${id}`,node()])
]);
const controls=['left','right','up','down','action'].map(key=>({...node(),dataset:{waveKey:key}}));
class FakeImage extends EventTarget{
 constructor(){super();this.complete=false;this.naturalWidth=0;this.naturalHeight=0;images.push(this);}
 set src(value){this.source=String(value);}
 get src(){return this.source;}
 succeed(){
  this.complete=true;this.naturalWidth=1024;this.naturalHeight=768;
  const event=new Event('load');this.onload?.(event);this.dispatchEvent(event);
 }
 fail(){
  this.complete=true;this.naturalWidth=0;this.naturalHeight=0;
  const event=new Event('error');this.onerror?.(event);this.dispatchEvent(event);
 }
}
function fireKey(type,key){
 const event={key,preventDefault(){}};
 for(const listener of listeners.get(type)||[])listener(event);
}
function advance(seconds){
 let remaining=seconds;
 while(remaining>1e-9){
  const step=Math.min(.01,remaining);remaining-=step;now+=step*1000;simulationSeconds+=step;
  arcs.length=0;
  const pending=[...frames.values()];frames.clear();
  for(const callback of pending)callback(now);
 }
}
function position(){
 const ring=arcs.find(args=>args[2]===80);
 assert.ok(ring,'passive sonar remains centered on the player');
 return {x:ring[0],y:ring[1]};
}
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-6,`${message}: ${actual} vs ${expected}`);
function assertResource(pulses){
 const expected=Math.round(100-simulationSeconds*1.9-pulses*6);
 assert.equal(nodes.get('#wave-resource').textContent,`${expected}%`,'battery drain and sonar cost remain unchanged');
}

install('window',{devicePixelRatio:2});
install('document',{
 querySelector:selector=>nodes.get(selector)||null,
 querySelectorAll:selector=>selector==='[data-wave-key]'?controls:[]
});
install('Image',FakeImage);
install('performance',{now:()=>now});
install('requestAnimationFrame',callback=>{const id=nextFrame++;frames.set(id,callback);return id;});
install('cancelAnimationFrame',id=>frames.delete(id));
install('addEventListener',(type,listener)=>{if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(listener);});
install('removeEventListener',(type,listener)=>listeners.get(type)?.delete(listener));

try{
 const finished=[];
 mountWave('submarine','endless',result=>finished.push(result));
 assert.equal(images.length,1,'mount preloads one cached submarine sprite');
 assert.ok(images[0].src,'sprite receives an asset URL');
 assert.equal(canvas.width,1440,'logical gameplay size keeps the existing DPR transform');
 assert.equal(canvas.height,1040);
 advance(.01);
 assert.equal(imageDraws.length,0,'loading images are not drawn');
 assert.deepEqual(position(),{x:360,y:430},'vector fallback keeps the original player anchor');

 images[0].succeed();
 advance(.01);
 assert.ok(imageDraws.length>0,'decoded art replaces the player drawing');
 assert.equal(imageDraws.at(-1)[0],images[0]);
 for(const value of imageDraws.at(-1).slice(1))assert.ok(Number.isFinite(value),'sprite coordinates are finite');

 fireKey('keydown','ArrowRight');fireKey('keydown','ArrowUp');advance(.25);
 fireKey('keyup','ArrowRight');fireKey('keyup','ArrowUp');
 close(position().x,405,'horizontal movement remains 180 px/s');
 close(position().y,390,'vertical movement remains 160 px/s');
 assertResource(0);
 assert.equal(nodes.get('#wave-score').textContent,0,'loading and moving do not award points');

 fireKey('keydown',' ');advance(.01);assertResource(1);
 assert.equal(nodes.get('#wave-alert').textContent,'主动声呐已发射','sonar still updates the HUD');
 advance(.1);assertResource(1);
 fireKey('keyup',' ');advance(.01);
 fireKey('keydown',' ');advance(.01);assertResource(2);
 fireKey('keyup',' ');
 assert.equal(images.length,1,'frames reuse the preloaded image');
 assert.equal(finished.length,0,'art loading never settles or restarts the run');

 stopWave();
 assert.equal(frames.size,0,'stopWave cancels its animation frame');
 assert.equal(listeners.get('keydown').size,0,'stopWave removes the keyboard-down listener');
 assert.equal(listeners.get('keyup').size,0,'stopWave removes the keyboard-up listener');
 const drawsAtStop=imageDraws.length;advance(.1);
 assert.equal(imageDraws.length,drawsAtStop,'a stopped run does not render later');

 // A separate module instance isolates the failure cache from the successful run.
 const failedArt=await import('../src/submarine-art.js?submarine-art-test=failed');
 const imageCount=images.length;
 const pending=failedArt.loadSubmarineArt();
 assert.equal(images.length,imageCount+1,'isolated loader creates an image');
 const state={p:{x:360,y:430},tick:0,keys:{}};
 assert.equal(failedArt.drawSubmarinePilot(context,state),false,'pending art requests vector fallback');
 images.at(-1).fail();
 if(pending&&typeof pending.then==='function')await pending.catch(()=>{});
 const drawsBeforeFailure=imageDraws.length;
 assert.doesNotThrow(()=>assert.equal(failedArt.drawSubmarinePilot(context,state),false),'failed art requests vector fallback without throwing');
 assert.equal(imageDraws.length,drawsBeforeFailure,'a broken image is never sent to drawImage');
}finally{
 stopWave();
 for(const [name,descriptor] of original){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
}

console.log('submarine-art: lazy loading, fallback, movement, sonar, scoring and cleanup passed');
