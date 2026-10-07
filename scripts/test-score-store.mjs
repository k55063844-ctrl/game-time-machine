import assert from 'node:assert/strict';
import {
 clearLocalRuns,
 recordRun,
 listRuns,
 getBestRun,
 getGameStats,
 calculateRunScore,
 RULESET_VERSIONS,
 SCORE_FORMULAS
} from '../src/score-store.js';

const run=(overrides={})=>recordRun({
 gameId:'blocks',
 mode:'extreme',
 outcome:'failed',
 durationMs:10_000,
 metrics:{linePoints:100,lines:1},
 ...overrides
});

clearLocalRuns();

assert.equal(calculateRunScore({gameId:'blocks',durationMs:40_000,metrics:{linePoints:800}}),1200);
assert.equal(calculateRunScore({gameId:'snake',outcome:'clear',durationMs:180_000,metrics:{foods:3}}),6300);

const expansionScoreCases=[
 ['bomb',{modulesDisarmed:4,perfectChains:2,mistakes:1},3_800],
 ['elevator',{passengersDelivered:5,emergencyStops:1,missedCalls:2},2_200],
 ['lighthouse',{rescues:3,maxLockStreak:4,falseSignals:1},2_180],
 ['goalie',{saves:4,perfectSaves:2,goalsConceded:1},3_200],
 ['courier',{deliveries:3,perfectRoutes:2,damage:1},2_700],
 ['stealth',{roomsCleared:2,silentRooms:1,alarms:1},1_850],
 ['rhythm',{hits:20,perfectHits:8,maxCombo:12,misses:3},1_960],
 ['weather',{districtsProtected:3,crisesResolved:2,systemIntegrity:80},4_100]
];
expansionScoreCases.forEach(([gameId,metrics,expected])=>{
 assert.equal(calculateRunScore({gameId,durationMs:0,metrics}),expected,`${gameId} score uses raw gameplay metrics`);
});
assert.throws(()=>recordRun({gameId:'bomb',mode:'extreme',outcome:'failed',durationMs:1_000,metrics:{mistakes:1}}),/Missing metric/);

const platformerMetrics={distance:3569,coins:7,stomps:3,checkpoints:2,deaths:1};
const nightwatchMetrics={kills:23,wavesCleared:4,towersBuilt:5,upgrades:2,baseHp:3};
assert.equal(RULESET_VERSIONS.platformer,'platformer@2.0.0','the longer hell-difficulty route has a separate ruleset');
assert.match(SCORE_FORMULAS.platformer,/齿轮 × 100/,'score explanations match the new collectible artwork');
assert.equal(calculateRunScore({gameId:'platformer',metrics:platformerMetrics}),2306,'platformer awards progress and actions, with death penalties');
assert.equal(calculateRunScore({gameId:'platformer',mode:'extreme',outcome:'clear',durationMs:90_000,metrics:platformerMetrics}),6206,'platformer goal clear awards speed and completion bonuses');
assert.equal(calculateRunScore({gameId:'platformer',mode:'shadow',outcome:'clear',durationMs:200_000,metrics:platformerMetrics}),5306,'late clears do not earn negative speed bonuses');
assert.equal(calculateRunScore({gameId:'platformer',mode:'endless',outcome:'clear',durationMs:90_000,metrics:platformerMetrics}),2306,'endless distance runs have no goal-clear bonuses');
assert.equal(calculateRunScore({gameId:'platformer',metrics:{distance:19.9}}),1,'distance scoring floors the actual traveled distance');
assert.equal(calculateRunScore({gameId:'platformer',metrics:{deaths:10}}),0,'death penalties cannot produce negative scores');
assert.equal(calculateRunScore({gameId:'nightwatch',metrics:nightwatchMetrics}),4300,'nightwatch awards only kills and completed waves before clearing');
assert.equal(calculateRunScore({gameId:'nightwatch',outcome:'clear',metrics:nightwatchMetrics}),7900,'nightwatch clear rewards remaining base health');
assert.equal(calculateRunScore({gameId:'nightwatch',outcome:'clear',metrics:{...nightwatchMetrics,baseHp:99}}),8300,'base health bonuses respect the five-health ruleset');
for(const [gameId,metrics] of [['platformer',platformerMetrics],['nightwatch',nightwatchMetrics]]){
 assert.equal(calculateRunScore({gameId,mode:'endless',durationMs:500_000,metrics}),calculateRunScore({gameId,mode:'endless',durationMs:1_000,metrics}),`${gameId} cannot farm points by waiting`);
 assert.throws(()=>recordRun({gameId,mode:'classic',metrics}),/Invalid mode/,`${gameId} rejects an unsupported mode`);
 for(const requiredKey of Object.keys(metrics)){
  const incomplete={...metrics};delete incomplete[requiredKey];
  assert.throws(()=>recordRun({gameId,mode:'extreme',metrics:incomplete}),new RegExp(`Missing metric for ${gameId}: ${requiredKey}`));
 }
}
assert.equal(calculateRunScore({gameId:'nightwatch',metrics:{...nightwatchMetrics,towersBuilt:1000,upgrades:1000,baseHp:5}}),4300,'construction, upgrades and unspent health cannot farm points');

