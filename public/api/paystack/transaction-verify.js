const { send, pstack } = require("./_util");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
  const ref = (req.query && req.query.reference) || "";
  if (!ref) return send(res, 400, { error: "reference required" });

  const r = await pstack(`/transaction/verify/${encodeURIComponent(ref)}`, { method: "GET" });
  if (!r.ok || !r?.data?.status) {
    return send(res, r.status || 400, { error: r.data?.message || "Verify failed", detail: r.data });
  }
  return send(res, 200, r.data.data);
};
