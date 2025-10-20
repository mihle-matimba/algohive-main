// /api/paystack/init.js
export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // later: https://www.thealgohive.com
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // --- Health/info ---
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, hint: 'POST { email, amount_cents } to initialize (ZAR)' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- Env guard ---
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not set on the server' });
  }

  try {
    // Accept BOTH amount_cents and amount (prefer cents)
    const {
      email,
      amount_cents,
      amount,                 // optional legacy
      currency = 'ZAR',
      reference,
      callback_url = 'https://www.thealgohive.com/pay/success',
      metadata = {},
      channels = ['card']
    } = req.body || {};

    const cents = Number.isFinite(Number(amount_cents))
      ? Number(amount_cents)
      : Number(amount);

    if (!email || !Number.isFinite(cents) || cents <= 0) {
      return res.status(400).json({ error: 'email and amount_cents (integer) are required' });
    }

    // Paystack expects smallest unit integer (ZAR cents) already
    const payload = {
      email,
      amount: Math.round(cents),
      currency,
      reference,
      callback_url,
      channels,
      metadata: {
        site: 'thealgohive.com',
        profile_id: metadata.profile_id,
        strategy_id: metadata.strategy_id,
        units: metadata.units,
        unit_price: metadata.unit_price,
        strategy_name: metadata.strategy_name
      }
    };

    const r = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      // avoid edge caching weirdness
      cache: 'no-store'
    });

    const ct = r.headers.get('content-type') || '';
    const raw = await r.text();
    const data = ct.includes('application/json') ? safeParse(raw) : { raw };

    if (!r.ok || (data && data.status === false)) {
      const msg = data?.message || data?.raw || `Paystack init failed (${r.status})`;
      return res.status(r.status).json({ error: msg, upstream: data });
    }

    // Normalize output for your frontend
    return res.status(200).json({
      ok: true,
      data // contains authorization_url, access_code, reference, etc.
    });

  } catch (err) {
    console.error('paystack/init error', err);
    // Always return JSON
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

// tiny helper to avoid crashing on invalid JSON
function safeParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}
