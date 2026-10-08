// Cosmetic assets only. Simulation coordinates, hit radii and shots stay in wave-games.
export const PLANE_PLAYER_ART_URL='/assets/zhanzhan-plane.png';
export const PLANE_ENEMY_ART_URL='/assets/plane-enemy-fleet.png';
const player={url:PLANE_PLAYER_ART_URL,image:null,loading:null,ready:false,retryAfter:0};
const fleet={url:PLANE_ENEMY_ART_URL,image:null,loading:null,ready:false,retryAfter:0};

function loadAsset(asset){
 if(asset.ready)return Promise.resolve(true);
 if(asset.loading)return asset.loading;
 if(typeof Image==='undefined'||Date.now()<asset.retryAfter)return Promise.resolve(false);
 asset.loading=new Promise(resolve=>{
  const image=new Image();asset.image=image;
  image.onload=()=>resolve(image.naturalWidth>0&&image.naturalHeight>0);
  image.onerror=()=>resolve(false);
  image.src=asset.url;
 }).catch(()=>false).then(loaded=>{
  asset.ready=loaded;
  if(!loaded){asset.loading=null;asset.retryAfter=Date.now()+3000}
  return loaded;
 });
 return asset.loading;
}

export function loadPlaneArt(){return Promise.all([loadAsset(player),loadAsset(fleet)])}

function available(asset){
 if(!asset.ready){void loadAsset(asset);return false}
 return !!(asset.image?.complete&&asset.image.naturalWidth);
}

export function drawPlanePilot(ctx,s){
 if(!available(player))return false;
 const width=76,height=width*player.image.naturalHeight/player.image.naturalWidth;
 ctx.save();
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(player.image,s.p.x-width/2,s.p.y-height/2,width,height);
 ctx.restore();
 return true;
}

export function drawPlaneEnemy(ctx,o){
 if(!available(fleet))return false;
 // Enemies travel vertically. Their original x fixes the livery for the whole flight.
 const index=((Math.floor(o.x/20)%3)+3)%3;
 const cellWidth=fleet.image.naturalWidth/3,cellHeight=fleet.image.naturalHeight;
 const width=48,height=width*cellHeight/cellWidth;
 ctx.save();
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(fleet.image,index*cellWidth,0,cellWidth,cellHeight,o.x-width/2,o.y-height/2,width,height);
 ctx.restore();
 return true;
}
