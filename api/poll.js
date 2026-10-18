import { fail, redis, room, SCRIPTS } from '../lib/relay.js';

export default async function handler(req, res) {
  try {
    const r = room(req);
    if (!r) return fail(res, Object.assign(new Error('Code de salle manquant'), { status: 400 }));
    const after = Number(new URL(req.url, 'http://x').searchParams.get('after') ?? -1);
    const result = JSON.parse(await redis(SCRIPTS.POLL, r, Number.isFinite(after) ? Math.floor(after) : -1));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    // Les messages sont déjà du JSON : on les recolle sans les relire.
    const msgs = Array.isArray(result.messages) ? result.messages : [];
    res.end(`{"last":${Number(result.last) || 0},"messages":[${msgs.join(",")}]}`);
  } catch (e) {
    fail(res, e);
  }
}
