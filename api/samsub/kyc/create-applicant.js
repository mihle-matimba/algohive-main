// CommonJS version (works without "type":"module")
const crypto = require('crypto');

const SUMSUB_BASE = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';
// Support both env names so you don't get tripped up
const APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SECRET = process.env.SUMSUB_APP_SECRET || process.env.SUMSUB_SECRET_KEY;

// HMAC signing per Sumsub: ts + METHOD + path(+query) + body
function sign(ts, method, pathWithQuery, bodyStr = '') {
  const toSign = String(ts) + method.toUpperCase() + pathWithQuery + bodyStr;
  return crypto.createHmac('sha256', SECRET).update(toSign).digest('hex');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
  }

  if (!APP_TOKEN || !SECRET) {
    return res.status(500).json({ success: false, error: { message: 'Sumsub credentials are not configured' } });
  }

  try {
    const {
      externalUserId,
      levelName = 'basic-kyc-level', // <-- make sure this exists in your Sumsub account
      email,
      firstName,
      lastName,
      phone
    } = req.body || {};

    const trimmedExternalId =
      typeof externalUserId === 'string' ? externalUserId.trim() : String(externalUserId || '');
    if (!trimmedExternalId) {
      return res.status(400).json({ success: false, error: { message: 'externalUserId required' } });
    }

    // Sumsub expects levelName as a query param (docs)
    const basePath = '/resources/applicants';
    const query = new URLSearchParams({ levelName: String(levelName).trim() || 'basic-kyc-level' });
    const pathWithQuery = `${basePath}?${query.toString()}`;
    const url = `${SUMSUB_BASE}${pathWithQuery}`;

    // Build payload
    const payload = { externalUserId: trimmedExternalId };
    const fixedInfo = {};
    if (typeof firstName === 'string' && firstName.trim()) fixedInfo.firstName = firstName.trim();
    if (typeof lastName === 'string' && lastName.trim()) fixedInfo.lastName = lastName.trim();
    if (Object.keys(fixedInfo).length) payload.fixedInfo = fixedInfo;
    if (typeof email === 'string' && email.trim()) payload.email = email.trim();
    if (typeof phone === 'string' && phone.trim()) payload.phone = phone.trim();

    const bodyStr = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000);
    const sig = sign(ts, 'POST', pathWithQuery, bodyStr);

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': APP_TOKEN,
        'X-App-Access-Ts': String(ts),
        'X-App-Access-Sig': sig
      },
      body: bodyStr
    });

    const text = await r.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    if (!r.ok) {
      // Forward Sumsub error payload so we can see why (level name mismatch, etc.)
      return res.status(r.status).json({ success: false, error: { message: 'Sumsub error' }, data });
    }

    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, error: { message: e.message } });
  }
};
