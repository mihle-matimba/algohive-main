const { send, readJson, pstack } = require("./_util");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  try {
    const { amountZar, email, reference } = await readJson(req);

    if (!amountZar || Number(amountZar) <= 0) return send(res, 400, { error: "Invalid amount" });
    if (!email) return send(res, 400, { error: "Email required" });

    const amountMinor = Math.round(Number(amountZar) * 100); // ZAR cents
    const body = {
      email,
      amount: amountMinor,
      currency: "ZAR",
      reference: reference || `AH-${Date.now()}`,
      callback_url: process.env.PAYSTACK_CALLBACK_URL, // where Paystack will redirect after payment
      // metadata is optional
      metadata: { source: "algohive", env: process.env.VERCEL_ENV || "dev" },
    };

    const r = await pstack("/transaction/initialize", { method: "POST", body: JSON.stringify(body) });

    if (!r.ok || !r?.data?.status) {
      return send(res, r.status || 400, { error: r.data?.message || "Init failed", detail: r.data });
    }

    const { authorization_url, access_code, reference: ref } = r.data.data;
    return send(res, 200, { authorization_url, access_code, reference: ref });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message || "Server error" });
  }
};
