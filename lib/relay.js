// Relais du jeu de société Géorama en ligne : les messages d'une salle (Table, téléphones, boîtier)
// sont gardés dans Upstash Redis, comme le fait jouer.py en mémoire sur le Mac.
const TTL = 6 * 3600;
const KEEP = 200;

// Une seule commande Redis par envoi : numéro, liste des 200 derniers messages, dernier état de la Table.
const SEND = String.raw`
local id = redis.call('INCR', KEYS[1])
redis.call('RPUSH', KEYS[2], cjson.encode({id = id, text = ARGV[1]}))
redis.call('LTRIM', KEYS[2], -${KEEP}, -1)
if ARGV[2] == '1' then redis.call('SET', KEYS[3], ARGV[1], 'EX', ${TTL}) end
redis.call('EXPIRE', KEYS[1], ${TTL})
redis.call('EXPIRE', KEYS[2], ${TTL})
return id`;

// Une seule commande par lecture : les messages plus récents que ARGV[1] (au premier appel, le dernier état).
const POLL = String.raw`
local last = tonumber(redis.call('GET', KEYS[1]) or '0')
local after = tonumber(ARGV[1])
if after < 0 then
  local state = redis.call('GET', KEYS[3])
  return cjson.encode({last = last, messages = state and {state} or {}})
end
local out = {}
for _, raw in ipairs(redis.call('LRANGE', KEYS[2], 0, -1)) do
  local m = cjson.decode(raw)
  if m.id > after then table.insert(out, m.text) end
end
return cjson.encode({last = last, messages = out})`;

export function room(req) {
  const r = String(new URL(req.url, 'http://x').searchParams.get('room') || '').toUpperCase();
  return /^[A-Z]{4}$/.test(r) ? r : null;
}

export async function redis(script, roomCode, ...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw Object.assign(new Error('Relais en ligne non configuré (Upstash Redis manquant)'), { status: 503 });
  const base = `georama:${process.env.VERCEL_ENV || 'dev'}:${roomCode}`;
  const keys = [`${base}:id`, `${base}:msgs`, `${base}:state`];
  const res = await fetch(url.replace(/\/$/, ''), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['EVAL', script, '3', ...keys, ...args.map(String)]),
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw Object.assign(new Error('Redis indisponible'), { status: 502 });
  return data.result;
}

export const SCRIPTS = { SEND, POLL };

export function fail(res, e) {
  res.statusCode = e.status || 500;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: e.message }));
}
