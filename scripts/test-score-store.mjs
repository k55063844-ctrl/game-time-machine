import assert from 'node:assert/strict';
import {
 clearLocalRuns,
 recordRun,
 listRuns,
 getBestRun,
 getGameStats,
 calculateRunScore,
 RULESET_VERSIONS
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

const storedEnvelope=JSON.parse(browserStorage.get('tm:v1:runs'));
storedEnvelope.runs[0].score=99_999_999;
browserStorage.set('tm:v1:runs',JSON.stringify(storedEnvelope));

const reloaded=await import(`../src/score-store.js?reload=${Date.now()}`);
assert.equal(reloaded.getBestRun({gameId:'plane',mode:'extreme'}).score,750,'stored display scores are recalculated from raw metrics');

reloaded.clearLocalRuns();
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