const first=run({durationMs:40_000,metrics:{linePoints:800,lines:4}});
const second=run({outcome:'clear',durationMs:180_000,metrics:{linePoints:300,lines:2}});
recordRun({gameId:'blocks',mode:'survival',outcome:'failed',durationMs:90_000,metrics:{linePoints:100,lines:1}});

assert.equal(first.rulesetVersion,RULESET_VERSIONS.blocks);
assert.equal(getBestRun({gameId:'blocks',mode:'extreme'}).runId,second.runId,'clear runs rank above failed runs');
assert.equal(listRuns({gameId:'blocks',mode:'extreme'}).length,2,'modes remain isolated');

const stats=getGameStats({gameId:'blocks'});
assert.equal(stats.attempts,3);
assert.equal(stats.clears,1);
assert.equal(stats.metricTotals.lines,7);

const slowClear=recordRun({gameId:'crossing',mode:'extreme',outcome:'clear',durationMs:120_000,metrics:{crossings:12,progressRows:13}});
const fastClear=recordRun({gameId:'crossing',mode:'extreme',outcome:'clear',durationMs:90_000,metrics:{crossings:12,progressRows:13}});
assert.equal(getBestRun({gameId:'crossing',mode:'extreme'}).runId,fastClear.runId,'timed clears rank by lower duration');
assert.notEqual(slowClear.score,fastClear.score);

const platformerSlow=recordRun({gameId:'platformer',mode:'extreme',outcome:'clear',durationMs:150_000,metrics:{...platformerMetrics,coins:100}});
const platformerFast=recordRun({gameId:'platformer',mode:'extreme',outcome:'clear',durationMs:75_000,metrics:platformerMetrics});
assert.ok(platformerSlow.score>platformerFast.score);
assert.equal(getBestRun({gameId:'platformer',mode:'extreme'}).runId,platformerFast.runId,'platformer completed routes rank faster clears before coin scores');
recordRun({gameId:'platformer',mode:'extreme',outcome:'failed',durationMs:30_000,metrics:{...platformerMetrics,coins:500}});
assert.equal(getBestRun({gameId:'platformer',mode:'extreme'}).runId,platformerFast.runId,'platformer clears outrank partial runs even with more points');
for(const mode of ['extreme','endless','shadow']){
 const survivalScore=recordRun({gameId:'nightwatch',mode,outcome:'failed',durationMs:240_000,metrics:{...nightwatchMetrics,kills:10,wavesCleared:2}});
 const combatScore=recordRun({gameId:'nightwatch',mode,outcome:'failed',durationMs:120_000,metrics:nightwatchMetrics});
 assert.ok(combatScore.score>survivalScore.score);
 assert.equal(getBestRun({gameId:'nightwatch',mode}).runId,combatScore.runId,`nightwatch ${mode} ranks combat progress before time`);
}
const platformerEndless=recordRun({gameId:'platformer',mode:'endless',outcome:'failed',durationMs:60_000,metrics:platformerMetrics});
recordRun({gameId:'platformer',mode:'endless',outcome:'failed',durationMs:120_000,metrics:{...platformerMetrics,coins:0}});
assert.equal(getBestRun({gameId:'platformer',mode:'endless'}).runId,platformerEndless.runId,'endless platformer runs rank score before time');

clearLocalRuns();
const longLow=run({durationMs:200_000,metrics:{linePoints:100,lines:1}});
const shortHigh=run({durationMs:10_000,metrics:{linePoints:4_000,lines:4}});
assert.equal(getBestRun({gameId:'blocks',mode:'extreme'}).runId,shortHigh.runId,'score outranks survival time for equal outcomes');
assert.notEqual(longLow.runId,shortHigh.runId);

