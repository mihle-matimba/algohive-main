// /api/ozow-create.js
const crypto = require("crypto");

const twoDec = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) throw new Error("Invalid amount");
  return num.toFixed(2); // "1124.00"
};

const sha512LowerHex = (s) =>
  crypto.createHash("sha512").update(String(s).toLowerCase(), "utf8").digest("hex");

function normBoolString(v) {
  return String(v).toLowerCase() === "true" ? "true" : "false";
}

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
    OZOW_SITE_CODE,
    OZOW_PRIVATE_KEY,
    OZOW_IS_TEST = "true",
    OZOW_SUCCESS_URL = "https://example.com/pay/success",
    OZOW_ERROR_URL   = "https://example.com/pay/error",
    OZOW_CANCEL_URL  = "https://example.com/pay/cancel",
    OZOW_NOTIFY_URL  = "https://example.com/api/ozow/notify",
  } = process.env;

  if (!OZOW_SITE_CODE || !OZOW_PRIVATE_KEY) {
    throw new Error("Missing env OZOW_SITE_CODE / OZOW_PRIVATE_KEY");
  }

  const fields = {
    SiteCode: OZOW_SITE_CODE,
    CountryCode: "ZA",
    CurrencyCode: "ZAR",
    Amount: twoDec(amount),
    TransactionReference: String(transactionReference),
    BankReference: String(bankReference).slice(0, 20),
    Customer: String(customer || ""),
    Optional1: String(optional1 || ""),
    Optional2: String(optional2 || ""),
    Optional3: String(optional3 || ""),
    Optional4: String(optional4 || ""),
    Optional5: String(optional5 || ""),
    NotifyUrl: String(OZOW_NOTIFY_URL || ""),
    SuccessUrl: String(OZOW_SUCCESS_URL || ""),
    ErrorUrl: String(OZOW_ERROR_URL || ""),
    CancelUrl: String(OZOW_CANCEL_URL || ""),
    IsTest: normBoolString(OZOW_IS_TEST),
  };

  // Order must match Ozow’s docs exactly:
  const order = [
    "SiteCode","CountryCode","CurrencyCode","Amount",
    "TransactionReference","BankReference",
    "Customer","Optional1","Optional2","Optional3","Optional4","Optional5",
    "NotifyUrl","SuccessUrl","ErrorUrl","CancelUrl","IsTest"
  ];

  const concat = order.map((k) => fields[k] ?? "").join("") + OZOW_PRIVATE_KEY;
  const HashCheck = sha512LowerHex(concat);

  // --- debug (safe to remove later) ---
  console.log("[ozow] concat-preview:", concat.slice(0, 160) + "…");
  console.log("[ozow] hash:", HashCheck);

  return { action: "https://pay.ozow.com", fields: { ...fields, HashCheck } };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { amount, transactionReference, bankReference, customer } = req.body || {};
    if (!amount || !transactionReference || !bankReference) {
      return res.status(400).json({ error: "amount, transactionReference, bankReference are required" });
    }

    const payload = buildOzowPayload({ amount, transactionReference, bankReference, customer });
    return res.status(200).json(payload);
  } catch (e) {
    console.error("ozow-create error:", e);
    return res.status(500).json({ error: "server_error", message: e?.message });
  }
};
