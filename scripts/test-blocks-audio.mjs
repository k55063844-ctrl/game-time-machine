import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

// The boundary double records Web Audio commands; browser acceptance exercises
// a real AudioContext separately. No production audio methods are replaced.
const source=await readFile(new URL('../src/blocks-audio.js',import.meta.url),'utf8').catch(error=>{
 if(error.code==='ENOENT')return '';
 throw error;
});

function fixture(options={}){
 const contexts=[],stored=new Map(Object.entries(options.stored||{}));
 const parameter=()=>({
  events:[],
  setValueAtTime(value,time){this.events.push({kind:'set',value,time});},
  linearRampToValueAtTime(value,time){this.events.push({kind:'linear',value,time});},
  exponentialRampToValueAtTime(value,time){this.events.push({kind:'exponential',value,time});},
  cancelScheduledValues(time){this.events.push({kind:'cancel',time});}
 });
 class AudioContext{
  constructor(){
   if(options.constructorError)throw new Error('Audio unavailable');
   this.state='suspended';this.currentTime=12;this.destination={};
   this.oscillators=[];this.gains=[];this.resumes=0;this.closes=0;contexts.push(this);
  }
  async resume(){this.resumes++;if(options.rejectResume)throw new Error('Gesture rejected');this.state='running';}
  close(){this.closes++;this.state='closed';}
  createOscillator(){
   if(options.nodeError)throw new Error('Audio device failed');
   const node={frequency:parameter(),type:'sine',starts:[],stops:[],connections:[],disconnects:0,onended:null,
    connect(target){this.connections.push(target);},disconnect(){this.disconnects++;},
    start(time=0){this.starts.push(time);},stop(time=0){this.stops.push(time);},
    finish(){this.onended?.();}
   };
   this.oscillators.push(node);return node;
  }
  createGain(){
   if(options.gainError)throw new Error('Gain unavailable');
   const node={gain:parameter(),connections:[],disconnects:0,
    connect(target){this.connections.push(target);},disconnect(){this.disconnects++;}
   };
   this.gains.push(node);return node;
  }
 }
 const sandbox={document:{hidden:false},localStorage:{
  getItem(key){if(options.storageError)throw new Error('Storage blocked');return stored.get(key)??null;},
  setItem(key,value){if(options.storageError)throw new Error('Storage blocked');stored.set(key,String(value));}
 }};
 if(!options.unsupported)sandbox[options.webkit?'webkitAudioContext':'AudioContext']=AudioContext;
 runInNewContext(`${source.replace('export function createBlocksAudio','function createBlocksAudio')}\nthis.factory=typeof createBlocksAudio==='function'?createBlocksAudio:undefined;`,sandbox);
 assert.equal(typeof sandbox.factory,'function','the blocks audio module must export createBlocksAudio');
 return {audio:sandbox.factory(),contexts,stored,sandbox,options};
}

test('cues and preference changes never create a context before gesture unlock',()=>{
 const {audio,contexts}=fixture();
 assert.equal(audio.enabled,true);assert.equal(audio.supported,true);
 audio.land();audio.clear(4);audio.stop();audio.setEnabled(false);audio.setEnabled(true);
 assert.equal(contexts.length,0);
});

test('unlock reuses one context and resumes it after browser suspension',async()=>{
 const {audio,contexts}=fixture();
 assert.equal(await audio.unlock(),true);assert.equal(await audio.unlock(),true);
 assert.equal(contexts.length,1);assert.equal(contexts[0].resumes,1);
 contexts[0].state='suspended';assert.equal(await audio.unlock(),true);
 assert.equal(contexts.length,1);assert.equal(contexts[0].resumes,2);
});

test('webkit AudioContext fallback can unlock and play',async()=>{
 const {audio,contexts}=fixture({webkit:true});
 assert.equal(audio.supported,true);await audio.unlock();audio.land();
 assert.ok(contexts[0].oscillators.length>0);
});

