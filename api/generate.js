// Crée une vidéo/image via fal.ai (file d'attente). Modèles choisis par variables d'environnement.
const { user, rpc, sign, SU } = require('./_lib');
const FAL = 'https://queue.fal.run/';
const MODELS = {
  video: process.env.FAL_VIDEO_MODEL,        // texte -> vidéo
  imgvideo: process.env.FAL_IMG2VIDEO_MODEL, // image (+texte) -> vidéo
  image: process.env.FAL_IMAGE_MODEL,        // texte (+image référence) -> image
  talk: process.env.FAL_TALK_MODEL,          // image + texte -> image qui parle
  motion: process.env.FAL_MOTION_MODEL,      // image + vidéo de mouvement -> vidéo
  upscale: process.env.FAL_UPSCALE_MODEL,    // vidéo -> vidéo Full HD
  voice: process.env.FAL_VOICE_MODEL,        // texte -> voix (audio)
  removebg: process.env.FAL_REMOVEBG_MODEL   // image -> image sans fond
};
const okUrl = (u) => !u || String(u).startsWith(SU + '/storage/v1/object/public/refs/');
// ⚠️ Les noms de champs changent d'un modèle à l'autre: vérifie la doc du modèle choisi sur fal.ai et ajuste ici.
function buildInput(kind, b) {
  const dur = String(parseInt(b.duration) || 5);
  const ratio = /16:9/.test(b.format) ? '16:9' : /1:1/.test(b.format) ? '1:1' : '9:16';
  const base = { prompt: b.prompt };
  if (kind === 'video') Object.assign(base, { duration: dur, aspect_ratio: ratio });
  if (kind === 'imgvideo') Object.assign(base, { duration: dur, aspect_ratio: ratio, image_url: b.imageUrl });
  if (kind === 'image') Object.assign(base, { aspect_ratio: ratio }, b.imageUrl ? { image_url: b.imageUrl, image_urls: [b.imageUrl] } : {});
  if (kind === 'talk') Object.assign(base, { image_url: b.imageUrl, text: b.speech, prompt: b.prompt || b.speech });
  if (kind === 'motion') Object.assign(base, { image_url: b.imageUrl, video_url: b.videoUrl });
  if (kind === 'upscale') Object.assign(base, { video_url: b.videoUrl });
  if (kind === 'voice') Object.assign(base, { text: b.speech });
  if (kind === 'removebg') Object.assign(base, { image_url: b.imageUrl });
  if (process.env.FAL_SEND_RESOLUTION === '1') base.resolution = b.quality === '1080' ? '1080p' : '720p';
  return base;
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const u = await user(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const b = req.body || {};
    const mode = ['video', 'image', 'talk', 'motion', 'upscale', 'voice', 'removebg'].includes(b.mode) ? b.mode : 'video';
    if (String(b.prompt || '').length > 2500 || !okUrl(b.imageUrl) || !okUrl(b.videoUrl)) return res.status(400).json({ error: 'bad_input' });
    const kind = mode === 'video' && b.imageUrl ? 'imgvideo' : mode;
    if (!MODELS[kind] || !process.env.FAL_KEY) return res.status(500).json({ error: 'model_not_configured' });
    if ((kind === 'talk' && (!b.imageUrl || !b.speech)) || (kind === 'motion' && (!b.imageUrl || !b.videoUrl)) || (kind === 'upscale' && !b.videoUrl) || (kind === 'voice' && !b.speech) || (kind === 'removebg' && !b.imageUrl)) return res.status(400).json({ error: 'missing_files' });
    const hd = b.quality === '1080';
    const cost = ['talk', 'motion', 'upscale'].includes(kind) || hd ? 2 : 1;
    const freeOk = !hd && ['video', 'imgvideo', 'image', 'voice', 'removebg'].includes(kind);
    const how = await rpc('consume', { p_user: u.id, p_cost: cost, p_free: 2, p_free_ok: freeOk });
    if (how === 'denied') return res.status(402).json({ error: 'no_credits' });
    const job = { u: u.id, t: { image: 'image', removebg: 'image', voice: 'audio' }[kind] || 'video', k: how, c: cost };
    try {
      const r = await fetch(FAL + MODELS[kind], { method: 'POST', headers: { Authorization: 'Key ' + process.env.FAL_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(buildInput(kind, b)) });
      const j = await r.json();
      if (!r.ok || !j.status_url) throw new Error('submit');
      return res.json({ id: sign({ ...job, s: j.status_url, r: j.response_url, j: j.request_id }) });
    } catch (e) {
      await rpc('refund_job', { p_job: 'sub-' + Date.now() + u.id, p_user: u.id, p_kind: how, p_cost: cost });
      return res.status(502).json({ error: 'provider' });
    }
  } catch (e) { res.status(500).json({ error: 'server' }); }
};
