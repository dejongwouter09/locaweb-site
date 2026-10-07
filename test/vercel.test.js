import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/game.js';
import {generateWorld} from '../public/world.js';
const response=()=>({headers:{},code:200,setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('Vercel API validates requests and offers solo when Redis is absent',async()=>{
 for(const key of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','KV_REST_API_URL','KV_REST_API_TOKEN'])delete process.env[key];
 let res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.code,405);
 res=response();await handler({method:'POST',headers:{host:'game.example',origin:'https://other.example'},body:{type:'join'}},res);assert.equal(res.code,403);
 res=response();await handler({method:'POST',headers:{},body:{type:'sync',messages:[null]}},res);assert.equal(res.code,400);
 res=response();await handler({method:'POST',headers:{},body:{type:'join'}},res);assert.equal(res.body.mode,'solo');
});
test('solo transport edits terrain and restores the browser save',async()=>{
 const nativeFetch=globalThis.fetch;const storage=new Map();
 globalThis.document={querySelector:()=>({})};globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 globalThis.fetch=async(url,opts)=>{const res=response();await handler({method:'POST',headers:{},body:JSON.parse(opts.body)},res);return {ok:res.code===200,json:async()=>res.body};};
 const {connect}=await import('../public/transport.js');let socket;
 try{socket=connect();const init=await new Promise(resolve=>socket.onmessage=e=>resolve(JSON.parse(e.data)));assert.equal(init.mode,'solo');assert.deepEqual(new Map(init.blocks),generateWorld());
 socket.send(JSON.stringify({type:'block',x:0,y:5,z:1,block:'brick'}));socket.send(JSON.stringify({type:'block',x:0,y:0,z:0,block:null}));socket.close();
 socket=connect();const restored=await new Promise(resolve=>socket.onmessage=e=>resolve(JSON.parse(e.data)));assert.equal(new Map(restored.blocks).get('0,5,1'),'brick');assert.equal(new Map(restored.blocks).has('0,0,0'),false);
 }finally{socket?.close();globalThis.fetch=nativeFetch;delete globalThis.document;delete globalThis.localStorage;}
});
