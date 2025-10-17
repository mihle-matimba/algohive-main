const crypto = require("crypto");

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  const signature = req.headers["x-paystack-signature"];
  const expected = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");

  if (signature !== expected) {
    return send(res, 401, { error: "Invalid signature" });
  }

  // Parse event and update your DB
  let event;
  try { event = JSON.parse(raw.toString("utf8")); } catch { event = null; }
  console.log("[paystack:webhook]", event?.event, event?.data?.reference);

  // TODO: handle events like "charge.success", "invoice.create", etc.
  // Always respond 200 so Paystack stops retrying
  return send(res, 200, { ok: true });
};
