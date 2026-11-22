// Stripe Checkout pour acheter des crédits.
const { user } = require('./_lib');
const PACKS = { starter: { credits: 10, cents: 299, name: 'Starter' }, createur: { credits: 40, cents: 899, name: 'Créateur' }, pro: { credits: 120, cents: 1999, name: 'Pro' } };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const u = await user(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const p = PACKS[(req.body || {}).pack];
    if (!p || !process.env.STRIPE_SECRET_KEY) return res.status(400).json({ error: 'bad_pack' });
    const origin = req.headers.origin || ('https://' + req.headers.host);
    const f = new URLSearchParams({
      mode: 'payment', success_url: origin + '/?paid=1', cancel_url: origin + '/',
      'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(p.cents),
      'line_items[0][price_data][product_data][name]': 'ÉCLAT ' + p.name + ' (' + p.credits + ' crédits)',
      'metadata[user_id]': u.id, 'metadata[credits]': String(p.credits)
    });
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body: f });
    const j = await r.json();
    if (!j.url) return res.status(502).json({ error: 'stripe' });
    res.json({ url: j.url });
  } catch (e) { res.status(500).json({ error: 'server' }); }
};
