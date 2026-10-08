// Presentation only: preserve the crossing engine's one-cell movement and hits.
export const CROSSING_ART_URL='/assets/zhanzhan-crossing-sheet.png';
let loading=null,ready=false,retryAfter=0;
const pendingBoards=new WeakSet();
const facingByBoard=new WeakMap();

function updateFacing(board,player){
 if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.y))return;
 const previous=facingByBoard.get(board);
 let facing=previous?.facing||'up';
 if(previous){
  const dx=player.x-previous.x,dy=player.y-previous.y;
  // A completed crossing returns to the starting row, not a backwards walk.
  if(Math.abs(dx)+Math.abs(dy)>1)facing='up';
  else if(dx>0)facing='right';
  else if(dx<0)facing='left';
  else if(dy<0)facing='up';
  else if(dy>0)facing='down';
 }
 facingByBoard.set(board,{x:player.x,y:player.y,facing});
 board.dataset.crossingFacing=facing;
}

function loadCrossingArt(){
 if(loading)return loading;
 loading=new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(image.naturalWidth>0&&image.naturalHeight>0);
  image.onerror=()=>resolve(false);
  image.src=CROSSING_ART_URL;
 }).catch(()=>false).then(loaded=>{
  ready=loaded;
  if(!loaded){loading=null;retryAfter=Date.now()+3000}
  return loaded;
 });
 return loading;
}

export function applyCrossingArt(board,player){
 if(!board)return false;
 updateFacing(board,player);
 if(ready){
  if(board.isConnected!==false)board.classList.add('has-crossing-art');
  return true;
 }
 if(typeof Image==='undefined'||pendingBoards.has(board)||Date.now()<retryAfter)return false;
 pendingBoards.add(board);
 void loadCrossingArt().then(loaded=>{
  pendingBoards.delete(board);
  if(loaded&&board.isConnected!==false)board.classList.add('has-crossing-art');
 });
 return false;
}