test('unsupported browsers safely ignore every audio operation',async()=>{
 const {audio,contexts}=fixture({unsupported:true});
 assert.equal(audio.supported,false);assert.equal(await audio.unlock(),false);
 assert.doesNotThrow(()=>{audio.land();audio.clear(4);audio.stop();audio.setEnabled(false);});
 assert.equal(contexts.length,0);
});

test('a stored mute prevents unlock and cues until explicitly enabled',async()=>{
 const {audio,contexts,stored}=fixture({stored:{'tm:v1:blocks-sound':'off'}});
 assert.equal(audio.enabled,false);assert.equal(await audio.unlock(),false);
 audio.land();audio.clear(2);assert.equal(contexts.length,0);
 audio.setEnabled(true);assert.equal(stored.get('tm:v1:blocks-sound'),'on');
 assert.equal(contexts.length,0);await audio.unlock();audio.land();
 assert.ok(contexts[0].oscillators.length>0);
 audio.setEnabled(false);assert.equal(stored.get('tm:v1:blocks-sound'),'off');
});

test('stored on and unknown preference values preserve the enabled default',()=>{
 for(const value of ['on','unexpected',''])assert.equal(fixture({stored:{'tm:v1:blocks-sound':value}}).audio.enabled,true);
});

test('blocked storage still allows session-only audio controls',async()=>{
 const {audio,contexts}=fixture({storageError:true});
 assert.equal(audio.enabled,true);await audio.unlock();audio.land();
 assert.doesNotThrow(()=>audio.setEnabled(false));assert.equal(audio.enabled,false);
 assert.ok(contexts[0].oscillators.every(node=>node.disconnects>0));
 audio.setEnabled(true);assert.equal(audio.enabled,true);
});

test('a denied localStorage property does not break construction or toggling',()=>{
 const {sandbox}=fixture();
 Object.defineProperty(sandbox,'localStorage',{get(){throw new Error('SecurityError');}});
 const audio=sandbox.factory();assert.equal(audio.enabled,true);
 assert.doesNotThrow(()=>audio.setEnabled(false));assert.equal(audio.enabled,false);
});

test('rejected resume stays silent and can retry on the next gesture',async()=>{
 const {audio,contexts,options}=fixture({rejectResume:true});
 assert.equal(await audio.unlock(),false);audio.land();audio.clear(4);
 assert.equal(contexts[0].oscillators.length,0);
 options.rejectResume=false;assert.equal(await audio.unlock(),true);audio.land();
 assert.equal(contexts.length,1);assert.ok(contexts[0].oscillators.length>0);
});

test('AudioContext constructor failure never escapes into gameplay',async()=>{
 const {audio}=fixture({constructorError:true});
 assert.equal(await audio.unlock(),false);
 assert.doesNotThrow(()=>{audio.land();audio.clear(3);audio.stop();});
});

test('hidden documents and suspended contexts cannot schedule cues',async()=>{
 const {audio,contexts,sandbox}=fixture();await audio.unlock();
 sandbox.document.hidden=true;audio.land();audio.clear(4);
 assert.equal(contexts[0].oscillators.length,0);
 sandbox.document.hidden=false;contexts[0].state='suspended';audio.land();audio.clear(4);
 assert.equal(contexts[0].oscillators.length,0);
 contexts[0].state='running';audio.land();assert.ok(contexts[0].oscillators.length>0);
});

