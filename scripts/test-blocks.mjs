import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const definitions=source.slice(source.indexOf('const pieces='),source.indexOf('const routePages='));
const gameplay=source.slice(source.indexOf('function spawn()'),source.indexOf('function setDropSpeed('));
const keyboard=source.slice(source.indexOf("window.addEventListener('keydown',e=>{if(state.page==='game')"),source.indexOf("window.addEventListener('keyup',e=>{if(state.page==='brick-game'"));

function fixture(){
 const nodes=new Map();
 const node=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',dataset:{},animate(){},setAttribute(name,value){this[name]=value;}});
  return nodes.get(selector);
 };
 const state={page:'game',mode:'survival',playing:true,pieceIndex:0,piece:null,board:Array.from({length:18},()=>Array(10).fill(0)),x:3,y:0,score:0,linesCleared:0};
 let keydown;
 const context={state,structuredClone,document:{querySelector:node},finishSurvival(){state.playing=false;},finishChallenge(){state.playing=false;},window:{addEventListener(type,handler){if(type==='keydown')keydown=handler;}}};
 runInNewContext(`${definitions}\n${gameplay}\n${keyboard}`,context);
 return {...context,node,key:properties=>keydown({key:' ',code:'Space',repeat:false,preventDefault(){},...properties})};
}

test('NEXT preview follows the actual queue through successive locks',()=>{
 const game=fixture();
 game.spawn();game.draw();
 assert.equal(game.node('#blocks-next').dataset.piece,'S');
 game.move('drop');
 assert.equal(game.state.pieceType,5,'the previewed S is now the active piece');
 assert.equal(game.node('#blocks-next').dataset.piece,'L');
});

test('hard drop locks exactly one piece above the first obstacle',()=>{
 const game=fixture();
 game.state.board[17][4]=1;
 game.spawn();game.move('drop');
 assert.equal(game.state.pieceIndex,2);
 assert.equal(game.state.board[15][3],2);
 assert.equal(game.state.board[15][4],2);
 assert.equal(game.state.board[15][5],2);
 assert.equal(game.state.board[16][4],2);
 assert.equal(game.state.board[17][4],1,'the obstacle is preserved');
 assert.equal(game.state.board.flat().filter(Boolean).length,5);
});

test('rotation and locking retain shape identity for every color',()=>{
 for(const [index,expectedType] of [[0,2],[1,5],[2,8],[3,3],[4,6],[5,4],[6,7]]){
  const game=fixture();game.state.pieceIndex=index;game.spawn();
  assert.equal(game.state.pieceType,expectedType);
  game.rotate();game.move('drop');
  assert.equal(game.state.board.flat().filter(value=>value===expectedType).length,4);
 }
});

for(const [lines,points,bonus] of [[1,100,0],[2,400,200],[3,800,500],[4,1200,800]]){
 test(`${lines} simultaneous line clears award ${points} points and preserve remaining colors`,()=>{
  const game=fixture();
  for(let row=18-lines;row<18;row++)game.state.board[row]=Array.from({length:10},(_,column)=>column===4?0:1);
  game.state.piece=[[1],[1],[1],[1]];game.state.pieceType=6;game.state.x=4;game.state.y=14;
  game.lock();game.draw();
  assert.equal(game.state.score,points);
  assert.equal(game.state.linesCleared,lines);
  assert.equal(game.state.board.length,18);
  assert.equal(game.state.board.flat().filter(value=>value===6).length,4-lines);
  assert.equal(game.state.lastClear.bonus,bonus);
  assert.ok(game.node('#blocks-clear').textContent.includes(String(points)));
 });
}

test('holding Space cannot accidentally drop the newly spawned piece',()=>{
 const game=fixture();game.spawn();
 let prevented=0;
 game.key({preventDefault(){prevented++;}});
 game.key({repeat:true,preventDefault(){prevented++;}});
 assert.equal(game.state.pieceIndex,2);
 assert.equal(game.state.board.flat().filter(Boolean).length,4);
 assert.equal(prevented,2,'Space never scrolls the page');
});

test('hard drop does nothing after top-out or while a run is stopped',()=>{
 const game=fixture();game.spawn();game.state.playing=false;game.move('drop');
 assert.equal(game.state.pieceIndex,1);
 assert.equal(game.state.board.flat().filter(Boolean).length,0);
 game.state.playing=true;game.state.board[0].fill(1);game.spawn();
 const index=game.state.pieceIndex;game.move('drop');
 assert.equal(game.state.playing,false);
 assert.equal(game.state.pieceIndex,index);
});

test('Space remains available to activate focused result buttons after a run ends',()=>{
 const game=fixture();game.spawn();game.state.playing=false;
 let prevented=0;game.key({preventDefault(){prevented++;}});
 assert.equal(prevented,0,'finished-run buttons keep native Space activation');
 assert.equal(game.state.pieceIndex,1);
});
