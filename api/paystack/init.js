// api/paystack/init.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');            // lock to your origin later
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, amount, currency = 'ZAR', reference, callback_url, metadata } = req.body || {};
    if (!email || !amount) return res.status(400).json({ error: 'email and amount (in cents) are required' });

    const payload = {
      email,
      amount,            // cents
      currency,          // 'ZAR'
      reference,
      callback_url,
      metadata: { site: 'thealgohive.com', ...metadata }
    };

    const r = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(payload),
    });

    const json = await r.json();
    if (!r.ok || json.status !== true) {
      return res.status(400).json({ error: json?.message || 'Paystack init failed', raw: json });
    }
    return res.status(200).json(json); // contains data.access_code
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