clearLocalRuns();
const stableId='run_idempotent_test';
const original=run({runId:stableId,metrics:{linePoints:500,lines:2}});
const duplicate=run({runId:stableId,metrics:{linePoints:9_999,lines:99}});
run({runId:'run_aborted_test',outcome:'aborted'});
assert.equal(duplicate.score,original.score,'a duplicate runId cannot overwrite a settled run');
assert.equal(listRuns({gameId:'blocks',mode:'extreme'}).length,1,'aborted runs are excluded from rankings');
assert.equal(listRuns({gameId:'blocks',mode:'extreme',includeAborted:true}).length,2);

clearLocalRuns();
const browserStorage=new Map();
globalThis.localStorage={
 getItem:key=>browserStorage.has(key)?browserStorage.get(key):null,
 setItem:(key,value)=>browserStorage.set(key,String(value)),
 removeItem:key=>browserStorage.delete(key)
};

const stored=recordRun({gameId:'plane',mode:'extreme',outcome:'failed',durationMs:35_000,metrics:{eventScore:4}});
assert.equal(stored.persistence,'device');
const storedPlatformer=recordRun({gameId:'platformer',mode:'shadow',outcome:'clear',durationMs:90_000,metrics:platformerMetrics,score:999_999});
const storedNightwatch=recordRun({gameId:'nightwatch',mode:'endless',outcome:'failed',durationMs:60_000,metrics:nightwatchMetrics,score:999_999});
assert.equal(storedPlatformer.score,6206,'caller-supplied platformer score is ignored');
assert.equal(storedNightwatch.score,4300,'caller-supplied nightwatch score is ignored');
const fractionalPlatformer=recordRun({gameId:'platformer',mode:'endless',outcome:'failed',durationMs:0,metrics:{distance:19.9,coins:0,stomps:0,checkpoints:0,deaths:0}});
assert.equal(fractionalPlatformer.metrics.distance,19,'stored furthest distance floors consistently with the score formula');
assert.equal(fractionalPlatformer.score,1);

const storedEnvelope=JSON.parse(browserStorage.get('tm:v1:runs'));
storedEnvelope.runs.forEach(item=>{item.score=99_999_999;});
storedEnvelope.runs.push({...storedPlatformer,runId:'invalid_platformer_mode',mode:'classic'});
storedEnvelope.runs.push({...storedNightwatch,runId:'invalid_nightwatch_metrics',metrics:{kills:999}});
browserStorage.set('tm:v1:runs',JSON.stringify(storedEnvelope));

const reloaded=await import(`../src/score-store.js?reload=${Date.now()}`);
assert.equal(reloaded.getBestRun({gameId:'plane',mode:'extreme'}).score,750,'stored display scores are recalculated from raw metrics');
assert.equal(reloaded.getBestRun({gameId:'platformer',mode:'shadow'}).score,6206,'platformer stored score is rebuilt from gameplay on reload');
assert.equal(reloaded.getBestRun({gameId:'nightwatch',mode:'endless'}).score,4300,'nightwatch stored score is rebuilt from gameplay on reload');
assert.deepEqual(reloaded.getBestRun({gameId:'platformer',mode:'shadow'}).metrics,platformerMetrics,'platformer metrics survive a storage roundtrip');
assert.deepEqual(reloaded.getBestRun({gameId:'nightwatch',mode:'endless'}).metrics,nightwatchMetrics,'nightwatch metrics survive a storage roundtrip');
assert.equal(reloaded.getBestRun({gameId:'platformer',mode:'shadow'}).rulesetVersion,RULESET_VERSIONS.platformer);
assert.equal(reloaded.getBestRun({gameId:'nightwatch',mode:'endless'}).rulesetVersion,RULESET_VERSIONS.nightwatch);
assert.equal(reloaded.listRuns({gameId:'platformer'}).length,2,'invalid stored platformer modes are excluded');
assert.equal(reloaded.listRuns({gameId:'nightwatch'}).length,1,'incomplete stored nightwatch metrics are excluded');

