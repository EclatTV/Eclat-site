const crypto = require('crypto');
const SU = process.env.SUPABASE_URL, SK = process.env.SUPABASE_SERVICE_KEY;
const SECRET = process.env.SIGN_SECRET || SK;
async function user(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!t) return null;
  const r = await fetch(SU + '/auth/v1/user', { headers: { apikey: SK, Authorization: 'Bearer ' + t } });
  return r.ok ? r.json() : null;
}
async function rpc(fn, body) {
  const r = await fetch(`${SU}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
const h = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
const sign = (o) => { const p = Buffer.from(JSON.stringify(o)).toString('base64url'); return p + '.' + h(p); };
function verify(t) {
  const [p, s] = String(t || '').split('.');
  if (!p || !s || h(p) !== s) return null;
  try { return JSON.parse(Buffer.from(p, 'base64url').toString()); } catch { return null; }
}
module.exports = { user, rpc, sign, verify, SU };
