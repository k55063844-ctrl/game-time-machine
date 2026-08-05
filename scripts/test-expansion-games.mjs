import assert from 'node:assert/strict';
import {
 newGameIdsA,newGameMetaA,newGameTilesA,newGameLandingA,newGameViewA
} from '../src/new-games-a.js';
import {
 newGameIdsB,newGameMetaB,newGameTilesB,newGameLandingB,newGameViewB
} from '../src/new-games-b.js';

const expected=['bomb','elevator','lighthouse','goalie','courier','stealth','rhythm','weather'];
const ids=[...newGameIdsA,...newGameIdsB];
const meta={...newGameMetaA,...newGameMetaB};

assert.deepEqual(ids,expected,'all recommended games are registered in library order');
assert.equal(new Set(ids).size,8,'game ids remain unique');
assert.deepEqual(ids.map(id=>meta[id].no),['12','13','14','15','16','17','18','19']);

const tiles=newGameTilesA()+newGameTilesB();
for(const id of ids){
 const groupA=newGameIdsA.includes(id);
 const landing=groupA?newGameLandingA(id):newGameLandingB(id);
 const view=groupA?newGameViewA(id,'extreme'):newGameViewB(id,'extreme');
 const startAttribute=groupA?`data-new-game-start="${id}"`:`data-start-new-b="${id}"`;
 const modeAttribute=groupA?'data-new-game-mode=':'data-new-b-mode=';
 const openAttribute=groupA?`data-open-new-game="${id}"`:`data-open-new-b="${id}"`;
 assert.match(tiles,new RegExp(openAttribute),`${id} has a library entry`);
 assert.match(landing,new RegExp(startAttribute),`${id} has a playable start action`);
 for(const mode of ['extreme','endless','shadow'])assert.match(landing,new RegExp(`${modeAttribute}"${mode}"`),`${id} exposes ${mode}`);
 assert.match(view,/<canvas\b/,`${id} has a rendered playfield`);
 assert.match(view,/本机真实(?:事件)?计分/,`${id} labels local event scoring honestly`);
}

console.log('expansion-games: all assertions passed');
