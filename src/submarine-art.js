// Shared by the game and its cartridge preview. This is a cosmetic asset only;
// the submarine's simulation, sonar origin and collision radius stay unchanged.
export const SUBMARINE_ART_URL='/assets/zhanzhan-submarine.png';
let image=null,loading=null,ready=false;

export function loadSubmarineArt(){
 if(loading)return loading;
 if(typeof Image==='undefined')return Promise.resolve(false);
 loading=new Promise(resolve=>{
  image=new Image();
  image.onload=()=>{ready=image.naturalWidth>0&&image.naturalHeight>0;resolve(ready)};
  image.onerror=()=>{ready=false;resolve(false)};
  image.src=SUBMARINE_ART_URL;
 });
 return loading;
}

export function drawSubmarinePilot(ctx,s){
 if(!ready||!image?.complete||!image.naturalWidth)return false;
 const width=96,height=width*image.naturalHeight/image.naturalWidth;
 ctx.save();
 ctx.imageSmoothingEnabled=true;
 ctx.imageSmoothingQuality='high';
 // Anchor the pressure hull, not the top of the pilot's horns, at the hit centre.
 ctx.drawImage(image,s.p.x-width/2,s.p.y-height*.7,width,height);
 ctx.restore();
 return true;
}
