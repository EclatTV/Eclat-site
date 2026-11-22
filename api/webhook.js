// Stripe webhook: ajoute les crédits après paiement. URL: https://TON-SITE/api/webhook (événement checkout.session.completed)
const crypto = require('crypto');
const { rpc } = require('./_lib');
const raw = (req) => new Promise((ok, no) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', no); });
module.exports = async (req, res) => {
  try {
    const body = await raw(req);
    const sig = String(req.headers['stripe-signature'] || '');
    const t = (sig.match(/t=(\d+)/) || [])[1], v1 = (sig.match(/v1=([a-f0-9]+)/) || [])[1];
    if (!t || !v1) return res.status(400).end();
    const exp = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(t + '.' + body).digest('hex');
    if (exp.length !== v1.length || !crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(v1))) return res.status(400).end();
    const ev = JSON.parse(body.toString());
    if (ev.type === 'checkout.session.completed') {
      const s = ev.data.object, m = s.metadata || {};
      if (s.payment_status === 'paid' && m.user_id) await rpc('add_credits', { p_user: m.user_id, p_n: parseInt(m.credits) || 0, p_ref: s.id });
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).end(); }
};
module.exports.config = { api: { bodyParser: false } };
