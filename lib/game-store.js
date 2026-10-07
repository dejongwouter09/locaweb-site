// Redis executes this whole update atomically, including movement and world edits.
export const updateScript=String.raw`
local raw=redis.call('GET',KEYS[1])
local s=raw and cjson.decode(raw) or {seq=0,players={},changes={},events={}}
local m=cjson.decode(ARGV[1])
local now=tonumber(ARGV[2])
local token=ARGV[3]
local newId=ARGV[4]
local function emit(e)
 s.seq=s.seq+1
 table.insert(s.events,{seq=s.seq,message=e})
end
local function player(p)
 return {id=p.id,name=p.name,x=p.x,y=p.y,z=p.z,yaw=p.yaw}
end
for k,p in pairs(s.players) do
 if now-p.seen>30 then s.players[k]=nil;emit({type='leave',id=p.id}) end
end
local p=s.players[token]
if not p then
 if m.type~='join' then return cjson.encode({error='Session expirée',status=409}) end
 local count=0;for _ in pairs(s.players)do count=count+1 end
 if count>=12 then return cjson.encode({error='Serveur complet',status=503}) end
 p={id=newId,name='Explorateur',x=0,y=8,z=0,yaw=0,seen=now,lastChat=0}
 s.players[token]=p;emit({type='player',player=player(p)})
elseif m.type=='sync' and now-p.seen<0.15 then
 return cjson.encode({error='Trop de requêtes',status=429})
end
p.seen=now
for _,msg in ipairs(m.messages or {})do
 if msg.type=='move' then
  if type(msg.x)=='number' and type(msg.y)=='number' and type(msg.z)=='number' and type(msg.yaw)=='number' and math.abs(msg.x)<40 and math.abs(msg.z)<40 and msg.y>-20 and msg.y<60 then
   p.x=msg.x;p.y=msg.y;p.z=msg.z;p.yaw=msg.yaw;emit({type='player',player=player(p)})
  end
 elseif msg.type=='name' and type(msg.name)=='string' then
  p.name=msg.name;emit({type='player',player=player(p)})
 elseif msg.type=='block' then
  local x,y,z=msg.x,msg.y,msg.z
  local valid=type(x)=='number' and type(y)=='number' and type(z)=='number' and x==math.floor(x) and y==math.floor(y) and z==math.floor(z) and math.abs(x)<=22 and math.abs(z)<=22 and y>0 and y<24
  local blocks={grass=true,dirt=true,stone=true,wood=true,leaves=true,sand=true,brick=true}
  if valid and (msg.block==cjson.null or (type(msg.block)=='string' and blocks[msg.block])) and math.sqrt((x-p.x)^2+(y-p.y)^2+(z-p.z)^2)<8 then
   local key=string.format('%d,%d,%d',x,y,z)
   s.changes[key]=msg.block;emit({type='block',x=x,y=y,z=z,block=msg.block})
  end
 elseif msg.type=='chat' and type(msg.text)=='string' and now-p.lastChat>=1 then
  local text=msg.text
  if #text>0 then p.lastChat=now;emit({type='chat',name=p.name,text=text}) end
 end
end
while #s.events>256 do table.remove(s.events,1)end
local seq=tonumber(m.seq) or 0
local resync=m.type=='join' or (#s.events>0 and seq<s.events[1].seq-1)
local result={seq=s.seq,events={},id=p.id,resync=resync}
if resync then
 result.changes=s.changes;result.players={}
 for _,other in pairs(s.players)do table.insert(result.players,player(other))end
else
 for _,e in ipairs(s.events)do if e.seq>seq then table.insert(result.events,e.message)end end
end
redis.call('SET',KEYS[1],cjson.encode(s))
return cjson.encode(result)
`;
