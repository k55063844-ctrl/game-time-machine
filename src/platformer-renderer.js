// A hand-built, resolution-independent illustrated world. Rendering never changes game state.
const W = 960, H = 540, TAU = Math.PI * 2;
const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const palettes = [
  ['#3c797c', '#b8d4c4', '#e7d8aa', '#568f8a', '#356f6e'],
  ['#3c7077', '#b6cfc0', '#ede0b3', '#5c8a83', '#356764'],
  ['#766b63', '#dec8a2', '#f3d8a2', '#a2997e', '#726f61'],
  ['#324e65', '#9cb8b6', '#dce7cf', '#658787', '#3c6268'],
  ['#303f58', '#8aa7b1', '#e7e2be', '#5c7c88', '#365c69'],
  ['#614645', '#d4a78f', '#f1cea3', '#947975', '#655c60'],
];
const sectorNames = ['风起草甸', '悬桥风场', '铜炉峡谷', '暴雨钟楼', '月影回廊', '终焉航标'];
let art = null, artPromise = null, artFrames = null;

export function loadPlatformerArt() {
  if (artPromise) return artPromise;
  if (typeof Image === 'undefined') return Promise.resolve(false);
  artPromise = new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      art = image;
      // Trim transparent padding once so all four poses share a stable foot line.
      try {
        const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(image.naturalWidth, image.naturalHeight) : document.createElement('canvas');
        canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
        const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
        const cw=image.naturalWidth/2,ch=image.naturalHeight/2;
        artFrames=Array.from({length:4},(_,i)=>{
          const ox=(i%2)*cw,oy=Math.floor(i/2)*ch,data=context.getImageData(ox,oy,cw,ch).data;
          let left=cw,top=ch,right=0,bottom=0;
          for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[(y*cw+x)*4+3]>24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
          return {x:ox+left,y:oy+top,w:right-left+1,h:bottom-top+1,anchor:cw*.62-left};
        });
      } catch { artFrames=null; }
      resolve(true);
    };
    image.onerror = () => resolve(false);
    image.src = '/assets/zhanzhan-platformer-lgd.png';
  });
  return artPromise;
}

