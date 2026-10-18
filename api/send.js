import { fail, redis, room, SCRIPTS } from '../lib/relay.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return fail(res, Object.assign(new Error('POST attendu'), { status: 405 }));
    const r = room(req);
    if (!r) return fail(res, Object.assign(new Error('Code de salle manquant'), { status: 400 }));
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const text = JSON.stringify(body);
    if (!body || typeof body.type !== 'string' || text.length > 200_000) return fail(res, Object.assign(new Error('Message invalide'), { status: 400 }));
    await redis(SCRIPTS.SEND, r, text, body.type === 'state' ? '1' : '0');
    res.statusCode = 204;
    res.end();
  } catch (e) {
    fail(res, e);
  }
}
