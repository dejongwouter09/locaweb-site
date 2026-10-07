import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import handler from '../api/game.js';
const name=`bloc-redis-test-${randomUUID()}`;
const nativeFetch=globalThis.fetch,oldNow=Date.now;let now=oldNow();
const redis=command=>execFileSync('docker',['exec',name,'redis-cli','--raw',...command.map(String)],{encoding:'utf8'}).trim();
try{
 execFileSync('docker',['run','-d','--name',name,'redis:7-alpine'],{stdio:'pipe'});
 for(let n=0;n<20;n++){try{if(redis(['PING'])==='PONG')break;}catch{}await new Promise(r=>setTimeout(r,100));}
 process.env.UPSTASH_REDIS_REST_URL='https://redis-test.example';process.env.UPSTASH_REDIS_REST_TOKEN='test-only';process.env.BLOC_WORLD_KEY='test:world';
 Date.now=()=>now;
 globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://redis-test.example');assert.equal(opts.headers.Authorization,'Bearer test-only');const result=redis(JSON.parse(opts.body));return {ok:true,json:async()=>({result})};};
 function client(){let cookie='';return async(body,expected=200,advance=true)=>{if(advance)now+=200;const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(value){this.body=value;return this;}};await handler({method:'POST',headers:{host:'game.example',origin:'https://game.example',cookie},body},res);assert.equal(res.code,expected,JSON.stringify(res.body));if(res.headers['Set-Cookie'])cookie=res.headers['Set-Cookie'].split(';')[0];return res.body;};}
 const a=client(),b=client();const one=await a({type:'join'}),two=await b({type:'join'});assert.notEqual(one.id,two.id);assert.ok(one.blocks.length>1000);assert.equal(two.players.length,2);
 const edits=await a({type:'sync',seq:one.seq,messages:[{type:'move',x:0,y:5,z:0,yaw:0},{type:'name',name:'Bâtisseur 🧱'},{type:'block',x:0,y:5,z:1,block:'brick'},{type:'chat',text:'Bonjour 🧱 !'}]});
 const received=await b({type:'sync',seq:two.seq,messages:[]});assert.ok(received.events.some(m=>m.type==='block'&&m.block==='brick'));assert.ok(received.events.some(m=>m.type==='chat'&&m.text==='Bonjour 🧱 !'&&m.name==='Bâtisseur 🧱'));
 const third=await client()({type:'join'});assert.equal(new Map(third.blocks).get('0,5,1'),'brick');
 const deletion=await a({type:'sync',seq:edits.seq,messages:[{type:'block',x:0,y:5,z:1,block:null},{type:'block',x:22,y:23,z:22,block:'wood'},{type:'block',x:0,y:0,z:0,block:null}]});assert.ok(deletion.events.some(m=>m.type==='block'&&m.block===null));assert.ok(!deletion.events.some(m=>m.type==='block'&&(m.x===22||m.y===0)));
 await a({type:'sync',seq:deletion.seq,messages:[]},429,false);
 for(let n=0;n<260;n++)await a({type:'sync',seq:0,messages:[{type:'move',x:0,y:5,z:0,yaw:0}]});
 const sync=await a({type:'sync',seq:0,messages:[]});assert.equal(sync.resync,true);assert.equal(sync.type,'init');assert.equal(new Map(sync.blocks).has('0,5,1'),false);
 assert.equal(JSON.parse(redis(['GET','test:world'])).changes['0,5,1'],null);
 console.log('Redis réel : sessions, monde partagé, chat Unicode, sauvegarde, suppression, limites de distance, fréquence et resynchronisation vérifiés.');
}finally{globalThis.fetch=nativeFetch;Date.now=oldNow;try{execFileSync('docker',['rm','-f',name],{stdio:'pipe'});}catch{}}
