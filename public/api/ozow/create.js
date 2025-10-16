import crypto from "crypto";

// --- Configuration ---
// IMPORTANT: These environment variables MUST be correctly set and match 
// your Ozow account to avoid HashCheck errors.
const OZOW = {
  api: "https://api.ozow.com/PostPaymentRequest",
  apiKey: process.env.OZOW_API_KEY,
  privateKey: process.env.OZOW_PRIVATE_KEY, // CRITICAL: Must be exact match!
  siteCode: process.env.OZOW_SITE_CODE,
  notifyUrl: process.env.OZOW_NOTIFY_URL,
  successUrl: process.env.OZOW_SUCCESS_URL,
  cancelUrl: process.env.OZOW_CANCEL_URL,
  errorUrl: process.env.OZOW_ERROR_URL,
};

// --- Utility Functions ---

/**
 * Ensures the amount is formatted as a string with exactly two decimal places, 
 * which is critical for HashCheck calculation stability.
 * @param {number|string} num The amount to format.
 * @returns {string} The formatted amount string (e.g., "10.00").
 */
function formatAmount(num) {
  // Coerce input to a number, default to 0, and format to 2 decimal places.
  return Number(num || 0).toFixed(2);
}

/**
 * Generates the SHA512 hash required by Ozow.
 * Note: Ozow requires the input string to be lowercased before hashing.
 * @param {string} s The concatenated string to hash.
 * @returns {string} The SHA512 hash in lower-hex format.
 */
function sha512LowerHex(s) {
  return crypto.createHash("sha512").update(s.toLowerCase(), "utf8").digest("hex");
}

/**
 * Generates an ISO8601 timestamp without milliseconds, always in UTC (Zulu time).
 * Example: 2025-10-16T15:20:00Z
 * @param {Date} date The date object to convert.
 * @returns {string} The formatted UTC string.
 */
function utcIsoNoMillis(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

// --- API Handler ---

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Safety check for critical configuration variables
  if (!OZOW.privateKey || !OZOW.siteCode || !OZOW.apiKey) {
     return res.status(500).json({ error: "Server misconfiguration: Ozow environment variables are missing." });
  }

  try {
    const { amount, customerName } = req.body || {};

    // Generate dynamic expiry time (10 minutes from now, UTC, ISO8601 format)
    const expiryDateUtc = utcIsoNoMillis(new Date(Date.now() + 10 * 60 * 1000));
    
    // Format the amount string correctly for the body and the HashCheck
    const formattedAmount = formatAmount(amount);

    const body = {
      siteCode: OZOW.siteCode,
      countryCode: "ZA",
      currencyCode: "ZAR",
      amount: formattedAmount, // ✅ USING FORMATTED AMOUNT STRING
      transactionReference: `AH-${Date.now()}`,
      bankReference: `ALGOHIVE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      // Setting these to empty strings ensures they don't break the concatenation logic if the API requires them in the body
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
      expiryDateUtc: expiryDateUtc, // ✅ USING DYNAMIC, UTC, ISO8601 TIME
      customerIdentifier: "",
    };

    // The order array is now simplified to match your working example's required fields 
    // for the HASH calculation (11 fields + Private Key).
    const order = [
      "siteCode","countryCode","currencyCode","amount",
      "transactionReference","bankReference",
      "cancelUrl","errorUrl","successUrl","notifyUrl",
      "isTest"
    ];

    // Build the concatenation string using the specified order and current body values
    // NOTE: If any of these fields are null/undefined, String(body[k] ?? "") ensures they become empty strings.
    const concat = order.map(k => String(body[k] ?? "")).join("") + OZOW.privateKey;
    body.hashCheck = sha512LowerHex(concat);

    // --- Post Request to Ozow ---
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
      // Handle API-level errors (like invalid Site Code, invalid HashCheck, etc.)
      console.error("Ozow API Error:", data);
      return res.status(400).json({ error: data?.errorMessage || "Ozow payment initialization failed.", raw: data });
    }

    res.status(200).json({ paymentRequestId: data.paymentRequestId, url: data.url });

  } catch (e) {
    console.error("Unexpected Server Error:", e);
    res.status(500).json({ error: "Internal server error during payment processing." });
  }
}
