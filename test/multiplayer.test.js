import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {once} from 'node:events';
import WebSocket from 'ws';
const waitFor=(ws,type)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',listener);reject(new Error(`Timeout ${type}`));},5000);function listener(raw){const m=JSON.parse(raw);if(m.type===type){clearTimeout(timer);ws.off('message',listener);resolve(m);}}ws.on('message',listener);});
test('resources, shared blocks and chat between two players',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bloc-test-'));for(const p of ['public','node_modules'])symlinkSync(resolve(p),join(dir,p));
 const proc=spawn(process.execPath,[resolve('server.js')],{cwd:dir,env:{...process.env,PORT:'3137'},stdio:['ignore','pipe','pipe']});let a,b;
 try{await Promise.race([once(proc.stdout,'data'),new Promise((_,r)=>setTimeout(()=>r(new Error('Server startup timeout')),5000))]);
 for(const path of ['/','/game.js','/style.css','/three.js','/three.core.js','/health'])assert.equal((await fetch(`http://127.0.0.1:3137${path}`)).status,200);
 a=new WebSocket('ws://127.0.0.1:3137');const first=await waitFor(a,'init');b=new WebSocket('ws://127.0.0.1:3137');const second=await waitFor(b,'init');assert.notEqual(first.id,second.id);assert.ok(first.blocks.length>1000);assert.equal(second.players.length,2);
 a.send(JSON.stringify({type:'move',x:0,y:5,z:0,yaw:0}));const changed=waitFor(b,'block');a.send(JSON.stringify({type:'block',x:0,y:5,z:1,block:'brick'}));assert.equal((await changed).block,'brick');
 const chat=waitFor(b,'chat');a.send(JSON.stringify({type:'chat',text:'Bonjour !'}));assert.equal((await chat).text,'Bonjour !');
 const c=new WebSocket('ws://127.0.0.1:3137');const third=await waitFor(c,'init');assert.equal(new Map(third.blocks).get('0,5,1'),'brick');c.close();
 }finally{a?.terminate();b?.terminate();proc.kill('SIGTERM');await once(proc,'exit');rmSync(dir,{recursive:true,force:true});}
});
