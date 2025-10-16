// api/ozow/create.js  — One API (OAuth) version
// Works on Vercel/Netlify Node serverless. CommonJS export.
const DEFAULT_API = process.env.OZOW_API_BASE || "https://one.ozow.com/v1";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function getAccessToken() {
  const client_id = process.env.OZOW_CLIENT_ID;
  const client_secret = process.env.OZOW_CLIENT_SECRET;
  const scope = process.env.OZOW_SCOPE || "payment";
  const tokenUrl = `${DEFAULT_API}/token`;

  if (!client_id || !client_secret) {
    throw new Error("Missing env vars: OZOW_CLIENT_ID, OZOW_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    client_id,
    client_secret,
    scope,
    grant_type: "client_credentials",
  });

  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data?.access_token) {
    throw new Error(
      `Token error (${r.status}): ${data?.error_description || data?.error || "unknown"}`
    );
  }

  return { access_token: data.access_token, expires_in: data.expires_in };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method && req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const body = await parseBody(req);
    const amount = Number(body.amount || 0);
    const reference =
      (body.reference || body.merchantReference || "").toString().trim() ||
      `ORDER-${Date.now()}`;
    const siteCode = process.env.OZOW_SITE_CODE;
    const returnUrl =
      body.returnUrl ||
      process.env.OZOW_RETURN_URL ||
      "https://thealgohive.com/pay/success";

    if (!siteCode) return json(res, 500, { error: "Missing env var: OZOW_SITE_CODE" });
    if (!amount || amount <= 0) return json(res, 400, { error: "Invalid amount" });
    if (!returnUrl) return json(res, 500, { error: "Missing returnUrl (env or body)" });

    // 1) OAuth token
    const { access_token } = await getAccessToken();

    // 2) Create payment
    const payload = {
      siteCode,
      amount: { currency: "ZAR", value: Number(amount) },
      merchantReference: reference,
      // Set a 30-min expiry by default
      expireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      returnUrl,
    };

    const createUrl = `${DEFAULT_API}/payments`;
    const pr = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await pr.json().catch(() => ({}));

    // Useful logs server-side
    console.error("[Ozow OneAPI] status:", pr.status);
    if (!pr.ok) console.error("[Ozow OneAPI] error:", data);

    if (!pr.ok || !data?.redirectUrl) {
      const msg = data?.message || data?.error || "Create payment failed";
      return json(res, pr.status || 400, { error: msg, detail: data });
    }

    // Success
    return json(res, 200, { url: data.redirectUrl, id: data.id, status: data.status });
  } catch (e) {
    console.error("Unexpected error:", e);
    return json(res, 500, { error: e.message || "Server error" });
  }
};
