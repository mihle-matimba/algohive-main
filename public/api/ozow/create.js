import crypto from "crypto";

const OZOW = {
  api: "https://api.ozow.com/PostPaymentRequest",
  apiKey: process.env.OZOW_API_KEY,
  privateKey: process.env.OZOW_PRIVATE_KEY,
  siteCode: process.env.OZOW_SITE_CODE,
  notifyUrl: process.env.OZOW_NOTIFY_URL,
  successUrl: process.env.OZOW_SUCCESS_URL,
  cancelUrl: process.env.OZOW_CANCEL_URL,
  errorUrl: process.env.OZOW_ERROR_URL,
};

function sha512LowerHex(s) {
  return crypto.createHash("sha512").update(s.toLowerCase(), "utf8").digest("hex");
}

// ISO8601 without milliseconds, always UTC (e.g. 2025-10-16T15:20:00Z)
function utcIsoNoMillis(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { amount, customerName } = req.body || {};

    // 10 minutes from now (UTC)
    //const expiryDateUtc = utcIsoNoMillis(new Date(Date.now() + 10 * 60 * 1000));

    const body = {
      siteCode: OZOW.siteCode,
      countryCode: "ZA",
      currencyCode: "ZAR",
      amount: Number(amount || 0),
      transactionReference: `AH-${Date.now()}`,
      bankReference: `ALGOHIVE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      optional1: "",
      optional2: "",
      optional3: "",
      optional4: "",
      optional5: "",
      customer: (customerName || "AlgoHive User").slice(0, 100),
      cancelUrl: OZOW.cancelUrl,
      errorUrl: OZOW.errorUrl,
      successUrl: OZOW.successUrl,
      notifyUrl: OZOW.notifyUrl,
      isTest: false,
      selectedBankId: "",
      bankAccountNumber: "",
      branchCode: "",
      bankAccountName: "",
      payeeDisplayName: "",
      expiryDateUtc: "2025-10-16 16:02",              // <<— set here
      customerIdentifier: "",
    };

    const order = [
      "siteCode","countryCode","currencyCode","amount",
      "transactionReference","bankReference",
      "optional1","optional2","optional3","optional4","optional5",
      "customer","cancelUrl","errorUrl","successUrl","notifyUrl",
      "isTest","selectedBankId","bankAccountNumber","branchCode",
      "bankAccountName","payeeDisplayName","expiryDateUtc",
      "customerIdentifier"
    ];

    const concat = order.map(k => String(body[k] ?? "")).join("") + OZOW.privateKey;
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

    const data = await r.json();
    if (!r.ok || !data?.url) {
      return res.status(400).json({ error: data?.errorMessage || "Ozow error", raw: data });
    }

    res.status(200).json({ paymentRequestId: data.paymentRequestId, url: data.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}
