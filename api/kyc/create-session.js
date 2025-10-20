// /api/kyc/create-session.js
export default async function handler(req, res) {
  // CORS (optional)
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const KEY = process.env.DIDIT_API_KEY;
  const WORKFLOW = process.env.DIDIT_WORKFLOW_ID;

  const { userId, email, phone, redirect_url } = req.body || {};
  if (!userId || !email) return res.status(400).json({ error: 'userId and email are required' });

  // Test mode if envs missing
  if (!KEY || !WORKFLOW) {
    return res.status(200).json({
      mode: 'TEST',
      sessionId: `test_${Date.now()}`,
      sessionUrl: redirect_url || '/',
      message: 'DIDIT_API_KEY / DIDIT_WORKFLOW_ID missing — returning TEST session.',
    });
  }

  const reference = `KYC|${userId}|${Date.now()}`;

  // Common payload — adjust keys if your workflow needs more fields
  const payload = {
    workflow_id: WORKFLOW,
    reference,
    applicant: { email, phone },
    // Some tenants use `redirect_url`, others `return_url` — include both
    redirect_url: redirect_url || undefined,
    return_url: redirect_url || undefined,
  };

  // Helper to parse body safely
  const safe = (t) => { try { return JSON.parse(t); } catch { return null; } };

  try {
    // 1) Preferred: Bearer + /v1/verification-sessions
    let r = await fetch('https://api.didit.me/v1/verification-sessions', {
      method: 'POST',
      headers: {
        'X-Api-Key': `${KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    let txt = await r.text();
    let js = safe(txt);

    // If not OK and looks like auth/route mismatch, try legacy path+header
    if (!r.ok && (r.status === 401 || r.status === 403 || r.status === 404)) {
      r = await fetch('https://api.didit.me/v1/sessions', {
        method: 'POST',
        headers: {
          'X-Api-Key': KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      txt = await r.text();
      js = safe(txt);
    }

    if (!r.ok) {
      return res.status(r.status).json({
        error: js?.message || 'Didit error',
        upstream_status: r.status,
        upstream_body: js || txt,
      });
    }

    return res.status(200).json({
      mode: 'LIVE',
      sessionId: js?.id || js?.session_id,
      sessionUrl: js?.url || js?.verification_url || js?.session_url,
      redirectUrl: redirect_url || null,
      reference,
    });
  } catch (e) {
    console.error('[didit/create-session]', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
