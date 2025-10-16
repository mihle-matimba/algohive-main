let cached: { token: string; exp: number } | null = null;

export async function getOzowToken() {
  const now = Date.now();
  if (cached && now < cached.exp) return cached.token;

  const body = new URLSearchParams({
    client_id: process.env.OZOW_CLIENT_ID!,
    client_secret: process.env.OZOW_CLIENT_SECRET!,
    scope: process.env.OZOW_SCOPE || "payment",
    grant_type: "client_credentials",
  });

  const res = await fetch(`${process.env.OZOW_API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    // IMPORTANT on server
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ozow token error: ${res.status} ${text}`);
  }

  const json = await res.json() as { access_token: string; expires_in: number };
  // cache for expires_in - 60s
  cached = { token: json.access_token, exp: now + (json.expires_in - 60) * 1000 };
  return json.access_token;
}
