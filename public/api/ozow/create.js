// ozow_dynamic_request.js
// Node 18+ (global fetch). CommonJS. Keeps original hash order.
// Env needed: OZOW_API_KEY, OZOW_PRIVATE_KEY, OZOW_SITE_CODE, OZOW_NOTIFY_URL, OZOW_SUCCESS_URL, OZOW_CANCEL_URL, OZOW_ERROR_URL

const crypto = require("crypto");

// ---- Config (from env) ----
const OZOW = {
  apiUrl: process.env.OZOW_API_URL || "https://api.ozow.com/postpaymentrequest",
  apiKey: process.env.OZOW_API_KEY,
  privateKey: process.env.OZOW_PRIVATE_KEY, // CRITICAL: real env value, not a string literal
  siteCode: process.env.OZOW_SITE_CODE,
  notifyUrl: process.env.OZOW_NOTIFY_URL,
  successUrl: process.env.OZOW_SUCCESS_URL,
  cancelUrl: process.env.OZOW_CANCEL_URL,
  errorUrl: process.env.OZOW_ERROR_URL,
};

// ---- Helpers ----
const formatAmount = (n) => Number(n || 0).toFixed(2);
const sha512LowerHex = (s) => crypto.createHash("sha512").update(s.toLowerCase(), "utf8").digest("hex");

// IMPORTANT: Keep EXACT order from your first code
const HASH_ORDER = [
  "siteCode",
  "countryCode",
  "currencyCode",
  "amount",
  "transactionReference",
  "bankReference",
  "cancelUrl",
  "errorUrl",
  "successUrl",
  "notifyUrl",
  "isTest",
];

function buildHashCheck(body) {
  const concatenated = HASH_ORDER.map((k) => String(body[k] ?? "")).join("") + OZOW.privateKey;
  return sha512LowerHex(concatenated);
}

function assertConfig() {
  const missing = [];
  if (!OZOW.apiKey) missing.push("OZOW_API_KEY");
  if (!OZOW.privateKey) missing.push("OZOW_PRIVATE_KEY");
  if (!OZOW.siteCode) missing.push("OZOW_SITE_CODE");
  if (!OZOW.notifyUrl) missing.push("OZOW_NOTIFY_URL");
  if (!OZOW.successUrl) missing.push("OZOW_SUCCESS_URL");
  if (!OZOW.cancelUrl) missing.push("OZOW_CANCEL_URL");
  if (!OZOW.errorUrl) missing.push("OZOW_ERROR_URL");
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

// ---- Core: build payload + fetch ----
async function createOzowPayment({
  amount,
  transactionReference, // e.g. `AH-${Date.now()}`
  bankReference,        // e.g. `ALGOHIVE-ABC123`
  isTest = false,       // boolean
}) {
  assertConfig();

  // Build the body with the same fields you used originally
  const body = {
    countryCode: "ZA",
    amount: formatAmount(amount),
    transactionReference,
    bankReference,
    cancelUrl: OZOW.cancelUrl,
    currencyCode: "ZAR",
    errorUrl: OZOW.errorUrl,
    isTest, // boolean in body is fine; we stringify for the hash below using String()
    notifyUrl: OZOW.notifyUrl,
    siteCode: OZOW.siteCode,
    successUrl: OZOW.successUrl,
  };

  // Compute hash using EXACT same order as original code + privateKey at the end
  // Note: we must pass the *string representation* of isTest to match your original concatenation
  const bodyForHash = { ...body, isTest: String(body.isTest) };
  body.hashCheck = buildHashCheck(bodyForHash);

  const res = await fetch(OZOW.apiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "ApiKey": OZOW.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Some Ozow responses are text or JSON; handle both
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    throw new Error(`Ozow error ${res.status}: ${data?.errorMessage || data?.raw || text}`);
  }

  return data; // usually contains paymentRequestId and url
}

// ---- Example run (CLI) ----
if (require.main === module) {
  (async () => {
    try {
      const out = await createOzowPayment({
        amount: 1, // dynamic
        transactionReference: `AH-${Date.now()}`,
        bankReference: `ALGOHIVE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        isTest: false, // or true for sandbox
      });
      console.log("✅ Ozow response:", out);
    } catch (e) {
      console.error("❌ Failed:", e.message);
      process.exit(1);
    }
  })();
}

// Export for server usage (e.g., Express/Next API route)
module.exports = { createOzowPayment };
