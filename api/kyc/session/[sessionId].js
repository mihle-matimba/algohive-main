// /api/kyc/session/[sessionId].js
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.query || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
  if (!DIDIT_API_KEY) {
    // Without keys, say “pending” so the UI doesn’t explode
    return res.status(200).json({ status: 'pending', note: 'DIDIT_API_KEY not set' });
  }

  try {
    const r = await fetch(`https://api.didit.me/v1/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${DIDIT_API_KEY}` },
      cache: 'no-store',
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.message || 'Didit error', upstream: data });

    // Normalize a couple of possible shapes
    const status =
      data.status ||
      data.result?.status ||
      data.session?.status ||
      'unknown';

    return res.status(200).json({ status, raw: data });
  } catch (e) {
    console.error('[didit/get-session]', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
