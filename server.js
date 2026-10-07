import http from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {WebSocketServer,WebSocket} from 'ws';
const blocks=new Map(), players=new Map();
const key=(x,y,z)=>`${x},${y},${z}`;
for(let x=-20;x<=20;x++)for(let z=-20;z<=20;z++){
 const h=2+Math.floor(Math.sin(x*.2)*Math.cos(z*.23)*2);
 for(let y=0;y<=h;y++)blocks.set(key(x,y,z),y===h?'grass':y===0?'stone':'dirt');
 if((x*31+z*17)%107===0 && Math.abs(x)>4){for(let y=h+1;y<h+5;y++)blocks.set(key(x,y,z),'wood');for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=4;dy<=5;dy++)blocks.set(key(x+dx,h+dy,z+dz),'leaves');}
}
mkdirSync('data',{recursive:true});
if(existsSync('data/world.json')){try{for(const [k,v] of JSON.parse(readFileSync('data/world.json')))v===null?blocks.delete(k):blocks.set(k,v);}catch(e){console.error('Sauvegarde illisible:',e.message);}}
const changes=new Map(existsSync('data/world.json')?JSON.parse(readFileSync('data/world.json')):[]);
const save=()=>{writeFileSync('data/world.tmp',JSON.stringify([...changes]));renameSync('data/world.tmp','data/world.json');};
const server=http.createServer((req,res)=>{
 const path=req.url.split('?')[0];
 const files={'/':['public/index.html','text/html'],'/game.js':['public/game.js','text/javascript'],'/transport.js':['public/transport.js','text/javascript'],'/world.js':['public/world.js','text/javascript'],'/style.css':['public/style.css','text/css'],'/three.js':['node_modules/three/build/three.module.js','text/javascript'],'/three.core.js':['node_modules/three/build/three.core.js','text/javascript'],'/health':[null,'application/json']};
 if(!files[path]){res.writeHead(404);return res.end('Introuvable');}const [file,type]=files[path];res.writeHead(200,{'Content-Type':type});res.end(file?readFileSync(file):JSON.stringify({ok:true,players:players.size}));
});
const wss=new WebSocketServer({server,maxPayload:2048});
const broadcast=m=>{const s=JSON.stringify(m);for(const c of wss.clients)if(c.readyState===WebSocket.OPEN)c.send(s);};
let next=1;
wss.on('connection',ws=>{
 if(players.size>=24){ws.close(1013,'Serveur complet');return;}
 const id=String(next++); const p={id,name:`Joueur ${id}`,x:0,y:8,z:0,yaw:0};players.set(id,p);
 ws.send(JSON.stringify({type:'init',id,blocks:[...blocks],players:[...players.values()]}));broadcast({type:'player',player:p});
 let window=Date.now(),count=0;
 ws.on('message',raw=>{if(Date.now()-window>1000){window=Date.now();count=0;}if(++count>50)return;
 try{const m=JSON.parse(raw);
 if(m.type==='move'&&['x','y','z','yaw'].every(k=>Number.isFinite(m[k]))&&Math.abs(m.x)<40&&Math.abs(m.z)<40&&m.y>-20&&m.y<60){Object.assign(p,{x:m.x,y:m.y,z:m.z,yaw:m.yaw});broadcast({type:'player',player:p});}
 if(m.type==='name'){p.name=String(m.name).trim().slice(0,20)||`Joueur ${id}`;broadcast({type:'player',player:p});}
 if(m.type==='block'&&[m.x,m.y,m.z].every(Number.isInteger)&&Math.abs(m.x)<=22&&Math.abs(m.z)<=22&&m.y>0&&m.y<24&&Math.hypot(m.x-p.x,m.y-p.y,m.z-p.z)<8&&[null,'grass','dirt','stone','wood','leaves','sand','brick'].includes(m.block)){
 const k=key(m.x,m.y,m.z);if(m.block===null)blocks.delete(k);else blocks.set(k,m.block);changes.set(k,m.block);broadcast({...m,type:'block'});
 }
 if(m.type==='chat'){const text=String(m.text).trim().slice(0,160);if(text)broadcast({type:'chat',name:p.name,text});}
 }catch{}});
 ws.on('close',()=>{players.delete(id);broadcast({type:'leave',id});});
});
setInterval(save,5000).unref();
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Bloc Club écoute sur le port',server.address().port));
process.on('SIGTERM',()=>{save();process.exit(0);});
