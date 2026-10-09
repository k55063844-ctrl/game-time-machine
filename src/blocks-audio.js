const SOUND_KEY='tm:v1:blocks-sound';
const MAX_VOICES=24;
const CLEAR_NOTES=[523.25,659.25,783.99,1046.5,1318.51,1567.98];

export function createBlocksAudio(){
 let enabled=true,context=null,Context=null;
 const voices=new Set();
 try{enabled=globalThis.localStorage?.getItem(SOUND_KEY)!=='off';}catch{}
 try{Context=globalThis.AudioContext||globalThis.webkitAudioContext;}catch{}

 // Release immediately on mute/exit, including notes whose start is in the
 // future. The context stays open so a pending gesture resume can finish safely.
 function release(voice,cancel=false){
  if(voice.released)return;
  voice.released=true;voices.delete(voice);
  try{voice.oscillator.onended=null;}catch{}
  if(cancel){
   try{voice.gain.gain.cancelScheduledValues(context.currentTime);}catch{}
   try{voice.gain.gain.setValueAtTime(0,context.currentTime);}catch{}
   try{voice.oscillator.stop(0);}catch{}
  }
  try{voice.oscillator.disconnect();}catch{}
  try{voice.gain.disconnect();}catch{}
 }

 function stop(){
  for(const voice of voices)release(voice,true);
 }

 function canPlay(){
  try{return enabled&&context?.state==='running'&&!globalThis.document?.hidden;}catch{return false;}
 }

 function tone(frequency,delay,duration,volume,type,endFrequency){
  if(!canPlay())return;
  const voice={oscillator:null,gain:null,released:false};
  try{
   while(voices.size>=MAX_VOICES)release(voices.values().next().value,true);
   voice.oscillator=context.createOscillator();
   voice.gain=context.createGain();
   const start=context.currentTime+0.005+delay,end=start+duration;
   const oscillator=voice.oscillator,gain=voice.gain;
   oscillator.type=type;
   oscillator.frequency.setValueAtTime(frequency,start);
   if(endFrequency)oscillator.frequency.exponentialRampToValueAtTime(endFrequency,end);
   gain.gain.setValueAtTime(0,start);
   gain.gain.linearRampToValueAtTime(volume,start+0.005);
   gain.gain.exponentialRampToValueAtTime(0.0001,end);
   oscillator.connect(gain);gain.connect(context.destination);
   oscillator.onended=()=>release(voice);
   voices.add(voice);
   oscillator.start(start);oscillator.stop(end+0.01);
  }catch{release(voice,true);}
 }

 return {
  get enabled(){return enabled;},
  get supported(){return typeof Context==='function';},
  // Called by the game's existing click/key gestures, never by a timer or cue.
  async unlock(){
   if(!enabled||typeof Context!=='function')return false;
   try{
    if(!context)context=new Context();
    if(context.state!=='running')await context.resume();
    return enabled&&context.state==='running';
   }catch{return false;}
  },
  setEnabled(value){
   enabled=Boolean(value);
   if(!enabled)stop();
   try{globalThis.localStorage?.setItem(SOUND_KEY,enabled?'on':'off');}catch{}
  },
  land(){tone(170,0,0.095,0.085,'sine',62);},
  clear(lines){
   if(!canPlay()||!Number.isFinite(lines)||lines<1)return;
   const count=Math.min(4,Math.floor(lines));
   for(let index=0;index<count+2;index++){
    tone(CLEAR_NOTES[index],index*0.048,0.14+count*0.012,0.048,'triangle');
   }
  },
  stop
 };
}
