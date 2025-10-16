async function getToken() {
  const r = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''}/api/ozow-token`, { method: 'POST' });
  if (!r.ok) throw new Error('Token failed');
  const { access_token } = await r.json();
  return access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { amount, reference } = req.body || {};
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (!reference) return res.status(400).json({ error: 'Missing reference' });

    const token = await getToken();
    const payload = {
      siteCode: process.env.OZOW_SITE_CODE,
      amount: { currency: 'ZAR', value: Number(amount) },
      merchantReference: reference,
      expireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      returnUrl: process.env.OZOW_RETURN_URL,
    };

    const r = await fetch(`${process.env.OZOW_API}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: 'Create payment failed', detail: data });

    res.status(200).json({ url: data.redirectUrl, id: data.id, status: data.status });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
}
