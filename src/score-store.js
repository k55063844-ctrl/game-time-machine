const STORAGE_KEY='tm:v1:runs';
const PLAYER_KEY='tm:v1:player';
const MAX_RUNS=500;
const MAX_ARCHIVED_RUNS=500;

export const RULESET_VERSIONS={
 blocks:'blocks@2.0.0',snake:'snake@2.0.0',bricks:'bricks@2.0.0',tank:'tank@1.0.0',
 racer:'racer@2.0.0',miner:'miner@1.0.0',crossing:'crossing@2.0.0',
 plane:'plane@2.0.0',pinball:'pinball@2.0.0',train:'train@2.0.0',submarine:'submarine@2.0.0',skate:'skate@2.0.0',
 bomb:'bomb@1.0.0',elevator:'elevator@1.0.0',lighthouse:'lighthouse@1.0.0',goalie:'goalie@1.0.0',
 courier:'courier@1.0.0',stealth:'stealth@1.0.0',rhythm:'rhythm@1.0.0',weather:'weather@1.0.0',
 platformer:'platformer@2.0.0',nightwatch:'nightwatch@1.0.0'
};

const VALID_MODES_BY_GAME={
 blocks:new Set(['extreme','survival','shadow']),snake:new Set(['extreme','classic','shadow']),bricks:new Set(['extreme','classic','shadow']),tank:new Set(['extreme','classic','shadow']),
 racer:new Set(['extreme','endless','shadow']),miner:new Set(['extreme','endless','shadow']),crossing:new Set(['extreme','endless','shadow']),
 plane:new Set(['extreme','endless','shadow']),pinball:new Set(['extreme','endless','shadow']),train:new Set(['extreme','endless','shadow']),submarine:new Set(['extreme','endless','shadow']),skate:new Set(['extreme','endless','shadow']),
 bomb:new Set(['extreme','endless','shadow']),elevator:new Set(['extreme','endless','shadow']),lighthouse:new Set(['extreme','endless','shadow']),goalie:new Set(['extreme','endless','shadow']),
 courier:new Set(['extreme','endless','shadow']),stealth:new Set(['extreme','endless','shadow']),rhythm:new Set(['extreme','endless','shadow']),weather:new Set(['extreme','endless','shadow']),
 platformer:new Set(['extreme','endless','shadow']),nightwatch:new Set(['extreme','endless','shadow'])
};
const REQUIRED_METRIC={
 blocks:'linePoints',snake:'foods',bricks:'destroyed',tank:'destroyed',racer:'overtakes',miner:'ores',crossing:'crossings',
 plane:'eventScore',pinball:'eventScore',train:'eventScore',submarine:'eventScore',skate:'eventScore',
 bomb:'modulesDisarmed',elevator:'passengersDelivered',lighthouse:'rescues',goalie:'saves',
 courier:'deliveries',stealth:'roomsCleared',rhythm:'hits',weather:'districtsProtected',
 platformer:['distance','coins','stomps','checkpoints','deaths'],
 nightwatch:['kills','wavesCleared','towersBuilt','upgrades','baseHp']
};
const memory=new Map();
const fallbackStorage={
 getItem:key=>memory.has(key)?memory.get(key):null,
 setItem:(key,value)=>memory.set(key,String(value)),
 removeItem:key=>memory.delete(key)
};

let activeStorage=null;
let activeCandidate=null;
let persistenceMode='session';

function storage(){
 let candidate=null;
 try{candidate=globalThis.localStorage}catch{}
 if(candidate!==activeCandidate){
  activeCandidate=candidate;
  if(candidate){
   try{
    const probe=`tm:probe:${Date.now()}`;
    candidate.setItem(probe,'1');
    if(candidate.getItem(probe)!=='1')throw new Error('Storage probe failed');
    candidate.removeItem(probe);
    activeStorage=candidate;persistenceMode='device';
   }catch{activeStorage=fallbackStorage;persistenceMode='session'}
  }else{activeStorage=fallbackStorage;persistenceMode='session'}
 }
 if(!activeStorage){activeStorage=fallbackStorage;persistenceMode='session'}
 return activeStorage;
}

export function getScoreStorageStatus(){storage();return persistenceMode}