function rounded(ctx, x, y, w, h, r = 8) {
  r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function box(ctx, x, y, w, h, color, r = 8) { rounded(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill(); }
function circle(ctx, x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = color; ctx.fill(); }
function ellipse(ctx, x, y, rx, ry, color) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = color; ctx.fill(); }
function path(ctx, points, color, close = true) { ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); if(close)ctx.closePath(); ctx.fillStyle=color;ctx.fill(); }
function line(ctx, points, color, width = 2) { ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke(); }
function label(ctx, text, x, y, size = 14, color = '#f8efd7', align = 'left') { ctx.font = `600 ${size}px ${FONT}`;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(text,x,y); }
function gradient(ctx, y1, y2, c1, c2) { const g=ctx.createLinearGradient(0,y1,0,y2);g.addColorStop(0,c1);g.addColorStop(1,c2);return g; }
function gear(ctx, x, y, radius, rotation, color, teeth = 12) {
  ctx.save(); ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();
  for(let i=0;i<teeth*4;i++){const a=i/(teeth*4)*TAU,r=i%4<2?radius:radius*.83;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}
  ctx.closePath();ctx.fillStyle=color;ctx.fill();circle(ctx,0,0,radius*.61,'#395d59');circle(ctx,0,0,radius*.23,'#d2b87e');circle(ctx,0,0,radius*.1,'#344d49');ctx.restore();
}
function cloud(ctx, x, y, scale, color) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle=color;ctx.beginPath();
  ctx.moveTo(-73,10);ctx.bezierCurveTo(-90,7,-84,-11,-61,-13);ctx.bezierCurveTo(-62,-31,-28,-39,-10,-23);ctx.bezierCurveTo(4,-46,47,-33,49,-13);ctx.bezierCurveTo(82,-24,104,7,74,14);ctx.bezierCurveTo(27,24,-34,22,-73,10);ctx.fill();ctx.restore();
}
function windmill(ctx,x,y,scale,t,color) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  path(ctx,[[-21,0],[-14,-94],[14,-94],[22,0]],color);
  path(ctx,[[-22,-91],[0,-120],[23,-91]],'#527571');
  box(ctx,-5,-41,10,30,'#315c59',4);box(ctx,-4,-78,8,14,'#d8dfbf',4);
  ctx.translate(0,-91);ctx.rotate(t*.32);
  for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);path(ctx,[[4,-3],[61,-7],[58,-19],[9,-14]],'#d1d7ba');line(ctx,[[6,-9],[60,-13]],'#668b7f',2);for(let j=20;j<60;j+=10)line(ctx,[[j,-6],[j,-16]],'#91a592',1);}
  circle(ctx,0,0,9,'#456d64');circle(ctx,0,0,4,'#dbbc77');ctx.restore();
}
function backdropIsland(ctx,x,y,width,height,color) {
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+width*.17,y-16,x+width*.74,y-13,x+width,y+1);ctx.bezierCurveTo(x+width*.84,y+height*.21,x+width*.66,y+height*.27,x+width*.56,y+height);ctx.bezierCurveTo(x+width*.32,y+height*.75,x+width*.19,y+height*.23,x,y);ctx.fill();
  ctx.strokeStyle='#d2dbbc33';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+width*.31,y+9);ctx.lineTo(x+width*.4,y+height*.52);ctx.lineTo(x+width*.54,y+height*.69);ctx.stroke();
}
function sectorIndex(s) {
  if(Number.isFinite(s.sectorIndex))return clamp(s.sectorIndex,0,5);
  if(Array.isArray(s.sectors)&&s.sectors.length){let i=0;for(let j=0;j<s.sectors.length;j++)if(s.maxX>=(s.sectors[j].start??s.sectors[j].x??0))i=j;return Math.min(5,i);}
  return clamp(Math.floor((s.maxX||0)/(Number.isFinite(s.goalX)?s.goalX/6:4000)),0,5);
}
function drawBackdrop(ctx,s,sector) {
  const [sky,horizon,sun,far,near]=palettes[sector],cam=s.camera||0,t=s.reducedMotion?0:s.elapsed||0;
  ctx.fillStyle=gradient(ctx,0,H,sky,horizon);ctx.fillRect(0,0,W,H);
  const sx=770-cam*.016%120;
  circle(ctx,sx,115,65,sun+'15');circle(ctx,sx,115,51,sun+'20');circle(ctx,sx,115,39,sun);
  if(sector>2)for(let i=0;i<30;i++){const x=(i*137.6+34-cam*.022+99999)%1050;const y=20+(i*43.9)%160;circle(ctx,x,y,i%3===0?1.4:.8,'#e5e9d7a8');}
  // Slow, soft distant clouds leave a quiet silhouette behind the active platforms.
  for(let i=0;i<5;i++){const x=((i*307-cam*.055+t*1.3)%1520+1520)%1520-170;cloud(ctx,x,105+(i%3)*31,.75+(i%2)*.28,'#dfebd333');}
  for(let i=-1;i<7;i++){
    const id=i+Math.floor(cam*.16/246),x=i*246-(cam*.16%246),y=276+(Math.abs(id*31)%48);
    backdropIsland(ctx,x,y,190,105,far+'b5');
    if(id%3===0){ctx.fillStyle=far;ctx.fillRect(x+91,y-100,21,99);path(ctx,[[x+82,y-99],[x+101,y-128],[x+121,y-99]],far);circle(ctx,x+102,y-80,7,horizon+'70');}
    else if(id%3===1)windmill(ctx,x+110,y-6,.58,t,far);
  }
  for(let i=-1;i<5;i++){
    const id=i+Math.floor(cam*.32/365),x=i*365-(cam*.32%365),y=365+Math.sin(id*2.2)*32;
    backdropIsland(ctx,x,y,292,163,near+'ab');
    // Waterfall ribbons terminate in the mist rather than competing with the ground edge.
    if(id%2===0){ctx.fillStyle=gradient(ctx,y,H,'#bde2d062','#bde2d000');ctx.beginPath();ctx.moveTo(x+147,y);ctx.bezierCurveTo(x+158,y+58,x+127,y+89,x+152,H);ctx.lineTo(x+178,H);ctx.bezierCurveTo(x+151,y+95,x+178,y+49,x+168,y);ctx.fill();line(ctx,[[x+157,y+5],[x+159,y+48],[x+150,y+86]],'#d4e7cf44',3);}
    if(id%3===0)windmill(ctx,x+80,y-5,.75,t*.8,near);
    else {ctx.fillStyle=near;box(ctx,x+68,y-78,29,77,near,4);box(ctx,x+56,y-84,55,8,near,3);circle(ctx,x+83,y-56,12,'#adc4a797');circle(ctx,x+83,y-56,9,near);line(ctx,[[x+83,y-62],[x+83,y-56],[x+89,y-56]],'#dbe2be',1.5);}
  }
  ctx.fillStyle=gradient(ctx,330,540,horizon+'00',horizon+'64');ctx.fillRect(0,330,W,210);
  // A few wind-borne leaves are scene-scale details, not a flashing screen overlay.
  for(let i=0;i<7;i++){const x=((i*159+t*13-cam*.2)%1060+1060)%1060-50,y=176+((i*53)%270)+Math.sin(t*.8+i)*12;ctx.save();ctx.translate(x,y);ctx.rotate(t*.3+i);ellipse(ctx,0,0,3.5,1.2,'#e4dbb677');ctx.restore();}
}
function stoneShape(ctx,x,y,w,h){ctx.beginPath();ctx.moveTo(x+5,y+9);ctx.lineTo(x+w-5,y+9);ctx.bezierCurveTo(x+w+2,y+42,x+w-13,y+h*.7,x+w-22,y+h);ctx.lineTo(x+22,y+h);ctx.bezierCurveTo(x+8,y+h*.68,x-2,y+41,x+5,y+9);ctx.closePath();}
function drawPlatform(ctx,s,p) {
  const x=p.x-s.camera,y=p.y;
  if(x>W+100||x+p.w< -100||p.broken)return;
  if(p.type==='ground'){
    const depth=Math.min(p.h||150,H-y+70);
    stoneShape(ctx,x,y,p.w,depth);ctx.fillStyle=gradient(ctx,y,y+depth,'#baad8b','#6a786c');ctx.fill();
    ctx.save();stoneShape(ctx,x,y,p.w,depth);ctx.clip();
    for(let j=0;j<p.w;j+=65){const offset=(p.id*19+j)%37;path(ctx,[[x+j+8,y+23],[x+j+57,y+25],[x+j+46,y+depth],[x+j+24,y+depth-18]],j%130===0?'#d4c49c28':'#47675c25');line(ctx,[[x+j+7,y+49],[x+j+32,y+62],[x+j+26,y+102+offset]],'#64756566',1.5);}
    for(let j=17;j<p.w-12;j+=43){circle(ctx,x+j,y+30,2,'#7c8069');circle(ctx,x+j-1,y+29,1,'#e9ddba');}
    ctx.restore();
    // Collision and visible top share the same Y; warm paving makes every landing readable.
    box(ctx,x,y,p.w,19,'#455e51',5);box(ctx,x,y,p.w,13,gradient(ctx,y,y+14,'#f0e6c4','#c2b38e'),5);
    ctx.fillStyle='#f7edcf';ctx.fillRect(x+7,y,p.w-14,2);ctx.fillStyle='#947a4a';ctx.fillRect(x+3,y+14,p.w-6,4);
    for(let j=43;j<p.w-10;j+=64)line(ctx,[[x+j,y+3],[x+j-4,y+11]],'#a69a76',1.4);
    if(p.w>155){gear(ctx,x+p.w*.64,y+68,30,s.elapsed*.12,'#b59a65');circle(ctx,x+p.w*.64,y+68,5,'#e4ce97');}
    // A restrained hanging vine sits below the lip, never masks a hazard.
    if(p.w>250){const vx=x+p.w-40;ctx.beginPath();ctx.moveTo(vx,y+18);ctx.bezierCurveTo(vx-15,y+42,vx+17,y+59,vx-1,y+92);ctx.strokeStyle='#3e7862';ctx.lineWidth=3;ctx.stroke();for(let j=0;j<4;j++)ellipse(ctx,vx+(j%2?6:-8),y+28+j*15,7,3,'#589376');}
    return;
  }
  const crumble=p.type==='crumble',sx=x+(crumble&&p.age>0?Math.sin(p.age*80)*1.8:0);
  if(p.type==='moving'){
    const mx=x+p.w/2;
    line(ctx,[[mx,95],[mx,y+1]],'#73908888',2);for(let k=106;k<y;k+=16)ellipse(ctx,mx,k,2.5,4,'#bcc6a88f');
    gear(ctx,mx,y+34,19,s.elapsed*1.1,'#c8ab6d');
    path(ctx,[[x+13,y+17],[mx-3,y+39],[mx+3,y+39],[x+p.w-13,y+17]],'#537569');
  }
  box(ctx,sx,y,p.w,20,crumble?'#a87350':'#476e66',5);
  box(ctx,sx,y,p.w,8,gradient(ctx,y,y+8,crumble?'#e6c18a':'#e9d8ac',crumble?'#c89d68':'#bda270'),4);
  line(ctx,[[sx+6,y+1],[sx+p.w-6,y+1]],'#fff0ca',1.5);
  for(let j=8;j<p.w-8;j+=28){circle(ctx,sx+j,y+14,2,'#dab879');if(crumble)line(ctx,[[sx+j+7,y+2],[sx+j+4,y+8],[sx+j+10,y+13],[sx+j+8,y+20]],'#784f3d',1.5);}
  if(crumble&&p.age>0){const ratio=clamp(1-p.age/(p.crumbleDelay||.44),0,1);box(ctx,x,y-7,p.w,3,'#624c4090',1);box(ctx,x,y-7,p.w*ratio,3,'#f1c886',1);}
}
function drawCoin(ctx,x,y,t){
  const scale=.4+Math.abs(Math.cos(t*2.4+x*.016))*.6;
  ctx.save();ctx.translate(x,y);ctx.scale(scale,1);gear(ctx,0,0,10,0,'#805f31',8);circle(ctx,0,0,7.9,'#f0c666');circle(ctx,-1,-1,5.7,'#e4af43');line(ctx,[[-3,-4],[-3,3]],'#fff1b7',2);circle(ctx,1,1,2,'#9d762d');ctx.restore();
}
function drawEnemy(ctx,s,e){
  if(!e.alive)return;const x=e.x-s.camera,y=e.y;if(x>W+60||x< -60)return;
  const spike=e.type==='spike',gait=Math.sin(s.elapsed*17+e.x)*2;
  ellipse(ctx,x+17,y+29,20,5,'#263e3b36');
  for(let j=0;j<3;j++){line(ctx,[[x+8+j*10,y+19],[x+4+j*12,y+28+(j%2?gait:-gait)]],'#304e48',4);}
  ellipse(ctx,x+17,y+15,19,14,'#334f46');
  ctx.fillStyle=gradient(ctx,y,y+26,spike?'#d8765b':'#dfb86b',spike?'#9b433a':'#90734b');ctx.beginPath();ctx.ellipse(x+17,y+12,16,13,0,Math.PI,TAU);ctx.lineTo(x+33,y+19);ctx.quadraticCurveTo(x+17,y+26,x+1,y+19);ctx.fill();
  line(ctx,[[x+17,y+1],[x+17,y+21]],spike?'#7e3f35':'#8c7248',2);
  ellipse(ctx,x+10,y+6,6,2,'#f5dfb56b');
  if(spike)for(let j=0;j<3;j++)path(ctx,[[x+3+j*10,y+5],[x+8+j*10,y-8],[x+14+j*10,y+6]],'#efe2c8');
  const ex=e.dir>0?x+27:x+6;ellipse(ctx,ex,y+15,7,6,'#f0e7cc');circle(ctx,ex+(e.dir>0?2:-2),y+15,2.7,'#293e3a');
}
function drawSaw(ctx,s,h){
  const x=h.x-s.camera,y=h.y,r=h.radius||19;if(x< -r-40||x>W+r+40)return;
  const bx=(h.baseX??h.x)-s.camera,by=h.baseY??h.y;
  if(h.axis==='x')line(ctx,[[bx-(h.range||0),by],[bx+(h.range||0),by]],'#6e605966',2);
  if(h.axis==='y')line(ctx,[[bx,by-(h.range||0)],[bx,by+(h.range||0)]],'#6e605966',2);
  circle(ctx,bx,by,4,'#9f8e6f');
  ctx.save();ctx.translate(x,y);ctx.rotate(s.elapsed*(h.speed||4));
  ctx.beginPath();for(let i=0;i<48;i++){const a=i/48*TAU,rr=i%4<2?r+4:r-1;const px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fillStyle='#e3d8c1';ctx.fill();ctx.strokeStyle='#92604e';ctx.lineWidth=1.5;ctx.stroke();
  circle(ctx,0,0,r*.73,'#b95743');circle(ctx,-2,-2,r*.45,'#cf7356');circle(ctx,0,0,r*.24,'#eee1b9');circle(ctx,0,0,2,'#584d43');for(let i=0;i<3;i++){const a=i/3*TAU;circle(ctx,Math.cos(a)*r*.47,Math.sin(a)*r*.47,2.5,'#873b34');}ctx.restore();
}
function drawHazard(ctx,s,h){
  if(h.type==='spikes'||h.type==='spike'){const x=h.x-s.camera,y=h.y,w=h.w||40;if(x>W+60||x+w< -60)return;box(ctx,x,y+7,w,8,'#774b3f',2);for(let i=0;i<w;i+=14)path(ctx,[[x+i,y+10],[x+i+7,y-10],[x+i+14,y+10]],'#d28a67');return;}
  if(h.type==='flame'||h.type==='vent'){
    const x=h.x-s.camera,y=h.y,w=h.w||22,hh=h.h||190,base=y+hh;if(x>W+100||x< -100)return;
    box(ctx,x-8,base-4,w+16,11,'#714d42',4);box(ctx,x-4,base-6,w+8,5,'#c9ad7f',2);
    for(let j=2;j<w;j+=6)line(ctx,[[x+j,base-4],[x+j,base+3]],'#755640',2);
    if(h.state==='active'){
      box(ctx,x,y,w,hh,gradient(ctx,y,base,'#d98c5988','#c34432'),5);
      box(ctx,x+4,y+3,w-8,hh-7,gradient(ctx,y,base,'#f1c47a8c','#f2b661'),3);
      box(ctx,x+8,y+7,Math.max(2,w-16),hh-12,'#ffe2a98c',2);
      for(let i=0;i<5;i++){const sy=base-((i*41+s.elapsed*82)%hh);circle(ctx,x+6+Math.sin(i*3+s.elapsed*8)*6,sy,2.2,'#ffe5a9');}
    }else if(h.state==='warning'){
      ctx.save();ctx.strokeStyle='#edc567';ctx.lineWidth=1.5;ctx.setLineDash([5,7]);ctx.strokeRect(x+.5,y+.5,w-1,hh-1);ctx.setLineDash([]);ctx.restore();
      box(ctx,x+2,base-5,w-4,4,'#f6d077',2);path(ctx,[[x+w/2,y+hh*.55-10],[x+w/2-5,y+hh*.55],[x+w/2+5,y+hh*.55]],'#efc766');
    }else circle(ctx,x+w/2,base-2,3,'#827760');return;
  }
  drawSaw(ctx,s,h);
}
function dragonFallback(ctx,s){
  // The mascot stays recognizable even if an offline asset has not finished loading.
  const p=s.player,run=p.grounded&&Math.abs(p.vx)>25?Math.sin(p.runCycle)*3:0;
  ctx.save();ctx.translate(p.x-s.camera+p.w/2,p.y+p.h);ctx.scale(p.facing*1.05,1.05);
  path(ctx,[[-13,-23],[-35,-37],[-27,-10],[-11,-10]],'#b94234');path(ctx,[[-20,-20],[-38,-35],[-29,-30],[-31,-45],[-15,-30]],'#d4dad1');
  ctx.fillStyle=gradient(ctx,-40,0,'#e2503c','#a62728');ctx.beginPath();ctx.ellipse(0,-23,16,19,0,0,TAU);ctx.fill();ellipse(ctx,4,-22,9,12,'#f5ebd9');circle(ctx,4,-23,6.5,'#244f70');circle(ctx,4,-23,4.8,'#f4ecda');path(ctx,[[2,-27],[6,-27],[6,-24],[3,-24],[3,-19],[1,-19],[1,-26]],'#c23229');
  box(ctx,-15,-7-run,13,8,'#f0eee1',4);box(ctx,4,-6+run,16,8,'#f0eee1',4);box(ctx,-15,-1-run,13,3,'#ae342d',1);box(ctx,4,+run,16,3,'#ae342d',1);
  circle(ctx,1,-50,23,'#b72e2b');circle(ctx,0,-52,21,'#e34a35');ellipse(ctx,-9,-61,6,3,'#f28769');
  path(ctx,[[-16,-65],[-15,-83],[-4,-68]],'#243b42');path(ctx,[[8,-69],[18,-81],[19,-59]],'#233840');
  ellipse(ctx,6,-42,18,10,'#f5efde');ellipse(ctx,9,-51,7,10,'#f2eedc');ellipse(ctx,11,-51,4,7,'#b77931');ellipse(ctx,12,-51,2.3,5,'#253733');circle(ctx,12,-53,1.2,'#faf5e4');
  path(ctx,[[-3,-65],[7,-66],[3,-59]],'#f4f0de');line(ctx,[[1,-38],[8,-36],[14,-39]],'#9f3f36',2);ellipse(ctx,18,-44,1.5,1,'#35453e');
  ellipse(ctx,17,-24+run,5,7,'#eceade');path(ctx,[[-18,-55],[-29,-59],[-22,-48]],'#d44232');ctx.restore();
}
function drawCharacter(ctx,s){
  const p=s.player,cx=p.x-s.camera+p.w/2,feet=p.y+p.h;
  ellipse(ctx,cx,feet+(p.grounded?1:4),p.grounded?20:14,4,'#244c4733');
  ctx.save();if(p.invincible>0)ctx.globalAlpha=Math.floor(p.invincible*13)%2===0?.48:1;
  if(p.dashTime>0){for(let i=0;i<4;i++){ctx.globalAlpha=.18-i*.035;ellipse(ctx,cx-p.facing*(22+i*12),feet-23,21-i*3,5,'#f7db96');}ctx.globalAlpha=.95;}
  if(art&&art.complete&&art.naturalWidth){
    const frame=!p.grounded?3:Math.abs(p.vx)>28?1+Math.floor(p.runCycle*.55)%2:0;
    ctx.translate(cx,feet);ctx.scale(p.facing,1);
    if(artFrames){const f=artFrames[frame],scale=82/Math.max(...artFrames.map(v=>v.h));ctx.drawImage(art,f.x,f.y,f.w,f.h,-f.anchor*scale,-f.h*scale,f.w*scale,f.h*scale);}
    else {const cw=art.naturalWidth/2,ch=art.naturalHeight/2,drawH=89,drawW=drawH*cw/ch;ctx.drawImage(art,(frame%2)*cw,Math.floor(frame/2)*ch,cw,ch,-drawW*.62,-drawH*.96,drawW,drawH);}
  }else dragonFallback(ctx,s);
  ctx.restore();
}
function drawCheckpoint(ctx,s,flag){
  const x=flag.x-s.camera,y=flag.y;if(x< -80||x>W+80)return;
  ellipse(ctx,x,y+1,19,5,'#3b63553b');box(ctx,x-9,y-10,18,12,'#c4b084',3);box(ctx,x-3,y-91,6,86,'#54766a',3);line(ctx,[[x-1,y-86],[x-1,y-13]],'#d9cd9d',1);
  const sway=s.reducedMotion?0:Math.sin(s.elapsed*2.5)*3;
  ctx.beginPath();ctx.moveTo(x+3,y-86);ctx.bezierCurveTo(x+21,y-92,x+35,y-81+sway,x+51,y-86+sway);ctx.lineTo(x+44,y-60);ctx.bezierCurveTo(x+26,y-59,x+20,y-71,x+3,y-63);ctx.closePath();ctx.fillStyle=flag.active?'#dab861':'#769788';ctx.fill();
  circle(ctx,x,y-93,7,'#866f49');circle(ctx,x,y-93,4,flag.active?'#f5dc90':'#c0c9a7');
  if(flag.active){label(ctx,'驿站点亮',x+22,y-109,13,'#f8ecd0','center');}
}
function drawGoal(ctx,s){
  if(!Number.isFinite(s.goalX))return;const x=s.goalX-s.camera;if(x< -160||x>W+160)return;
  const ground=s.platforms.find(p=>s.goalX>=p.x&&s.goalX<=p.x+p.w&&p.type==='ground'),y=ground?.y??410;
  box(ctx,x-40,y-128,18,128,'#59776b',4);box(ctx,x+38,y-128,18,128,'#59776b',4);
  box(ctx,x-47,y-134,110,18,'#d6c290',5);line(ctx,[[x-43,y-131],[x+59,y-131]],'#f3e6b6',2);
  for(let i=0;i<2;i++){box(ctx,x-37+i*77,y-124,4,121,'#bcc6a2',2);box(ctx,x-48+i*79,y-12,34,12,'#b5a278',3);}
  gear(ctx,x+8,y-150,28,s.won?s.elapsed*.5:0,'#c6a96b');circle(ctx,x+8,y-150,13,s.won?'#f8dfa0':'#e6ca89');
  ctx.save();ctx.globalAlpha=s.won?.35:.12;ctx.fillStyle='#f7dda0';ctx.fillRect(x-22,y-114,60,112);ctx.restore();
  label(ctx,'终焉航标',x+8,y-192,17,'#f9ebc9','center');
}
function drawHud(ctx,s,sector){
  ctx.save();
  box(ctx,18,18,166,46,'#203f3be8',10);rounded(ctx,18.5,18.5,165,45,9.5);ctx.strokeStyle='#d9ddbd57';ctx.lineWidth=1;ctx.stroke();
  const lives=s.maxHealth??s.initialHealth??(s.mode==='shadow'?1:2);
  for(let i=0;i<lives;i++){const x=33+i*23;ctx.save();ctx.translate(x,39);ctx.beginPath();ctx.moveTo(0,-4);ctx.bezierCurveTo(-9,-13,-13,1,0,10);ctx.bezierCurveTo(13,1,9,-13,0,-4);ctx.fillStyle=i<s.player.health?'#ee7358':'#607a6d';ctx.fill();ctx.restore();}
  gear(ctx,116,40,9,0,'#dfb85f',8);label(ctx,String(s.metrics.coins),133,46,17,'#f6e6b5');
  box(ctx,26,55,149,3,'#71877866',1);
  const cooldown=s.dashCooldownMax??s.rules?.dashCooldown??.95;
  box(ctx,26,55,149*clamp(1-s.player.dashCooldown/cooldown,0,1),3,'#e8ce88',1);
  box(ctx,731,18,211,46,'#203f3be8',10);rounded(ctx,731.5,18.5,210,45,9.5);ctx.strokeStyle='#d9ddbd57';ctx.stroke();
  circle(ctx,756,41,13,'#aec3a128');line(ctx,[[756,30],[756,52]],'#d7cfaa',1);line(ctx,[[745,41],[767,41]],'#d7cfaa',1);path(ctx,[[756,30],[760,43],[752,43]],'#e3c17b');
  const index=s.mode==='endless'?(s.sectorIndex??0)+1:sector+1;
  label(ctx,`${String(index).padStart(2,'0')}  ${s.mode==='endless'?'无尽群岛':(s.sectors?.[sector]?.name||sectorNames[sector])}`,778,46,15,'#f1e6cc');
  if(s.pressure?.x!=null){const gap=Math.max(0,Math.floor((s.player.x-s.pressure.x)/10));box(ctx,363,18,234,32,'#7e3c31e8',8);label(ctx,`崩塌追近 · 距离 ${gap} m`,480,39,14,'#fff0da','center');}
  ctx.restore();
}

export function drawPlatformer(ctx,s,w=W,h=H){
  if(!artPromise&&typeof Image!=='undefined')void loadPlatformerArt();
  ctx.save();ctx.scale(w/W,h/H);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.lineCap='round';ctx.lineJoin='round';
  const sector=sectorIndex(s);drawBackdrop(ctx,s,sector);
  ctx.save();if(s.shake>0&&!s.reducedMotion)ctx.translate(Math.sin(s.elapsed*103)*s.shake*10,Math.cos(s.elapsed*89)*s.shake*6);
  for(const p of s.platforms)drawPlatform(ctx,s,p);
  for(const c of s.coins)if(!c.taken){const x=c.x-s.camera;if(x> -20&&x<W+20)drawCoin(ctx,x,c.y+Math.sin(s.elapsed*3+c.x)*2.5,s.elapsed);}
  for(const f of s.checkpointFlags)drawCheckpoint(ctx,s,f);drawGoal(ctx,s);
  for(const e of s.enemies)drawEnemy(ctx,s,e);for(const hazard of s.hazards)drawHazard(ctx,s,hazard);
  drawCharacter(ctx,s);
  for(const p of s.particles){ctx.globalAlpha=clamp(p.life*3,0,1);circle(ctx,p.x-s.camera,p.y,p.size*.65,p.color);}ctx.globalAlpha=1;
  for(const f of s.floats){ctx.globalAlpha=clamp(f.life*2,0,1);label(ctx,f.text,f.x-s.camera,f.y,16,'#fff0ad');}ctx.globalAlpha=1;
  ctx.restore();drawHud(ctx,s,sector);ctx.restore();
}
