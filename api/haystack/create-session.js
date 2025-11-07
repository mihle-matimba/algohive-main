const compact = (obj = {}) => Object.fromEntries(
  Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== '')
);

const safeParse = (input) => {
  if (typeof input !== 'string' || input.length === 0) return null;
  try {
    return JSON.parse(input);
  } catch (error) {
    return null;
  }
};

const buildReference = (planKey) => {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `algo_${planKey || 'plan'}_${Date.now()}_${suffix}`;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      hint: 'POST { planKey, amountCents, currency?, customer? } to create a Haystack checkout session',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const secretKey = process.env.HAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ ok: false, error: 'HAYSTACK_SECRET_KEY is not set on the server' });
  }

  try {
    const {
      planKey,
      planName,
      amountCents,
      currency = 'ZAR',
      productCode,
      reference,
      perks = [],
      customer = {},
      redirectUrls = {},
    } = req.body || {};

    const cents = Number(amountCents);
    if (!planKey || !Number.isFinite(cents) || cents <= 0) {
      return res.status(400).json({ ok: false, error: 'Required: planKey and amountCents > 0' });
    }

    const baseUrl = (process.env.HAYSTACK_API_BASE || 'https://api.haystack.com/v1').replace(/\/$/, '');
    const path = (process.env.HAYSTACK_CHECKOUT_PATH || '/payments/checkout-links').replace(/^\/?/, '/');
    const requestUrl = `${baseUrl}${path}`;

    const cleanCustomer = compact({
      email: customer.email,
      first_name: customer.firstName || customer.first_name,
      last_name: customer.lastName || customer.last_name,
    });

    const cleanRedirects = compact({
      success: redirectUrls.success || process.env.HAYSTACK_REDIRECT_SUCCESS,
      cancel: redirectUrls.cancel || process.env.HAYSTACK_REDIRECT_CANCEL,
    });

    const cleanMetadata = compact({
      planKey,
      planName,
      productCode,
      perks: Array.isArray(perks) && perks.length ? perks : undefined,
    });

    const payload = compact({
      amount: Math.round(cents),
      currency,
      reference: reference || buildReference(planKey),
      description: planName || `AlgoHive ${planKey} subscription`,
      metadata: Object.keys(cleanMetadata).length ? cleanMetadata : undefined,
      customer: Object.keys(cleanCustomer).length ? cleanCustomer : undefined,
      redirect_urls: Object.keys(cleanRedirects).length ? cleanRedirects : undefined,
    });

    const upstream = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const raw = await upstream.text();
    const body = safeParse(raw);

    if (!upstream.ok || body?.success === false || body?.status === 'error') {
      const errorMessage = body?.error || body?.message || `Haystack checkout failed (${upstream.status})`;
      return res.status(upstream.status || 502).json({ ok: false, error: errorMessage, upstream: body ?? raw });
    }

    const checkoutData = body?.data || body;
    const checkoutUrl = checkoutData?.checkout_url || checkoutData?.hosted_url || checkoutData?.url || null;
    if (!checkoutUrl) {
      return res.status(502).json({ ok: false, error: 'Haystack response missing checkout URL', upstream: body ?? raw });
    }

    return res.status(200).json({
      ok: true,
      data: {
        checkout_url: checkoutUrl,
        reference: payload.reference,
        upstream: checkoutData,
      },
    });
  } catch (error) {
    console.error('haystack/create-session error', error);
    return res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
}