function id(prefix='run'){
 const uuid=globalThis.crypto?.randomUUID?.();
 return `${prefix}_${uuid||`${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
}

function finite(value,fallback=0){
 const number=Number(value);
 return Number.isFinite(number)?number:fallback;
}

function integer(value,min=0,max=Number.MAX_SAFE_INTEGER){
 return Math.min(max,Math.max(min,Math.round(finite(value))));
}

function cleanMetrics(metrics={}){
 return Object.fromEntries(Object.entries(metrics).slice(0,40).map(([key,value])=>{
  const safeKey=String(key).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40);
  if(typeof value==='boolean')return [safeKey,value];
  if(typeof value==='string')return [safeKey,value.slice(0,80)];
  return [safeKey,integer(value,-1_000_000,1_000_000_000)];
 }).filter(([key])=>key));
}

function cleanRunMetrics(gameId,rawMetrics){
 const metrics=cleanMetrics(rawMetrics);
 if(gameId==='platformer'||gameId==='nightwatch'){
  for(const key of REQUIRED_METRIC[gameId]){
   if(!Object.hasOwn(metrics,key))continue;
   metrics[key]=key==='distance'?Math.floor(Math.max(0,Math.min(1_000_000_000,finite(rawMetrics[key])))):integer(metrics[key],0,key==='baseHp'?5:1_000_000_000);
  }
 }
 return metrics;
}

function missingMetric(gameId,metrics){
 const required=REQUIRED_METRIC[gameId];
 return (Array.isArray(required)?required:[required]).find(key=>key&&!Object.hasOwn(metrics,key));
}

