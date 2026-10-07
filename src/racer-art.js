// Only presentation state lives here. Grid positions and collision rules remain
// in the existing racer engine; the original CSS vehicle is the safe fallback.
export const RACER_ART_URL='/assets/zhanzhan-racer-player-rear.png';
export const RACER_FLEET_URLS=Object.freeze([
 '/assets/zhanzhan-racer-traffic-gold.png',
 '/assets/zhanzhan-racer-traffic-blue.png',
 '/assets/zhanzhan-racer-traffic-green.png'
]);
let loading=null,ready=false,fleetReady=false;
const pendingBoards=new WeakSet();

function loadImage(url){
 return new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(image.naturalWidth>0&&image.naturalHeight>0);
  image.onerror=()=>resolve(false);
  image.src=url;
 }).catch(()=>false);
}

function loadRacerArt(){
 if(loading)return loading;
 // The player is independent; traffic changes only as one complete fleet.
 loading={
  player:loadImage(RACER_ART_URL).then(loaded=>ready=loaded),
  fleet:Promise.all(RACER_FLEET_URLS.map(loadImage)).then(results=>fleetReady=results.every(Boolean))
 };
 return loading;
}

export function applyRacerArt(board){
 if(!board)return false;
 if(board.isConnected!==false){
  if(ready)board.classList.add('has-racer-art');
  if(fleetReady)board.classList.add('has-racer-fleet');
 }
 if((ready&&fleetReady)||typeof Image==='undefined'||pendingBoards.has(board))return ready;
 pendingBoards.add(board);
 const loads=loadRacerArt();
 void loads.player.then(loaded=>{
  if(loaded&&board.isConnected!==false)board.classList.add('has-racer-art');
 });
 void loads.fleet.then(loaded=>{
  if(loaded&&board.isConnected!==false)board.classList.add('has-racer-fleet');
 });
 return ready;
}
