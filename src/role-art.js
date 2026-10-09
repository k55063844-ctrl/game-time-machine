// Shared presentation layer only: no gameplay state, timers or input handlers.
export const ROLE_ART={
  "skate": {
    "url": "/assets/zhanzhan-skate.png",
    "width": 1774,
    "height": 887,
    "columns": 2,
    "rows": 1,
    "previewFrame": 0,
    "align": "bottom",
    "frames": [
      [
        144,
        28,
        700,
        828
      ],
      [
        994,
        33,
        679,
        755
      ]
    ]
  },
  "goalie": {
    "url": "/assets/zhanzhan-goalie.png",
    "width": 1254,
    "height": 1254,
    "columns": 1,
    "rows": 1,
    "previewFrame": 0,
    "align": "bottom",
    "frames": [
      [
        58,
        52,
        1138,
        1144
      ]
    ]
  },
  "courier": {
    "url": "/assets/zhanzhan-courier.png",
    "width": 1254,
    "height": 1254,
    "columns": 2,
    "rows": 2,
    "previewFrame": 2,
    "align": "center",
    "frames": [
      [
        149,
        34,
        351,
        577
      ],
      [
        701,
        39,
        512,
        547
      ],
      [
        149,
        639,
        348,
        581
      ],
      [
        692,
        643,
        520,
        546
      ]
    ]
  },
  "stealth": {
    "url": "/assets/zhanzhan-stealth.png",
    "width": 1254,
    "height": 1254,
    "columns": 2,
    "rows": 2,
    "previewFrame": 2,
    "align": "center",
    "frames": [
      [
        133,
        25,
        421,
        581
      ],
      [
        711,
        46,
        477,
        557
      ],
      [
        142,
        660,
        416,
        562
      ],
      [
        753,
        664,
        442,
        550
      ]
    ]
  },
  "train": {
    "url": "/assets/zhanzhan-train.png",
    "width": 1254,
    "height": 1254,
    "columns": 1,
    "rows": 1,
    "previewFrame": 0,
    "align": "bottom",
    "frames": [
      [
        299,
        57,
        653,
        1108
      ]
    ]
  }
};
const cache=new Map();
const getRoleConfig=role=>Object.hasOwn(ROLE_ART,role)?ROLE_ART[role]:null;

export function loadRoleArt(role){
 const config=getRoleConfig(role);
 if(!config||typeof Image==='undefined')return Promise.resolve(false);
 let entry=cache.get(role);
 if(!entry){entry={image:null,pending:null,ready:false,retryAfter:0};cache.set(role,entry)}
 if(entry.ready)return Promise.resolve(true);
 if(entry.pending)return entry.pending;
 if(Date.now()<entry.retryAfter)return Promise.resolve(false);
 entry.pending=new Promise(resolve=>{
  const image=new Image();entry.image=image;
  image.onload=()=>resolve(image.naturalWidth>0&&image.naturalHeight>0);
  image.onerror=()=>resolve(false);
  image.src=config.url;
 }).catch(()=>false).then(loaded=>{
  entry.ready=loaded;
  if(!loaded){entry.pending=null;entry.retryAfter=Date.now()+3000}
  return loaded;
 });
 return entry.pending;
}

export function drawRoleSprite(ctx,role,frame,x,y,width,height){
 const config=getRoleConfig(role),entry=cache.get(role);
 if(!config||![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)return false;
 if(!entry?.ready||!entry.image?.complete){void loadRoleArt(role);return false}
 const index=Math.max(0,Math.min(config.frames.length-1,Math.trunc(frame)||0));
 const [left,top,sw,sh]=config.frames[index];
 // Tight source bounds remove transparent padding without modifying the PNG.
 // A shared envelope keeps the character the same scale between poses.
 const envelopeW=Math.max(...config.frames.map(f=>f[2]));
 const envelopeH=Math.max(...config.frames.map(f=>f[3]));
 const scale=Math.min(width/envelopeW,height/envelopeH),dw=sw*scale,dh=sh*scale;
 const dx=x+(width-dw)/2,dy=config.align==='bottom'?y+height-dh:y+(height-dh)/2;
 const rx=entry.image.naturalWidth/config.width,ry=entry.image.naturalHeight/config.height;
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(entry.image,left*rx,top*ry,sw*rx,sh*ry,dx,dy,dw,dh);
 ctx.restore();
 return true;
}

const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function roleArtPreview(role,alt='战战游戏主角'){
 const config=getRoleConfig(role);
 if(!config)return '';
 const [x,y,w,h]=config.frames[config.previewFrame];
 return `<svg class="role-art-preview role-art-${role}" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="${escapeHtml(alt)}" focusable="false"><image href="${config.url}" width="${config.width}" height="${config.height}"/></svg>`;
}
