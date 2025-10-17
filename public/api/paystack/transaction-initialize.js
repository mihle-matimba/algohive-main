const { send, readJson, pstack } = require("./_util");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  try {
    const { amountZar, email, reference } = await readJson(req);

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return send(res, 500, { error: "Missing PAYSTACK_SECRET_KEY" });
    }

    if (!amountZar || Number(amountZar) <= 0) return send(res, 400, { error: "Invalid amount" });
    if (!email) return send(res, 400, { error: "Email required" });

    const amountMinor = Math.round(Number(amountZar) * 100);
    const body = {
      email,
      amount: amountMinor,
      currency: "ZAR",
      reference: reference || `AH-${Date.now()}`,
      callback_url: process.env.PAYSTACK_CALLBACK_URL || "https://thealgohive.com/pay/success",
      metadata: { source: "algohive", env: process.env.VERCEL_ENV || "dev" },
    };

    const r = await pstack("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!r.ok || !(r.data?.status)) {
      // Log detailed diagnostics to server logs
      console.error("[paystack:init] status:", r.status);
      console.error("[paystack:init] headers:", r.headers);
      console.error("[paystack:init] body:", r.text);

      // Return a clean JSON error to the client
      return send(res, r.status || 500, {
        error: r.data?.message || "Init failed",
        detail: r.data || r.text,
      });
    }

    const { authorization_url, access_code, reference: ref } = r.data.data || {};
    if (!authorization_url) return send(res, 502, { error: "No authorization_url from Paystack" });

    return send(res, 200, { authorization_url, access_code, reference: ref });
  } catch (e) {
    console.error("Unexpected error:", e);
    return send(res, 500, { error: e.message || "Server error" });
  }
};
