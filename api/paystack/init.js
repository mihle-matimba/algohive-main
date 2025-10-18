// api/paystack/init.js
export default async function handler(req, res) {
  // Basic CORS (adjust origin if serving frontend elsewhere)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, amount, currency = 'ZAR', reference, callback_url, metadata } = req.body || {};
    if (!email || !amount) {
      return res.status(400).json({ error: 'email and amount (in cents) are required' });
    }

    const payload = {
      email,
      amount,                 // in cents (ZAR subunit)
      currency,               // 'ZAR'
      reference,              // optional but recommended unique ID
      callback_url,           // optional: where Paystack redirects to
      metadata: {
        site: 'thealgohive.com',
        cancel_action: `${process.env.CANCEL_URL || 'https://thealgohive.com/pay/cancel'}`,
        ...metadata
      }
    };

    const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(payload)
    });

    const json = await psRes.json();
    if (!psRes.ok || json.status !== true) {
      return res.status(400).json({ error: json?.message || 'Paystack init failed', raw: json });
    }

    // json.data contains authorization_url & access_code
    return res.status(200).json(json);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