const currentEnvelope=JSON.parse(browserStorage.get('tm:v1:runs'));
const historicPlatformer={...storedPlatformer,runId:'historic_platformer_v1',rulesetVersion:'platformer@1.0.0',score:888_888};
currentEnvelope.runs.push(historicPlatformer);
currentEnvelope.runs.push({...storedPlatformer,runId:'malformed_active_metrics',metrics:null});
currentEnvelope.runs.push({...storedPlatformer,runId:'out_of_range_started_date',finishedAt:-8_640_000_000_000_000});
currentEnvelope.archivedRuns=[
 {...historicPlatformer,runId:'existing_historic_run',mode:'retired-mode'},
 {...historicPlatformer,runId:'bad_version',rulesetVersion:'<script>bad</script>'},
 {...historicPlatformer,runId:'wrong_game_version',rulesetVersion:'snake@1.0.0'},
 {...historicPlatformer,runId:'unknown_game',gameId:'unknown'},
 {...historicPlatformer,runId:'bad_archive_metrics',metrics:[]},
 {...historicPlatformer,runId:'bad_archive_date',finishedAt:'not a date'},
 {...historicPlatformer,runId:'bad_archive_date_boundary',finishedAt:-8_640_000_000_000_000},
 {...storedPlatformer,runId:'current_in_archive',score:999_999_999},
 null
];
browserStorage.set('tm:v1:runs',JSON.stringify(currentEnvelope));
assert.equal(reloaded.listRuns({gameId:'platformer'}).length,2,'old rulesets and malformed records never enter current ranks');
assert.equal(reloaded.getGameStats({gameId:'platformer'}).attempts,2,'old rulesets do not inflate current stats');
assert.equal(reloaded.getBestRun({gameId:'platformer',mode:'shadow'}).runId,storedPlatformer.runId,'untrusted historic scores cannot replace the current best');
reloaded.recordRun({gameId:'nightwatch',mode:'shadow',outcome:'failed',durationMs:1_000,metrics:nightwatchMetrics});
let archivedEnvelope=JSON.parse(browserStorage.get('tm:v1:runs'));
assert.equal(archivedEnvelope.archivedRuns.length,2,'only bounded, well-shaped historical data is preserved');
assert.equal(archivedEnvelope.runs.some(item=>item.runId===historicPlatformer.runId),false,'historical records move to a separate collection');
assert.equal(archivedEnvelope.archivedRuns.find(item=>item.runId===historicPlatformer.runId).score,888_888,'historical scores are not silently recalculated with new rules');
assert.deepEqual(archivedEnvelope.archivedRuns.find(item=>item.runId===historicPlatformer.runId).metrics,platformerMetrics,'historic gameplay metrics remain available for future export');
assert.equal(archivedEnvelope.archivedRuns.find(item=>item.runId==='existing_historic_run').mode,'retired-mode','valid retired modes can be archived without entering current modes');
assert.equal(archivedEnvelope.archivedRuns.every(item=>item.verification.status==='historical-unverified'),true,'stored historical values are explicitly unverified');
reloaded.recordRun({gameId:'blocks',mode:'shadow',outcome:'failed',durationMs:1_000,metrics:{linePoints:10}});
assert.equal(JSON.parse(browserStorage.get('tm:v1:runs')).archivedRuns.length,2,'saving a second unrelated run does not erase history');
assert.equal(reloaded.getBestRun({gameId:'plane',mode:'extreme'}).score,750,'archival does not change other games scores');

archivedEnvelope=JSON.parse(browserStorage.get('tm:v1:runs'));
archivedEnvelope.archivedRuns=Array.from({length:550},(_,index)=>({...historicPlatformer,runId:`archive_capacity_${index}`,finishedAt:new Date(Date.UTC(2026,0,1)+index*1_000).toISOString()}));
browserStorage.set('tm:v1:runs',JSON.stringify(archivedEnvelope));
reloaded.recordRun({gameId:'blocks',mode:'shadow',outcome:'failed',durationMs:2_000,metrics:{linePoints:20}});
const boundedArchive=JSON.parse(browserStorage.get('tm:v1:runs')).archivedRuns;
assert.equal(boundedArchive.length,500,'historical storage has its own bounded capacity');
assert.equal(boundedArchive[0].runId,'archive_capacity_549','archive retention prioritizes the most recent history');
assert.equal(reloaded.listRuns({gameId:'platformer'}).length,2,'archive capacity does not consume current-run capacity');

reloaded.clearLocalRuns();
assert.equal(browserStorage.has('tm:v1:runs'),false,'clear local history also clears the archived collection');
globalThis.localStorage={
 getItem:()=>null,
 setItem:()=>{throw new Error('storage blocked')},
 removeItem:()=>{}
};
const sessionRun=reloaded.recordRun({gameId:'snake',mode:'extreme',outcome:'failed',durationMs:12_000,metrics:{foods:1}});
assert.equal(sessionRun.persistence,'session','storage failures must be visible instead of pretending a save succeeded');

reloaded.clearLocalRuns();
delete globalThis.localStorage;

console.log('score-store: all assertions passed');
