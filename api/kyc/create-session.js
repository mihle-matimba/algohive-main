// /api/kyc/create-session.js
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
  const DIDIT_WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;

  const {
    userId,
    email,
    phone,
    // where Didit should send the user back after completion
    redirect_url,
  } = req.body || {};

  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email are required' });
  }

  // If you haven’t configured DIDIT env vars yet, run in TEST mode
  if (!DIDIT_API_KEY || !DIDIT_WORKFLOW_ID) {
    const testId = `test_${Date.now()}`;
    return res.status(200).json({
      mode: 'TEST',
      sessionId: testId,
      // In test we “redirect” right back
      sessionUrl: redirect_url || '/',
      message: 'DIDIT keys missing; returning TEST session so the client flow can continue.',
    });
  }

  try {
    // Build a stable reference (handy for webhooks / audits)
    const reference = `KYC|${userId}|${Date.now()}`;

    // NOTE: Shape matches Didit’s “create session” style.
    // If their API uses slightly different field names, adjust here.
    const payload = {
      workflow_id: DIDIT_WORKFLOW_ID,
      reference,
      applicant: { email, phone },
      // Didit supports redirect on completion; this brings the user back.
      redirect_url: redirect_url,
    };

    const r = await fetch('https://api.didit.me/v1/sessions', {
      method: 'POST',
      headers: {
        'X-Api-Key': DIDIT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.message || 'Didit error', upstream: data });
    }

    // Return the essentials for the client to redirect
    return res.status(200).json({
      mode: 'LIVE',
      sessionId: data.id || data.session_id,
      sessionUrl: data.url || data.session_url, // Didit usually returns one of these
      redirectUrl: payload.redirect_url,
      reference,
    });
  } catch (e) {
    console.error('[didit/create-session]', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
