export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = new URLSearchParams({
    client_id: process.env.OZOW_CLIENT_ID,
    client_secret: process.env.OZOW_CLIENT_SECRET,
    scope: process.env.OZOW_SCOPE || 'payment',
    grant_type: 'client_credentials',
  });

  const r = await fetch(`${process.env.OZOW_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) return res.status(r.status).json(data);
  res.status(200).json(data); // { access_token, expires_in, ... }
}
