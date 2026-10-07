import {generateWorld} from './world.js';
export function connect(){
 if(!document.querySelector('meta[name="bloc-transport"][content="vercel"]'))return new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);
 const socket={readyState:0,onmessage:null,onclose:null,onerror:null},queue=[];
 let movement=null,seq=0,stopped=false,solo=false,changes=new Map();
 const emit=m=>socket.onmessage?.({data:JSON.stringify(m)});
 const request=async body=>{const r=await fetch('/api/game',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});const result=await r.json();if(!r.ok)throw new Error(result.error||`HTTP ${r.status}`);return result;};
 socket.send=raw=>{const m=JSON.parse(raw);if(solo){if(m.type==='block'){changes.set(`${m.x},${m.y},${m.z}`,m.block);try{localStorage.setItem('blocclub-world-v1',JSON.stringify([...changes]));}catch{emit({type:'chat',name:'Système',text:'Sauvegarde locale indisponible.'});}emit(m);}if(m.type==='chat')emit({type:'chat',name:'Système',text:'Le chat sera disponible après activation du multijoueur.'});return;}if(m.type==='move')movement=m;else if(queue.length<16)queue.push(m);};
 socket.close=()=>{stopped=true;socket.readyState=3;socket.onclose?.();};
 async function poll(){if(stopped)return;try{const messages=queue.splice(0,16);if(movement){messages.unshift(movement);movement=null;}const r=await request({type:'sync',seq,messages});if(r.mode==='solo')throw new Error('Configuration du serveur modifiée. Rechargez la page.');r.events.forEach(emit);seq=r.seq;if(r.resync)emit(r);}catch(e){socket.onerror?.(e);socket.close();return;}setTimeout(poll,400);}
 setTimeout(async()=>{try{const initial=await request({type:'join'});socket.readyState=1;if(initial.mode==='solo'){solo=true;try{const saved=JSON.parse(localStorage.getItem('blocclub-world-v1')||'[]');if(Array.isArray(saved))changes=new Map(saved);}catch{}emit({type:'init',mode:'solo',id:'local',blocks:[...generateWorld(changes)],players:[]});}else{seq=initial.seq;emit(initial);setTimeout(poll,400);}}catch(e){socket.onerror?.(e);socket.close();}},0);
 return socket;
}