function localDateKey(value=new Date()){
 const date=value instanceof Date?value:new Date(value);
 if(Number.isNaN(date.getTime()))return '';
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export function currentChallenge(date=new Date()){
 const day=localDateKey(date);
 return {challengeId:`daily:${day}`,seed:`${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`};
}

function cleanToken(value,max=80){return String(value||'').replace(/[^a-zA-Z0-9_:@.-]/g,'').slice(0,max)}

function normalizeStoredRun(raw){
 if(!raw||!RULESET_VERSIONS[raw.gameId]||raw.rulesetVersion!==RULESET_VERSIONS[raw.gameId])return null;
 const gameId=raw.gameId,mode=raw.mode;
 if(!VALID_MODES_BY_GAME[gameId]?.has(mode))return null;
 if(!raw.metrics||typeof raw.metrics!=='object'||Array.isArray(raw.metrics))return null;
 const metrics=cleanRunMetrics(gameId,raw.metrics);
 if(missingMetric(gameId,metrics))return null;
 const durationMs=integer(raw.durationMs,0,24*60*60*1000),outcome=['clear','failed','aborted'].includes(raw.outcome)?raw.outcome:'failed';
 const finished=new Date(raw.finishedAt),finishedMs=Number.isFinite(finished.getTime())?finished.getTime():Date.now(),finishedAt=new Date(finishedMs).toISOString();
 return {
  schemaVersion:1,runId:cleanToken(raw.runId,100)||id(),playerId:cleanToken(raw.playerId,100)||'local',gameId,mode,
  challengeId:cleanToken(raw.challengeId,80),seed:cleanToken(raw.seed,32),rulesetVersion:RULESET_VERSIONS[gameId],scoreVersion:1,
  outcome,endedReason:cleanToken(raw.endedReason,40)||'unknown',durationMs,metrics,
  score:calculateRunScore({gameId,mode,outcome,durationMs,metrics}),
  startedAt:new Date(finishedMs-durationMs).toISOString(),finishedAt,inputLogHash:null,
  persistence:getScoreStorageStatus(),verification:{status:'local'}
 };
}

// Old rulesets are kept for a future history/export view, never promoted into
// current leaderboards or recalculated using rules they were not played under.
function normalizeArchivedRun(raw){
 if(!raw||!Object.hasOwn(RULESET_VERSIONS,raw.gameId)||raw.rulesetVersion===RULESET_VERSIONS[raw.gameId])return null;
 const gameId=raw.gameId,rulesetVersion=String(raw.rulesetVersion||'');
 if(!new RegExp(`^${gameId}@[0-9]+\\.[0-9]+\\.[0-9]+$`).test(rulesetVersion)||rulesetVersion.length>80)return null;
 const runId=cleanToken(raw.runId,100),mode=cleanToken(raw.mode,40),finishedMs=new Date(raw.finishedAt).getTime();
 if(!runId||!mode||!Number.isFinite(finishedMs)||!raw.metrics||typeof raw.metrics!=='object'||Array.isArray(raw.metrics))return null;
 const durationMs=integer(raw.durationMs,0,24*60*60*1000);
 return {
  schemaVersion:1,runId,playerId:cleanToken(raw.playerId,100)||'local',gameId,mode,
  challengeId:cleanToken(raw.challengeId,80),seed:cleanToken(raw.seed,32),rulesetVersion,scoreVersion:integer(raw.scoreVersion,1,100),
  outcome:['clear','failed','aborted'].includes(raw.outcome)?raw.outcome:'failed',endedReason:cleanToken(raw.endedReason,40)||'unknown',
  durationMs,metrics:cleanMetrics(raw.metrics),score:integer(raw.score),
  startedAt:new Date(finishedMs-durationMs).toISOString(),finishedAt:new Date(finishedMs).toISOString(),inputLogHash:null,
  verification:{status:'historical-unverified'}
 };
}

function archiveRuns(runs){
 const normalized=runs.map(raw=>safelyNormalizeRun(raw,normalizeArchivedRun)).filter(Boolean);
 const unique=[...new Map(normalized.map(run=>[`${run.gameId}|${run.rulesetVersion}|${run.runId}`,run])).values()];
 return unique.sort((a,b)=>new Date(b.finishedAt)-new Date(a.finishedAt)).slice(0,MAX_ARCHIVED_RUNS);
}

function safelyNormalizeRun(raw,normalize){try{return normalize(raw)}catch{return null}}

function loadEnvelope(){
 try{
  const parsed=JSON.parse(storage().getItem(STORAGE_KEY)||'null');
  if(parsed?.schemaVersion===1&&Array.isArray(parsed.runs)){
   const storedRuns=parsed.runs.slice(0,5000),storedArchive=Array.isArray(parsed.archivedRuns)?parsed.archivedRuns.slice(0,5000):[];
   return {schemaVersion:1,runs:storedRuns.map(raw=>safelyNormalizeRun(raw,normalizeStoredRun)).filter(Boolean),archivedRuns:archiveRuns([...storedArchive,...storedRuns])};
  }
 }catch{}
 return {schemaVersion:1,runs:[],archivedRuns:[]};
}

function saveEnvelope(envelope){
 const payload=JSON.stringify(envelope);
 try{storage().setItem(STORAGE_KEY,payload);return persistenceMode}catch{
  try{activeCandidate=globalThis.localStorage||null}catch{activeCandidate=null}
  activeStorage=fallbackStorage;persistenceMode='session';
  fallbackStorage.setItem(STORAGE_KEY,payload);return persistenceMode;
 }
}

export function getPlayerId(){
 try{
  const existing=storage().getItem(PLAYER_KEY);
  if(existing)return existing;
  const playerId=id('local');
  storage().setItem(PLAYER_KEY,playerId);
  return playerId;
 }catch{activeStorage=fallbackStorage;persistenceMode='session';return 'local-session'}
}

/**
 * Scores are calculated only from raw gameplay metrics. UI code cannot inject an
 * arbitrary leaderboard score. Formula changes require a ruleset version bump.
 */
export function calculateRunScore({gameId,mode='extreme',outcome='failed',durationMs=0,metrics={}}){
 const seconds=Math.max(0,Math.floor(finite(durationMs)/1000));
 const cleared=outcome==='clear';
 const clearBonus=cleared?3000:0;
 const eventScore=integer(metrics.eventScore);
 switch(gameId){
  case 'blocks':return integer(metrics.linePoints)+seconds*10+clearBonus;
  case 'snake':return integer(metrics.foods)*500+seconds*10+clearBonus;
  case 'bricks':return integer(metrics.destroyed)*100+(cleared&&mode==='classic'?Math.max(0,180-seconds)*10:seconds*10)+clearBonus;
  case 'tank':return integer(metrics.destroyed)*200+seconds*10+clearBonus;
  case 'racer':return integer(metrics.overtakes)*200+seconds*10+clearBonus;
  case 'miner':return integer(metrics.ores)*1000+(cleared&&mode!=='endless'?Math.max(0,180-seconds)*10:seconds*5)+clearBonus;
  case 'crossing':return integer(metrics.crossings)*1000+(cleared&&mode!=='endless'?Math.max(0,180-seconds)*10:seconds*5)+clearBonus;
  case 'plane':return eventScore*100+seconds*10+clearBonus;
  case 'pinball':return eventScore*10+seconds*10+clearBonus;
  case 'train':
  case 'submarine':
  case 'skate':return eventScore*250+seconds*10+clearBonus;
  case 'bomb':return integer(integer(metrics.modulesDisarmed)*900+integer(metrics.perfectChains)*250-integer(metrics.mistakes)*300+seconds*10+clearBonus);
  case 'elevator':return integer(integer(metrics.passengersDelivered)*450+integer(metrics.emergencyStops)*150-integer(metrics.missedCalls)*100+seconds*10+clearBonus);
  case 'lighthouse':return integer(integer(metrics.rescues)*650+integer(metrics.maxLockStreak)*120-integer(metrics.falseSignals)*250+seconds*10+clearBonus);
  case 'goalie':return integer(integer(metrics.saves)*750+integer(metrics.perfectSaves)*250-integer(metrics.goalsConceded)*300+seconds*10+clearBonus);
  case 'courier':return integer(integer(metrics.deliveries)*800+integer(metrics.perfectRoutes)*250-integer(metrics.damage)*200+seconds*10+clearBonus);
  case 'stealth':return integer(integer(metrics.roomsCleared)*1000+integer(metrics.silentRooms)*350-integer(metrics.alarms)*500+seconds*10+clearBonus);
  case 'rhythm':return integer(integer(metrics.hits)*60+integer(metrics.perfectHits)*80+integer(metrics.maxCombo)*20-integer(metrics.misses)*40+seconds*5+clearBonus);
  case 'weather':return integer(integer(metrics.districtsProtected)*900+integer(metrics.crisesResolved)*300+integer(metrics.systemIntegrity)*10+seconds*10+clearBonus);
  case 'platformer':return integer(Math.floor(Math.max(0,finite(metrics.distance))/10)+integer(metrics.coins)*100+integer(metrics.stomps)*150+integer(metrics.checkpoints)*500-integer(metrics.deaths)*200+(cleared&&mode!=='endless'?3000+Math.max(0,180-seconds)*10:0));
  case 'nightwatch':return integer(integer(metrics.kills)*100+integer(metrics.wavesCleared)*500+(cleared?3000+integer(metrics.baseHp,0,5)*200:0));
  default:return eventScore+seconds*10+clearBonus;
 }
}

function trimRuns(runs){
 const unique=[...new Map(runs.map(run=>[run.runId,run])).values()];
 const bestByPartition=new Map();
 unique.forEach(run=>{
  if(run.outcome==='aborted')return;
  const key=`${run.gameId}|${run.mode}|${run.rulesetVersion}`;
  const current=bestByPartition.get(key);
  if(!current||compareRuns(run,current)<0)bestByPartition.set(key,run);
 });
 const best=[...bestByPartition.values()],bestIds=new Set(best.map(run=>run.runId));
 const recent=unique.filter(run=>!bestIds.has(run.runId)).sort((a,b)=>new Date(b.finishedAt)-new Date(a.finishedAt)).slice(0,Math.max(0,MAX_RUNS-best.length));
 return [...best,...recent].sort((a,b)=>new Date(b.finishedAt)-new Date(a.finishedAt)).slice(0,MAX_RUNS);
}

export function recordRun(input){
 const gameId=String(input.gameId||'');
 if(!RULESET_VERSIONS[gameId])throw new Error(`Unknown gameId: ${gameId}`);
 const mode=String(input.mode||'');
 if(!VALID_MODES_BY_GAME[gameId]?.has(mode))throw new Error(`Invalid mode for ${gameId}: ${mode}`);
 const outcome=['clear','failed','aborted'].includes(input.outcome)?input.outcome:'failed';
 const durationMs=integer(input.durationMs,0,24*60*60*1000);
 const metrics=cleanRunMetrics(gameId,input.metrics);
 const missing=missingMetric(gameId,metrics);
 if(missing)throw new Error(`Missing metric for ${gameId}: ${missing}`);
 const finishedAt=input.finishedAt&&Number.isFinite(new Date(input.finishedAt).getTime())?new Date(input.finishedAt).toISOString():new Date().toISOString();
 const challenge=currentChallenge(new Date(finishedAt));
 const startedAt=input.startedAt&&Number.isFinite(new Date(input.startedAt).getTime())?new Date(input.startedAt).toISOString():new Date(new Date(finishedAt).getTime()-durationMs).toISOString();
 const run={
  schemaVersion:1,runId:cleanToken(input.runId,100)||id(),playerId:getPlayerId(),gameId,mode,
  challengeId:cleanToken(input.challengeId,80)||challenge.challengeId,seed:cleanToken(input.seed,32)||challenge.seed,
  rulesetVersion:RULESET_VERSIONS[gameId],scoreVersion:1,outcome,durationMs,metrics,
  score:calculateRunScore({gameId,mode,outcome,durationMs,metrics}),
  startedAt,finishedAt,endedReason:cleanToken(input.endedReason,40)||'unknown',inputLogHash:null,
  persistence:getScoreStorageStatus(),verification:{status:'local'}
 };
 const envelope=loadEnvelope();
 const existing=envelope.runs.find(item=>item.runId===run.runId);
 if(existing)return existing;
 envelope.runs=trimRuns([run,...envelope.runs.filter(item=>item.runId!==run.runId)]);
 const savedAs=saveEnvelope(envelope);
 if(run.persistence!==savedAs){run.persistence=savedAs;envelope.runs=envelope.runs.map(item=>item.runId===run.runId?run:item);saveEnvelope(envelope)}
 return run;
}

function periodMatches(run,period,now=new Date()){
 if(period==='today')return localDateKey(run.finishedAt)===localDateKey(now);
 if(period==='week')return new Date(run.finishedAt).getTime()>=now.getTime()-7*24*60*60*1000;
 return true;
}

function metric(run,key){return integer(run?.metrics?.[key]);}

export function compareRuns(a,b){
 if(a.gameId!==b.gameId)return String(a.gameId).localeCompare(String(b.gameId));
 if(a.mode!==b.mode)return String(a.mode).localeCompare(String(b.mode));
 const outcomeRank={clear:0,failed:1,aborted:2},outcomeDiff=(outcomeRank[a.outcome]??2)-(outcomeRank[b.outcome]??2);
 if(outcomeDiff)return outcomeDiff;
 const aClear=a.outcome==='clear',bClear=b.outcome==='clear';
 const timedClear=['crossing','miner'].includes(a.gameId)||(a.gameId==='bricks'&&a.mode==='classic')||(a.gameId==='platformer'&&a.mode!=='endless');
 if(timedClear&&aClear&&bClear&&a.durationMs!==b.durationMs)return a.durationMs-b.durationMs;
 if(!aClear&&a.gameId==='crossing'){
  if(metric(a,'crossings')!==metric(b,'crossings'))return metric(b,'crossings')-metric(a,'crossings');
  if(metric(a,'progressRows')!==metric(b,'progressRows'))return metric(b,'progressRows')-metric(a,'progressRows');
 }
 if(!aClear&&a.gameId==='miner'&&metric(a,'ores')!==metric(b,'ores'))return metric(b,'ores')-metric(a,'ores');
 if(a.score!==b.score)return b.score-a.score;
 if(a.durationMs!==b.durationMs)return b.durationMs-a.durationMs;
 return String(a.runId).localeCompare(String(b.runId));
}

export function listRuns({gameId,mode,period='all',limit=MAX_RUNS,now=new Date(),includeAborted=false}={}){
 return loadEnvelope().runs.filter(run=>(!gameId||run.gameId===gameId)&&(!mode||run.mode===mode)&&periodMatches(run,period,now)&&run.rulesetVersion===RULESET_VERSIONS[run.gameId]&&(includeAborted||run.outcome!=='aborted')).sort(compareRuns).slice(0,limit);
}

export function getBestRun(query={}){return listRuns({...query,limit:1})[0]||null}

export function getGameStats({gameId,mode}={}){
 const runs=listRuns({gameId,mode,period:'all'});
 const metricTotals={},metricMaximums={};
 runs.forEach(run=>Object.entries(run.metrics||{}).forEach(([key,value])=>{
  if(typeof value!=='number')return;
  metricTotals[key]=(metricTotals[key]||0)+value;
  metricMaximums[key]=Math.max(metricMaximums[key]||0,value);
 }));
 return {
  attempts:runs.length,clears:runs.filter(run=>run.outcome==='clear').length,
  longestDurationMs:runs.reduce((max,run)=>Math.max(max,run.durationMs||0),0),
  bestScore:runs.reduce((max,run)=>Math.max(max,run.score||0),0),metricTotals,metricMaximums
 };
}

export function formatScore(value){return integer(value).toLocaleString('zh-CN')}

export const SCORE_FORMULAS={
 blocks:'消行分 + 生存秒数 × 10 + 通关奖励 3,000',
 snake:'吃到食物 × 500 + 生存秒数 × 10 + 通关奖励 3,000',
 bricks:'击碎砖块 × 100 + 生存秒数 × 10 + 通关奖励 3,000',
 racer:'成功避让车辆 × 200 + 生存秒数 × 10 + 通关奖励 3,000',
 crossing:'抵达次数 × 1,000 + 时间奖励 + 通关奖励 3,000',
 plane:'击破数 × 100 + 生存秒数 × 10 + 通关奖励 3,000',
 pinball:'机台原始分 × 10 + 生存秒数 × 10 + 通关奖励 3,000',
 train:'安全避让 × 250 + 生存秒数 × 10 + 通关奖励 3,000',
 submarine:'成功规避 × 250 + 生存秒数 × 10 + 通关奖励 3,000',
 skate:'成功越障 × 250 + 生存秒数 × 10 + 通关奖励 3,000',
 bomb:'正确拆除 × 900 + 完美连锁 × 250 − 误操作 × 300 + 生存奖励',
 elevator:'成功运送 × 450 + 紧急处置 × 150 − 漏接 × 100 + 生存奖励',
 lighthouse:'成功救援 × 650 + 最长锁定 × 120 − 误报 × 250 + 生存奖励',
 goalie:'扑救 × 750 + 完美扑救 × 250 − 失球 × 300 + 生存奖励',
 courier:'完成投递 × 800 + 完美路线 × 250 − 车辆损伤 × 200 + 生存奖励',
 stealth:'通过房间 × 1,000 + 无警报房间 × 350 − 警报 × 500 + 生存奖励',
 rhythm:'有效命中 × 60 + 完美命中 × 80 + 最高连击 × 20 − 漏拍 × 40',
 weather:'保护城区 × 900 + 化解危机 × 300 + 系统完整度奖励 + 生存奖励',
 platformer:'最远距离每 10 像素计 1 分（取整）+ 齿轮 × 100 + 踩敌 × 150 + 检查点 × 500 − 失误 × 200；闯关通关 +3,000，180 秒内每提前 1 秒 +10；最低 0 分',
 nightwatch:'击败僵尸 × 100 + 完成波次 × 500；通关 +3,000，剩余基地耐久 × 200（仅通关）；建造、升级和等待不计分'
};

export function clearLocalRuns(){storage().removeItem(STORAGE_KEY)}

const API_BASE=(import.meta.env?.VITE_SCORE_API_URL||'').replace(/\/$/,'');
export const scoreServiceConfigured=Boolean(API_BASE);

async function scoreRequest(path,options={}){
 if(!API_BASE)throw new Error('Score service is not configured');
 const response=await fetch(`${API_BASE}${path}`,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});
 if(!response.ok)throw new Error(`Score service error ${response.status}`);
 return response.json();
}

export function startVerifiedRun(query){return scoreRequest('/v1/runs/start',{method:'POST',body:JSON.stringify(query)})}
export function submitVerifiedRun({runToken,inputLog,checkpoints}){return scoreRequest('/v1/runs/finish',{method:'POST',body:JSON.stringify({runToken,inputLog,checkpoints})})}
export function fetchVerifiedLeaderboard(query){const params=new URLSearchParams(query);return scoreRequest(`/v1/leaderboards?${params}`)}
