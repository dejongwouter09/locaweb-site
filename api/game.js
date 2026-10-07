import {randomBytes,createHash} from 'node:crypto';
import {updateScript} from '../lib/game-store.js';
import {generateWorld} from '../public/world.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 const reply=(status,body)=>res.status(status).json(body);
 if(req.method!=='POST')return reply(405,{error:'POST requis'});
 if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return reply(403,{error:'Origine refusée'});}catch{return reply(403,{error:'Origine refusée'});}}
 let m=req.body;
 try{if(typeof m==='string')m=JSON.parse(m);}catch{return reply(400,{error:'JSON requis'});}
 if(!m||!['join','sync'].includes(m.type)||JSON.stringify(m).length>8192||!Array.isArray(m.messages??[])||(m.messages?.length??0)>17)return reply(400,{error:'Message invalide'});
 if(m.messages?.some(msg=>!msg||typeof msg!=='object'||Array.isArray(msg)))return reply(400,{error:'Message invalide'});
 if(m.seq!==undefined&&(!Number.isSafeInteger(m.seq)||m.seq<0))return reply(400,{error:'Séquence invalide'});
 if(m.messages)m.messages=m.messages.map(msg=>{const clean={...msg};if(typeof clean.name==='string')clean.name=Array.from(clean.name.trim()).slice(0,20).join('')||'Explorateur';if(typeof clean.text==='string')clean.text=Array.from(clean.text.trim()).slice(0,160).join('');return clean;});
 const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
 const secret=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
 if(!url||!secret)return reply(200,{mode:'solo',reason:'Le serveur multijoueur n’est pas encore configuré.'});
 let token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('bloc_session='))?.slice(13);
 if(!token||!/^[a-f0-9]{48}$/.test(token)){if(m.type!=='join')return reply(409,{error:'Session expirée'});token=randomBytes(24).toString('hex');}
 const tokenHash=createHash('sha256').update(token).digest('hex');
 const namespace=process.env.BLOC_WORLD_KEY||`blocclub:${process.env.VERCEL_ENV||'development'}:world:v1`;
 try{
  if(new URL(url).protocol!=='https:')throw new Error('URL Redis HTTPS requise');
  const response=await fetch(url.replace(/\/$/,''),{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',updateScript,'1',namespace,JSON.stringify(m),String(Date.now()/1000),tokenHash,randomBytes(8).toString('hex')]),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('Redis indisponible');
  const payload=await response.json();if(payload.error||typeof payload.result!=='string')throw new Error('Réponse Redis invalide');
  const result=JSON.parse(payload.result);if(result.error)return reply(result.status||503,{error:result.error});
  result.events=Array.isArray(result.events)?result.events:[];
  if(result.resync){result.type='init';result.mode='multiplayer';result.blocks=[...generateWorld(Object.entries(result.changes||{}))];result.players=Array.isArray(result.players)?result.players:[];delete result.changes;}
  if(m.type==='join')res.setHeader('Set-Cookie',`bloc_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${process.env.VERCEL?'; Secure':''}`);
  return reply(200,result);
 }catch{return reply(503,{error:'Serveur multijoueur temporairement indisponible. Réessayez plus tard.'});}
}
