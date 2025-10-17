const BASE = process.env.PAYSTACK_BASE || "https://api.paystack.co";

function send(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

async function pstack(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: r.ok, status: r.status, data, text };
}

module.exports = { send, readJson, pstack };
