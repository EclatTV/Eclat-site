const { user, rpc, verify } = require('./_lib');
module.exports = async (req, res) => {
  try {
    const u = await user(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const job = verify(req.query.id);
    if (!job || job.u !== u.id || !String(job.s).startsWith('https://queue.fal.run/')) return res.status(400).json({ error: 'bad_id' });
    const H = { Authorization: 'Key ' + process.env.FAL_KEY };
    const fail = async () => { await rpc('refund_job', { p_job: job.j, p_user: u.id, p_kind: job.k, p_cost: job.c }); return res.json({ status: 'failed' }); };
    const st = await (await fetch(job.s, { headers: H })).json();
    if (st.status === 'COMPLETED') {
      const r = await fetch(job.r, { headers: H });
      if (!r.ok) return fail();
      const o = await r.json();
      const url = (o.video && o.video.url) || (o.images && o.images[0] && o.images[0].url) || (o.image && o.image.url) || (o.audio && o.audio.url) || (o.audio_url) || o.url || (o.output && o.output.url);
      return url ? res.json({ status: 'done', url, type: job.t }) : fail();
    }
    if (st.status === 'FAILED' || st.error) return fail();
    res.json({ status: 'running' });
  } catch (e) { res.status(500).json({ error: 'server' }); }
};