test('landing is a short low knock and clears are ascending brighter notes',async()=>{
 const {audio,contexts}=fixture();await audio.unlock();audio.land();
 const context=contexts[0],landing=[...context.oscillators];
 assert.ok(landing.length>0&&landing.length<=2);
 assert.ok(landing.every(node=>node.frequency.events[0].value<300));
 assert.ok(landing.every(node=>node.stops[0]-node.starts[0]<=0.18));
 const summaries=[];
 for(const lines of [1,2,3,4]){
  const start=context.oscillators.length;audio.clear(lines);
  const notes=context.oscillators.slice(start);
  assert.ok(notes.length>=3&&notes.length<=8,'clear cue stays compact');
  assert.ok(notes.every(node=>node.frequency.events[0].value>300));
  assert.ok(notes.some(node=>node.starts[0]>context.currentTime),'arpeggio schedules future notes');
  const ascending=notes.filter((node,index)=>!index||node.starts[0]>notes[index-1].starts[0]);
  assert.ok(ascending.every((node,index)=>!index||node.frequency.events[0].value>ascending[index-1].frequency.events[0].value));
  summaries.push(notes.length);audio.stop();
 }
 assert.ok(summaries[3]>summaries[0],'four lines have a richer cue than one line');
 assert.ok(new Set(summaries).size>=3,'line counts give distinct cue lengths');
});

test('stop immediately cancels both sounding and queued notes without closing context',async()=>{
 const {audio,contexts}=fixture();await audio.unlock();audio.land();audio.clear(4);
 const context=contexts[0];assert.ok(context.oscillators.some(node=>node.starts[0]>context.currentTime));
 audio.stop();
 for(const node of context.oscillators){
  assert.ok(node.stops.some(time=>time<=context.currentTime),'every oscillator receives an immediate stop');
  assert.ok(node.disconnects>0,'oscillator is disconnected immediately');
 }
 assert.ok(context.gains.every(node=>node.disconnects>0));assert.equal(context.closes,0);
 const count=context.oscillators.length;await audio.unlock();audio.land();
 assert.equal(contexts.length,1);assert.ok(context.oscillators.length>count);
});

test('muting stops existing voices and blocks all further cues',async()=>{
 const {audio,contexts}=fixture();await audio.unlock();audio.clear(4);
 const context=contexts[0],count=context.oscillators.length;audio.setEnabled(false);
 assert.ok(context.oscillators.every(node=>node.disconnects>0));
 audio.land();audio.clear(1);assert.equal(context.oscillators.length,count);
});

test('ended voices release their nodes and do not accumulate in later stop calls',async()=>{
 const {audio,contexts}=fixture();await audio.unlock();
 const context=contexts[0];
 for(let cue=0;cue<40;cue++){
  const start=context.oscillators.length;audio.clear(4);
  for(const node of context.oscillators.slice(start))node.finish();
 }
 assert.ok(context.oscillators.every(node=>node.disconnects===1));
 assert.ok(context.gains.every(node=>node.disconnects===1));
 const stopCounts=context.oscillators.map(node=>node.stops.length);audio.stop();
 assert.deepEqual(context.oscillators.map(node=>node.stops.length),stopCounts,'completed voices are no longer retained');
 audio.land();assert.equal(context.oscillators.filter(node=>!node.disconnects).length,1);
});

test('a burst of cues keeps the number of connected voices bounded',async()=>{
 const {audio,contexts}=fixture();await audio.unlock();
 for(let cue=0;cue<50;cue++)audio.clear(4);
 const context=contexts[0];
 assert.ok(context.oscillators.filter(node=>!node.disconnects).length<=24);
 audio.stop();assert.ok(context.oscillators.every(node=>node.disconnects>0));
});

test('node creation failure never escapes and releases a partially created voice',async()=>{
 for(const options of [{nodeError:true},{gainError:true}]){
  const {audio,contexts}=fixture(options);await audio.unlock();
  assert.doesNotThrow(()=>{audio.land();audio.clear(4);audio.stop();});
  assert.ok(contexts[0].oscillators.every(node=>node.disconnects>0));
 }
});

test('invalid clear counts do not create a cue or permit unbounded scheduling',async()=>{
 const {audio,contexts}=fixture();await audio.unlock();
 for(const lines of [0,-1,NaN,Infinity,undefined,'four'])audio.clear(lines);
 assert.equal(contexts[0].oscillators.length,0);
 audio.clear(1000);assert.ok(contexts[0].oscillators.length<=8);
});
