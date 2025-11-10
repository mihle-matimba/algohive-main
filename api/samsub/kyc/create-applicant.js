import crypto from 'crypto';

const SUMSUB_BASE = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';
const APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SECRET = process.env.SUMSUB_SECRET_KEY;

function sign(ts, method, path, body = '') {
  const toSign = ts + method.toUpperCase() + path + body;
  return crypto.createHmac('sha256', SECRET).update(toSign).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!APP_TOKEN || !SECRET) {
    return res.status(500).json({ error: 'Sumsub credentials are not configured' });
  }

  try {
    const {
      externalUserId,
      levelName = 'idv-and-phone-verification',
      email,
      firstName,
      lastName,
      phone,
    } = req.body || {};
    const trimmedExternalId = typeof externalUserId === 'string' ? externalUserId.trim() : String(externalUserId || '');
    const normalizedLevel = typeof levelName === 'string' && levelName.trim() ? levelName.trim() : 'idv-and-phone-verification';
    if (!trimmedExternalId) {
      return res.status(400).json({ error: 'externalUserId required' });
    }

    const path = `/resources/applicants`;
    const url = `${SUMSUB_BASE}${path}`;
    const ts = Math.floor(Date.now() / 1000);
    const payload = { externalUserId: trimmedExternalId, levelName: normalizedLevel };
    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
    if (normalizedEmail) payload.email = normalizedEmail;
    if (normalizedPhone) payload.phone = normalizedPhone;
    const fixedInfo = {};
    const normalizedFirstName = typeof firstName === 'string' ? firstName.trim() : '';
    const normalizedLastName = typeof lastName === 'string' ? lastName.trim() : '';
    if (normalizedFirstName) fixedInfo.firstName = normalizedFirstName;
    if (normalizedLastName) fixedInfo.lastName = normalizedLastName;
    if (Object.keys(fixedInfo).length) payload.fixedInfo = fixedInfo;

    const body = JSON.stringify(payload);

    const sig = sign(ts, 'POST', path, body);

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': APP_TOKEN,
        'X-App-Access-Ts': String(ts),
        'X-App-Access-Sig': sig,
      },
      body,
    });

    const text = await r.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      data = { raw: text };
    }

    if (!r.ok) {
      return res.status(r.status).json({ error: 'Sumsub error', data });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
