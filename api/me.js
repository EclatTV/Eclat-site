const { user, rpc } = require('./_lib');
module.exports = async (req, res) => {
  try {
    const u = await user(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    res.json(await rpc('get_me', { p_user: u.id }));
  } catch (e) { res.status(500).json({ error: 'server' }); }
};
