// /api/ozow-create.js  (Vercel Serverless Function - CommonJS)
const crypto = require("crypto");

/** Helpers */
const twoDec = (n) => Number(n).toFixed(2);
const sha512LowerHex = (s) =>
  crypto.createHash("sha512").update(String(s).toLowerCase(), "utf8").digest("hex");

/** Build Ozow fields + HashCheck */
function buildOzowPayload({
  amount,
  transactionReference,
  bankReference,
  customer = "",
  optional1 = "",
  optional2 = "",
  optional3 = "",
  optional4 = "",
  optional5 = "",
}) {
  const {
    OZOW_SITE_CODE = "ALG-ALG-003",          // TODO: move to env in Vercel
    OZOW_PRIVATE_KEY = "398a4e543bfa42c39d18dde8bba9a9cf", // TODO: env
    OZOW_IS_TEST = "true",
    OZOW_SUCCESS_URL = "https://your.app/pay/success",
    OZOW_ERROR_URL   = "https://your.app/pay/error",
    OZOW_CANCEL_URL  = "https://your.app/pay/cancel",
    OZOW_NOTIFY_URL  = "https://your.app/api/ozow/notify",
  } = process.env;

  if (!OZOW_SITE_CODE || !OZOW_PRIVATE_KEY) {
    throw new Error("Missing env: OZOW_SITE_CODE / OZOW_PRIVATE_KEY");
  }

  const fields = {
    SiteCode: OZOW_SITE_CODE,
    CountryCode: "ZA",
    CurrencyCode: "ZAR",
    Amount: twoDec(amount),
    TransactionReference: String(transactionReference),
    BankReference: String(bankReference).slice(0, 20),
    Customer: customer,
    Optional1: optional1,
    Optional2: optional2,
    Optional3: optional3,
    Optional4: optional4,
    Optional5: optional5,
    NotifyUrl: OZOW_NOTIFY_URL,
    SuccessUrl: OZOW_SUCCESS_URL,
    ErrorUrl: OZOW_ERROR_URL,
    CancelUrl: OZOW_CANCEL_URL,
    IsTest: String(OZOW_IS_TEST).toLowerCase() === "true" ? "true" : "false",
  };

  // Keep exact order for hash
  const order = [
    "SiteCode", "CountryCode", "CurrencyCode", "Amount",
    "TransactionReference", "BankReference",
    "Customer", "Optional1", "Optional2", "Optional3", "Optional4", "Optional5",
    "NotifyUrl", "SuccessUrl", "ErrorUrl", "CancelUrl", "IsTest",
  ];
  const concat = order.map((k) => fields[k] ?? "").join("") + OZOW_PRIVATE_KEY;
  const HashCheck = sha512LowerHex(concat);

  return { action: "https://pay.ozow.com", fields: { ...fields, HashCheck } };
}

module.exports = async (req, res) => {
  // CORS (optional)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")  return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { amount, transactionReference, bankReference, customer } = req.body || {};
    if (!amount || !transactionReference || !bankReference) {
      return res.status(400).json({ error: "amount, transactionReference, bankReference are required" });
    }
    const payload = buildOzowPayload({ amount, transactionReference, bankReference, customer });
    return res.status(200).json(payload);
  } catch (e) {
    console.error("ozow-create error:", e);
    return res.status(500).json({ error: "server_error" });
  }
};
