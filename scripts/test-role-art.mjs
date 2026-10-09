import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const roles=['skate','goalie','courier','stealth','train'];
const originalImage=Object.getOwnPropertyDescriptor(globalThis,'Image');
const originalDate=Object.getOwnPropertyDescriptor(globalThis,'Date');
const NativeDate=Date;
let now=10000;
const images=[];
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-8,`${label}: ${actual} vs ${expected}`);
const fresh=tag=>import(`../src/role-art.js?role-art-test=${tag}`);
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
class ClockDate extends NativeDate{static now(){return now;}}
class FakeImage{
 constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;images.push(this);}
 set src(value){this.url=String(value);}
 get src(){return this.url;}
 succeed(width,height){this.complete=true;this.naturalWidth=width;this.naturalHeight=height;this.onload?.();}
 fail(){this.complete=true;this.naturalWidth=0;this.naturalHeight=0;this.onerror?.();}
}
function canvas(){
 const calls=[],stack=[];
 const ctx={
  imageSmoothingEnabled:false,imageSmoothingQuality:'low',
  save(){calls.push(['save']);stack.push([this.imageSmoothingEnabled,this.imageSmoothingQuality]);},
  restore(){calls.push(['restore']);assert.ok(stack.length,'restore has a matching save');[this.imageSmoothingEnabled,this.imageSmoothingQuality]=stack.pop();},
  drawImage(...args){calls.push(['drawImage',...args]);}
 };
 return {ctx,calls,stack,draws:()=>calls.filter(call=>call[0]==='drawImage').map(call=>call.slice(1))};
}
const invalidRoles=['missing-role','constructor','toString','__proto__',null,undefined];
try{
 // Import and optional rendering must be safe without browser globals.
 delete globalThis.Image;
 const art=await fresh('main');
 assert.deepEqual(Object.keys(art.ROLE_ART).sort(),[...roles].sort(),'all five requested roles have art');
 const nodeCanvas=canvas();
 assert.equal(await art.loadRoleArt('skate'),false,'Node can skip optional image loading');
 assert.equal(art.drawRoleSprite(nodeCanvas.ctx,'skate',0,10,20,80,90),false,'Node requests vector fallback');
 assert.equal(nodeCanvas.calls.length,0,'Node fallback does not touch canvas state');

 for(const role of roles){
  const config=art.ROLE_ART[role];
  const png=await readFile(new URL(`../public${config.url}`,import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10],`${role} is a PNG`);
  assert.equal(png.subarray(12,16).toString(),'IHDR',`${role} has a PNG header`);
  assert.equal(png.readUInt32BE(16),config.width,`${role} source width matches metadata`);
  assert.equal(png.readUInt32BE(20),config.height,`${role} source height matches metadata`);
  assert.equal(png[24],8,`${role} uses 8-bit channel depth`);
  assert.equal(png[25],6,`${role} is truecolor RGBA, preserving transparency`);
  assert.ok(config.frames.length>0&&config.frames.length<=config.columns*config.rows);
  assert.ok(Number.isInteger(config.previewFrame)&&config.previewFrame>=0&&config.previewFrame<config.frames.length);
  const cellW=config.width/config.columns,cellH=config.height/config.rows;
  config.frames.forEach((frame,index)=>{
   assert.equal(frame.length,4,`${role} frame ${index} has four crop coordinates`);
   assert.ok(frame.every(Number.isFinite),`${role} frame ${index} is finite`);
   const [x,y,w,h]=frame,col=index%config.columns,row=Math.floor(index/config.columns);
   assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=config.width&&y+h<=config.height,`${role} frame ${index} stays inside its bitmap`);
   assert.ok(x>=col*cellW&&y>=row*cellH&&x+w<=(col+1)*cellW&&y+h<=(row+1)*cellH,`${role} frame ${index} never samples a neighboring pose`);
  });
  const preview=art.roleArtPreview(role);
  assert.ok(preview.includes(`viewBox="${config.frames[config.previewFrame].join(' ')}"`),`${role} preview uses its documented crop`);
  assert.ok(preview.includes(`href="${config.url}"`),`${role} preview reuses the same bitmap`);
 }
 for(const role of ['courier','stealth']){
  assert.equal(art.ROLE_ART[role].previewFrame,2,`${role} landing preview uses front-facing frame 2`);
  assert.equal(art.ROLE_ART[role].align,'center');
 }
 for(const role of ['skate','goalie','train'])assert.equal(art.ROLE_ART[role].align,'bottom',`${role} uses a grounded bottom anchor`);
 const untrusted='战战 & <tag x="1">\'</tag>';
 const safe=art.roleArtPreview('courier',untrusted);
 assert.ok(safe.includes('aria-label="战战 &amp; &lt;tag x=&quot;1&quot;&gt;&#39;&lt;/tag&gt;"'),'preview escapes every HTML-sensitive character in alt text');
 assert.ok(!safe.includes('<tag'),'alt text cannot create markup');

 Object.defineProperty(globalThis,'Image',{configurable:true,writable:true,value:FakeImage});
 Object.defineProperty(globalThis,'Date',{configurable:true,writable:true,value:ClockDate});
 assert.equal(images.length,0,'importing and previewing never start image requests');
 for(const role of invalidRoles){
  const unknownLoad=art.loadRoleArt(role);
  assert.equal(images.length,0,`unknown role ${String(role)} never requests an image`);
  assert.equal(await unknownLoad,false,`unknown role ${String(role)} safely declines loading`);
  assert.equal(art.drawRoleSprite(nodeCanvas.ctx,role,0,10,20,80,90),false,`unknown role ${String(role)} safely declines drawing`);
  assert.equal(art.roleArtPreview(role),'',`unknown role ${String(role)} produces no markup`);
 }
 assert.equal(images.length,0,'unknown roles do not start image requests');

 const loads=[];
 for(const role of roles){
  const before=images.length,config=art.ROLE_ART[role],board=canvas();
  assert.equal(art.drawRoleSprite(board.ctx,role,0,0,0,100,100),false,`${role} starts lazy loading and falls back`);
  assert.equal(images.length,before+1,`${role} creates exactly one image`);
  assert.equal(images.at(-1).url,config.url,`${role} uses its own source URL`);
  const load=art.loadRoleArt(role),same=art.loadRoleArt(role);loads.push(load,same);
  assert.equal(load,same,`${role} concurrent callers share the pending promise`);
  for(let i=0;i<10;i++)assert.equal(art.drawRoleSprite(board.ctx,role,0,0,0,100,100),false);
  assert.equal(images.length,before+1,`${role} pending frames do not repeat requests`);
  assert.equal(board.calls.length,0,`${role} pending fallback does not alter canvas`);
  images.at(-1).succeed(config.width,config.height);
 }
 assert.ok((await Promise.all(loads)).every(Boolean),'each independent role loads successfully');
 await settle();

 for(const role of roles){
  const config=art.ROLE_ART[role],board=canvas(),x=123,y=234,width=86,height=96;
  const envelopeW=Math.max(...config.frames.map(frame=>frame[2]));
  const envelopeH=Math.max(...config.frames.map(frame=>frame[3]));
  const expectedScale=Math.min(width/envelopeW,height/envelopeH);
  const image=images.find(item=>item.url===config.url);
  for(let index=0;index<config.frames.length;index++){
   assert.equal(art.drawRoleSprite(board.ctx,role,index,x,y,width,height),true,`${role} frame ${index} renders`);
   const args=board.draws().at(-1);
   assert.equal(args.length,9,'tight crop rendering uses nine drawImage arguments');
   assert.equal(args[0],image);
   assert.deepEqual(args.slice(1,5),config.frames[index],`${role} samples the requested pose`);
   const [,sx,sy,sw,sh,dx,dy,dw,dh]=args;
   assert.ok(args.slice(1).every(Number.isFinite));
   close(dw/sw,expectedScale,`${role} uses a common horizontal scale across poses`);
   close(dh/sh,expectedScale,`${role} preserves aspect ratio and a common vertical scale`);
   close(dx+dw/2,x+width/2,`${role} remains horizontally centered`);
   if(config.align==='bottom')close(dy+dh,y+height,`${role} maintains its fixed bottom anchor`);
   else close(dy+dh/2,y+height/2,`${role} remains vertically centered`);
   assert.ok(dx>=x-1e-8&&dy>=y-1e-8&&dx+dw<=x+width+1e-8&&dy+dh<=y+height+1e-8,`${role} fits its destination box`);
   assert.ok(sx+sw<=image.naturalWidth&&sy+sh<=image.naturalHeight);
  }
  for(const [frame,expected] of [[-1,0],[NaN,0],[undefined,0],[.9,0],[999,config.frames.length-1]]){
   art.drawRoleSprite(board.ctx,role,frame,x,y,width,height);
   assert.deepEqual(board.draws().at(-1).slice(1,5),config.frames[expected],`${role} safely clamps frame ${String(frame)}`);
  }
  assert.equal(board.ctx.imageSmoothingEnabled,false,'drawing restores prior smoothing setting');
  assert.equal(board.ctx.imageSmoothingQuality,'low','drawing restores prior smoothing quality');
  assert.equal(board.stack.length,0,'all canvas saves are restored');
  assert.equal(board.calls.filter(call=>call[0]==='save').length,board.calls.filter(call=>call[0]==='restore').length);
  const before=board.calls.length;
  for(const box of [[NaN,0,100,100],[0,Infinity,100,100],[0,0,0,100],[0,0,100,-1],[0,0,NaN,100]]){
   assert.equal(art.drawRoleSprite(board.ctx,role,0,...box),false,'invalid geometry requests fallback');
  }
  assert.equal(board.calls.length,before,'invalid geometry never changes canvas state');
 }
 const allLoaded=images.length;
 for(let i=0;i<20;i++)for(const role of roles)assert.equal(await art.loadRoleArt(role),true);
 assert.equal(images.length,allLoaded,'successful assets stay cached indefinitely');

 const recovery=await fresh('recovery'),offset=images.length;
 const pending=['skate','courier','stealth'].map(role=>recovery.loadRoleArt(role));
 images[offset].fail();
 for(let i=1;i<3;i++){const config=recovery.ROLE_ART[['skate','courier','stealth'][i]];images[offset+i].succeed(config.width,config.height);}
 assert.deepEqual(await Promise.all(pending),[false,true,true],'one failed character never blocks unrelated roles');
 await settle();const recoveryCanvas=canvas(),afterFailure=images.length;
 assert.equal(recovery.drawRoleSprite(recoveryCanvas.ctx,'skate',0,0,0,100,100),false,'failed role keeps the vector fallback');
 assert.equal(recovery.drawRoleSprite(recoveryCanvas.ctx,'courier',0,0,0,100,100),true,'other roles remain drawable');
 now+=2999;
 for(let i=0;i<20;i++){await recovery.loadRoleArt('skate');recovery.drawRoleSprite(recoveryCanvas.ctx,'skate',0,0,0,100,100);}
 assert.equal(images.length,afterFailure,'failure is throttled for the complete three-second cooldown');
 now+=1;
 assert.equal(recovery.drawRoleSprite(recoveryCanvas.ctx,'skate',0,0,0,100,100),false,'first later draw starts a retry without blocking');
 assert.equal(images.length,afterFailure+1,'only the failed role is retried');
 assert.equal(images.at(-1).url,recovery.ROLE_ART.skate.url);
 const retry=recovery.loadRoleArt('skate');
 for(let i=0;i<5;i++)recovery.drawRoleSprite(recoveryCanvas.ctx,'skate',0,0,0,100,100);
 assert.equal(images.length,afterFailure+1,'retry shares the same pending image');
 const cfg=recovery.ROLE_ART.skate;images.at(-1).succeed(cfg.width,cfg.height);assert.equal(await retry,true);
 assert.equal(recovery.drawRoleSprite(recoveryCanvas.ctx,'skate',0,0,0,100,100),true,'late recovery replaces fallback without restarting the game');

 const invalid=await fresh('invalid-image'),invalidPending=invalid.loadRoleArt('train');
 images.at(-1).succeed(0,0);assert.equal(await invalidPending,false,'zero-size decoded images are not accepted');
 const invalidCanvas=canvas();
 assert.equal(invalid.drawRoleSprite(invalidCanvas.ctx,'train',0,0,0,100,100),false);
 assert.equal(invalidCanvas.calls.length,0,'zero-size bitmap never reaches drawImage');

 const resized=await fresh('resized-bitmap'),resizedPending=resized.loadRoleArt('courier');
 const resizedConfig=resized.ROLE_ART.courier;
 images.at(-1).succeed(resizedConfig.width*2,resizedConfig.height*2);assert.equal(await resizedPending,true);
 const scaledCanvas=canvas();resized.drawRoleSprite(scaledCanvas.ctx,'courier',2,10,20,80,100);
 assert.deepEqual(scaledCanvas.draws()[0].slice(1,5),resizedConfig.frames[2].map(value=>value*2),'source crops scale with actual decoded bitmap dimensions');
}finally{
 if(originalImage)Object.defineProperty(globalThis,'Image',originalImage);else delete globalThis.Image;
 if(originalDate)Object.defineProperty(globalThis,'Date',originalDate);else delete globalThis.Date;
}
console.log('role-art: PNG/RGBA, frame bounds, lazy cache, isolated failure/retry, common scale, anchors, canvas state, previews and safe roles passed');
