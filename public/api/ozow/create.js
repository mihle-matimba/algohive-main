// ozow.request.cjs (drop-in replacement for handler)
const crypto = require("crypto");

const OZOW = {
  api: "https://api.ozow.com/PostPaymentRequest",
  apiKey: process.env.OZOW_API_KEY,
  privateKey: process.env.OZOW_PRIVATE_KEY,
  siteCode: process.env.OZOW_SITE_CODE,
  notifyUrl: process.env.OZOW_NOTIFY_URL,
  successUrl: process.env.OZOW_SUCCESS_URL,
  cancelUrl: process.env.OZOW_CANCEL_URL,
  errorUrl: process.env.OZOW_ERROR_URL,
  isTest: false,
};

const str = (v) => (v === null || v === undefined ? "" : String(v));
const fmtAmount = (n) => Number(n || 0).toFixed(2);
const sha512LowerHex = (s) => crypto.createHash("sha512").update(s.toLowerCase(), "utf8").digest("hex");

async function handler(req, res) {
  try {
    if (req.method && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    // Env checks
    const missing = ["privateKey","siteCode","apiKey","notifyUrl","successUrl","cancelUrl","errorUrl"]
      .filter(k => !OZOW[k]);
    if (missing.length) {
      return res.status(500).json({ error: `Missing env vars: ${missing.join(", ")}` });
    }

    const inBody = (req.body && typeof req.body === "object") ? req.body : {};
    const amount = fmtAmount(inBody.amount);
    const transactionReference = str(inBody.transactionReference) || `AH-${Date.now()}`;
    const bankReference        = str(inBody.bankReference) || `ALGOHIVE-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

    // — Keep your original hash order —
    const body = {
      siteCode: OZOW.siteCode,
      countryCode: "ZA",
      currencyCode: "ZAR",
      amount,
      transactionReference,
      bankReference,
      cancelUrl: OZOW.cancelUrl,
      errorUrl: OZOW.errorUrl,
      successUrl: OZOW.successUrl,
      notifyUrl: OZOW.notifyUrl,
      isTest: OZOW.isTest, // boolean; becomes "true"/"false" in concat
    };

    const concat =
      str(body.siteCode) +
      str(body.countryCode) +
      str(body.currencyCode) +
      str(body.amount) +
      str(body.transactionReference) +
      str(body.bankReference) +
      str(body.cancelUrl) +
      str(body.errorUrl) +
      str(body.successUrl) +
      str(body.notifyUrl) +
      str(body.isTest) +
      str(OZOW.privateKey);

    body.hashCheck = sha512LowerHex(concat);

    const r = await fetch(OZOW.api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, application/xml",
        "ApiKey": OZOW.apiKey,
      },
      body: JSON.stringify(body),
    });

    const raw = await r.text();
    let data = raw;
    try { data = JSON.parse(raw); } catch {}

    // Log everything server-side for debugging
    console.error("[Ozow] status:", r.status);
    console.error("[Ozow] headers:", Object.fromEntries(r.headers.entries()));
    console.error("[Ozow] raw:", raw);
    console.error("[Ozow] concatUsed:", concat);
    console.error("[Ozow] hashCheck:", body.hashCheck);

    if (!r.ok || !data?.url) {
      const msg = data?.errorMessage || data?.message || data?.errors || "Ozow returned a non-OK response";
      return res.status(400).json({
        error: String(msg),
        status: r.status,
        ozow: data,
        debug: {
          siteCode: body.siteCode,
          amount: body.amount,
          isTest: body.isTest,
          transactionReference: body.transactionReference,
          bankReference: body.bankReference,
        }
      });
    }

    return res.status(200).json({ paymentRequestId: data.paymentRequestId, url: data.url });
  } catch (e) {
    console.error("Unexpected error:", e);
    return res.status(500).json({ error: "Internal server error.", detail: String(e?.message || e) });
  }
}

module.exports = handler;
